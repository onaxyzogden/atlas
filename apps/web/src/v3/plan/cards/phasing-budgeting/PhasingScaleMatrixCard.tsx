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
import { usePhaseStore, type DesignLayer, type PhaseTask } from '../../../../store/phaseStore.js';
import styles from '../../../../features/plan/planCard.module.css';

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

function classifyTask(t: PhaseTask): DesignLayer | 'uncategorised' {
  return t.designLayer ?? 'uncategorised';
}

export default function PhasingScaleMatrixCard({ project }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);

  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === project.id).slice().sort((a, b) => a.order - b.order),
    [allPhases, project.id],
  );

  // Build the (layer × phase) cell matrix.
  const matrix = useMemo(() => {
    const m = new Map<string, Cell>();
    for (const row of LAYER_ROWS) {
      for (const ph of phases) {
        m.set(`${row.key}::${ph.id}`, emptyCell());
      }
    }
    for (const ph of phases) {
      for (const t of ph.tasks ?? []) {
        const key = `${classifyTask(t)}::${ph.id}`;
        const cell = m.get(key);
        if (!cell) continue;
        cell.count += 1;
        cell.hrs += t.laborHrs;
        cell.usd += t.costUSD;
      }
    }
    return m;
  }, [phases]);

  // Sequencing-violation detection.
  const violations = useMemo(() => {
    const out: Array<{ phaseId: string; phaseName: string; layer: DesignLayer; missing: DesignLayer[] }> = [];
    for (const ph of phases) {
      for (const row of LAYER_ROWS) {
        if (row.key === 'uncategorised') continue;
        if (row.prereqs.length === 0) continue;
        const cell = matrix.get(`${row.key}::${ph.id}`);
        if (!cell || cell.count === 0) continue;
        const missing = row.prereqs.filter((pre) => {
          const c = matrix.get(`${pre}::${ph.id}`);
          return !c || c.count === 0;
        });
        if (missing.length > 0) {
          out.push({ phaseId: ph.id, phaseName: ph.name, layer: row.key as DesignLayer, missing });
        }
      }
    }
    return out;
  }, [phases, matrix]);

  // Coverage: which layers are populated at all (across the whole project).
  const populatedLayers = useMemo(() => {
    const populated = new Set<string>();
    for (const ph of phases) {
      for (const t of ph.tasks ?? []) {
        populated.add(classifyTask(t));
      }
    }
    return populated;
  }, [phases]);

  const totals = useMemo(() => {
    let count = 0, hrs = 0, usd = 0;
    for (const ph of phases) {
      for (const t of ph.tasks ?? []) {
        count += 1;
        hrs += t.laborHrs;
        usd += t.costUSD;
      }
    }
    return { count, hrs, usd };
  }, [phases]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
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
            {violations.map((v, i) => (
              <li key={`${v.phaseId}-${v.layer}-${i}`} className={styles.listRow}>
                <div>
                  <strong>{v.phaseName}</strong> — {LAYER_ROWS.find((r) => r.key === v.layer)?.label} populated
                  <div className={styles.listMeta}>
                    but {v.missing.map((m) => LAYER_ROWS.find((r) => r.key === m)?.label).join(' + ')} is empty in the same phase. Consider sequencing the prerequisite work first.
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
