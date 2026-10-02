export type LabProject = { n: string; slug: string; title: string; blurb: string; status: "live" | "poc" | "soon"; href?: string };

export const PROJECTS: LabProject[] = [
  { n: "03", slug: "documents", title: "Ask My Documents", blurb: "Ask questions over your files; every answer cites its source chunks and unanswerable questions are refused.", status: "poc", href: "/documents" },
  { n: "13", slug: "equity-research", title: "Equity Research Lab", blurb: "Source-grounded stock research with frozen predictions. Deployed separately with its own protection and keys.", status: "live" },
  { n: "01", slug: "chief-of-staff", title: "Personal Chief of Staff", blurb: "Turns a messy goal into priorities, risks and next actions.", status: "soon" },
  { n: "02", slug: "research-briefing", title: "Deep Research Briefing", blurb: "Plans, cites and critiques a research briefing from your sources.", status: "soon" },
];
