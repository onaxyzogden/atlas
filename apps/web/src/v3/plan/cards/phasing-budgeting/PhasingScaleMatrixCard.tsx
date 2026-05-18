/**
 * PhasingScaleMatrixCard — Plan Module 7 (Phasing & Budgeting), card 4/4.
 *
 * Per Permaculture Scholar verdict 2026-05-07
 * (`wiki/decisions/2026-05-07-atlas-plan-phasing-scholar-keep-atlas.md`):
 * Atlas's flat phase × season matrix is correct (matches the OSU PDC Pro
 * 5-year × 4-season template) but it's missing the *Scale-of-Permanence
 * sequencing* layer Yeomans / Mollison demand. The orthodox phasing
 * spreadsheet groups tasks by Earthworks → Water → Structures →
 * Vegetation rows, so that earlier phases naturally populate with the
 * mainframe and later phases with planting.
 *
 * This additive card reads the same `BuildPhase.tasks[]` data as the
 * existing matrix and rollup cards, but pivots the view: rows are the
 * 4 Yeomans Keyline categories (+ an "Uncategorised" catchall for legacy
 * tasks without a `designLayer`), columns are the project phases. Each
 * cell shows task count, hours, and dollars for that (layer, phase) pair.
 *
 * Sequencing-violation warning: if any task in a "later" layer
 * (Vegetation / Structures) appears in a phase whose "earlier" layer
 * cells (Earthworks / Water) are empty, we flag it — that's the steward
 * planting trees before water is on the land.
 *
 * Source: NotebookLM Permaculture Scholar (5aa3dcf3-…), 2026-05-07.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { usePhaseStore, type DesignLayer } from '../../../../store/phaseStore.js';
import { useWorkItemStore } from '../../../../store/workItemStore.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface LayerRow {
  key: DesignLayer | 'uncategorised';
  label: string;
  blurb: string;
  /**
   * Sequencing prerequisite layers — if this row has any tasks but a
   * prerequisite row in the *same* phase has zero, that's a Keyline
   * violation. Earthworks + Water have no prerequisites.
   */
  prereqs: DesignLayer[];
}

const LAYER_ROWS: LayerRow[] = [
  {
    key: 'earthworks',
    label: 'Earthworks (landform)',
    blurb: 'Cuts, fills, terraces — the most permanent change you make.',
    prereqs: [],
  },
  {
    key: 'water',
    label: 'Water (ponds, swales, irrigation)',
    blurb: 'Water lines drawn before access lines, before structures.',
    prereqs: [],
  },
  {
    key: 'structures',
    label: 'Structures & energy',
    blurb: 'Buildings, fences, solar — placed after water + access.',
    prereqs: ['earthworks', 'water'],
  },
  {
    key: 'vegetation',
    label: 'Vegetation (succession)',
    blurb: 'Trees, shrubs, groundcover — last because they need the rest.',
    prereqs: ['earthworks', 'water'],
  },
  {
    key: 'uncategorised',
    label: 'Uncategorised',
    blurb: 'Legacy tasks with no Scale-of-Permanence layer set.',
    prereqs: [],
  },
];

function fmtUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

interface Cell {
  count: number;
  hrs: number;
  usd: number;
}

function emptyCell(): Cell {
  return { count: 0, hrs: 0, usd: 0 };
}

interface PhaseTaskProj {
  designLayer?: DesignLayer;
  laborHrs: number;
  costUSD: number;
}

function classifyTask(t: PhaseTaskProj): DesignLayer | 'uncategorised' {
  return t.designLayer ?? 'uncategorised';
}

export default function PhasingScaleMatrixCard({ project }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);
  const allItems = useWorkItemStore((s) => s.items);

  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === project.id).slice().sort((a, b) => a.order - b.order),
    [allPhases, project.id],
  );

  // Spine is authoritative (D0.1). phaseStore tasks now live on the WorkItem
  // spine (discriminator: `phaseId != null`); project them back per-phase so
  // the matrix/violation/coverage math is byte-unchanged. BuildPhase stays
  // the phase container — only its `tasks[]` moved.
  const tasksByPhase = useMemo(() => {
    const map = new Map<string, PhaseTaskProj[]>();
    for (const w of allItems) {
      if (w.projectId !== project.id || w.phaseId == null) continue;
      const list = map.get(w.phaseId) ?? [];
      list.push({
        designLayer: w.designLayer,
        laborHrs: w.laborHrs ?? 0,
        costUSD: w.costUSD ?? 0,
      });
      map.set(w.phaseId, list);
    }
    return map;
  }, [allItems, project.id]);

  // Build the (layer × phase) cell matrix.
  const matrix = useMemo(() => {
    const m = new Map<string, Cell>();
    for (const row of LAYER_ROWS) {
      for (const ph of phases) {
        m.set(`${row.key}::${ph.id}`, emptyCell());
      }
    }
    for (const ph of phases) {
      for (const t of tasksByPhase.get(ph.id) ?? []) {
        const key = `${classifyTask(t)}::${ph.id}`;
        const cell = m.get(key);
        if (!cell) continue;
        cell.count += 1;
        cell.hrs += t.laborHrs;
        cell.usd += t.costUSD;
      }
    }
    return m;
  }, [phases, tasksByPhase]);

  // Sequencing-violation detection. Two severities:
  //   · `same-phase` (orange) — later layer populated but its prereqs are
  //     empty in THE SAME phase. Often a real ordering issue, sometimes
  //     just a steward batching multi-phase prep into earlier rows; the
  //     cumulative check below catches the remaining true violations.
  //   · `cumulative` (red) — later layer populated in phase N but its
  //     prereqs are empty in phases 1..N (nowhere upstream). This is the
  //     orthodox Keyline reading: trees planted before water is on the
  //     land *anywhere* in the program. Strictly worse than same-phase.
  // A given (phase, layer, prereq) triple is reported once at the worst
  // severity that applies — cumulative subsumes same-phase, so any prereq
  // missing cumulatively is removed from the same-phase set.
  const violations = useMemo(() => {
    type Severity = 'same-phase' | 'cumulative';
    const out: Array<{
      phaseId: string;
      phaseName: string;
      layer: DesignLayer;
      missing: DesignLayer[];
      severity: Severity;
    }> = [];
    // Pre-compute cumulative counts per (layer, phaseIndex) — count of
    // tasks tagged that layer across phases 0..i inclusive.
    const cumByLayer: Record<string, number[]> = {};
    for (const row of LAYER_ROWS) {
      const arr: number[] = [];
      let running = 0;
      for (const ph of phases) {
        running += matrix.get(`${row.key}::${ph.id}`)?.count ?? 0;
        arr.push(running);
      }
      cumByLayer[row.key] = arr;
    }
    for (let i = 0; i < phases.length; i += 1) {
      const ph = phases[i];
      if (!ph) continue;
      for (const row of LAYER_ROWS) {
        if (row.key === 'uncategorised') continue;
        if (row.prereqs.length === 0) continue;
        const cell = matrix.get(`${row.key}::${ph.id}`);
        if (!cell || cell.count === 0) continue;
        const cumulativeMissing: DesignLayer[] = [];
        const samePhaseMissing: DesignLayer[] = [];
        for (const pre of row.prereqs) {
          const cumCount = cumByLayer[pre]?.[i] ?? 0;
          const sameCount = matrix.get(`${pre}::${ph.id}`)?.count ?? 0;
          if (cumCount === 0) {
            cumulativeMissing.push(pre);
          } else if (sameCount === 0) {
            samePhaseMissing.push(pre);
          }
        }
        if (cumulativeMissing.length > 0) {
          out.push({
            phaseId: ph.id,
            phaseName: ph.name,
            layer: row.key as DesignLayer,
            missing: cumulativeMissing,
            severity: 'cumulative',
          });
        }
        if (samePhaseMissing.length > 0) {
          out.push({
            phaseId: ph.id,
            phaseName: ph.name,
            layer: row.key as DesignLayer,
            missing: samePhaseMissing,
            severity: 'same-phase',
          });
        }
      }
    }
    return out;
  }, [phases, matrix]);

  // Coverage: which layers are populated at all (across the whole project).
  const populatedLayers = useMemo(() => {
    const populated = new Set<string>();
    for (const ph of phases) {
      for (const t of tasksByPhase.get(ph.id) ?? []) {
        populated.add(classifyTask(t));
      }
    }
    return populated;
  }, [phases, tasksByPhase]);

  const totals = useMemo(() => {
    let count = 0, hrs = 0, usd = 0;
    for (const ph of phases) {
      for (const t of tasksByPhase.get(ph.id) ?? []) {
        count += 1;
        hrs += t.laborHrs;
        usd += t.costUSD;
      }
    }
    return { count, hrs, usd };
  }, [phases, tasksByPhase]);

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 7 · Phasing</span>
        <h1 className={styles.title}>Scale-of-permanence matrix</h1>
        <p className={styles.lede}>
          The same phase tasks, pivoted to Yeomans Keyline rows. Earthworks
          and water should populate the early phases; structures and
          vegetation should follow. The matrix flags phases where later
          layers leap ahead of their prerequisites.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Coverage</h2>
        <div className={styles.statRow}><span>Total tasks</span><span>{totals.count}</span></div>
        <div className={styles.statRow}><span>Total labor</span><span>{totals.hrs} h</span></div>
        <div className={styles.statRow}><span>Total cost</span><span>{fmtUSD(totals.usd)}</span></div>
        <div className={styles.statRow}>
          <span>Layers in use</span>
          <span>
            {LAYER_ROWS.filter((r) => r.key !== 'uncategorised').filter((r) => populatedLayers.has(r.key)).length} / 4
          </span>
        </div>
      </section>

      {phases.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>No phases defined for this project yet.</p>
        </section>
      ) : (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Matrix</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>Scale of permanence</th>
                  {phases.map((ph) => (
                    <th key={ph.id} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>
                      {ph.name}
                      <div className={styles.listMeta} style={{ marginTop: 2, fontWeight: 400 }}>{ph.timeframe}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LAYER_ROWS.map((row) => {
                  // Hide the uncategorised row entirely if no tasks are uncategorised.
                  if (row.key === 'uncategorised' && !populatedLayers.has('uncategorised')) return null;
                  return (
                    <tr key={row.key}>
                      <td style={{ padding: '10px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'top' }}>
                        <strong>{row.label}</strong>
                        <div className={styles.listMeta} style={{ marginTop: 2 }}>{row.blurb}</div>
                      </td>
                      {phases.map((ph) => {
                        const cell = matrix.get(`${row.key}::${ph.id}`) ?? emptyCell();
                        const empty = cell.count === 0;
                        return (
                          <td key={ph.id} style={{
                            padding: '10px 10px',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            verticalAlign: 'top',
                            opacity: empty ? 0.45 : 1,
                          }}>
                            <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {cell.count} task{cell.count === 1 ? '' : 's'}
                            </div>
                            <div className={styles.listMeta} style={{ marginTop: 2 }}>
                              {cell.hrs} h · {fmtUSD(cell.usd)}
                            </div>
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
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Sequencing checks</h2>
        {violations.length === 0 ? (
          <p className={styles.empty}>
            No Keyline sequencing violations detected. Either the design is
            clean, or the phases haven't been categorised yet — try
            tagging a few tasks with their Scale-of-Permanence layer in
            the Seasonal tasks tab.
          </p>
        ) : (
          <ul className={styles.list}>
            {violations.map((v, i) => {
              const isCumulative = v.severity === 'cumulative';
              const ringColor = isCumulative ? 'rgba(220,90,90,0.7)' : 'rgba(220,160,90,0.7)';
              const tagColor = isCumulative ? 'rgba(220,90,90,0.9)' : 'rgba(220,160,90,0.9)';
              const missingLabel = v.missing
                .map((m) => LAYER_ROWS.find((r) => r.key === m)?.label)
                .join(' + ');
              return (
                <li
                  key={`${v.phaseId}-${v.layer}-${v.severity}-${i}`}
                  className={styles.listRow}
                  style={{ borderLeft: `3px solid ${ringColor}`, paddingLeft: 10 }}
                >
                  <div>
                    <strong>{v.phaseName}</strong> — {LAYER_ROWS.find((r) => r.key === v.layer)?.label} populated{' '}
                    <span style={{
                      marginLeft: 6,
                      padding: '1px 8px',
                      borderRadius: 10,
                      border: `1px solid ${tagColor}`,
                      color: tagColor,
                      fontSize: '0.7em',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}>
                      {isCumulative ? 'cumulative' : 'same phase'}
                    </span>
                    <div className={styles.listMeta} style={{ marginTop: 2 }}>
                      {isCumulative
                        ? `but ${missingLabel} has no tasks in this phase or any earlier phase. Yeomans Keyline: water and landform must precede planting and structures across the whole program, not just within one phase.`
                        : `but ${missingLabel} is empty in the same phase. Consider sequencing the prerequisite work first.`}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
