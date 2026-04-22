/**
 * CompareCandidatesPage — Section 1 Gap C.
 *
 * Renders candidate projects side-by-side using the scored-label output
 * that ProjectDashboard consumes. URL shape: /projects/compare?ids=a,b,c
 *
 * Phase: P2. Candidate-only rows (status === 'candidate') are highlighted;
 * comparing non-candidate projects still works but gets a subtle note.
 */

import { useEffect, useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import { api } from '../../../lib/apiClient.js';
import type { ProjectSummary } from '@ogden/shared';

interface AssessmentRow {
  projectId: string;
  suitabilityScore: number | null;
  buildabilityScore: number | null;
  waterResilienceScore: number | null;
  agPotentialScore: number | null;
  overallScore: number | null;
  confidence: 'high' | 'medium' | 'low' | null;
  error: string | null;
}

const SCORE_ROWS: Array<{ key: keyof AssessmentRow; label: string }> = [
  { key: 'overallScore', label: 'Overall' },
  { key: 'suitabilityScore', label: 'Suitability' },
  { key: 'buildabilityScore', label: 'Buildability' },
  { key: 'waterResilienceScore', label: 'Water Resilience' },
  { key: 'agPotentialScore', label: 'Agricultural Potential' },
];

const cellStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--color-border)',
  fontSize: 13,
  color: 'var(--color-text)',
};

const headerCellStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 500,
  fontSize: 11,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  background: 'var(--color-surface)',
};

function formatScore(v: number | null): string {
  return v === null || v === undefined ? '—' : v.toFixed(1);
}

export default function CompareCandidatesPage() {
  // TanStack Router gives us search params. `ids` is a comma-separated list.
  const search = useSearch({ strict: false }) as { ids?: string };
  const ids = (search.ids ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [assessments, setAssessments] = useState<Record<string, AssessmentRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const summaries: ProjectSummary[] = [];
      const rows: Record<string, AssessmentRow> = {};

      for (const id of ids) {
        try {
          const { data: proj } = await api.projects.get(id);
          summaries.push(proj);
        } catch {
          // Skip inaccessible projects — they show up as an error row.
        }

        try {
          const { data: asmt, error } = await api.projects.assessment(id);
          if (error || !asmt) {
            rows[id] = {
              projectId: id,
              suitabilityScore: null,
              buildabilityScore: null,
              waterResilienceScore: null,
              agPotentialScore: null,
              overallScore: null,
              confidence: null,
              error: error?.message ?? 'Assessment not ready',
            };
          } else {
            const a = asmt as unknown as Record<string, number | string | null>;
            rows[id] = {
              projectId: id,
              suitabilityScore: (a.suitability_score ?? a.suitabilityScore) as number | null,
              buildabilityScore: (a.buildability_score ?? a.buildabilityScore) as number | null,
              waterResilienceScore: (a.water_resilience_score ?? a.waterResilienceScore) as number | null,
              agPotentialScore: (a.ag_potential_score ?? a.agPotentialScore) as number | null,
              overallScore: (a.overall_score ?? a.overallScore) as number | null,
              confidence: (a.confidence as AssessmentRow['confidence']) ?? null,
              error: null,
            };
          }
        } catch (err) {
          rows[id] = {
            projectId: id,
            suitabilityScore: null,
            buildabilityScore: null,
            waterResilienceScore: null,
            agPotentialScore: null,
            overallScore: null,
            confidence: null,
            error: err instanceof Error ? err.message : 'Fetch failed',
          };
        }
      }

      if (!cancelled) {
        setProjects(summaries);
        setAssessments(rows);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ids.join(',')]);

  if (ids.length === 0) {
    return (
      <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>
        No projects selected. Use <code>?ids=a,b,c</code> to compare projects.
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>Loading candidates…</div>;
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 400, marginBottom: 8, color: 'var(--color-text)' }}>
        Compare Candidates
      </h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
        Side-by-side assessment scores for {projects.length} {projects.length === 1 ? 'project' : 'projects'}.
      </p>

      <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...headerCellStyle, textAlign: 'left', width: 200 }}>Metric</th>
              {projects.map((p) => (
                <th key={p.id} style={{ ...headerCellStyle, textAlign: 'left' }}>
                  <div style={{ color: 'var(--color-text)', fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 10, textTransform: 'none', letterSpacing: 0, marginTop: 2 }}>
                    {p.status === 'candidate' ? 'Candidate' : p.status}
                    {p.acreage ? ` · ${p.acreage.toFixed(1)} ac` : ''}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCORE_ROWS.map(({ key, label }) => (
              <tr key={key}>
                <td style={{ ...cellStyle, fontWeight: 500 }}>{label}</td>
                {projects.map((p) => {
                  const row = assessments[p.id];
                  const v = row ? (row[key] as number | null) : null;
                  return (
                    <td key={p.id} style={cellStyle}>
                      {row?.error ? (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{row.error}</span>
                      ) : (
                        formatScore(v)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td style={{ ...cellStyle, fontWeight: 500 }}>Confidence</td>
              {projects.map((p) => (
                <td key={p.id} style={cellStyle}>
                  {assessments[p.id]?.confidence ?? '—'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
