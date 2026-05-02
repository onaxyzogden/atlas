/**
 * generateProveBrief — Phase 6.2.
 *
 * Generates a Markdown feasibility brief for a v3 Project from its
 * `prove` payload. The brief is shipped as a client-side download —
 * no backend round-trip today. A future server-side render can swap
 * the call site without changing the UI vocabulary; the function is
 * pure so it's also reusable from a Node CLI or a server route.
 */

import type { Project } from "../types.js";

function severityIcon(s: string): string {
  switch (s) {
    case "blocking": return "🔴";
    case "warning": return "🟡";
    case "incomplete": return "⚪";
    case "advisory": return "🔵";
    default: return "·";
  }
}

function ruleIcon(s: string): string {
  switch (s) {
    case "pass": return "✅";
    case "warning": return "⚠️";
    case "blocked": return "❌";
    default: return "·";
  }
}

export function buildProveBriefMarkdown(project: Project): string {
  const brief = project.prove;
  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  lines.push(`# Feasibility Brief — ${project.name}`);
  lines.push("");
  lines.push(`*Generated ${today} from /v3/project/${project.id}/prove*`);
  lines.push("");
  lines.push(`**Location:** ${project.location.region} — ${project.location.acreage} ${project.location.acreageUnit}`);
  lines.push(`**Stage:** ${project.stage}`);
  lines.push(`**Verdict:** ${(brief?.verdict ?? project.verdict).label}`);
  lines.push("");
  lines.push(`> ${project.summary}`);
  lines.push("");

  if (!brief) {
    lines.push("_No feasibility data is available for this project yet._");
    return lines.join("\n");
  }

  lines.push("## Blocking Issues");
  lines.push("");
  if (brief.blockers.length === 0) {
    lines.push("_No blocking issues recorded._");
  } else {
    for (const b of brief.blockers) {
      lines.push(`### ${severityIcon(b.severity)} ${b.title} _(${b.severity})_`);
      lines.push("");
      lines.push(b.description);
      lines.push("");
      lines.push(`**Recommended:** ${b.recommendedAction}`);
      lines.push("");
    }
  }

  lines.push("## Best Uses");
  lines.push("");
  lines.push("| Land Use | Vision Fit | Quality | Note |");
  lines.push("|---|---:|---|---|");
  for (const u of brief.bestUses) {
    lines.push(`| ${u.useType} | ${u.visionFit} | ${u.fitQuality} | ${u.note ?? ""} |`);
  }
  lines.push("");

  lines.push("## Vision Fit Analysis");
  lines.push("");
  lines.push("| Category | Score | Benchmark | Note |");
  lines.push("|---|---:|---:|---|");
  for (const v of brief.visionFit) {
    lines.push(
      `| ${v.category} | ${v.value} | ${v.benchmark ?? "—"} | ${v.note ?? ""} |`,
    );
  }
  lines.push("");

  lines.push("## Execution Reality");
  lines.push("");
  lines.push("| Metric | Value | Note |");
  lines.push("|---|---|---|");
  for (const e of brief.execution) {
    lines.push(`| ${e.label} | ${e.value} | ${e.hint ?? ""} |`);
  }
  lines.push("");

  lines.push("## Design Rules & Safety");
  lines.push("");
  for (const r of brief.designRules) {
    lines.push(`- ${ruleIcon(r.status)} **${r.rule}** — ${r.detail}`);
  }
  lines.push("");

  return lines.join("\n");
}

export function downloadProveBrief(project: Project): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const md = buildProveBriefMarkdown(project);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.shortLabel || project.id}-feasibility-brief.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
