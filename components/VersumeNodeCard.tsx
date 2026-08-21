"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { VNode, EntryData, SectionData, IdentityData, TemplateData, FilterData, OutputData } from "@/lib/types";
import { KIND_META, SECTION_LABELS } from "@/lib/registry";
import { useStudio } from "@/lib/store";
import { Toggle } from "./ui";

export type RFNodeData = { vnode: VNode };

function Icon({ kind }: { kind: string }) {
  const p = { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 } as const;
  switch (kind) {
    case "identity":
      return (
        <svg {...p}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      );
    case "section":
      return (
        <svg {...p}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 9h16" />
        </svg>
      );
    case "entry":
      return (
        <svg {...p}>
          <path d="M8 6h13M8 12h13M8 18h13" />
          <circle cx="4" cy="6" r="1" fill="currentColor" />
          <circle cx="4" cy="12" r="1" fill="currentColor" />
          <circle cx="4" cy="18" r="1" fill="currentColor" />
        </svg>
      );
    case "template":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      );
    case "filter":
      return (
        <svg {...p}>
          <path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" />
          <path d="M14 3v6h6" />
        </svg>
      );
  }
}

function summary(v: VNode): string {
  const d = v.data as unknown as Record<string, unknown>;
  if (v.kind === "identity") {
    const f = (d as unknown as IdentityData).fields;
    return f.name ? f.name + (f.headline ? " · " + f.headline : "") : "Unnamed";
  }
  if (v.kind === "section") {
    const sd = d as unknown as SectionData;
    return SECTION_LABELS[sd.sectionType] + " · " + sd.title;
  }
  if (v.kind === "entry") {
    const ed = d as unknown as EntryData;
    const f = ed.fields;
    const main = f.title || f.name || f.degree || f.category || f.text || "Entry";
    const sub = f.org ? " · " + f.org : "";
    const bl = ed.bullets.filter(Boolean).length;
    return (main + sub).slice(0, 44) + (bl ? " · " + bl + " ln" : "");
  }
  if (v.kind === "template") {
    const td = d as unknown as TemplateData;
    return td.templateId + " · " + td.fontSize + "pt · " + td.density;
  }
  if (v.kind === "filter") {
    const fd = d as unknown as FilterData;
    if (fd.filterType === "keywordBoost") return "Boost: " + (fd.keywords.filter(Boolean).slice(0, 3).join(", ") || "…");
    if (fd.filterType === "limit") return "Limit: " + (fd.limit ?? "∞");
    return "LLM tailor (soon)";
  }
  const od = d as unknown as OutputData;
  return "Output · " + od.paper.toUpperCase();
}

export default function VersumeNodeCard({ data, selected }: NodeProps) {
  const { vnode } = data as unknown as RFNodeData;
  const updateNode = useStudio((s) => s.updateNode);
  const meta = KIND_META[vnode.kind];
  const dim = !vnode.enabled;

  const handles: React.ReactNode[] = [];
  if (vnode.kind === "identity")
    handles.push(<Handle key="i" type="source" position={Position.Right} id="identity" title="Connect to Resume ▸ identity" />);
  if (vnode.kind === "entry")
    handles.push(<Handle key="e" type="source" position={Position.Right} id="entry" title="Connect into a Section (or Filter)" />);
  if (vnode.kind === "section") {
    handles.push(<Handle key="in" type="target" position={Position.Left} id="entries" title="Entries plug in here" />);
    handles.push(<Handle key="out" type="source" position={Position.Right} id="section" title="Connect to Resume ▸ sections" />);
  }
  if (vnode.kind === "filter") {
    handles.push(<Handle key="in" type="target" position={Position.Left} id="in" />);
    handles.push(<Handle key="out" type="source" position={Position.Right} id="out" />);
  }
  if (vnode.kind === "template")
    handles.push(<Handle key="t" type="source" position={Position.Right} id="template" title="Connect to Resume ▸ template" />);
  if (vnode.kind === "output") {
    handles.push(
      <Handle key="id" type="target" position={Position.Left} id="identity" style={{ top: 42 }} />,
      <Handle key="sec" type="target" position={Position.Left} id="sections" style={{ top: 66 }} />,
      <Handle key="tpl" type="target" position={Position.Left} id="template" style={{ top: 90 }} />
    );
  }

  return (
    <div
      className={
        "w-[230px] rounded-lg border bg-panel shadow-lg transition-colors " +
        (selected ? "border-zinc-300 " : "border-edge2 ") +
        (dim ? "opacity-45 " : "")
      }
    >
      <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
        <span style={{ color: meta.accent }}>
          <Icon kind={vnode.kind} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{meta.label}</span>
        <span className="ml-auto" onClick={(e) => e.stopPropagation()}>
          <Toggle size="sm" on={vnode.enabled} onChange={(v) => updateNode(vnode.id, { enabled: v })} />
        </span>
      </div>
      <div className="px-3 py-2">
        <div className="truncate text-[12px] font-medium text-zinc-100">{summary(vnode)}</div>
        {vnode.kind === "output" && (
          <div className="mt-1.5 space-y-1 text-[10px] text-zinc-500">
            <div className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-500" />identity</div>
            <div className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400" />sections (order matters)</div>
            <div className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-600" />template</div>
          </div>
        )}
        {vnode.kind === "filter" && (vnode.data as FilterData).filterType === "llmTailor" && (
          <div className="mt-1 rounded border border-dashed border-edge2 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-zinc-500">
            LLM · coming soon
          </div>
        )}
      </div>
      {handles}
    </div>
  );
}
