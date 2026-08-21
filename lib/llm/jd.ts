"use client";

import { JINA_API_KEY, JINA_READER_BASE } from "./config";

export interface FetchedJD {
  text: string;
  title: string;
  sourceUrl: string;
}

const MAX_JD_CHARS = 12000;

export function normalizeJobUrl(input: string): string | null {
  let u = input.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const parsed = new URL(u);
    if (!parsed.hostname.includes(".")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function fetchJobDescription(input: string): Promise<FetchedJD> {
  const url = normalizeJobUrl(input);
  if (!url) throw new Error("That does not look like a valid URL.");
  const res = await fetch(JINA_READER_BASE + url, {
    headers: { Authorization: "Bearer " + JINA_API_KEY, "X-Timeout": "30" },
  });
  if (!res.ok) throw new Error("Reader request failed (HTTP " + res.status + ")");
  const raw = await res.text();
  const titleMatch = /^Title:\s*(.+)$/m.exec(raw);
  const title = titleMatch?.[1]?.trim() ?? "";
  const warning = /^Warning:\s*(.+)$/m.exec(raw)?.[1] ?? "";
  if (/returned error|not authorized/i.test(warning)) {
    throw new Error("The job page could not be read: " + warning);
  }
  const mdIndex = raw.indexOf("Markdown Content:");
  let text = mdIndex >= 0 ? raw.slice(mdIndex + "Markdown Content:".length) : raw;
  text = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length < 200) {
    throw new Error("The page yielded almost no text — it may need login or block crawlers. Paste the JD manually instead.");
  }
  if (text.length > MAX_JD_CHARS) text = text.slice(0, MAX_JD_CHARS) + "\n…";
  return { text, title, sourceUrl: url };
}
