"use client";

import React, { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage, syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { tags as t } from "@lezer/highlight";
import { useStudio } from "@/lib/store";
import { Button, Badge, Textarea, Input } from "./ui";
import { aiAvailable, editLatexWithAI } from "@/lib/llm/firebase";
import { fetchJobDescription } from "@/lib/llm/jd";

const latexHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#e4e4e7", fontWeight: "600" },
  { tag: t.tagName, color: "#d4d4d8" },
  { tag: t.string, color: "#a1a1aa" },
  { tag: t.comment, color: "#52525b", fontStyle: "italic" },
  { tag: t.number, color: "#c4b5fd" },
  { tag: t.brace, color: "#71717a" },
  { tag: t.macroName, color: "#fafafa" },
  { tag: t.emphasis, fontStyle: "italic" },
]);

type AiPhase = "idle" | "running" | "done" | "error";

export default function LatexEditor({ generated }: { generated: string }) {
  const doc = useStudio((s) => s.doc);
  const setLatexOverride = useStudio((s) => s.setLatexOverride);
  const lastCompile = useStudio((s) => s.lastCompile);
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [aiOpen, setAiOpen] = React.useState(false);
  const [instruction, setInstruction] = React.useState("");
  const [jd, setJd] = React.useState("");
  const [showJd, setShowJd] = React.useState(false);
  const [aiPhase, setAiPhase] = React.useState<AiPhase>("idle");
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<{ latex: string; note: string } | null>(null);
  const [jobUrl, setJobUrl] = React.useState("");
  const [jdFetch, setJdFetch] = React.useState<{ state: "idle" | "fetching" | "ok" | "error"; detail?: string }>({ state: "idle" });

  const value = doc?.draft.latexOverride ?? generated;
  const isOverride = doc?.draft.latexOverride != null;
  const extensions = useMemo(() => [StreamLanguage.define(stex), syntaxHighlighting(latexHighlight)], []);
  const failedLog = lastCompile && !lastCompile.ok ? lastCompile.log : null;

  async function handleFetchJd() {
    if (!jobUrl.trim()) return;
    setJdFetch({ state: "fetching" });
    try {
      const r = await fetchJobDescription(jobUrl);
      setJd(r.text);
      const host = new URL(r.sourceUrl).hostname;
      setJdFetch({ state: "ok", detail: (r.title ? r.title + " · " : "") + host + " · " + r.text.length.toLocaleString() + " chars" });
    } catch (e) {
      setJdFetch({ state: "error", detail: e instanceof Error ? e.message : String(e) });
    }
  }

  async function runAi(customInstruction?: string) {
    let instr = (customInstruction ?? instruction).trim();
    if (!instr && showJd && jd.trim()) instr = "Tailor this resume to the job description";
    if (!instr || !value) return;
    setAiPhase("running");
    setAiError(null);
    setPending(null);
    try {
      const r = await editLatexWithAI({
        source: value,
        instruction: instr,
        jobDescription: showJd ? jd : undefined,
        log: failedLog ?? undefined,
      });
      setPending(r);
      setAiPhase("done");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
      setAiPhase("error");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">LaTeX source</span>
        {isOverride ? <Badge tone="amber">edited</Badge> : <Badge>generated</Badge>}
        <div className="ml-auto flex items-center gap-1">
          {aiAvailable() && (
            <Button
              variant={aiOpen ? "primary" : "outline"}
              size="sm"
              onClick={() => setAiOpen((v) => !v)}
              title="Edit this source with Gemini"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2zM19 15l.9 3.1L23 19l-3.1.9L19 23l-.9-3.1L15 19l3.1-.9L19 15z" />
              </svg>
              AI edit
            </Button>
          )}
          {isOverride && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
              Resync from graph
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(value)} title="Copy source">
            Copy
          </Button>
        </div>
      </div>

      {aiOpen && (
        <div className="shrink-0 border-b border-edge bg-panel2/60 px-3 py-2.5">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {failedLog && (
              <button
                onClick={() => {
                  setInstruction("Fix the compile errors shown in the log");
                  runAi("Fix the compile errors shown in the log");
                }}
                disabled={aiPhase === "running"}
                className="rounded-full border border-red-900/70 bg-red-950/30 px-2.5 py-1 text-[11px] font-medium text-red-300 transition-colors hover:border-red-700 disabled:opacity-50"
              >
                Fix compile error
              </button>
            )}
            <button
              onClick={() => setShowJd((v) => !v)}
              className={
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors " +
                (showJd
                  ? "border-zinc-400 bg-panel text-zinc-100"
                  : "border-edge2 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200")
              }
            >
              Tailor to job description
            </button>
            <button
              onClick={() => {
                setInstruction("Tighten wording: shorter, stronger bullets, quantified impact kept");
                runAi("Tighten wording: shorter, stronger bullets, quantified impact kept");
              }}
              disabled={aiPhase === "running"}
              className="rounded-full border border-edge2 px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-50"
            >
              Tighten wording
            </button>
          </div>
          {showJd && (
            <div className="mb-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Input
                  value={jobUrl}
                  onChange={setJobUrl}
                  placeholder="Paste a job link — greenhouse, lever, linkedin…"
                  className="flex-1 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFetchJd();
                  }}
                />
                <Button variant="outline" size="sm" onClick={handleFetchJd} disabled={jdFetch.state === "fetching" || !jobUrl.trim()}>
                  {jdFetch.state === "fetching" ? "Fetching…" : "Fetch JD"}
                </Button>
              </div>
              {jdFetch.state === "fetching" && (
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-zinc-300" />
                  Reading the posting via r.jina.ai…
                </div>
              )}
              {jdFetch.state === "ok" && (
                <div className="truncate text-[10px] text-emerald-400" title={jdFetch.detail}>
                  ✓ {jdFetch.detail}
                </div>
              )}
              {jdFetch.state === "error" && (
                <div className="text-[10px] leading-snug text-red-400">{jdFetch.detail}</div>
              )}
              <Textarea
                value={jd}
                onChange={(v) => {
                  setJd(v);
                  if (jdFetch.state === "ok") setJdFetch({ state: "idle" });
                }}
                rows={4}
                placeholder="Job description (fetch it from a link above, or paste it)"
                className="text-xs"
              />
            </div>
          )}
          <div className="flex items-start gap-1.5">
            <Textarea
              value={instruction}
              onChange={setInstruction}
              rows={2}
              placeholder={
                showJd
                  ? "e.g. Emphasize distributed systems experience for this role (optional)"
                  : "e.g. Make it denser / swap to A4 / fix the overfull sections"
              }
              className="flex-1 text-xs"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => runAi()}
              disabled={aiPhase === "running" || (!instruction.trim() && !(showJd && jd.trim()))}
            >
              {aiPhase === "running" ? "Working…" : "Run"}
            </Button>
          </div>
          {aiPhase === "running" && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-zinc-300" />
              Gemini is rewriting the source…
            </div>
          )}
          {aiPhase === "error" && aiError && (
            <div className="mt-2 rounded-md border border-red-900/60 bg-red-950/20 px-2.5 py-2 text-[11px] text-red-300">
              {aiError}
            </div>
          )}
          {pending && (
            <div className="mt-2 rounded-md border border-emerald-900/60 bg-emerald-950/20 px-2.5 py-2">
              {pending.note && <div className="mb-2 text-[11px] leading-snug text-zinc-400">{pending.note}</div>}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-300">Revision ready ({pending.latex.length.toLocaleString()} chars)</span>
                <div className="ml-auto flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPending(null);
                      setAiPhase("idle");
                    }}
                  >
                    Discard
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setLatexOverride(pending.latex);
                      setPending(null);
                      setAiPhase("idle");
                      setInstruction("");
                    }}
                  >
                    Apply as override
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1">
        <CodeMirror
          value={value}
          height="100%"
          style={{ height: "100%" }}
          theme="dark"
          extensions={extensions}
          onChange={(v) => {
            if (v === generated && !isOverride) return;
            setLatexOverride(v === generated ? null : v);
          }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: true,
            autocompletion: false,
          }}
        />
      </div>
      {isOverride && (
        <div className="border-t border-amber-900/60 bg-amber-950/20 px-3 py-2 text-[11px] leading-snug text-amber-400/90">
          This source has been edited by hand and no longer follows the canvas. It is committed with the version.
          {confirmReset ? (
            <span className="ml-1">
              Discard edits?{" "}
              <button className="font-semibold underline" onClick={() => { setLatexOverride(null); setConfirmReset(false); }}>
                yes
              </button>{" "}
              /{" "}
              <button className="underline" onClick={() => setConfirmReset(false)}>
                no
              </button>
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
