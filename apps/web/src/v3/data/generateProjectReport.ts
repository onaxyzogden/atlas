/**
 * generateProjectReport — Phase 6.5.
 *
 * Builds a Markdown summary of a v3 Project (verdict, six scores,
 * blocking issues, next actions) for client-side download from
 * ReportPage. Pure builder + DOM helper, mirroring the Phase 6.2
 * `generateProveBrief` pattern so a future server-side render
 * (Phase 7 backend) can swap call sites without changing the UI.
 *
 * react-pdf was considered for native PDF output but rejected for
 * v3.1: the runtime cost (~3MB delta on the report bundle) and the
 * authoring overhead of a parallel `<Document>` tree don't earn their
 * keep when the browser's print-to-PDF already renders the on-screen
 * summary cleanly. PDF generation stays as a server-side concern.
 */

import type { Project, ProjectScores } from "../types.js";

const SCORE_KEYS: Array<{ key: keyof ProjectScores; label: string }> = [
  { key: "landFit", label: "Land Fit" },
  { key: "water", label: "Water" },
  { key: "regulation", label: "Regulation" },
  { key: "access", label: "Access" },
  { key: "financial", label: "Financial" },
  { key: "designCompleteness", label: "Design" },
];

function severityIcon(s: string): string {
  switch (s) {
    case "blocking": return "🔴";
    case "warning": return "🟡";
    case "incomplete": return "⚪";
    case "advisory": return "🔵";
    default: return "·";
  }
}

function actionIcon(s: string): string {
  switch (s) {
    case "done": return "[x]";
    case "in-progress": return "[~]";
    case "blocked": return "[!]";
    default: return "[ ]";
  }
}

export function buildProjectReportMarkdown(project: Project): string {
  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  lines.push(`# Project Report — ${project.name}`);
  lines.push("");
  lines.push(`*Generated ${today} from /v3/project/${project.id}/report*`);
  lines.push("");
  lines.push(`**Stage:** ${project.stage}`);
  lines.push(`**Location:** ${project.location.region} — ${project.location.acreage} ${project.location.acreageUnit}`);
  lines.push("");

  lines.push("## Verdict");
  lines.push("");
  lines.push(`**${project.verdict.label}** — ${project.verdict.score}/100`);
  lines.push("");
  lines.push(`> ${project.verdict.summary}`);
  lines.push("");

  lines.push("## Scores");
  lines.push("");
  lines.push("| Category | Score | Note |");
  lines.push("|---|---:|---|");
  for (const { key, label } of SCORE_KEYS) {
    const s = project.scores[key];
    lines.push(`| ${label} | ${s.value} | ${s.label ?? ""} |`);
  }
  lines.push("");

  lines.push(`## Blocking Issues (${project.blockers.length})`);
  lines.push("");
  if (project.blockers.length === 0) {
    lines.push("_No blocking issues recorded._");
  } else {
    for (const b of project.blockers) {
      lines.push(`### ${severityIcon(b.severity)} ${b.title} _(${b.severity})_`);
      lines.push("");
      lines.push(b.description);
      lines.push("");
      lines.push(`**Recommended:** ${b.recommendedAction}`);
      lines.push("");
    }
  }

  lines.push(`## Next Actions (${project.actions.length})`);
  lines.push("");
  for (const a of project.actions) {
    const due = a.dueLabel ? ` · ${a.dueLabel}` : "";
    lines.push(`- ${actionIcon(a.status)} ${a.title}${due}`);
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push(`OGDEN Atlas · ${project.shortLabel}`);

  return lines.join("\n");
}

export function downloadProjectReport(project: Project): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const md = buildProjectReportMarkdown(project);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.shortLabel || project.id}-report.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Build a shareable URL for the report. Today this is just a deep
 * link to /v3/project/$id/report — anyone with access to the app can
 * load it. Phase 7 backend backfill replaces this with a tokenized
 * share link backed by an audit log + per-project ACL. The call site
 * stays stable: `getProjectShareUrl(project)` returns the URL the UI
 * copies to the clipboard.
 */
export function getProjectShareUrl(project: Project): string {
  if (typeof window === "undefined") {
    return `/v3/project/${project.id}/report`;
  }
  const u = new URL(window.location.href);
  u.pathname = `/v3/project/${project.id}/report`;
  u.search = "";
  u.hash = "";
  return u.toString();
}
