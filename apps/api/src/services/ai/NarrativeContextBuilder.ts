/**
 * NarrativeContextBuilder — build the plain-text context string that gets sent
 * to ClaudeClient.generateSiteNarrative / generateDesignRecommendation.
 *
 * Server-side equivalent of `apps/web/src/features/ai/ContextBuilder.ts`. The
 * format is deliberately similar — LLM prompt drift between the two paths is
 * the enemy. If the web-side builder evolves, update this in lockstep.
 */

import type postgres from 'postgres';

interface LayerRow {
  layer_type: string;
  summary_data: Record<string, unknown> | null;
  confidence: string | null;
  source_api: string | null;
}

interface ProjectRow {
  name: string | null;
  project_type: string | null;
  country: string;
  province_state: string | null;
  acreage: string | null;
  address: string | null;
}

interface AssessmentRow {
  overall_score: string | null;
  confidence: string | null;
  score_breakdown: unknown;
}

export async function buildNarrativeContext(
  db: postgres.Sql,
  projectId: string,
): Promise<string | null> {
  const [project] = await db<ProjectRow[]>`
    SELECT name, project_type, country, province_state, acreage::text, address
    FROM projects WHERE id = ${projectId}
  `;
  if (!project) return null;

  const layerRows = await db<LayerRow[]>`
    SELECT layer_type, summary_data, confidence, source_api
    FROM project_layers
    WHERE project_id = ${projectId} AND fetch_status = 'complete'
    ORDER BY layer_type
  `;

  const [assessment] = await db<AssessmentRow[]>`
    SELECT overall_score::text, confidence, score_breakdown
    FROM site_assessments
    WHERE project_id = ${projectId} AND is_current = true
  `;

  const lines: string[] = [];
  lines.push(`## Project`);
  lines.push(`Name: ${project.name ?? '(unnamed)'}`);
  if (project.project_type) lines.push(`Type: ${project.project_type}`);
  lines.push(`Location: ${project.province_state ?? ''}, ${project.country}`.replace(/^, /, ''));
  if (project.address) lines.push(`Address: ${project.address}`);
  if (project.acreage) lines.push(`Acreage: ${project.acreage}`);
  lines.push('');

  if (assessment) {
    lines.push(`## Assessment`);
    lines.push(`Overall score: ${assessment.overall_score ?? '—'}/100 (${assessment.confidence ?? '—'} confidence)`);
    if (Array.isArray(assessment.score_breakdown)) {
      for (const entry of assessment.score_breakdown as Array<Record<string, unknown>>) {
        const label = entry.label;
        const score = entry.score;
        const conf = entry.confidence;
        if (typeof label === 'string' && typeof score === 'number') {
          lines.push(`- ${label}: ${score.toFixed(1)}/100 (${conf ?? '—'})`);
        }
      }
    }
    lines.push('');
  }

  lines.push(`## Layer summaries`);
  for (const r of layerRows) {
    const summary = r.summary_data ?? {};
    const keys = Object.entries(summary)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .slice(0, 10)
      .map(([k, v]) => `${k}=${formatValue(v)}`)
      .join(', ');
    lines.push(`- ${r.layer_type} [${r.source_api ?? '—'}, ${r.confidence ?? '—'}]: ${keys || '(no summary fields)'}`);
  }

  return lines.join('\n');
}

function formatValue(v: unknown): string {
  if (typeof v === 'number') return Number.isFinite(v) ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : 'NaN';
  if (typeof v === 'string') return v.length > 60 ? `${v.slice(0, 60)}…` : v;
  if (typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.length} items]`;
  if (v && typeof v === 'object') return '{…}';
  return String(v);
}
