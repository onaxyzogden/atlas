/**
 * PrincipleCoverageMatrixCard — Plan Module 8 (Principle Verification), card 3/3.
 *
 * Per Permaculture Scholar verdict 2026-05-07
 * (`wiki/decisions/2026-05-07-atlas-plan-principles-scholar-keep-atlas.md`):
 * "A visualization that highlights ignored principles ... If a user has
 * linked 50 features to 'Obtain a Yield' but zero to 'Catch and Store
 * Energy', a missing-principle warning acts as a crucial feedback loop
 * prompting the designer to 'Apply Self-Regulation and Accept Feedback.'"
 *
 * This additive card pivots the same `principleCheckStore.byProject[
 * projectId]` data used by the Holmgren checklist, building a 12 × 9
 * coverage matrix: rows are Holmgren's 12 principles, columns are the
 * feature-type buckets the checklist supports (Zone / Path / Structure /
 * Transect / Guild / Earthwork / Crop / Fertility / Ecology). Each cell
 * counts how many features of that type are linked to that principle's
 * check. The expanded set (added 2026-05-07) lets P3 *Obtain a Yield*
 * accept crop-area evidence directly, P6 *Produce No Waste* accept
 * fertility-unit evidence, and P10 *Use & Value Diversity* accept
 * ecology observations — closing the gap where earlier the checklist
 * forced these to be evidenced indirectly via zones or guilds.
 *
 * Surfaces three derived signals:
 *   - "Uncovered principles" — principles with zero linked features
 *   - "Underweight principles" — principles linked to only one feature type
 *   - "Dominant principles" — principles linked to ≥4 feature types
 *
 * Source: NotebookLM Permaculture Scholar (5aa3dcf3-…), 2026-05-07.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { HOLMGREN_PRINCIPLES } from '../../../../data/holmgrenPrinciples.js';
import { usePrincipleCheckStore } from '../../../../store/principleCheckStore.js';
import {
  usePrincipleEvidenceVisibleIds,
  type FeatureKind,
} from './usePrincipleEvidenceVisibleIds.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const FEATURE_COLS: Array<{ key: FeatureKind; label: string }> = [
  { key: 'zone',       label: 'Zones' },
  { key: 'path',       label: 'Paths' },
  { key: 'structure',  label: 'Structures' },
  { key: 'transect',   label: 'Transects' },
  { key: 'guild',      label: 'Guilds' },
  { key: 'earthwork',  label: 'Earthworks' },
  { key: 'crop',       label: 'Crops' },
  { key: 'fertility',  label: 'Fertility' },
  { key: 'ecology',    label: 'Ecology' },
];

export default function PrincipleCoverageMatrixCard({ project }: Props) {
  const byProject = usePrincipleCheckStore((s) => s.byProject);
  const checks = useMemo(() => byProject[project.id] ?? {}, [byProject, project.id]);

  // id → kind map scoped to this project AND capped by the year
  // scrubber's `yeomansCapForYear(currentYear)`. Phase-tagged features
  // (water nodes/earthworks, paddocks, fertility infra) drop out when
  // their BuildPhase's `yeomansCap` exceeds that cap. The matrix,
  // radar, and uncovered/dominant signals are all readouts of "evidence
  // visible at this year," not data-deletion — the steward's narrative
  // (PrincipleCheck.linkedFeatureIds) is untouched. See
  // wiki/decisions/2026-05-12-plan-phasestore-yeomans-adapter.md.
  const { idToKind } = usePrincipleEvidenceVisibleIds(project.id);

  // 12 × 6 matrix (principle id → feature kind → count of linked features)
  const matrix = useMemo(() => {
    const out = new Map<string, Map<FeatureKind, number>>();
    for (const principle of HOLMGREN_PRINCIPLES) {
      const row = new Map<FeatureKind, number>();
      for (const col of FEATURE_COLS) row.set(col.key, 0);
      const linked = checks[principle.id]?.linkedFeatureIds ?? [];
      for (const id of linked) {
        const kind = idToKind.get(id);
        if (!kind) continue;
        row.set(kind, (row.get(kind) ?? 0) + 1);
      }
      out.set(principle.id, row);
    }
    return out;
  }, [checks, idToKind]);

  const summary = useMemo(() => {
    const uncovered: string[] = [];
    const underweight: string[] = [];
    const dominant: string[] = [];
    for (const principle of HOLMGREN_PRINCIPLES) {
      const row = matrix.get(principle.id);
      if (!row) continue;
      let totalLinks = 0;
      let typesUsed = 0;
      for (const col of FEATURE_COLS) {
        const c = row.get(col.key) ?? 0;
        totalLinks += c;
        if (c > 0) typesUsed += 1;
      }
      const label = `${principle.number}. ${principle.title}`;
      if (totalLinks === 0) uncovered.push(label);
      else if (typesUsed === 1) underweight.push(label);
      else if (typesUsed >= 5) dominant.push(label);
    }
    return { uncovered, underweight, dominant };
  }, [matrix]);

  // For per-cell intensity colouring: max cell across the matrix.
  const maxCell = useMemo(() => {
    let max = 0;
    for (const row of matrix.values()) {
      for (const v of row.values()) if (v > max) max = v;
    }
    return max;
  }, [matrix]);

  function cellBg(count: number): string {
    if (count === 0 || maxCell === 0) return 'transparent';
    const intensity = count / maxCell;
    return `rgba(var(--color-gold-rgb), ${0.1 + intensity * 0.45})`;
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 8 · Principle Verification</span>
        <h1 className={styles.title}>Principle × feature coverage</h1>
        <p className={styles.lede}>
          A 12 × 9 grid of which feature types you've cited as evidence for
          each principle. Empty rows are an honest signal that the design
          isn't yet responding to that principle — exactly the feedback
          loop principle 4 asks for. As you scrub the year cursor, the
          matrix counts only evidence visible at that year, so the radar
          shrinks honestly as the design earns its way up the Scale of Permanence.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Coverage signals</h2>

        <div className={styles.statRow}>
          <span>Uncovered principles</span>
          <span>{summary.uncovered.length} / 12</span>
        </div>
        {summary.uncovered.length > 0 && (
          <p className={styles.listMeta} style={{ marginTop: 4 }}>
            {summary.uncovered.join(' · ')}
          </p>
        )}

        <div className={styles.statRow} style={{ marginTop: 10 }}>
          <span>Underweight (one feature type only)</span>
          <span>{summary.underweight.length} / 12</span>
        </div>
        {summary.underweight.length > 0 && (
          <p className={styles.listMeta} style={{ marginTop: 4 }}>
            {summary.underweight.join(' · ')}
          </p>
        )}

        <div className={styles.statRow} style={{ marginTop: 10 }}>
          <span>Well-integrated (≥5 feature types)</span>
          <span>{summary.dominant.length} / 12</span>
        </div>
        {summary.dominant.length > 0 && (
          <p className={styles.listMeta} style={{ marginTop: 4 }}>
            {summary.dominant.join(' · ')}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Breadth radar</h2>
        <p className={styles.empty} style={{ textAlign: 'left', padding: '4px 0 8px' }}>
          Each spoke is one principle; the radius is the share of feature
          types you&rsquo;ve linked as evidence for it (1.0 = all {FEATURE_COLS.length}{' '}
          types, 0 = uncovered). A spiky shape means the design leans on a
          handful of principles; a balanced polygon is Holmgren P8{' '}
          <em>Integrate rather than segregate</em> made visible.
        </p>
        {(() => {
          const SIZE = 320;
          const CX = SIZE / 2;
          const CY = SIZE / 2;
          const R = SIZE / 2 - 36;
          const N = HOLMGREN_PRINCIPLES.length;
          const COLS = FEATURE_COLS.length;
          const angleAt = (i: number): number =>
            -Math.PI / 2 + (i * 2 * Math.PI) / N;
          const pointAt = (i: number, frac: number): [number, number] => {
            const a = angleAt(i);
            return [CX + Math.cos(a) * R * frac, CY + Math.sin(a) * R * frac];
          };
          const values: number[] = HOLMGREN_PRINCIPLES.map((p) => {
            const row = matrix.get(p.id);
            if (!row) return 0;
            let typesUsed = 0;
            for (const c of FEATURE_COLS) {
              if ((row.get(c.key) ?? 0) > 0) typesUsed += 1;
            }
            return typesUsed / COLS;
          });
          const polygon = HOLMGREN_PRINCIPLES.map((_, i) =>
            pointAt(i, values[i] ?? 0).join(','),
          ).join(' ');
          const rings = [0.25, 0.5, 0.75, 1.0];
          return (
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              style={{
                width: '100%',
                maxWidth: 360,
                height: 'auto',
                margin: '0 auto',
                display: 'block',
              }}
            >
              {/* Concentric reference rings */}
              {rings.map((f) => (
                <circle
                  key={f}
                  cx={CX}
                  cy={CY}
                  r={R * f}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={1}
                  strokeDasharray={f === 1 ? undefined : '2 3'}
                />
              ))}
              {/* Spokes */}
              {HOLMGREN_PRINCIPLES.map((p, i) => {
                const [x, y] = pointAt(i, 1);
                return (
                  <line
                    key={`spoke-${p.id}`}
                    x1={CX}
                    y1={CY}
                    x2={x}
                    y2={y}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={1}
                  />
                );
              })}
              {/* Coverage polygon */}
              <polygon
                points={polygon}
                fill="rgba(var(--color-gold-rgb), 0.18)"
                stroke="rgba(var(--color-gold-rgb), 0.85)"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
              {/* Vertices for non-zero values */}
              {HOLMGREN_PRINCIPLES.map((p, i) => {
                const v = values[i] ?? 0;
                if (v === 0) return null;
                const [x, y] = pointAt(i, v);
                return (
                  <circle
                    key={`pt-${p.id}`}
                    cx={x}
                    cy={y}
                    r={2.5}
                    fill="rgba(var(--color-gold-rgb), 0.95)"
                  />
                );
              })}
              {/* Spoke labels (principle number) */}
              {HOLMGREN_PRINCIPLES.map((p, i) => {
                const [x, y] = pointAt(i, 1.12);
                return (
                  <text
                    key={`lbl-${p.id}`}
                    x={x}
                    y={y}
                    fontSize={10}
                    fill="rgba(232,220,200,0.8)"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {p.number}
                  </text>
                );
              })}
            </svg>
          );
        })()}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Matrix</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>Principle</th>
                {FEATURE_COLS.map((c) => (
                  <th key={c.key} style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOLMGREN_PRINCIPLES.map((principle) => {
                const row = matrix.get(principle.id);
                return (
                  <tr key={principle.id}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'top' }}>
                      <strong>{principle.number}. {principle.title}</strong>
                    </td>
                    {FEATURE_COLS.map((c) => {
                      const v = row?.get(c.key) ?? 0;
                      return (
                        <td key={c.key} style={{
                          padding: '8px 10px',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          textAlign: 'center',
                          fontVariantNumeric: 'tabular-nums',
                          background: cellBg(v),
                          opacity: v === 0 ? 0.45 : 1,
                        }}>
                          {v}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
