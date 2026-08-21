"use client";

import { create } from "zustand";
import { Branch, GraphState, ResumeDoc, ResumeMeta, VEdge, VNode, Version } from "./types";
import { getStorageProvider, StorageProvider } from "./storage/provider";
import { seedDoc } from "./graph/seed";
import { newId } from "./ids";

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

interface StudioState {
  ready: boolean;
  resumes: ResumeMeta[];
  doc: ResumeDoc | null;
  selectedNodeId: string | null;
  lastCompile: { log: string; ok: boolean; at: number } | null;
  provider: StorageProvider;
  setLastCompile(v: { log: string; ok: boolean } | null): void;
  init(): Promise<void>;
  refreshIndex(): Promise<void>;
  createResume(name: string): Promise<string>;
  importResume(json: string): Promise<string>;
  deleteResume(id: string): Promise<void>;
  openResume(id: string): Promise<boolean>;
  closeResume(): void;
  persist(): Promise<void>;
  renameResume(name: string): void;
  setNodes(nodes: VNode[]): void;
  setEdges(edges: VEdge[]): void;
  updateNode(id: string, patch: Partial<VNode>): void;
  updateNodeData(id: string, data: Partial<VNode["data"]>): void;
  addNode(node: VNode, connect?: { target: string; targetHandle: string }): void;
  removeNode(id: string): void;
  addEdge(edge: VEdge): void;
  setLatexOverride(source: string | null): void;
  selectNode(id: string | null): void;
  currentBranch(): Branch | null;
  headVersion(): Version | null;
  isDirty(): boolean;
  switchBranch(branchId: string): void;
  commit(message: string): void;
  checkout(versionId: string): void;
  branchFrom(versionId: string, name: string): void;
  renameBranch(branchId: string, name: string): void;
  deleteBranch(branchId: string): void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useStudio = create<StudioState>((set, get) => ({
  ready: false,
  resumes: [],
  doc: null,
  selectedNodeId: null,
  lastCompile: null,
  provider: getStorageProvider(),

  setLastCompile(v) {
    set({ lastCompile: v ? { ...v, at: Date.now() } : null });
  },

  async init() {
    if (get().ready) return;
    await get().refreshIndex();
    set({ ready: true });
  },

  async refreshIndex() {
    const resumes = await get().provider.listResumes();
    set({ resumes });
  },

  async createResume(name: string) {
    const doc = seedDoc(name || "Untitled Resume");
    await get().provider.saveResume(doc);
    await get().refreshIndex();
    return doc.id;
  },

  async importResume(json: string) {
    const doc = JSON.parse(json) as ResumeDoc;
    doc.id = newId();
    doc.updatedAt = Date.now();
    await get().provider.saveResume(doc);
    await get().refreshIndex();
    return doc.id;
  },

  async deleteResume(id: string) {
    await get().provider.deleteResume(id);
    if (get().doc?.id === id) set({ doc: null });
    await get().refreshIndex();
  },

  async openResume(id: string) {
    const doc = await get().provider.loadResume(id);
    if (!doc) return false;
    set({ doc, selectedNodeId: null });
    return true;
  },

  closeResume() {
    set({ doc: null, selectedNodeId: null });
  },

  async persist() {
    const doc = get().doc;
    if (!doc) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const d = get().doc;
      if (!d) return;
      await get().provider.saveResume(d);
      get().refreshIndex();
    }, 400);
  },

  renameResume(name: string) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, name } });
    get().persist();
  },

  setNodes(nodes: VNode[]) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, draft: { ...doc.draft, nodes } } });
    get().persist();
  },

  setEdges(edges: VEdge[]) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, draft: { ...doc.draft, edges } } });
    get().persist();
  },

  updateNode(id: string, patch: Partial<VNode>) {
    const doc = get().doc;
    if (!doc) return;
    const nodes = doc.draft.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
    set({ doc: { ...doc, draft: { ...doc.draft, nodes } } });
    get().persist();
  },

  updateNodeData(id: string, data: Partial<VNode["data"]>) {
    const doc = get().doc;
    if (!doc) return;
    const nodes = doc.draft.nodes.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, ...data } as VNode["data"] } : n
    );
    set({ doc: { ...doc, draft: { ...doc.draft, nodes } } });
    get().persist();
  },

  addNode(node: VNode, connect?: { target: string; targetHandle: string }) {
    const doc = get().doc;
    if (!doc) return;
    const nodes = [...doc.draft.nodes, node];
    let edges = doc.draft.edges;
    if (connect) {
      edges = [
        ...edges,
        { id: newId(), source: node.id, sourceHandle: node.kind, target: connect.target, targetHandle: connect.targetHandle },
      ];
    }
    set({ doc: { ...doc, draft: { ...doc.draft, nodes, edges } }, selectedNodeId: node.id });
    get().persist();
  },

  removeNode(id: string) {
    const doc = get().doc;
    if (!doc) return;
    const nodes = doc.draft.nodes.filter((n) => n.id !== id);
    const edges = doc.draft.edges.filter((e) => e.source !== id && e.target !== id);
    set({
      doc: { ...doc, draft: { ...doc.draft, nodes, edges } },
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
    get().persist();
  },

  addEdge(edge: VEdge) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, draft: { ...doc.draft, edges: [...doc.draft.edges, edge] } } });
    get().persist();
  },

  setLatexOverride(source: string | null) {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, draft: { ...doc.draft, latexOverride: source } } });
    get().persist();
  },

  selectNode(id: string | null) {
    set({ selectedNodeId: id });
  },

  currentBranch() {
    const doc = get().doc;
    if (!doc) return null;
    return doc.branches[doc.draftBranchId] ?? null;
  },

  headVersion() {
    const doc = get().doc;
    const branch = get().currentBranch();
    if (!doc || !branch?.headVersionId) return null;
    return doc.versions[branch.headVersionId] ?? null;
  },

  isDirty() {
    const doc = get().doc;
    const head = get().headVersion();
    if (!doc) return false;
    if (!head) return true;
    return JSON.stringify(head.state) !== JSON.stringify(doc.draft);
  },

  switchBranch(branchId: string) {
    const doc = get().doc;
    if (!doc || !doc.branches[branchId]) return;
    const headId = doc.branches[branchId].headVersionId;
    const head = headId ? doc.versions[headId] : null;
    const draft = head ? clone(head.state) : doc.draft;
    set({ doc: { ...doc, draftBranchId: branchId, draft }, selectedNodeId: null });
    get().persist();
  },

  commit(message: string) {
    const doc = get().doc;
    if (!doc) return;
    const branch = doc.branches[doc.draftBranchId];
    if (!branch) return;
    const id = newId();
    const version: Version = {
      id,
      branchId: branch.id,
      parents: branch.headVersionId ? [branch.headVersionId] : [],
      message: message || "Update",
      createdAt: Date.now(),
      state: clone(doc.draft),
    };
    set({
      doc: {
        ...doc,
        versions: { ...doc.versions, [id]: version },
        branches: { ...doc.branches, [branch.id]: { ...branch, headVersionId: id } },
      },
    });
    get().persist();
  },

  checkout(versionId: string) {
    const doc = get().doc;
    if (!doc || !doc.versions[versionId]) return;
    const v = doc.versions[versionId];
    set({
      doc: { ...doc, draft: clone(v.state), draftBranchId: v.branchId },
      selectedNodeId: null,
    });
    get().persist();
  },

  branchFrom(versionId: string, name: string) {
    const doc = get().doc;
    if (!doc || !doc.versions[versionId]) return;
    const id = newId();
    const branch: Branch = { id, name: name || "branch", headVersionId: versionId, createdAt: Date.now() };
    set({
      doc: { ...doc, branches: { ...doc.branches, [id]: branch }, draftBranchId: id, draft: clone(doc.versions[versionId].state) },
      selectedNodeId: null,
    });
    get().persist();
  },

  renameBranch(branchId: string, name: string) {
    const doc = get().doc;
    if (!doc || !doc.branches[branchId]) return;
    set({ doc: { ...doc, branches: { ...doc.branches, [branchId]: { ...doc.branches[branchId], name } } } });
    get().persist();
  },

  deleteBranch(branchId: string) {
    const doc = get().doc;
    if (!doc || !doc.branches[branchId] || branchId === doc.defaultBranchId) return;
    const branches = { ...doc.branches };
    delete branches[branchId];
    const next: ResumeDoc = { ...doc, branches };
    if (doc.draftBranchId === branchId) {
      next.draftBranchId = doc.defaultBranchId;
      const headId = branches[doc.defaultBranchId]?.headVersionId;
      if (headId && doc.versions[headId]) next.draft = clone(doc.versions[headId].state);
    }
    set({ doc: next });
    get().persist();
  },
}));

export function draftGraph(state: { doc: ResumeDoc | null }): GraphState | null {
  return state.doc?.draft ?? null;
}
