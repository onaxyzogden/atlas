/**
 * WasteRoutingChecklistCard — ACT-stage Module 2 (Maintenance & Operations).
 *
 * Each PLAN-stage `WasteVector` describes a closed-loop route ("kitchen
 * scraps → chickens", "greywater → orchard"). This card lets the steward
 * log each cycle ("ran the chicken bucket") so the system shows, per
 * vector: last-run-X-days-ago and a 30-day run histogram.
 *
 * Runs persist on `siteAnnotationsStore.wasteVectorRuns` (added in v3).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useClosedLoopStore } from '../../store/closedLoopStore.js';
import { newAnnotationId, type WasteVectorRun } from '../../store/site-annotations.js';
import styles from './actCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

const HIST_DAYS = 30;
const DAY_MS = 24 * 3600 * 1000;

export default function WasteRoutingChecklistCard({ project }: Props) {
  const allVectors = useClosedLoopStore((s) => s.wasteVectors);
  const allRuns = useClosedLoopStore((s) => s.wasteVectorRuns);
  const addRun = useClosedLoopStore((s) => s.addWasteVectorRun);
  const removeRun = useClosedLoopStore((s) => s.removeWasteVectorRun);

  const vectors = useMemo(
    () => allVectors.filter((v) => v.projectId === project.id),
    [allVectors, project.id],
  );
  const runs = useMemo(
    () => allRuns.filter((r) => r.projectId === project.id),
    [allRuns, project.id],
  );
  const runsByVector = useMemo(() => {
    const m = new Map<string, WasteVectorRun[]>();
    runs.forEach((r) => {
      const list = m.get(r.vectorId) ?? [];
      list.push(r);
      m.set(r.vectorId, list);
    });
    return m;
  }, [runs]);

  const today = Date.now();
  const earliest = today - HIST_DAYS * DAY_MS;

  function logRun(vectorId: string) {
    const entry: WasteVectorRun = {
      id: newAnnotationId('wvr'),
      projectId: project.id,
      vectorId,
      runDate: new Date().toISOString().slice(0, 10),
    };
    addRun(entry);
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Act · Module 2 — Closed-Loop Cycles</span>
        <h1 className={styles.title}>Waste Routing Checklist</h1>
        <p className={styles.lede}>
          One row per PLAN-stage waste vector. Click &ldquo;Log run&rdquo;
          when you actually moved the bucket; the 30-day histogram shows
          which loops are turning and which are stalling.
        </p>
      </header>

      <section className={styles.section}>
        {vectors.length === 0 ? (
          <p className={styles.empty}>No waste vectors yet — design them in PLAN → Waste Vectors.</p>
        ) : (
          <ul className={styles.list}>
            {vectors.map((v) => {
              const list = (runsByVector.get(v.id) ?? []).slice().sort((a, b) => (a.runDate < b.runDate ? 1 : -1));
              const last = list[0];
              const lastDays = last ? Math.floor((today - new Date(last.runDate).getTime()) / DAY_MS) : null;

              // 30-day histogram: 1 cell per day, today on the right.
              const cells: boolean[] = [];
              for (let i = HIST_DAYS - 1; i >= 0; i--) {
                const dayStart = today - i * DAY_MS;
                const dayEnd = dayStart + DAY_MS;
                cells.push(list.some((r) => {
                  const t = new Date(r.runDate).getTime();
                  return t >= dayStart - DAY_MS && t < dayEnd;
                }));
              }
              const recentCount = list.filter((r) => new Date(r.runDate).getTime() >= earliest).length;

              return (
                <li key={v.id} className={styles.listRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <span>
                      <strong>{v.label}</strong>
                      <div className={styles.listMeta}>
                        {v.resourceType} · {recentCount} run{recentCount === 1 ? '' : 's'} in last {HIST_DAYS} days
                        {lastDays !== null && ` · last ${lastDays} day${lastDays === 1 ? '' : 's'} ago`}
                      </div>
                    </span>
                    <button type="button" className={styles.btn} onClick={() => logRun(v.id)}>Log run</button>
                  </div>
                  {/* Histogram strip */}
                  <div style={{ display: 'flex', gap: 2 }}>
                    {cells.map((on, i) => (
                      <div
                        key={i}
                        title={`${HIST_DAYS - 1 - i} day(s) ago`}
                        style={{
                          flex: 1,
                          height: 14,
                          borderRadius: 2,
                          background: on
                            ? 'rgba(var(--color-gold-rgb),0.7)'
                            : 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}
                      />
                    ))}
                  </div>
                  {last && (
                    <div className={styles.listMeta}>
                      Most recent: {last.runDate}
                      <button
                        type="button"
                        className={styles.removeBtn}
                        style={{ marginLeft: 8 }}
                        onClick={() => removeRun(last.id)}
                      >
                        Undo
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
