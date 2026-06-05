/**
 * BudgetCard — ACT-stage budget vs actuals on the canonical WorkItem spine
 * (Sub-project D3). Dedicated card; supersedes the legacy
 * `BudgetActualsCard` (PhaseTask `actualsStore` path), which D3 retires from
 * the Act IA (file preserved for audit, un-mounted).
 *
 * Joins this project's `workItemStore` planned baseline (manual `costUSD`
 * promoted to a degenerate band, else Goal-Compass-seeded `costRangeAuto`,
 * else zero) against the net-new `workItemBudgetStore` recorded actuals,
 * through the pure `analyzeBudget` engine. Renders:
 *   1. Project total — planned / actual / variance bands + render-only drift;
 *   2. Per-phase rollup — band-wise planned/actual/variance;
 *   3. Per-work-item — planned vs actual band, variance, render-only
 *      over-budget badge, inline actual-entry editor (low/mid/high + hrs);
 *   4. Orphan actuals — recorded spend whose WorkItem no longer exists,
 *      kept for audit with an explicit remove (no cascade-delete).
 *
 * Covenant (D3, binding): strictly project cost/budget tracking. No
 * cost-of-capital, financing, advance-purchase, investor/equity, or
 * yield-as-return framing anywhere — those stay in Scholar-gated Sub-project
 * C. Variance/drift is derived at render only — NEVER written to
 * `WorkItem.status` (single-writer spine discipline).
 *
 * Derive discipline: subscribe to store arrays raw, filter+analyse in
 * `useMemo` (never a freshly-allocating selector inside a Zustand selector —
 * wiki/decisions/2026-04-26-zustand-selector-stability.md).
 */

import { useMemo, useState } from 'react';
import { analyzeBudget, type RecordedActual } from '@ogden/shared';
import type { LocalProject } from '../../store/projectStore.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import { useWorkItemBudgetStore } from '../../store/workItemBudgetStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface Draft {
  low: string;
  mid: string;
  high: string;
  hrs: string;
}

const EMPTY: Draft = { low: '', mid: '', high: '', hrs: '' };

const usd = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/** `low / mid / high` band, em-dash when a degenerate point. */
function band(r: { low: number; mid: number; high: number }): string {
  if (r.low === r.mid && r.mid === r.high) return usd(r.mid);
  return `${usd(r.low)} / ${usd(r.mid)} / ${usd(r.high)}`;
}

export default function BudgetCard({ project }: Props) {
  const items = useWorkItemStore((s) => s.items);
  const actuals = useWorkItemBudgetStore((s) => s.actuals);
  const upsertActual = useWorkItemBudgetStore((s) => s.upsertActual);
  const removeActual = useWorkItemBudgetStore((s) => s.removeActual);
  const allPhases = usePhaseStore((s) => s.phases);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const projectItems = useMemo(
    () => items.filter((it) => it.projectId === project.id),
    [items, project.id],
  );
  const projectActuals = useMemo(
    () => actuals.filter((a) => a.projectId === project.id),
    [actuals, project.id],
  );

  const phaseName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allPhases) {
      if (p.projectId === project.id) m.set(p.id, p.name);
    }
    return m;
  }, [allPhases, project.id]);

  const actualsByItemId = useMemo(() => {
    const m = new Map<string, RecordedActual>();
    for (const a of projectActuals) {
      m.set(a.workItemId, { actual: a.actual, actualHrs: a.actualHrs });
    }
    return m;
  }, [projectActuals]);

  const analysis = useMemo(
    () => analyzeBudget(projectItems, actualsByItemId),
    [projectItems, actualsByItemId],
  );

  // Orphans: recorded actuals whose WorkItem no longer exists in the spine.
  const itemIds = useMemo(
    () => new Set(projectItems.map((it) => it.id)),
    [projectItems],
  );
  const orphans = useMemo(
    () => projectActuals.filter((a) => !itemIds.has(a.workItemId)),
    [projectActuals, itemIds],
  );

  function setDraft(id: string, patch: Partial<Draft>) {
    setDrafts((m) => ({ ...m, [id]: { ...(m[id] ?? EMPTY), ...patch } }));
  }

  function commit(workItemId: string) {
    const d = drafts[workItemId] ?? EMPTY;
    const low = parseFloat(d.low);
    const mid = parseFloat(d.mid);
    const high = parseFloat(d.high);
    const hrs = parseFloat(d.hrs);
    // Single-figure shorthand: a lone `mid` fills a degenerate band.
    const hasMid = Number.isFinite(mid);
    const lo = Number.isFinite(low) ? low : hasMid ? mid : 0;
    const hi = Number.isFinite(high) ? high : hasMid ? mid : 0;
    const md = hasMid ? mid : Number.isFinite(low) ? low : 0;
    if (
      !Number.isFinite(low) &&
      !hasMid &&
      !Number.isFinite(high) &&
      !Number.isFinite(hrs)
    ) {
      return;
    }
    upsertActual({
      workItemId,
      projectId: project.id,
      actual: { low: lo, mid: md, high: hi },
      actualHrs: Number.isFinite(hrs) ? hrs : 0,
      updatedAt: new Date().toISOString(),
    });
    setDrafts((m) => ({ ...m, [workItemId]: EMPTY }));
  }

  // Per-phase rollup rows, ordered by the PLAN phase order where known.
  const phaseRows = useMemo(() => {
    const rows = [...analysis.byPhase.entries()];
    const order = new Map<string, number>();
    allPhases
      .filter((p) => p.projectId === project.id)
      .forEach((p) => order.set(p.id, p.order));
    return rows.sort(
      (a, b) => (order.get(a[0]) ?? 1e9) - (order.get(b[0]) ?? 1e9),
    );
  }, [analysis.byPhase, allPhases, project.id]);

  const t = analysis.total;

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="act">
        <span className={styles.heroTag}>Act · Budget vs actuals</span>
        <h1 className={styles.title}>Budget vs actuals</h1>
        <p className={styles.lede}>
          Planned cost (manual estimate or Goal-Compass baseline) against
          recorded spend for this project's work items. Variance and
          over-budget flags are read-only — strictly project cost tracking.
        </p>
      </header>

      {/* ---- Project total ---- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Project total</h2>
        <div className={styles.statRow}>
          <span>Planned (low / mid / high)</span>
          <span>{band(t.planned)}</span>
        </div>
        <div className={styles.statRow}>
          <span>Actual (low / mid / high)</span>
          <span>{band(t.actual)}</span>
        </div>
        <div className={styles.statRow}>
          <span>Variance (actual − planned)</span>
          <span>
            {band(t.variance)}
            {t.drift && (
              <span className={styles.pillUnmet} style={{ marginLeft: 8 }}>
                Over budget
              </span>
            )}
          </span>
        </div>
        <div className={styles.statRow}>
          <span>Actual labour hours</span>
          <span>{t.actualHrs} h</span>
        </div>
      </section>

      {/* ---- Per-phase rollup ---- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Per-phase rollup</h2>
        {phaseRows.length === 0 ? (
          <p className={styles.empty}>No work items yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Phase</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Variance</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {phaseRows.map(([pk, c]) => (
                <tr key={pk || '(no phase)'}>
                  <td>{pk ? (phaseName.get(pk) ?? pk) : '(no phase)'}</td>
                  <td>{band(c.planned)}</td>
                  <td>{band(c.actual)}</td>
                  <td>{band(c.variance)}</td>
                  <td>
                    {c.drift && (
                      <span className={styles.pillUnmet}>Over budget</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ---- Per-work-item variance + actual editor ---- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Work items</h2>
        {projectItems.length === 0 ? (
          <p className={styles.empty}>
            No work items — generate them via Goal Compass or add them in PLAN.
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Work item</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Variance</th>
                <th>Log actual (low / mid / high / hrs)</th>
              </tr>
            </thead>
            <tbody>
              {projectItems.map((it) => {
                const c = analysis.byItemId.get(it.id)!;
                const d = drafts[it.id] ?? EMPTY;
                return (
                  <tr key={it.id}>
                    <td>
                      {it.title}
                      {it.phaseId && (
                        <div className={styles.listMeta}>
                          {phaseName.get(it.phaseId) ?? it.phaseId}
                        </div>
                      )}
                    </td>
                    <td>{band(c.planned)}</td>
                    <td>{band(c.actual)}</td>
                    <td>
                      {band(c.variance)}
                      {c.drift && (
                        <span
                          className={styles.pillUnmet}
                          style={{ marginLeft: 6 }}
                        >
                          Over budget
                        </span>
                      )}
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: 4,
                          alignItems: 'center',
                        }}
                      >
                        <input
                          type="number"
                          placeholder="low"
                          value={d.low}
                          onChange={(e) =>
                            setDraft(it.id, { low: e.target.value })
                          }
                          style={{ width: 64 }}
                        />
                        <input
                          type="number"
                          placeholder="mid"
                          value={d.mid}
                          onChange={(e) =>
                            setDraft(it.id, { mid: e.target.value })
                          }
                          style={{ width: 64 }}
                        />
                        <input
                          type="number"
                          placeholder="high"
                          value={d.high}
                          onChange={(e) =>
                            setDraft(it.id, { high: e.target.value })
                          }
                          style={{ width: 64 }}
                        />
                        <input
                          type="number"
                          placeholder="hrs"
                          value={d.hrs}
                          onChange={(e) =>
                            setDraft(it.id, { hrs: e.target.value })
                          }
                          style={{ width: 56 }}
                        />
                        <button
                          type="button"
                          className={styles.btn}
                          onClick={() => commit(it.id)}
                        >
                          Save
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ---- Orphan actuals ---- */}
      {orphans.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Orphan actuals</h2>
          <p className={styles.sectionBody}>
            Recorded spend whose work item no longer exists. Kept for audit;
            remove once the figures are copied into a current item.
          </p>
          <ul className={styles.list} style={{ marginTop: 12 }}>
            {orphans.map((a) => (
              <li key={a.workItemId} className={styles.listRow}>
                <span>
                  <strong>Item {a.workItemId}</strong>
                  <div className={styles.listMeta}>
                    {band(a.actual)} · {a.actualHrs} h ·{' '}
                    {new Date(a.updatedAt).toLocaleDateString()}
                  </div>
                </span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeActual(project.id, a.workItemId)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
