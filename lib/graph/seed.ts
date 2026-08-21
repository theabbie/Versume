import { GraphState, ResumeDoc, VEdge, VNode } from "../types";
import { newId } from "../ids";

function edge(source: string, sourceHandle: string, target: string, targetHandle: string): VEdge {
  return { id: newId(), source, sourceHandle, target, targetHandle };
}

export function seedGraph(): GraphState {
  const identity: VNode = {
    id: newId(),
    kind: "identity",
    position: { x: -420, y: -40 },
    enabled: true,
    data: {
      fields: {
        name: "Alex Rivera",
        headline: "Full-Stack Engineer",
        email: "alex.rivera@example.com",
        phone: "+1 415 555 0132",
        location: "San Francisco, CA",
        website: "alexrivera.dev",
        github: "github.com/arivera",
        linkedin: "linkedin.com/in/arivera",
      },
    },
  };
  const output: VNode = {
    id: newId(),
    kind: "output",
    position: { x: 560, y: 120 },
    enabled: true,
    data: { sectionOrder: [], paper: "letter" },
  };
  const template: VNode = {
    id: newId(),
    kind: "template",
    position: { x: -420, y: 320 },
    enabled: true,
    data: { templateId: "onyx", fontSize: "10", density: "tight" },
  };
  const expSection: VNode = {
    id: newId(),
    kind: "section",
    position: { x: 160, y: -60 },
    enabled: true,
    data: { sectionType: "experience", title: "Experience", maxItems: null, entryOrder: [], showDates: true, compact: false },
  };
  const eduSection: VNode = {
    id: newId(),
    kind: "section",
    position: { x: 160, y: 200 },
    enabled: true,
    data: { sectionType: "education", title: "Education", maxItems: null, entryOrder: [], showDates: true, compact: false },
  };
  const skillsSection: VNode = {
    id: newId(),
    kind: "section",
    position: { x: 160, y: 420 },
    enabled: true,
    data: { sectionType: "skills", title: "Skills", maxItems: null, entryOrder: [], showDates: false, compact: true },
  };
  const job1: VNode = {
    id: newId(),
    kind: "entry",
    position: { x: -180, y: -140 },
    enabled: true,
    data: {
      entryType: "experience",
      fields: { title: "Senior Software Engineer", org: "Nimbus Systems", location: "San Francisco, CA", start: "Jan 2023", end: "Present" },
      bullets: [
        "Led migration of a monolith to event-driven microservices, cutting p95 latency by 42%",
        "Designed a React Flow based internal workflow builder used by 3 product teams",
        "Mentored 5 engineers and drove adoption of typed API contracts across services",
      ],
    },
  };
  const job2: VNode = {
    id: newId(),
    kind: "entry",
    position: { x: -180, y: 40 },
    enabled: true,
    data: {
      entryType: "experience",
      fields: { title: "Software Engineer", org: "Brightleaf Labs", location: "Remote", start: "Jun 2020", end: "Dec 2022" },
      bullets: [
        "Built a real-time collaboration layer with CRDTs serving 40k concurrent sessions",
        "Shipped CI pipeline improvements that cut deploy time from 25 to 6 minutes",
      ],
    },
  };
  const degree: VNode = {
    id: newId(),
    kind: "entry",
    position: { x: -180, y: 220 },
    enabled: true,
    data: {
      entryType: "education",
      fields: { degree: "B.S. Computer Science", org: "UC Berkeley", location: "Berkeley, CA", start: "2016", end: "2020", note: "" },
      bullets: ["Teaching assistant for CS 61B (Data Structures)"],
    },
  };
  const skills: VNode = {
    id: newId(),
    kind: "entry",
    position: { x: -180, y: 420 },
    enabled: true,
    data: {
      entryType: "skills",
      fields: { category: "Core" },
      bullets: ["TypeScript", "React", "Node.js", "Go", "PostgreSQL", "Kubernetes", "WASM"],
    },
  };
  const nodes = [identity, template, job1, job2, degree, skills, expSection, eduSection, skillsSection, output];
  const edges = [
    edge(identity.id, "identity", output.id, "identity"),
    edge(template.id, "template", output.id, "template"),
    edge(job1.id, "entry", expSection.id, "entries"),
    edge(job2.id, "entry", expSection.id, "entries"),
    edge(degree.id, "entry", eduSection.id, "entries"),
    edge(skills.id, "entry", skillsSection.id, "entries"),
    edge(expSection.id, "section", output.id, "sections"),
    edge(eduSection.id, "section", output.id, "sections"),
    edge(skillsSection.id, "section", output.id, "sections"),
  ];
  (output.data as { sectionOrder: string[] }).sectionOrder = [expSection.id, eduSection.id, skillsSection.id];
  (expSection.data as { entryOrder: string[] }).entryOrder = [job1.id, job2.id];
  return { nodes, edges, latexOverride: null };
}

export function seedDoc(name: string): ResumeDoc {
  const now = Date.now();
  const branchId = newId();
  const draft = seedGraph();
  const versionId = newId();
  return {
    id: newId(),
    schemaVersion: 1,
    name,
    createdAt: now,
    updatedAt: now,
    branches: { [branchId]: { id: branchId, name: "main", headVersionId: versionId, createdAt: now } },
    versions: {
      [versionId]: {
        id: versionId,
        branchId,
        parents: [],
        message: "Initial resume",
        createdAt: now,
        state: JSON.parse(JSON.stringify(draft)),
      },
    },
    defaultBranchId: branchId,
    draft,
    draftBranchId: branchId,
  };
}
