"use client";

import React, { useEffect, useRef, useState } from "react";
import { Badge, Button } from "./ui";
import type { EnginePhase } from "@/lib/latex/engine";

export interface PreviewState {
  phase: EnginePhase;
  phaseDetail?: string;
  log: string;
  pdf: Uint8Array | null;
  error: string | null;
}

export default function PdfPreview({
  state,
  onCompile,
  onDownload,
  problems,
  compilingDisabled,
}: {
  state: PreviewState;
  onCompile: () => void;
  onDownload: () => void;
  problems: string[];
  compilingDisabled: boolean;
}) {
  const [pages, setPages] = useState<HTMLCanvasElement[]>([]);
  const [scale, setScale] = useState(1.1);
  const [showLog, setShowLog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setPages([]);
    if (!state.pdf) return;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const doc = await pdfjs.getDocument({ data: state.pdf!.slice().buffer }).promise;
        const canvases: HTMLCanvasElement[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: scale * 2 });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width;
          canvas.height = vp.height;
          canvas.style.width = vp.width / 2 + "px";
          canvas.style.height = vp.height / 2 + "px";
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
          canvases.push(canvas);
        }
        if (!cancelled) setPages(canvases);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.pdf, scale]);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    c.innerHTML = "";
    for (const p of pages) {
      const wrap = document.createElement("div");
      wrap.className = "mx-auto mb-4 w-fit shadow-2xl ring-1 ring-zinc-800";
      wrap.appendChild(p);
      c.appendChild(wrap);
    }
  }, [pages]);

  const busy = state.phase === "loading" || state.phase === "format" || state.phase === "compiling";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Preview</span>
        {busy && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-zinc-300" />}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} title="Zoom out">−</Button>
          <span className="w-10 text-center text-[10px] text-zinc-500">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={() => setScale((s) => Math.min(2.5, s + 0.2))} title="Zoom in">+</Button>
          <Button variant="outline" size="sm" onClick={() => setShowLog((v) => !v)}>
            Log
          </Button>
          <Button variant="primary" size="sm" onClick={onCompile} disabled={compilingDisabled || busy}>
            {busy ? "Compiling…" : "Compile"}
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload} disabled={!state.pdf}>
            PDF
          </Button>
        </div>
      </div>

      {problems.length > 0 && (
        <div className="border-b border-edge bg-panel2 px-3 py-1.5">
          {problems.map((p, i) => (
            <div key={i} className="text-[11px] text-amber-400/90">△ {p}</div>
          ))}
        </div>
      )}

      {state.phase === "format" && (
        <div className="border-b border-edge bg-panel2 px-3 py-1.5 text-[11px] text-zinc-400">
          {state.phaseDetail ?? "Building format"} — the very first compile downloads the TeX toolchain pieces; later
          compiles are fast.
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="h-full overflow-auto p-4" hidden={showLog} />

        {showLog && (
          <pre className="h-full overflow-auto whitespace-pre-wrap break-all p-3 font-mono text-[10px] leading-relaxed text-zinc-500">
            {state.log || "No log yet. Hit Compile."}
          </pre>
        )}

        {!state.pdf && !showLog && (
          <div className="pointer-events-none absolute inset-0 flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            {state.phase === "error" || state.error ? (
              <>
                <Badge tone="red">compile failed</Badge>
                <p className="max-w-xs text-[11px] text-zinc-500">
                  Open the log to see what pdflatex reported. Fix the source in the LaTeX tab or adjust the graph.
                </p>
              </>
            ) : (
              <>
                <svg width="26" height="32" viewBox="0 0 26 32" fill="none" stroke="#3f3f46" strokeWidth="1.2">
                  <rect x="1" y="1" width="24" height="30" rx="2" />
                  <line x1="5" y1="7" x2="21" y2="7" />
                  <line x1="5" y1="11" x2="16" y2="11" />
                  <line x1="5" y1="17" x2="21" y2="17" />
                  <line x1="5" y1="21" x2="21" y2="21" />
                </svg>
                <p className="text-xs text-zinc-500">Nothing compiled yet.</p>
                <p className="max-w-[240px] text-[11px] text-zinc-600">
                  Compile runs pdfTeX (WebAssembly) entirely in your browser.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
