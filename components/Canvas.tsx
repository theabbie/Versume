"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Connection,
  EdgeChange,
  NodeChange,
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionLineType,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useStudio } from "@/lib/store";
import { GraphState, NodeKind, SectionType, VEdge, VNode } from "@/lib/types";
import { SECTION_LABELS, SECTION_TYPES } from "@/lib/registry";
import { newId } from "@/lib/ids";
import VersumeNodeCard from "./VersumeNodeCard";

const nodeTypes = { versume: VersumeNodeCard };

const VALID: Record<string, string[]> = {
  entry: ["section:entries", "filter:in"],
  section: ["output:sections"],
  identity: ["output:identity"],
  template: ["output:template"],
  filter: ["section:entries", "output:sections"],
};

function makeNode(kind: NodeKind, sectionType: SectionType | null, center: { x: number; y: number }): VNode {
  const id = newId();
  const jitter = () => ({ x: center.x + (Math.random() * 60 - 30), y: center.y + (Math.random() * 60 - 30) });
  if (kind === "identity") return { id, kind, position: jitter(), enabled: true, data: { fields: {} } };
  if (kind === "section")
    return {
      id,
      kind,
      position: jitter(),
      enabled: true,
      data: { sectionType: sectionType ?? "experience", title: SECTION_LABELS[sectionType ?? "experience"], maxItems: null, entryOrder: [], showDates: true, compact: false },
    };
  if (kind === "entry")
    return { id, kind, position: jitter(), enabled: true, data: { entryType: sectionType ?? "experience", fields: {}, bullets: [] } };
  if (kind === "template")
    return { id, kind, position: jitter(), enabled: true, data: { templateId: "onyx", fontSize: "10", density: "tight" } };
  if (kind === "filter")
    return { id, kind, position: jitter(), enabled: true, data: { filterType: "keywordBoost", keywords: [], boldMatches: true, limit: 3, prompt: "" } };
  return { id, kind: "output", position: jitter(), enabled: true, data: { sectionOrder: [], paper: "letter" } };
}

export default function Canvas({ graph }: { graph: GraphState }) {
  const { setNodes, setEdges, addEdge, removeNode, selectNode, selectedNodeId, addNode } = useStudio();
  const rfRef = useRef<HTMLDivElement>(null);

  const [rfNodes, setRfNodes] = useState<Node[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);

  useEffect(() => {
    setRfNodes((prev) => {
      const prevById = new Map(prev.map((p) => [p.id, p]));
      return graph.nodes.map((n) => {
        const old = prevById.get(n.id);
        return {
          id: n.id,
          type: "versume",
          position: n.position,
          selected: n.id === selectedNodeId,
          data: { vnode: n },
          measured: old?.measured,
          width: old?.width,
          height: old?.height,
        } as Node;
      });
    });
  }, [graph.nodes, selectedNodeId]);

  useEffect(() => {
    setRfEdges(
      graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        targetHandle: e.targetHandle,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#71717a" },
      }))
    );
  }, [graph.edges]);

  const kindOf = useCallback(
    (id: string): NodeKind | null => graph.nodes.find((n) => n.id === id)?.kind ?? null,
    [graph.nodes]
  );

  const isValid = useCallback(
    (c: Connection | Edge): boolean => {
      if (!c.source || !c.target || c.source === c.target) return false;
      const sk = kindOf(c.source);
      const tk = kindOf(c.target);
      if (!sk || !tk) return false;
      return (VALID[sk] ?? []).includes(tk + ":" + c.targetHandle);
    },
    [kindOf]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setRfNodes((prev) => applyNodeChanges(changes, prev));
      for (const c of changes) {
        if (c.type === "remove") removeNode(c.id);
        else if (c.type === "select") selectNode(c.selected ? c.id : null);
        else if (c.type === "position" && !c.dragging && c.position) {
          const g = useStudio.getState().doc?.draft.nodes.find((n) => n.id === c.id);
          if (g && (g.position.x !== c.position.x || g.position.y !== c.position.y)) {
            useStudio.getState().updateNode(c.id, { position: { x: c.position.x, y: c.position.y } });
          }
        }
      }
    },
    [removeNode, selectNode]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setRfEdges((prev) => applyEdgeChanges(changes, prev));
      const removed = changes.filter((c) => c.type === "remove").map((c) => c.id);
      if (removed.length) {
        setEdges(useStudio.getState().doc?.draft.edges.filter((e) => !removed.includes(e.id)) ?? []);
      }
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (!isValid(c) || !c.source || !c.target) return;
      const exists = graph.edges.some(
        (e) => e.target === c.target && e.targetHandle === c.targetHandle && e.source === c.source
      );
      if (exists) return;
      if (c.targetHandle === "identity" || c.targetHandle === "template") {
        const dup = graph.edges.some((e) => e.target === c.target && e.targetHandle === c.targetHandle);
        if (dup) setEdges(graph.edges.filter((e) => !(e.target === c.target && e.targetHandle === c.targetHandle)));
      }
      addEdge({
        id: newId(),
        source: c.source,
        sourceHandle: c.sourceHandle ?? "",
        target: c.target,
        targetHandle: c.targetHandle ?? "",
      });
    },
    [addEdge, graph.edges, isValid, setEdges]
  );

  function canvasCenter(): { x: number; y: number } {
    const el = rfRef.current;
    if (!el) return { x: 0, y: 0 };
    const bounds = el.getBoundingClientRect();
    const pane = el.querySelector(".react-flow__viewport");
    let tx = 0,
      ty = 0,
      zoom = 1;
    if (pane) {
      const m = /translate\((-?\d+\.?\d*)px,\s*(-?\d+\.?\d*)px\)\s*scale\((\d+\.?\d*)\)/.exec(
        (pane as HTMLElement).style.transform
      );
      if (m) {
        tx = parseFloat(m[1]);
        ty = parseFloat(m[2]);
        zoom = parseFloat(m[3]);
      }
    }
    return { x: (bounds.width / 2 - tx) / zoom, y: (bounds.height / 2 - ty) / zoom };
  }

  function add(kind: NodeKind, sectionType: SectionType | null = null) {
    addNode(makeNode(kind, sectionType, canvasCenter()));
  }

  return (
    <div ref={rfRef} className="relative h-full w-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValid}
        connectionLineType={ConnectionLineType.Bezier}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={1.6}
        deleteKeyCode={["Backspace", "Delete"]}
        onPaneClick={() => selectNode(null)}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#262626" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap position="bottom-right" pannable zoomable className="!bg-panel" nodeColor="#3f3f46" maskColor="rgba(10,10,10,0.7)" />
      </ReactFlow>

      <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-full border border-edge2 bg-panel/90 px-1.5 py-1 shadow-xl backdrop-blur">
          <button onClick={() => add("identity")} className="rounded-full px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100">
            Identity
          </button>
          <PaletteSplit label="Section" onPick={(st) => add("section", st)} />
          <PaletteSplit label="Entry" onPick={(st) => add("entry", st)} />
          <button onClick={() => add("filter")} className="rounded-full px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100">
            Filter
          </button>
          <button onClick={() => add("template")} className="rounded-full px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100">
            Template
          </button>
        </div>
      </div>

      {graph.nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="max-w-sm rounded-xl border border-dashed border-edge2 bg-panel/80 p-6 text-center">
            <p className="text-sm text-zinc-400">This version is empty.</p>
            <p className="mt-1 text-xs text-zinc-600">
              Add nodes from the toolbar above. Wire entries into sections, sections into the Resume node, and the flow
              decides the document.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PaletteSplit({ label, onPick }: { label: string; onPick: (st: SectionType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
      >
        {label}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-full z-30 mt-1 w-40 -translate-x-1/2 rounded-lg border border-edge2 bg-panel p-1 shadow-2xl">
            {SECTION_TYPES.map((st) => (
              <button
                key={st}
                onClick={() => {
                  onPick(st);
                  setOpen(false);
                }}
                className="w-full rounded-md px-2 py-1.5 text-left text-[11px] text-zinc-300 hover:bg-zinc-800"
              >
                {SECTION_LABELS[st]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
