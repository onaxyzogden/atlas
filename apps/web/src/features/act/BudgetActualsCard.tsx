/**
 * BudgetActualsCard — ACT-stage Module 1 (Phased Implementation & Budgeting).
 *
 * Joins `phaseStore.BuildPhase.tasks` (estimates from PLAN) against
 * `actualsStore.byProject` (real spend from ACT). Per phase + per task we
 * surface est, act, delta, and variance %. Inline editing on actual hrs/$
 * writes through `upsertActual()`.
 *
 * Orphans by design: if a PhaseTask is deleted in PLAN, the actual entry
 * remains in `actualsStore` until the steward removes it explicitly. This
 * card lists orphans at the bottom with a remove affordance — we do not
 * cascade-delete so the audit history stays intact.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useActualsStore, type TaskActual } from '../../store/actualsStore.js';
import styles from './actCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

interface Draft { hrs: string; usd: string; notes: string; }

export default function BudgetActualsCard({ project }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);
  const actualsByProject = useActualsStore((s) => s.byProject);
  const upsertActual = useActualsStore((s) => s.upsertActual);
  const removeActual = useActualsStore((s) => s.removeActual);

  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === project.id).slice().sort((a, b) => a.order - b.order),
    [allPhases, project.id],
  );
  const projectActuals = useMemo(() => actualsByProject[project.id] ?? {}, [actualsByProject, project.id]);

  // Orphans: actuals whose taskId no longer matches any task on any phase.
  const taskIdSet = useMemo(() => {
    const s = new Set<string>();
    phases.forEach((p) => (p.tasks ?? []).forEach((t) => s.add(t.id)));
    return s;
  }, [phases]);
  const orphans = useMemo(
    () => Object.values(projectActuals).filter((a) => !taskIdSet.has(a.taskId)),
    [projectActuals, taskIdSet],
  );

  // Local draft state per task id, for inline editing.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  function commit(taskId: string) {
    const d = drafts[taskId];
    if (!d) return;
    const hrs = parseFloat(d.hrs);
    const usd = parseFloat(d.usd);
    if (Number.isNaN(hrs) && Number.isNaN(usd)) return;
    const next: TaskActual = {
      taskId,
      actualHrs: Number.isFinite(hrs) ? hrs : 0,
      actualUSD: Number.isFinite(usd) ? usd : 0,
      updatedAt: new Date().toISOString(),
      notes: d.notes.trim() || undefined,
    };
    upsertActual(project.id, next);
    setDrafts((m) => ({ ...m, [taskId]: { hrs: '', usd: '', notes: '' } }));
  }

  function fmtVariance(actual: number, est: number): string {
    if (est === 0) return actual === 0 ? '—' : '∞';
    const pct = ((actual - est) / est) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`;
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Act · Module 1 — Budget Actuals</span>
        <h1 className={styles.title}>Estimated vs Actual</h1>
        <p className={styles.lede}>
          Log real labour hours and dollars against every PLAN-stage seasonal
          task. Variance lights up where estimates drift; orphan actuals
          (task deleted in PLAN) appear at the bottom for explicit cleanup.
        </p>
      </header>

      {phases.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>No phases yet — define them in PLAN → Phasing Matrix.</p>
        </section>
      ) : (
        phases.map((p) => {
          const tasks = p.tasks ?? [];
          let estHrs = 0, estUSD = 0, actHrs = 0, actUSD = 0;
          tasks.forEach((t) => {
            estHrs += t.laborHrs ?? 0;
            estUSD += t.costUSD  ?? 0;
            const a = projectActuals[t.id];
            if (a) { actHrs += a.actualHrs; actUSD += a.actualUSD; }
          });
          return (
            <section key={p.id} className={styles.section}>
              <h2 className={styles.sectionTitle}>
                {p.name} · {p.timeframe}
              </h2>
              <div className={styles.statRow}>
                <span>Total labour (act / est)</span>
                <span>{actHrs} h / {estHrs} h · {fmtVariance(actHrs, estHrs)}</span>
              </div>
              <div className={styles.statRow}>
                <span>Total spend (act / est)</span>
                <span>${actUSD} / ${estUSD} · {fmtVariance(actUSD, estUSD)}</span>
              </div>
              {tasks.length === 0 ? (
                <p className={styles.empty}>No tasks on this phase — add them in PLAN → Seasonal Tasks.</p>
              ) : (
                <table className={styles.table} style={{ marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th className={styles.num}>Est h</th>
                      <th className={styles.num}>Act h</th>
                      <th className={styles.num}>Est $</th>
                      <th className={styles.num}>Act $</th>
                      <th>Log new</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => {
                      const a = projectActuals[t.id];
                      const draft = drafts[t.id] ?? { hrs: '', usd: '', notes: '' };
                      return (
                        <tr key={t.id}>
                          <td>
                            {t.title}
                            <div className={styles.listMeta}>{t.season}</div>
                          </td>
                          <td className={styles.num}>{t.laborHrs}</td>
                          <td className={styles.num}>{a?.actualHrs ?? '—'}</td>
                          <td className={styles.num}>${t.costUSD}</td>
                          <td className={styles.num}>${a?.actualUSD ?? '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <input
                                type="number"
                                placeholder="h"
                                value={draft.hrs}
                                onChange={(ev) =>
                                  setDrafts((m) => ({ ...m, [t.id]: { ...draft, hrs: ev.target.value } }))
                                }
                                style={{ width: 56 }}
                              />
                              <input
                                type="number"
                                placeholder="$"
                                value={draft.usd}
                                onChange={(ev) =>
                                  setDrafts((m) => ({ ...m, [t.id]: { ...draft, usd: ev.target.value } }))
                                }
                                style={{ width: 64 }}
                              />
                              <button type="button" className={styles.btn} onClick={() => commit(t.id)}>
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
          );
        })
      )}

      {orphans.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Orphan actuals</h2>
          <p className={styles.sectionBody}>
            These actuals reference tasks that no longer exist in PLAN. They
            are kept for audit; remove them when you have copied the figures
            into a current task.
          </p>
          <ul className={styles.list} style={{ marginTop: 12 }}>
            {orphans.map((a) => (
              <li key={a.taskId} className={styles.listRow}>
                <span>
                  <strong>Task {a.taskId}</strong>
                  <div className={styles.listMeta}>
                    {a.actualHrs} h · ${a.actualUSD} · {new Date(a.updatedAt).toLocaleDateString()}
                  </div>
                </span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeActual(project.id, a.taskId)}
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
