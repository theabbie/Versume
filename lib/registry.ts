import { FieldDef, SectionType } from "./types";

export const SECTION_TYPES: SectionType[] = [
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "publications",
  "custom",
];

export const SECTION_LABELS: Record<SectionType, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
  publications: "Publications",
  custom: "Custom",
};

export const IDENTITY_FIELDS: FieldDef[] = [
  { key: "name", label: "Full name", placeholder: "Ada Lovelace" },
  { key: "headline", label: "Headline", placeholder: "Senior Software Engineer" },
  { key: "email", label: "Email", placeholder: "ada@example.com" },
  { key: "phone", label: "Phone", placeholder: "+1 555 0100" },
  { key: "location", label: "Location", placeholder: "San Francisco, CA" },
  { key: "website", label: "Website", placeholder: "https://ada.dev" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/ada" },
  { key: "github", label: "GitHub", placeholder: "github.com/ada" },
];

export const ENTRY_FIELDS: Record<SectionType, FieldDef[]> = {
  summary: [{ key: "text", label: "Text", multiline: true, placeholder: "One-paragraph professional summary" }],
  experience: [
    { key: "title", label: "Job title", placeholder: "Senior Software Engineer" },
    { key: "org", label: "Company", placeholder: "Acme Corp" },
    { key: "location", label: "Location", placeholder: "Remote" },
    { key: "start", label: "Start", placeholder: "Jan 2022" },
    { key: "end", label: "End", placeholder: "Present" },
  ],
  education: [
    { key: "degree", label: "Degree", placeholder: "B.S. Computer Science" },
    { key: "org", label: "School", placeholder: "MIT" },
    { key: "location", label: "Location", placeholder: "Cambridge, MA" },
    { key: "start", label: "Start", placeholder: "2016" },
    { key: "end", label: "End", placeholder: "2020" },
    { key: "note", label: "Note", placeholder: "GPA 3.9, Honors" },
  ],
  projects: [
    { key: "name", label: "Project name", placeholder: "Versume" },
    { key: "stack", label: "Stack / tech", placeholder: "Next.js, WASM, React Flow" },
    { key: "link", label: "Link", placeholder: "github.com/you/project" },
    { key: "start", label: "Start", placeholder: "2024" },
    { key: "end", label: "End", placeholder: "2025" },
  ],
  skills: [{ key: "category", label: "Category", placeholder: "Languages" }],
  certifications: [
    { key: "name", label: "Certification", placeholder: "AWS Solutions Architect" },
    { key: "org", label: "Issuer", placeholder: "Amazon" },
    { key: "end", label: "Date", placeholder: "2024" },
  ],
  publications: [
    { key: "title", label: "Title", placeholder: "On Versioned Resumes" },
    { key: "org", label: "Venue", placeholder: "Journal of CVs" },
    { key: "end", label: "Year", placeholder: "2025" },
    { key: "link", label: "Link", placeholder: "doi.org/..." },
  ],
  custom: [{ key: "title", label: "Title", placeholder: "Item title" }],
};

export const BULLETS_LABEL: Partial<Record<SectionType, string>> = {
  experience: "Achievements / bullets",
  projects: "Highlights",
  education: "Details",
  skills: "Skills (one per line)",
  certifications: "Details",
  publications: "Details",
  custom: "Body lines",
};

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
}

export const TEMPLATES: TemplateInfo[] = [
  { id: "onyx", name: "Onyx", description: "Compact sans-serif, dense, ATS-friendly" },
  { id: "quartz", name: "Quartz", description: "Roomy serif with ruled section titles" },
];

export const KIND_META: Record<
  string,
  { label: string; accent: string; hint: string }
> = {
  identity: { label: "Identity", accent: "#fafafa", hint: "Contact block" },
  section: { label: "Section", accent: "#a1a1aa", hint: "Groups entries" },
  entry: { label: "Entry", accent: "#71717a", hint: "One item" },
  template: { label: "Template", accent: "#8b8b94", hint: "Look & feel" },
  filter: { label: "Filter", accent: "#6e6e77", hint: "Shapes content" },
  output: { label: "Resume", accent: "#ffffff", hint: "Final document" },
};
