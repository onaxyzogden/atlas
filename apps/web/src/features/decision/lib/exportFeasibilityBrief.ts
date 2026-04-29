/**
 * Renders the §21 Feasibility Command Center verdict + execution context as
 * a self-contained markdown brief and triggers a browser download. Mirrors
 * the Land-Brief pattern in `v3/lib/exportDiagnoseBrief.ts` so both stages
 * deliver via the same "Generate Brief" CTA contract.
 *
 * The renderer is a pure function over already-fetched verdict + ranking +
 * triage data; the `useFeasibilityBriefDownloader` hook stitches the right
 * hooks together so the FeasibilityCommandCenter can pass a single
 * `onGenerateBrief` callback down to the hero and the rail.
 */

import { useCallback } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { fitStatusLabel } from '../../../lib/visionFit.js';
import {
  useFeasibilityVerdict,
  type FeasibilityVerdict,
} from '../hooks/useFeasibilityVerdict.js';
import {
  useTypeFitRanking,
  type TypeFitRanking,
} from '../hooks/useTypeFitRanking.js';
import type { TriageRollup, TriageItem } from '../hooks/useTriageItems.js';

interface RenderArgs {
  project: LocalProject;
  verdict: FeasibilityVerdict;
  ranking: TypeFitRanking;
  triage: TriageRollup;
}

function formatCapital(total: number): string {
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(total / 1000)}K`;
}

function renderTriageBlock(items: TriageItem[], heading: string): string[] {
  if (items.length === 0) return [];
  const lines: string[] = [];
  lines.push(`### ${heading}`);
  lines.push('');
  for (const item of items) {
    const status = item.resolved ? '✅' : '⚠️';
    lines.push(`- ${status} **${item.label}** — ${item.detail}`);
    lines.push(`  - _Why it matters:_ ${item.rationale}`);
  }
  lines.push('');
  return lines;
}

export function renderFeasibilityBriefMarkdown({
  project,
  verdict,
  ranking,
  triage,
}: RenderArgs): string {
  const lines: string[] = [];
  const projectLabel = project.name || `Project ${project.id}`;

  // ── Header ─────────────────────────────────────────────────────────
  lines.push(`# ${projectLabel} — Feasibility Brief`);
  if (project.acreage != null) {
    lines.push(`_${project.acreage} acres · ${verdict.currentFit?.label ?? 'Project'}_`);
  } else if (verdict.currentFit) {
    lines.push(`_${verdict.currentFit.label}_`);
  }
  lines.push('');

  // ── Verdict ────────────────────────────────────────────────────────
  const score = verdict.currentFit?.score ?? 0;
  lines.push(`**Verdict:** ${verdict.bandLabel} · ${score}/100 Vision Fit`);
  lines.push('');
  lines.push(verdict.headline);
  lines.push('');
  lines.push(verdict.subhead);
  lines.push('');

  // Interpretation paragraph (matches the hero copy)
  switch (verdict.band) {
    case 'supported':
      lines.push(
        'This land naturally supports the chosen vision and the design is on track. ' +
          'Move into detailed design.',
      );
      break;
    case 'supported-with-fixes':
      lines.push(
        `This land naturally supports the chosen vision, but execution is currently blocked ` +
          `by ${verdict.blockerCount} unresolved item${verdict.blockerCount === 1 ? '' : 's'}. ` +
          `Resolve the blockers below before treating downstream feasibility as final.`,
      );
      break;
    case 'workable':
      lines.push(
        'Workable, but expect compromises where critical scores fall short. Validate before committing.',
      );
      break;
    case 'not-recommended':
      lines.push(
        'Material risks outweigh upside under current data. Reframe scope or consider one of the ' +
          'better-fit project types in the Best Use section below.',
      );
      break;
  }
  lines.push('');

  // ── Mini metrics ───────────────────────────────────────────────────
  lines.push('## Snapshot');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  if (verdict.metrics.bestUse) {
    lines.push(`| Best use | ${verdict.metrics.bestUse.label} — ${verdict.metrics.bestUse.score}/100 |`);
  }
  if (verdict.metrics.currentDirection) {
    lines.push(
      `| Current direction | ${verdict.metrics.currentDirection.label} — ${verdict.metrics.currentDirection.score}/100 |`,
    );
  }
  if (verdict.metrics.laborHoursPerYear != null) {
    lines.push(`| Labor load | ${verdict.metrics.laborHoursPerYear} hrs/yr |`);
  }
  if (verdict.metrics.capitalIntensity) {
    lines.push(
      `| Capital intensity | ${verdict.metrics.capitalIntensity.label} — ${formatCapital(verdict.metrics.capitalIntensity.total)} |`,
    );
  }
  if (verdict.metrics.breakEvenYear != null) {
    lines.push(`| Break-even | Year ${verdict.metrics.breakEvenYear} |`);
  }
  lines.push(`| Blocking issues | ${verdict.metrics.blockerCount} |`);
  lines.push('');

  // ── Readiness ──────────────────────────────────────────────────────
  lines.push('## Readiness');
  lines.push('');
  lines.push(`- **Land fit:** ${verdict.readiness.land}`);
  lines.push(`- **Design completeness:** ${verdict.readiness.designCompleteness}`);
  lines.push(`- **Operations burden:** ${verdict.readiness.opsBurden}`);
  lines.push(`- **Capital burden:** ${verdict.readiness.capitalBurden}`);
  lines.push(`- **Confidence:** ${verdict.readiness.confidence}`);
  lines.push('');

  // ── Blocking issues ────────────────────────────────────────────────
  lines.push('## Blocking Issues');
  lines.push('');
  if (triage.open.length === 0) {
    lines.push('_No blocking issues detected. Foundations are in place._');
    lines.push('');
  } else {
    lines.push(...renderTriageBlock(triage.grouped.first.filter((t) => !t.resolved), 'First — must be solved'));
    lines.push(...renderTriageBlock(triage.grouped.then.filter((t) => !t.resolved), 'Then — next phase'));
    lines.push(
      ...renderTriageBlock(triage.grouped.eventually.filter((t) => !t.resolved), 'Eventually — soft preferences'),
    );
  }

  // ── Vision fit detail ──────────────────────────────────────────────
  if (verdict.currentFit && verdict.currentFit.results.length > 0) {
    lines.push('## Vision Fit Detail');
    lines.push('');
    lines.push(`Project type: **${verdict.currentFit.label}** (${verdict.currentFit.score}/100, ${verdict.currentFit.band})`);
    lines.push('');
    lines.push('| Requirement | Weight | Status | Score | Threshold |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const r of verdict.currentFit.results) {
      lines.push(
        `| ${r.scoreName} | ${r.weight} | ${fitStatusLabel(r.status)} | ${Math.round(r.actual)} | ${r.threshold} |`,
      );
    }
    lines.push('');
    if (verdict.currentFit.topStrength) {
      lines.push(`- **Top strength:** ${verdict.currentFit.topStrength}`);
    }
    if (verdict.currentFit.topGap) {
      lines.push(`- **Top gap:** ${verdict.currentFit.topGap}`);
    }
    lines.push('');
  }

  // ── Cross-type ranking ─────────────────────────────────────────────
  if (ranking.fits.length > 0) {
    lines.push('## Best-Use Ranking');
    lines.push('');
    lines.push('| Rank | Project type | Score | Band | Critical gaps |');
    lines.push('| --- | --- | --- | --- | --- |');
    ranking.fits.slice(0, 8).forEach((f, i) => {
      lines.push(
        `| ${i + 1} | ${f.label}${f.type === project.projectType ? ' ★' : ''} | ${f.score}/100 | ${f.band} | ${f.criticalChallenges} |`,
      );
    });
    lines.push('');
    lines.push('_★ marks the project\'s current direction._');
    lines.push('');
  }

  // ── Footer ─────────────────────────────────────────────────────────
  lines.push('---');
  lines.push(
    `_Generated by Atlas on ${new Date().toISOString().slice(0, 10)} · Feasibility Command Center._`,
  );
  lines.push('');
  lines.push(
    '_Methodology: vision-fit ranking weights each project-type requirement (critical/important/supportive) ' +
      'against site assessment scores; triage rollup composes structure, zone, path, utility, and climate ' +
      'completeness signals. See `useFeasibilityVerdict`, `useTypeFitRanking`, `useTriageItems`._',
  );
  lines.push('');

  return lines.join('\n');
}

function triggerDownload(filename: string, markdown: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Returns a stable callback that, when invoked, renders + downloads the
 * Feasibility Brief for the given project. Composes verdict + ranking +
 * triage hooks so callers (FeasibilityCommandCenter) only have to pass
 * `onGenerateBrief` down.
 */
export function useFeasibilityBriefDownloader(project: LocalProject): () => void {
  const verdict = useFeasibilityVerdict(project);
  const ranking = useTypeFitRanking(project);
  const triage = verdict.triage;

  return useCallback(() => {
    const md = renderFeasibilityBriefMarkdown({ project, verdict, ranking, triage });
    const slug = (project.name || project.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    triggerDownload(`${slug || project.id}-feasibility-brief.md`, md);
  }, [project, verdict, ranking, triage]);
}
