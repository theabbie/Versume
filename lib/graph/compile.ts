import {
  EntryData,
  FilterData,
  GraphState,
  IdentityData,
  OutputData,
  SectionData,
  SectionType,
  TemplateData,
  VEdge,
  VNode,
} from "../types";
import {
  EMPTY_DOC,
  escapeLatex,
  escapeUrl,
  normalizeUrl,
  PREAMBLES,
  TemplateOpts,
} from "../latex/template";

interface ResolvedEntry {
  node: VNode;
  data: EntryData;
}

interface ResolvedSection {
  node: VNode;
  data: SectionData;
  entries: ResolvedEntry[];
}

export interface CompileOutput {
  latex: string;
  problems: string[];
}

function byId(nodes: VNode[]): Map<string, VNode> {
  return new Map(nodes.map((n) => [n.id, n]));
}

function incoming(edges: VEdge[], target: string, handle: string): VEdge[] {
  return edges.filter((e) => e.target === target && e.targetHandle === handle);
}

function orderIds(ids: string[], order: string[], yOf: (id: string) => number): string[] {
  const set = new Set(ids);
  const head = order.filter((id) => set.has(id));
  const rest = ids.filter((id) => !head.includes(id)).sort((a, b) => yOf(a) - yOf(b));
  return [...head, ...rest];
}

function scoreText(text: string, keywords: string[]): number {
  const t = text.toLowerCase();
  let s = 0;
  for (const k of keywords) {
    const kw = k.trim().toLowerCase();
    if (!kw) continue;
    if (t.includes(kw)) s += kw.includes(" ") ? 3 : 1;
  }
  return s;
}

function entryText(d: EntryData): string {
  return Object.values(d.fields).join(" ") + " " + d.bullets.join(" ");
}

function boldKeywords(text: string, keywords: string[]): string {
  let out = escapeLatex(text);
  const hits = keywords
    .map((k) => k.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const k of hits) {
    const ek = escapeLatex(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp("(" + ek + ")", "gi"), "\\\\textbf{$1}");
  }
  return out;
}

function applyFilters(
  entries: ResolvedEntry[],
  edges: VEdge[],
  nodes: Map<string, VNode>,
  intoHandle: VEdge[]
): ResolvedEntry[] {
  const out: ResolvedEntry[] = [];
  for (const e of intoHandle) {
    const src = nodes.get(e.source);
    if (!src || !src.enabled) continue;
    if (src.kind === "entry") {
      out.push({ node: src, data: src.data as EntryData });
    } else if (src.kind === "filter") {
      const f = src.data as FilterData;
      let pool = applyFilters(entries, edges, nodes, incoming(edges, src.id, "in"));
      if (f.filterType === "keywordBoost") {
        pool = [...pool].sort(
          (a, b) => scoreText(entryText(b.data), f.keywords) - scoreText(entryText(a.data), f.keywords)
        );
      } else if (f.filterType === "limit") {
        pool = f.limit ? pool.slice(0, f.limit) : pool;
      }
      out.push(...pool);
    }
  }
  return out;
}

function resolveSections(
  state: GraphState,
  output: VNode,
  nodes: Map<string, VNode>
): { sections: ResolvedSection[]; identity: VNode | null; template: VNode | null } {
  const od = output.data as OutputData;
  const sectionEdges = incoming(state.edges, output.id, "sections");
  const sectionIds = orderIds(
    sectionEdges.map((e) => e.source),
    od.sectionOrder,
    (id) => nodes.get(id)?.position.y ?? 0
  );
  const sections: ResolvedSection[] = [];
  for (const sid of sectionIds) {
    const sn = nodes.get(sid);
    if (!sn || !sn.enabled || sn.kind !== "section") continue;
    const sd = sn.data as SectionData;
    const entryEdges = incoming(state.edges, sn.id, "entries");
    let entries = applyFilters([], state.edges, nodes, entryEdges);
    const ids = entries.map((r) => r.node.id);
    const ordered = orderIds(ids, sd.entryOrder, (id) => nodes.get(id)?.position.y ?? 0);
    entries = ordered
      .map((id) => entries.find((r) => r.node.id === id))
      .filter((r): r is ResolvedEntry => !!r);
    if (sd.maxItems) entries = entries.slice(0, sd.maxItems);
    if (entries.length === 0 && sd.sectionType !== "summary") continue;
    sections.push({ node: sn, data: sd, entries });
  }
  const idEdge = incoming(state.edges, output.id, "identity")[0];
  const identity = idEdge ? nodes.get(idEdge.source) ?? null : null;
  const tplEdge = incoming(state.edges, output.id, "template")[0];
  const template = tplEdge ? nodes.get(tplEdge.source) ?? null : null;
  return { sections, identity, template };
}

function boostFiltersFor(state: GraphState, sectionId: string, nodes: Map<string, VNode>): FilterData[] {
  const out: FilterData[] = [];
  for (const e of incoming(state.edges, sectionId, "entries")) {
    const n = nodes.get(e.source);
    if (n && n.enabled && n.kind === "filter") {
      const f = n.data as FilterData;
      if (f.filterType === "keywordBoost" && f.boldMatches) out.push(f);
    }
  }
  return out;
}

function bulletText(
  text: string,
  boost: FilterData[]
): string {
  const f = boost[0];
  if (f && f.keywords.length) return boldKeywords(text, f.keywords);
  return escapeLatex(text);
}

function dateRange(f: Record<string, string>): string {
  const s = (f.start || "").trim();
  const e = (f.end || "").trim();
  if (s && e) return s + " -- " + e;
  return s || e || "";
}

function renderEntryBody(
  st: SectionType,
  d: EntryData,
  boost: FilterData[]
): string[] {
  const f = d.fields;
  const lines: string[] = [];
  const bullets = d.bullets.map((b) => b.trim()).filter(Boolean);
  if (st === "experience" || st === "education") {
    const head = st === "experience" ? f.title : f.degree;
    if (head || f.org) {
      lines.push(
        "\\entry{" + escapeLatex(head || "") + "}{" + escapeLatex(dateRange(f)) + "}{" +
          escapeLatex(f.org || "") + "}{" + escapeLatex(f.location || "") + "}"
      );
    }
    if (f.note) lines.push("\\textit{" + escapeLatex(f.note) + "}");
  } else if (st === "projects") {
    let head = "\\textbf{" + escapeLatex(f.name || "Project") + "}";
    if (f.stack) head += " $|$ \\textit{" + escapeLatex(f.stack) + "}";
    const dr = dateRange(f);
    if (f.link) {
      head += " \\hfill \\href{" + escapeUrl(normalizeUrl(f.link)) + "}{" + escapeLatex(f.link) + "}";
    } else if (dr) {
      head += " \\hfill " + escapeLatex(dr);
    }
    lines.push(head);
  } else if (st === "skills") {
    if (f.category && bullets.length) {
      lines.push("\\textbf{" + escapeLatex(f.category) + ":} " + bullets.map(escapeLatex).join(", "));
    } else if (bullets.length) {
      lines.push(bullets.map(escapeLatex).join(", "));
    }
    return lines;
  } else if (st === "certifications") {
    let head = "\\textbf{" + escapeLatex(f.name || "") + "}";
    if (f.org) head += " --- " + escapeLatex(f.org);
    if (f.end) head += " \\hfill " + escapeLatex(f.end);
    lines.push(head);
  } else if (st === "publications") {
    let head = "\\textbf{" + escapeLatex(f.title || "") + "}";
    if (f.org) head += ", \\textit{" + escapeLatex(f.org) + "}";
    if (f.end) head += " \\hfill " + escapeLatex(f.end);
    lines.push(head);
    if (f.link) lines.push("\\href{" + escapeUrl(normalizeUrl(f.link)) + "}{" + escapeLatex(f.link) + "}");
  } else if (st === "custom" || st === "summary") {
    if (f.title) lines.push("\\textbf{" + escapeLatex(f.title) + "}");
    if (f.text) lines.push(escapeLatex(f.text));
  }
  if (bullets.length) {
    lines.push("\\begin{itemize}");
    for (const b of bullets) lines.push("\\item " + bulletText(b, boost));
    lines.push("\\end{itemize}");
  }
  return lines;
}

function renderIdentity(d: IdentityData, templateId: string): string[] {
  const f = d.fields;
  const lines: string[] = [];
  const name = escapeLatex(f.name || "Your Name");
  if (templateId === "quartz") {
    lines.push("\\begin{center}");
    lines.push("{\\Huge\\scshape " + name + "} \\\\");
    if (f.headline) lines.push("{\\large " + escapeLatex(f.headline) + "} \\\\");
  } else {
    lines.push("\\begin{center}");
    lines.push("{\\Huge\\bfseries " + name + "} \\\\");
    if (f.headline) lines.push("{\\large\\itshape " + escapeLatex(f.headline) + "} \\\\");
  }
  const contacts: string[] = [];
  if (f.email) contacts.push("\\href{mailto:" + escapeUrl(f.email) + "}{" + escapeLatex(f.email) + "}");
  if (f.phone) contacts.push(escapeLatex(f.phone));
  if (f.location) contacts.push(escapeLatex(f.location));
  if (contacts.length) lines.push(contacts.join(" \\textbar\\ ") + " \\\\");
  const links: string[] = [];
  if (f.website) links.push("\\href{" + escapeUrl(normalizeUrl(f.website)) + "}{" + escapeLatex(f.website) + "}");
  if (f.linkedin) links.push("\\href{" + escapeUrl(normalizeUrl(f.linkedin)) + "}{" + escapeLatex(f.linkedin) + "}");
  if (f.github) links.push("\\href{" + escapeUrl(normalizeUrl(f.github)) + "}{" + escapeLatex(f.github) + "}");
  if (links.length) lines.push(links.join(" \\textbar\\ "));
  lines.push("\\end{center}");
  lines.push("\\vspace{-4pt}");
  return lines;
}

export function generateLatex(state: GraphState): CompileOutput {
  const problems: string[] = [];
  const nodes = byId(state.nodes);
  const output = state.nodes.find((n) => n.kind === "output") ?? null;
  if (!output) {
    return { latex: EMPTY_DOC, problems: ["No Resume output node on the canvas."] };
  }
  const { sections, identity, template } = resolveSections(state, output, nodes);
  const tpl = (template?.data as TemplateData | undefined) ?? {
    templateId: "onyx",
    fontSize: "10",
    density: "tight",
  };
  const od = output.data as OutputData;
  const opts: TemplateOpts = { paper: od.paper ?? "letter", fontSize: tpl.fontSize ?? "10", density: tpl.density ?? "tight" };
  const preamble = (PREAMBLES[tpl.templateId] ?? PREAMBLES.onyx)(opts);
  const body: string[] = [];
  if (identity && identity.enabled) {
    body.push(...renderIdentity(identity.data as IdentityData, tpl.templateId));
  } else {
    problems.push("No Identity node connected - header omitted.");
  }
  for (const s of sections) {
    body.push("\\section{" + escapeLatex(s.data.title) + "}");
    const boost = boostFiltersFor(state, s.node.id, nodes);
    if (s.data.sectionType === "summary") {
      for (const r of s.entries) {
        const d = r.data;
        const txt = d.fields.text || d.bullets.join(" ");
        if (txt.trim()) body.push(bulletText(txt.trim(), boost));
      }
      body.push("");
      continue;
    }
    for (let i = 0; i < s.entries.length; i++) {
      const r = s.entries[i];
      body.push(...renderEntryBody(s.data.sectionType, r.data, boost));
      if (i < s.entries.length - 1 && s.data.sectionType !== "skills") {
        body.push(s.data.compact ? "\\vspace{2pt}" : "\\vspace{5pt}");
      }
    }
    body.push("");
  }
  if (sections.length === 0) problems.push("No sections connected to the Resume node.");
  const llmNodes = state.nodes.filter((n) => n.kind === "filter" && (n.data as FilterData).filterType === "llmTailor");
  for (const n of llmNodes) {
    if (n.enabled) problems.push("LLM Tailor node is a placeholder - it passes content through unchanged for now.");
  }
  return { latex: preamble + "\n" + body.join("\n") + "\n\\end{document}\n", problems };
}
