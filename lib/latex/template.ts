export function escapeLatex(input: string): string {
  return input
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&#%$_])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

export function escapeUrl(input: string): string {
  return input.replace(/([#%])/g, "\\$1");
}

export function normalizeUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  return "https://" + u;
}

export interface TemplateOpts {
  paper: "letter" | "a4";
  fontSize: "10" | "11";
  density: "tight" | "normal";
}

export function preambleOnyx(o: TemplateOpts): string {
  const sep = o.density === "tight" ? "1.5pt" : "3pt";
  const margin = o.density === "tight" ? "0.55in" : "0.7in";
  return [
    "\\documentclass[" + (o.paper === "a4" ? "a4paper" : "letterpaper") + "," + o.fontSize + "pt]{article}",
    "\\usepackage[" + (o.paper === "a4" ? "a4paper" : "letterpaper") + ",margin=" + margin + "]{geometry}",
    "\\usepackage{lmodern}",
    "\\usepackage[T1]{fontenc}",
    "\\usepackage[utf8]{inputenc}",
    "\\renewcommand{\\familydefault}{\\sfdefault}",
    "\\usepackage[hidelinks]{hyperref}",
    "\\usepackage{enumitem}",
    "\\usepackage{titlesec}",
    "\\pagestyle{empty}",
    "\\setlength{\\parindent}{0pt}",
    "\\titleformat{\\section}{\\large\\bfseries\\scshape}{}{0pt}{}[\\vspace{-2pt}\\rule{\\textwidth}{0.6pt}]",
    "\\titlespacing*{\\section}{0pt}{8pt}{5pt}",
    "\\setlist[itemize]{leftmargin=1.4em,itemsep=" + sep + ",topsep=" + sep + ",parsep=0pt,label=\\textbullet}",
    "\\newcommand{\\entry}[4]{\\textbf{#1} \\hfill #2 \\\\ #3 \\hfill \\textit{#4}}",
    "\\begin{document}",
  ].join("\n");
}

export function preambleQuartz(o: TemplateOpts): string {
  const sep = o.density === "tight" ? "1.5pt" : "3.5pt";
  const margin = o.density === "tight" ? "0.65in" : "0.85in";
  return [
    "\\documentclass[" + (o.paper === "a4" ? "a4paper" : "letterpaper") + "," + o.fontSize + "pt]{article}",
    "\\usepackage[" + (o.paper === "a4" ? "a4paper" : "letterpaper") + ",margin=" + margin + "]{geometry}",
    "\\usepackage{lmodern}",
    "\\usepackage[T1]{fontenc}",
    "\\usepackage[utf8]{inputenc}",
    "\\usepackage[hidelinks]{hyperref}",
    "\\usepackage{enumitem}",
    "\\usepackage{titlesec}",
    "\\pagestyle{empty}",
    "\\setlength{\\parindent}{0pt}",
    "\\titleformat{\\section}{\\large\\scshape}{}{0pt}{}[\\vspace{-3pt}\\rule{\\textwidth}{0.4pt}]",
    "\\titlespacing*{\\section}{0pt}{10pt}{6pt}",
    "\\setlist[itemize]{leftmargin=1.5em,itemsep=" + sep + ",topsep=" + sep + ",parsep=0pt,label=--}",
    "\\newcommand{\\entry}[4]{\\textbf{#1} \\hfill #2 \\\\ \\textit{#3} \\hfill #4}",
    "\\begin{document}",
  ].join("\n");
}

export const PREAMBLES: Record<string, (o: TemplateOpts) => string> = {
  onyx: preambleOnyx,
  quartz: preambleQuartz,
};

export const EMPTY_DOC = `\\documentclass[letterpaper,10pt]{article}
\\usepackage[letterpaper,margin=0.7in]{geometry}
\\pagestyle{empty}
\\begin{document}
Connect an Identity and at least one Section to the Resume node to generate your document.
\\end{document}
`;
