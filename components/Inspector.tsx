"use client";

import React from "react";
import { useStudio } from "@/lib/store";
import {
  EntryData,
  FilterData,
  IdentityData,
  OutputData,
  SectionData,
  TemplateData,
  VNode,
} from "@/lib/types";
import { BULLETS_LABEL, ENTRY_FIELDS, IDENTITY_FIELDS, SECTION_LABELS, SECTION_TYPES, TEMPLATES } from "@/lib/registry";
import { Button, Input, Textarea, Toggle, Badge } from "./ui";
import { newId } from "@/lib/ids";

export default function Inspector() {
  const doc = useStudio((s) => s.doc);
  const selectedNodeId = useStudio((s) => s.selectedNodeId);
  const updateNode = useStudio((s) => s.updateNode);
  const updateNodeData = useStudio((s) => s.updateNodeData);
  const removeNode = useStudio((s) => s.removeNode);
  const addNode = useStudio((s) => s.addNode);
  const selectNode = useStudio((s) => s.selectNode);

  if (!doc) return null;
  const node = doc.draft.nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5">
          <path d="M4 4l7 17 2.5-7.5L21 11 4 4z" />
        </svg>
        <p className="text-xs text-zinc-500">Select a node on the canvas to edit it here.</p>
        <p className="text-[11px] leading-relaxed text-zinc-600">
          Flow: Identity → Resume · Entries → Sections → Resume · Template → Resume. Insert Filters between entries and
          sections to shape what a role sees.
        </p>
      </div>
    );
  }

  const d = node.data as unknown as Record<string, unknown>;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{node.kind}</div>
          <div className="text-sm font-medium text-zinc-100">{titleOf(node)}</div>
        </div>
        <div className="flex items-center gap-2">
          <Toggle on={node.enabled} onChange={(v) => updateNode(node.id, { enabled: v })} />
          {node.kind !== "output" && (
            <Button
              variant="danger"
              size="sm"
              title="Delete node"
              onClick={() => removeNode(node.id)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
              </svg>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-5 p-4">
        {node.kind === "identity" && (
          <FieldsEditor
            fields={IDENTITY_FIELDS}
            values={(d as unknown as IdentityData).fields}
            onChange={(fields) => updateNodeData(node.id, { fields } as Partial<IdentityData>)}
          />
        )}

        {node.kind === "section" && <SectionEditor node={node} />}
        {node.kind === "entry" && <EntryEditor node={node} />}
        {node.kind === "template" && (
          <div className="space-y-4">
            <div>
              <Label>Template</Label>
              <div className="mt-1.5 grid grid-cols-1 gap-2">
                {TEMPLATES.map((t) => {
                  const td = d as unknown as TemplateData;
                  const active = td.templateId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => updateNodeData(node.id, { templateId: t.id } as Partial<TemplateData>)}
                      className={
                        "rounded-lg border p-3 text-left transition-colors " +
                        (active ? "border-zinc-300 bg-panel2" : "border-edge2 hover:border-zinc-500")
                      }
                    >
                      <div className="text-xs font-semibold text-zinc-100">{t.name}</div>
                      <div className="mt-0.5 text-[11px] text-zinc-500">{t.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Font size</Label>
                <Seg
                  options={["10", "11"]}
                  value={(d as unknown as TemplateData).fontSize}
                  onChange={(v) => updateNodeData(node.id, { fontSize: v as "10" | "11" } as Partial<TemplateData>)}
                  suffix="pt"
                />
              </div>
              <div>
                <Label>Density</Label>
                <Seg
                  options={["tight", "normal"]}
                  value={(d as unknown as TemplateData).density}
                  onChange={(v) => updateNodeData(node.id, { density: v as "tight" | "normal" } as Partial<TemplateData>)}
                />
              </div>
            </div>
          </div>
        )}

        {node.kind === "filter" && <FilterEditor node={node} />}

        {node.kind === "output" && <OutputEditor node={node} />}
      </div>

      {node.kind === "section" && (
        <div className="border-t border-edge p-3">
          <QuickEntryAdder
            sectionId={node.id}
            sectionType={(node.data as SectionData).sectionType}
            onAdd={(entryNode) => {
              addNode(entryNode, { target: node.id, targetHandle: "entries" });
            }}
          />
        </div>
      )}

      {node.kind !== "output" && (
        <div className="border-t border-edge px-4 py-2 text-[10px] text-zinc-600">
          id {node.id.slice(0, 8)} · {node.enabled ? "included in build" : "excluded from build"}
        </div>
      )}
    </div>
  );

  function titleOf(n: VNode): string {
    const dd = n.data as unknown as Record<string, unknown>;
    if (n.kind === "identity") return ((dd as unknown as IdentityData).fields.name || "Identity") as string;
    if (n.kind === "section") return (dd as unknown as SectionData).title;
    if (n.kind === "entry") {
      const f = (dd as unknown as EntryData).fields;
      return (f.title || f.name || f.degree || f.category || "Entry") as string;
    }
    if (n.kind === "template") return TEMPLATES.find((t) => t.id === (dd as unknown as TemplateData).templateId)?.name ?? "Template";
    if (n.kind === "filter") {
      const ft = (dd as unknown as FilterData).filterType;
      return ft === "keywordBoost" ? "Keyword boost" : ft === "limit" ? "Limit items" : "LLM tailor";
    }
    return "Resume output";
  }
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{children}</div>;
}

function Seg({
  options,
  value,
  onChange,
  suffix = "",
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div className="mt-1.5 flex overflow-hidden rounded-md border border-edge2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={
            "flex-1 px-2 py-1.5 text-xs font-medium transition-colors " +
            (o === value ? "bg-zinc-100 text-zinc-900" : "bg-panel2 text-zinc-400 hover:text-zinc-200")
          }
        >
          {o}
          {suffix}
        </button>
      ))}
    </div>
  );
}

function FieldsEditor({
  fields,
  values,
  onChange,
}: {
  fields: { key: string; label: string; placeholder?: string; multiline?: boolean }[];
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.key}>
          <Label>{f.label}</Label>
          <div className="mt-1.5">
            {f.multiline ? (
              <Textarea
                value={values[f.key] ?? ""}
                onChange={(v) => onChange({ ...values, [f.key]: v })}
                placeholder={f.placeholder}
              />
            ) : (
              <Input
                value={values[f.key] ?? ""}
                onChange={(v) => onChange({ ...values, [f.key]: v })}
                placeholder={f.placeholder}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionEditor({ node }: { node: VNode }) {
  const updateNodeData = useStudio((s) => s.updateNodeData);
  const doc = useStudio((s) => s.doc);
  const selectNode = useStudio((s) => s.selectNode);
  const sd = node.data as SectionData;
  const connected = doc
    ? doc.draft.edges
        .filter((e) => e.target === node.id && e.targetHandle === "entries")
        .map((e) => doc.draft.nodes.find((n) => n.id === e.source))
        .filter((n): n is VNode => !!n)
    : [];

  function move(id: string, dir: -1 | 1) {
    const order = orderedIds();
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    updateNodeData(node.id, { entryOrder: next } as Partial<SectionData>);
  }

  function orderedIds(): string[] {
    const ids = connected.map((n) => n.id);
    const head = sd.entryOrder.filter((id) => ids.includes(id));
    const rest = ids.filter((id) => !head.includes(id));
    return [...head, ...rest];
  }

  const ordered = orderedIds()
    .map((id) => connected.find((n) => n.id === id))
    .filter((n): n is VNode => !!n);

  return (
    <div className="space-y-4">
      <div>
        <Label>Section type</Label>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {SECTION_TYPES.map((st) => (
            <button
              key={st}
              onClick={() =>
                updateNodeData(node.id, { sectionType: st, title: sd.title || SECTION_LABELS[st] } as Partial<SectionData>)
              }
              className={
                "rounded-md border px-2 py-1 text-[11px] transition-colors " +
                (sd.sectionType === st
                  ? "border-zinc-300 bg-panel2 text-zinc-100"
                  : "border-edge2 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300")
              }
            >
              {SECTION_LABELS[st]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Displayed title</Label>
        <div className="mt-1.5">
          <Input value={sd.title} onChange={(v) => updateNodeData(node.id, { title: v } as Partial<SectionData>)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Max items</Label>
          <div className="mt-1.5">
            <Input
              value={sd.maxItems?.toString() ?? ""}
              onChange={(v) =>
                updateNodeData(node.id, { maxItems: v ? Math.max(1, parseInt(v) || 1) : null } as Partial<SectionData>)
              }
              placeholder="no limit"
            />
          </div>
        </div>
        <div>
          <Label>Spacing</Label>
          <Seg
            options={["roomy", "compact"]}
            value={sd.compact ? "compact" : "roomy"}
            onChange={(v) => updateNodeData(node.id, { compact: v === "compact" } as Partial<SectionData>)}
          />
        </div>
      </div>
      <div>
        <Label>Entries · order</Label>
        {ordered.length === 0 ? (
          <p className="mt-1.5 text-[11px] text-zinc-600">Nothing connected yet. Use the button below or wire entries in.</p>
        ) : (
          <div className="mt-1.5 space-y-1">
            {ordered.map((n, i) => {
              const ed = n.data as EntryData;
              const f = ed.fields;
              const isFilter = n.kind === "filter";
              return (
                <div
                  key={n.id}
                  className="flex items-center gap-1.5 rounded-md border border-edge2 bg-panel2 px-2 py-1.5"
                >
                  <div className="flex flex-col">
                    <button
                      className="text-zinc-600 hover:text-zinc-200 disabled:opacity-30"
                      disabled={i === 0}
                      onClick={() => move(n.id, -1)}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 15l-6-6-6 6" /></svg>
                    </button>
                    <button
                      className="text-zinc-600 hover:text-zinc-200 disabled:opacity-30"
                      disabled={i === ordered.length - 1}
                      onClick={() => move(n.id, 1)}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                  </div>
                  <button
                    className="min-w-0 flex-1 truncate text-left text-[11px] text-zinc-300 hover:text-zinc-100"
                    onClick={() => selectNode(n.id)}
                  >
                    {isFilter ? "filter: " + (n.data as FilterData).filterType : f.title || f.name || f.degree || f.category || "entry"}
                  </button>
                  {!n.enabled && <Badge tone="amber">off</Badge>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickEntryAdder({ sectionId, sectionType, onAdd }: { sectionId: string; sectionType: SectionData["sectionType"]; onAdd: (n: VNode) => void }) {
  const doc = useStudio((s) => s.doc);
  const sec = doc?.draft.nodes.find((n) => n.id === sectionId);
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-center"
      onClick={() => {
        const base = sec?.position ?? { x: 0, y: 0 };
        onAdd({
          id: newId(),
          kind: "entry",
          position: { x: base.x - 340, y: base.y + Math.random() * 80 - 40 },
          enabled: true,
          data: { entryType: sectionType, fields: {}, bullets: [] },
        });
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Add {SECTION_LABELS[sectionType].toLowerCase()} entry
    </Button>
  );
}

function EntryEditor({ node }: { node: VNode }) {
  const updateNodeData = useStudio((s) => s.updateNodeData);
  const ed = node.data as EntryData;
  const fields = ENTRY_FIELDS[ed.entryType] ?? [];
  const [newBullet, setNewBullet] = React.useState("");

  function setField(key: string, value: string) {
    updateNodeData(node.id, { fields: { ...ed.fields, [key]: value } } as Partial<EntryData>);
  }

  function setBullets(bullets: string[]) {
    updateNodeData(node.id, { bullets } as Partial<EntryData>);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Type</Label>
        <div className="mt-1.5">
          <Badge>{SECTION_LABELS[ed.entryType]}</Badge>
        </div>
      </div>
      {fields.map((f) => (
        <div key={f.key}>
          <Label>{f.label}</Label>
          <div className="mt-1.5">
            {f.multiline ? (
              <Textarea value={ed.fields[f.key] ?? ""} onChange={(v) => setField(f.key, v)} placeholder={f.placeholder} rows={4} />
            ) : (
              <Input value={ed.fields[f.key] ?? ""} onChange={(v) => setField(f.key, v)} placeholder={f.placeholder} />
            )}
          </div>
        </div>
      ))}
      {ed.entryType !== "summary" && (
        <div>
          <Label>{BULLETS_LABEL[ed.entryType] ?? "Bullets"}</Label>
          <div className="mt-1.5 space-y-1.5">
            {ed.bullets.map((b, i) => (
              <div key={i} className="group flex items-start gap-1.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                <Textarea value={b} onChange={(v) => setBullets(ed.bullets.map((x, j) => (j === i ? v : x)))} rows={2} className="text-xs" />
                <div className="flex shrink-0 flex-col opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    className="p-0.5 text-zinc-600 hover:text-zinc-200 disabled:opacity-30"
                    disabled={i === 0}
                    onClick={() => {
                      const next = [...ed.bullets];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      setBullets(next);
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 15l-6-6-6 6" /></svg>
                  </button>
                  <button className="p-0.5 text-zinc-600 hover:text-red-400" onClick={() => setBullets(ed.bullets.filter((_, j) => j !== i))}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-1.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-700" />
              <Input
                value={newBullet}
                onChange={setNewBullet}
                placeholder="Add a bullet and press Enter"
                className="text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newBullet.trim()) {
                    setBullets([...ed.bullets, newBullet.trim()]);
                    setNewBullet("");
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
      {ed.entryType === "summary" && (
        <div>
          <Label>Or body lines</Label>
          <div className="mt-1.5">
            <Textarea
              value={ed.bullets.join("\n")}
              onChange={(v) => updateNodeData(node.id, { bullets: v.split("\n") } as Partial<EntryData>)}
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FilterEditor({ node }: { node: VNode }) {
  const updateNodeData = useStudio((s) => s.updateNodeData);
  const fd = node.data as FilterData;
  const [kw, setKw] = React.useState("");

  return (
    <div className="space-y-4">
      <div>
        <Label>Filter type</Label>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {(
            [
              { id: "keywordBoost", name: "Keyword boost", desc: "Reorder entries by relevance to keywords; optionally bold matches" },
              { id: "limit", name: "Limit items", desc: "Keep only the first N entries passing through" },
              { id: "llmTailor", name: "LLM tailor", desc: "Rewrite bullets against a job description (lands with LLM integration)" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => updateNodeData(node.id, { filterType: t.id } as Partial<FilterData>)}
              className={
                "rounded-lg border p-2.5 text-left transition-colors " +
                (fd.filterType === t.id ? "border-zinc-300 bg-panel2" : "border-edge2 hover:border-zinc-500")
              }
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-100">
                {t.name}
                {t.id === "llmTailor" && <Badge tone="amber">soon</Badge>}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-500">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {fd.filterType === "keywordBoost" && (
        <>
          <div>
            <Label>Keywords</Label>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {fd.keywords.filter(Boolean).map((k, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full border border-edge2 bg-panel2 px-2 py-0.5 text-[11px] text-zinc-300">
                  {k}
                  <button
                    className="text-zinc-600 hover:text-red-400"
                    onClick={() => updateNodeData(node.id, { keywords: fd.keywords.filter((_, j) => j !== i) } as Partial<FilterData>)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-1.5">
              <Input
                value={kw}
                onChange={setKw}
                placeholder="e.g. kubernetes, typescript — Enter to add"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && kw.trim()) {
                    updateNodeData(node.id, { keywords: [...fd.keywords, kw.trim()] } as Partial<FilterData>);
                    setKw("");
                  }
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-edge2 bg-panel2 px-2.5 py-2">
            <span className="text-xs text-zinc-400">Bold matched keywords</span>
            <Toggle on={fd.boldMatches} onChange={(v) => updateNodeData(node.id, { boldMatches: v } as Partial<FilterData>)} />
          </div>
        </>
      )}

      {fd.filterType === "limit" && (
        <div>
          <Label>Keep first</Label>
          <div className="mt-1.5">
            <Input
              value={fd.limit?.toString() ?? ""}
              onChange={(v) => updateNodeData(node.id, { limit: v ? Math.max(1, parseInt(v) || 1) : null } as Partial<FilterData>)}
              placeholder="3"
            />
          </div>
        </div>
      )}

      {fd.filterType === "llmTailor" && (
        <div className="space-y-3">
          <div>
            <Label>Job description / instruction</Label>
            <div className="mt-1.5">
              <Textarea
                value={fd.prompt}
                onChange={(v) => updateNodeData(node.id, { prompt: v } as Partial<FilterData>)}
                rows={6}
                placeholder="Paste the job description here. When LLM integration ships, this node will rewrite and rank content against it."
              />
            </div>
          </div>
          <div className="rounded-md border border-dashed border-edge2 p-2.5 text-[11px] leading-relaxed text-zinc-500">
            Stored with the graph today, executed by an LLM provider later. The node currently passes content through
            unchanged, and the stored prompt becomes part of every version snapshot.
          </div>
        </div>
      )}
    </div>
  );
}

function OutputEditor({ node }: { node: VNode }) {
  const updateNodeData = useStudio((s) => s.updateNodeData);
  const doc = useStudio((s) => s.doc);
  const selectNode = useStudio((s) => s.selectNode);
  const od = node.data as OutputData;

  const connected = doc
    ? doc.draft.edges
        .filter((e) => e.target === node.id && e.targetHandle === "sections")
        .map((e) => doc.draft.nodes.find((n) => n.id === e.source))
        .filter((n): n is VNode => !!n && n.kind === "section")
    : [];

  function orderedIds(): string[] {
    const ids = connected.map((n) => n.id);
    const head = od.sectionOrder.filter((id) => ids.includes(id));
    const rest = ids.filter((id) => !head.includes(id));
    return [...head, ...rest];
  }

  function move(id: string, dir: -1 | 1) {
    const order = orderedIds();
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    updateNodeData(node.id, { sectionOrder: next } as Partial<OutputData>);
  }

  const ordered = orderedIds()
    .map((id) => connected.find((n) => n.id === id))
    .filter((n): n is VNode => !!n);

  return (
    <div className="space-y-4">
      <div>
        <Label>Paper size</Label>
        <Seg
          options={["letter", "a4"]}
          value={od.paper}
          onChange={(v) => updateNodeData(node.id, { paper: v as "letter" | "a4" } as Partial<OutputData>)}
        />
      </div>
      <div>
        <Label>Section order in document</Label>
        {ordered.length === 0 ? (
          <p className="mt-1.5 text-[11px] text-zinc-600">No sections wired in yet.</p>
        ) : (
          <div className="mt-1.5 space-y-1">
            {ordered.map((n, i) => (
              <div key={n.id} className="flex items-center gap-1.5 rounded-md border border-edge2 bg-panel2 px-2 py-1.5">
                <span className="w-4 text-center text-[10px] text-zinc-600">{i + 1}</span>
                <div className="flex flex-col">
                  <button className="text-zinc-600 hover:text-zinc-200 disabled:opacity-30" disabled={i === 0} onClick={() => move(n.id, -1)}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 15l-6-6-6 6" /></svg>
                  </button>
                  <button className="text-zinc-600 hover:text-zinc-200 disabled:opacity-30" disabled={i === ordered.length - 1} onClick={() => move(n.id, 1)}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                </div>
                <button className="min-w-0 flex-1 truncate text-left text-[11px] text-zinc-300 hover:text-zinc-100" onClick={() => selectNode(n.id)}>
                  {(n.data as SectionData).title}
                </button>
                {!n.enabled && <Badge tone="amber">off</Badge>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-md border border-dashed border-edge2 p-2.5 text-[11px] leading-relaxed text-zinc-500">
        Everything reachable from this node becomes the document. Disconnect or disable anything a role does not need —
        no content is ever lost, it stays in the graph and in version history.
      </div>
    </div>
  );
}
