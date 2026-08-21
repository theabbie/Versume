"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStudio } from "@/lib/store";
import { generateLatex } from "@/lib/graph/compile";
import { compileLatex } from "@/lib/latex/engine";
import Canvas from "@/components/Canvas";
import Inspector from "@/components/Inspector";
import VersionPanel from "@/components/VersionPanel";
import LatexEditor from "@/components/LatexEditor";
import PdfPreview, { PreviewState } from "@/components/PdfPreview";
import { Button, Logo, Badge } from "@/components/ui";
import { Branch } from "@/lib/types";

type RightTab = "preview" | "latex" | "node";

function StudioInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const { ready, init, doc, openResume, renameResume, currentBranch, isDirty } = useStudio();
  const [tab, setTab] = useState<RightTab>("preview");
  const [preview, setPreview] = useState<PreviewState>({ phase: "idle", log: "", pdf: null, error: null });
  const [leftOpen, setLeftOpen] = useState(true);
  const [nameEdit, setNameEdit] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (ready && id) openResume(id);
  }, [ready, id, openResume]);

  const generated = useMemo(() => {
    if (!doc) return { latex: "", problems: [] as string[] };
    return generateLatex(doc.draft);
  }, [doc]);

  const source = doc?.draft.latexOverride ?? generated.latex;

  const setLastCompile = useStudio((s) => s.setLastCompile);

  const doCompile = useCallback(async () => {
    if (!source) return;
    setTab("preview");
    setPreview((p) => ({ ...p, phase: "loading", error: null }));
    try {
      const r = await compileLatex(source, (phase, detail) =>
        setPreview((p) => ({ ...p, phase, phaseDetail: detail }))
      );
      const ok = r.status === 0 && !!r.pdf;
      setLastCompile({ log: r.log, ok });
      setPreview({
        phase: ok ? "done" : "error",
        log: r.log,
        pdf: r.pdf ?? null,
        error: ok ? null : "pdflatex exited with status " + r.status,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastCompile({ log: msg, ok: false });
      setPreview({ phase: "error", log: msg, pdf: null, error: msg });
    }
  }, [source, setLastCompile]);

  useEffect(() => {
    if (!doc) return;
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => {
      if (source && source.length > 60) doCompile();
    }, 2500);
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  function downloadPdf() {
    if (!preview.pdf || !doc) return;
    const branch = doc.branches[doc.draftBranchId]?.name ?? "main";
    const blob = new Blob([preview.pdf.slice().buffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-") + "-" + branch + ".pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    if (!doc) return;
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-") + ".versume.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-zinc-600">Loading…</div>
    );
  }

  if (!doc) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-zinc-500">Resume not found locally.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/")}>
          Back to library
        </Button>
      </div>
    );
  }

  const branch: Branch | null = currentBranch();
  const dirty = isDirty();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-edge bg-panel px-3">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-zinc-500 transition-colors hover:text-zinc-200"
          title="Library"
        >
          <Logo size={18} />
        </button>
        <div className="h-4 w-px bg-edge2" />
        {nameEdit ? (
          <input
            className="rounded border border-edge2 bg-canvas px-2 py-0.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            value={nameVal}
            autoFocus
            onChange={(e) => setNameVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                renameResume(nameVal.trim() || doc.name);
                setNameEdit(false);
              }
              if (e.key === "Escape") setNameEdit(false);
            }}
            onBlur={() => setNameEdit(false)}
          />
        ) : (
          <button
            className="max-w-56 truncate text-sm font-medium text-zinc-100 hover:text-white"
            title="Rename"
            onClick={() => {
              setNameVal(doc.name);
              setNameEdit(true);
            }}
          >
            {doc.name}
          </button>
        )}
        <BranchPicker />
        {dirty && <Badge tone="amber">modified</Badge>}
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={exportJson} title="Export full history as JSON">
            Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLeftOpen((v) => !v)}
            title={leftOpen ? "Hide versions" : "Show versions"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="6" cy="6" r="2.5" />
              <circle cx="6" cy="18" r="2.5" />
              <circle cx="18" cy="12" r="2.5" />
              <path d="M6 8.5v7M8 7l7.5 4" />
            </svg>
            {branch && <span className="text-zinc-500">{branch.name}</span>}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {leftOpen && (
          <aside className="w-60 shrink-0 border-r border-edge bg-panel">
            <VersionPanel />
          </aside>
        )}
        <main className="min-w-0 flex-1">
          <Canvas graph={doc.draft} />
        </main>
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-edge bg-panel">
          <div className="flex shrink-0 border-b border-edge">
            {(
              [
                ["preview", "Preview"],
                ["latex", "LaTeX"],
                ["node", "Node"],
              ] as [RightTab, string][]
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  "flex-1 border-b-2 px-2 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors " +
                  (tab === t ? "border-zinc-100 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300")
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            {tab === "preview" && (
              <PdfPreview
                state={preview}
                onCompile={doCompile}
                onDownload={downloadPdf}
                problems={generated.problems}
                compilingDisabled={!source}
              />
            )}
            {tab === "latex" && <LatexEditor generated={generated.latex} />}
            {tab === "node" && <Inspector />}
          </div>
        </aside>
      </div>
    </div>
  );
}

function BranchPicker() {
  const doc = useStudio((s) => s.doc);
  const switchBranch = useStudio((s) => s.switchBranch);
  const [open, setOpen] = useState(false);
  if (!doc) return null;
  const current = doc.branches[doc.draftBranchId];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-edge2 bg-panel2 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="12" r="2.5" />
          <path d="M6 8.5v7M8 7l7.5 4" />
        </svg>
        {current?.name ?? "?"}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-30 mt-1 w-48 rounded-lg border border-edge2 bg-panel p-1 shadow-2xl">
            {Object.values(doc.branches)
              .sort((a, b) => a.createdAt - b.createdAt)
              .map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    switchBranch(b.id);
                    setOpen(false);
                  }}
                  className={
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-zinc-800 " +
                    (b.id === doc.draftBranchId ? "text-zinc-100" : "text-zinc-400")
                  }
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {b.name}
                  {b.id === doc.draftBranchId && <span className="ml-auto text-[9px] text-zinc-500">current</span>}
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense
      fallback={<div className="flex h-screen items-center justify-center text-sm text-zinc-600">Loading…</div>}
    >
      <StudioInner />
    </Suspense>
  );
}
