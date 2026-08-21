"use client";

import { FIREBASE_CONFIG, APPCHECK_SITE_KEY, AI_MODEL } from "./config";

export interface LatexEditRequest {
  source: string;
  instruction: string;
  jobDescription?: string;
  log?: string;
}

export interface LatexEditResult {
  latex: string;
  note: string;
}

const SYSTEM_INSTRUCTION = [
  "You are Versume's LaTeX resume editor. You receive the complete LaTeX source of a resume and an instruction.",
  "Rules:",
  "- Return ONLY the complete revised LaTeX document inside a single ```latex fenced block. No commentary outside the fence.",
  "- Keep the document compilable with pdfLaTeX: article class, T1 fontenc, lmodern, geometry, enumitem, titlesec, hyperref only unless the document already uses others.",
  "- Preserve the preamble unless the instruction requires changing it.",
  "- Escape LaTeX special characters (& % $ # _ { } ~ ^) in any text you add.",
  "- Never invent employers, degrees, metrics, or skills that are not already present or clearly implied by the instruction or job description.",
  "- When tailoring to a job description: reorder and reword existing bullets to surface relevant keywords, keep every claim truthful.",
  "- When fixing compile errors: make the smallest change that resolves the error shown in the log.",
  "- Keep the resume to one page when possible.",
].join("\n");

let modelPromise: Promise<unknown> | null = null;

async function getModel() {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    const { initializeApp, getApps } = await import("firebase/app");
    const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import("firebase/app-check");
    const { getAI, getGenerativeModel, GoogleAIBackend } = await import("firebase/ai");
    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(APPCHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    return getGenerativeModel(ai, {
      model: AI_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    });
  })();
  return modelPromise;
}

function buildPrompt(req: LatexEditRequest): string {
  const parts: string[] = [];
  parts.push("CURRENT LATEX SOURCE:\n```latex\n" + req.source + "\n```");
  if (req.jobDescription?.trim()) {
    parts.push("JOB DESCRIPTION:\n" + req.jobDescription.trim());
  }
  if (req.log?.trim()) {
    parts.push("LAST COMPILE LOG (tail):\n```\n" + req.log.slice(-4000) + "\n```");
  }
  parts.push("INSTRUCTION: " + req.instruction);
  return parts.join("\n\n");
}

function extractLatex(text: string): { latex: string | null; note: string } {
  const fence = /```(?:latex|tex)?\s*\n([\s\S]*?)```/.exec(text);
  if (fence) {
    const before = text.slice(0, fence.index).trim();
    const after = text.slice(fence.index + fence[0].length).trim();
    return { latex: fence[1].trim(), note: [before, after].filter(Boolean).join("\n").slice(0, 500) };
  }
  if (text.includes("\\documentclass") && text.includes("\\end{document}")) {
    const start = text.indexOf("\\documentclass");
    const end = text.lastIndexOf("\\end{document}") + "\\end{document}".length;
    return { latex: text.slice(start, end).trim(), note: "" };
  }
  return { latex: null, note: text.slice(0, 500) };
}

export function aiAvailable(): boolean {
  return Boolean(FIREBASE_CONFIG.apiKey && APPCHECK_SITE_KEY);
}

export async function editLatexWithAI(req: LatexEditRequest): Promise<LatexEditResult> {
  const model = (await getModel()) as {
    generateContent(prompt: string): Promise<{ response: { text(): string } }>;
  };
  const result = await model.generateContent(buildPrompt(req));
  const text = result.response.text();
  const { latex, note } = extractLatex(text);
  if (!latex) throw new Error("The model did not return a LaTeX document. Try rephrasing the instruction.");
  return { latex, note };
}
