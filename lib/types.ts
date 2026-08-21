export type ID = string;

export type SectionType =
  | "summary"
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications"
  | "publications"
  | "custom";

export type NodeKind =
  | "identity"
  | "section"
  | "entry"
  | "template"
  | "filter"
  | "output";

export interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
}

export interface IdentityData {
  fields: Record<string, string>;
}

export interface SectionData {
  sectionType: SectionType;
  title: string;
  maxItems: number | null;
  entryOrder: string[];
  showDates: boolean;
  compact: boolean;
}

export interface EntryData {
  entryType: SectionType;
  fields: Record<string, string>;
  bullets: string[];
}

export interface TemplateData {
  templateId: string;
  fontSize: "10" | "11";
  density: "tight" | "normal";
}

export type FilterType = "keywordBoost" | "limit" | "llmTailor";

export interface FilterData {
  filterType: FilterType;
  keywords: string[];
  boldMatches: boolean;
  limit: number | null;
  prompt: string;
}

export interface OutputData {
  sectionOrder: string[];
  paper: "letter" | "a4";
}

export type NodeData =
  | IdentityData
  | SectionData
  | EntryData
  | TemplateData
  | FilterData
  | OutputData;

export interface VNode {
  id: ID;
  kind: NodeKind;
  position: { x: number; y: number };
  enabled: boolean;
  data: NodeData;
}

export interface VEdge {
  id: ID;
  source: ID;
  sourceHandle: string;
  target: ID;
  targetHandle: string;
}

export interface GraphState {
  nodes: VNode[];
  edges: VEdge[];
  latexOverride: string | null;
}

export interface Version {
  id: ID;
  branchId: ID;
  parents: ID[];
  message: string;
  createdAt: number;
  state: GraphState;
}

export interface Branch {
  id: ID;
  name: string;
  headVersionId: ID | null;
  createdAt: number;
}

export interface ResumeDoc {
  id: ID;
  schemaVersion: 1;
  name: string;
  createdAt: number;
  updatedAt: number;
  branches: Record<ID, Branch>;
  versions: Record<ID, Version>;
  defaultBranchId: ID;
  draft: GraphState;
  draftBranchId: ID;
}

export interface ResumeMeta {
  id: ID;
  name: string;
  updatedAt: number;
  createdAt: number;
  branches: number;
  versions: number;
}
