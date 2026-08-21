"use client";

export interface CompileResultLite {
  status: number;
  log: string;
  pdf?: Uint8Array;
}

interface EngineLike {
  loadEngine(): Promise<void>;
  isReady(): boolean;
  writeMemFSFile(name: string, src: string): void;
  setEngineMainFile(name: string): void;
  compileLaTeX(): Promise<{ status: number; log: string; pdf?: Uint8Array }>;
  compileFormat(): Promise<unknown>;
  flushCache(): void;
  setTexliveEndpoint(url: string): void;
}

declare global {
  interface Window {
    PdfTeXEngine?: new () => EngineLike;
  }
}

let enginePromise: Promise<EngineLike> | null = null;
let scriptPromise: Promise<void> | null = null;
let formatReady = false;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/latex/PdfTeXEngine.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load the LaTeX engine script"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

async function getEngine(): Promise<EngineLike> {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    await loadScript();
    if (!window.PdfTeXEngine) throw new Error("PdfTeXEngine unavailable");
    const engine = new window.PdfTeXEngine();
    await engine.loadEngine();
    const custom =
      (typeof localStorage !== "undefined" && localStorage.getItem("VERSUME_TEXLIVE_ENDPOINT")) ||
      process.env.NEXT_PUBLIC_TEXLIVE_ENDPOINT;
    engine.setTexliveEndpoint(custom ?? location.origin + "/texlive/");
    return engine;
  })();
  return enginePromise;
}

export type EnginePhase = "idle" | "loading" | "format" | "compiling" | "done" | "error";

export async function compileLatex(
  source: string,
  onPhase?: (phase: EnginePhase, detail?: string) => void
): Promise<CompileResultLite> {
  onPhase?.("loading");
  const engine = await getEngine();
  if (!engine.isReady()) throw new Error("Engine not ready");
  engine.flushCache();
  engine.writeMemFSFile("main.tex", source);
  engine.setEngineMainFile("main.tex");
  onPhase?.("compiling");
  let r = await engine.compileLaTeX();
  if (r.status !== 0 && !formatReady) {
    onPhase?.("format", "Building pdflatex format (first run only)");
    try {
      const res = (await engine.compileFormat()) as { status?: number; log?: string; pdf?: Uint8Array } | undefined;
      if (res && res.status === 0 && res.pdf) {
        formatReady = true;
        if (localStorage.getItem("VERSUME_FMT_CAPTURE") === "1") {
          await fetch((localStorage.getItem("VERSUME_TEXLIVE_ENDPOINT") ?? "/").replace(/texlive\/?$/, "") + "save-fmt", {
            method: "POST",
            body: res.pdf.slice().buffer,
          }).catch(() => {});
        }
        engine.flushCache();
        engine.writeMemFSFile("main.tex", source);
        engine.setEngineMainFile("main.tex");
        onPhase?.("compiling");
        r = await engine.compileLaTeX();
      } else {
        r = { status: -1, log: (res?.log ?? "format build failed") + "\n\n--- first attempt ---\n" + r.log, pdf: undefined };
      }
    } catch (fmtErr) {
      r = { status: -1, log: String(fmtErr) + "\n\n--- first attempt ---\n" + r.log, pdf: undefined };
    }
  } else if (r.status === 0) {
    formatReady = true;
  }
  onPhase?.(r.status === 0 && r.pdf ? "done" : "error");
  const log = r.log.replace(/I found no[^\n]*\n/g, "").replace(/\(There were \d+ error messages\)/, "");
  return { status: r.status, log, pdf: r.pdf };
}

export function warmupEngine(onPhase?: (phase: EnginePhase) => void): void {
  getEngine()
    .then(() => onPhase?.("done"))
    .catch(() => onPhase?.("error"));
}
