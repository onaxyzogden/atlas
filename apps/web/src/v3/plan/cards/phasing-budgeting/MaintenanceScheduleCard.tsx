/**
 * MaintenanceScheduleCard — Plan Module 7 (Phasing & Budgeting).
 *
 * Operational maintenance rollup (spec §4.3.3). The synthetic
 * "Ongoing maintenance (recurring)" BuildPhase + its tagged
 * `isMaintenanceTask` PhaseTasks are woven into the plan by
 * `computeMaintenanceSchedule` at the `runAutoDesign` orchestrator
 * seam. This card is the read-only surface: it reconstructs the rollup
 * from the persisted maintenance tasks (per-frequency labor/cost,
 * annualised labor/cost, materials procurement, skilled help beyond
 * the household, equipment dependency).
 *
 * Mirrors the `CumulativeInvestmentCard.tsx` data pattern:
 * `usePhaseStore` subscription + `useMemo` derivation, no store writes.
 *
 * Spec ref: OLOS_Atlas_Platform_Workflow_Spec_v1.docx §4.3.3.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { usePhaseStore, type PhaseTask } from '../../../../store/phaseStore.js';
import type { MaintenanceFrequency } from '../../data/goalCompassTypes.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

/** Occurrences per year — used to annualise per-occurrence labor/cost. */
const OCCURRENCES_PER_YEAR: Record<MaintenanceFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  annual: 1,
  biennial: 0.5,
  'every-3-years': 1 / 3,
};

const FREQUENCY_ORDER: MaintenanceFrequency[] = [
  'monthly',
  'quarterly',
  'annual',
  'biennial',
  'every-3-years',
];

const FREQUENCY_LABEL: Record<MaintenanceFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
  biennial: 'Biennial',
  'every-3-years': 'Every 3 years',
};

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

function fmtUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

interface FrequencyBucketVM {
  freq: MaintenanceFrequency;
  taskCount: number;
  laborHrsPerOccurrence: number;
  costUSDPerOccurrence: number;
}

export default function MaintenanceScheduleCard({ project }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);

  const tasks = useMemo<PhaseTask[]>(() => {
    const out: PhaseTask[] = [];
    for (const p of allPhases) {
      if (p.projectId !== project.id) continue;
      for (const t of p.tasks ?? []) {
        if (t.isMaintenanceTask) out.push(t);
      }
    }
    return out;
  }, [allPhases, project.id]);

  const rollup = useMemo(() => {
    const byFrequency = new Map<MaintenanceFrequency, FrequencyBucketVM>();
    let annualisedLaborHrs = 0;
    let annualisedCostUSD = 0;
    const materialIndex = new Map<
      string,
      { label: string; unit: string; sources: Set<string> }
    >();
    const externalPersonnel: {
      skillLevel: string;
      minCount: number;
      from: string;
    }[] = [];
    const equipment = new Set<string>();

    for (const t of tasks) {
      const freq = t.recurrenceFrequency;
      if (!freq) continue;
      const perYear = OCCURRENCES_PER_YEAR[freq];
      const bucket = byFrequency.get(freq) ?? {
        freq,
        taskCount: 0,
        laborHrsPerOccurrence: 0,
        costUSDPerOccurrence: 0,
      };
      bucket.taskCount += 1;
      bucket.laborHrsPerOccurrence += t.laborHrs;
      bucket.costUSDPerOccurrence += t.costUSD;
      byFrequency.set(freq, bucket);

      annualisedLaborHrs += t.laborHrs * perYear;
      annualisedCostUSD += t.costUSD * perYear;

      for (const m of t.materials ?? []) {
        const k = `${m.label}|${m.unit}`;
        const existing = materialIndex.get(k);
        if (existing) {
          existing.sources.add(t.title);
        } else {
          materialIndex.set(k, {
            label: m.label,
            unit: m.unit,
            sources: new Set([t.title]),
          });
        }
      }

      if (t.requiredPersonnel) {
        externalPersonnel.push({
          skillLevel: t.requiredPersonnel.skillLevel ?? 'skilled',
          minCount: t.requiredPersonnel.minCount,
          from: t.title,
        });
      }

      for (const e of t.equipmentRequired ?? []) equipment.add(e);
    }

    const buckets = FREQUENCY_ORDER.map((f) => byFrequency.get(f)).filter(
      (b): b is FrequencyBucketVM => b !== undefined,
    );
    const materials = [...materialIndex.values()]
      .map((m) => ({
        label: m.label,
        unit: m.unit,
        sources: [...m.sources].sort(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      buckets,
      annualisedLaborHrs,
      annualisedCostUSD,
      materials,
      externalPersonnel,
      equipment: [...equipment].sort(),
    };
  }, [tasks]);

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 7 · Phasing</span>
        <h1 className={styles.title}>Maintenance schedule</h1>
        <p className={styles.lede}>
          One-time install is captured by the build phases; this is the
          <em> recurring</em> upkeep once interventions are established —
          labor, cost, materials, skilled help beyond the household, and
          equipment. Generated from the maintenance metadata on the
          intervention catalog and the recurring regeneration methods
          (spec §4.3.3).
        </p>
      </header>

      {tasks.length === 0 ? (
        <section className={styles.section}>
          <p className={styles.empty}>
            No recurring maintenance yet. Run Auto-design from the Goal
            Compass — selected interventions carrying upkeep metadata emit
            an "Ongoing maintenance" phase here.
          </p>
        </section>
      ) : (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Annualised commitment</h2>
            <div className={styles.statRow}>
              <span>Recurring labor / year</span>
              <span>{Math.round(rollup.annualisedLaborHrs)} h</span>
            </div>
            <div className={styles.statRow}>
              <span>Recurring cost / year</span>
              <span>{fmtUSD(rollup.annualisedCostUSD)}</span>
            </div>
            <div className={styles.statRow}>
              <span>Recurring tasks</span>
              <span>{tasks.length}</span>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>By frequency</h2>
            <ul className={styles.list}>
              {rollup.buckets.map((b) => (
                <li key={b.freq} className={styles.listRow}>
                  <div>
                    <strong>{FREQUENCY_LABEL[b.freq]}</strong>
                    <div className={styles.listMeta}>
                      {b.taskCount} task{b.taskCount === 1 ? '' : 's'} ·{' '}
                      {OCCURRENCES_PER_YEAR[b.freq] >= 1
                        ? `${OCCURRENCES_PER_YEAR[b.freq]}×/yr`
                        : `every ${Math.round(1 / OCCURRENCES_PER_YEAR[b.freq])} yr`}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <div>
                      {b.laborHrsPerOccurrence} h · {fmtUSD(b.costUSDPerOccurrence)}
                    </div>
                    <div className={styles.listMeta}>per occurrence</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Recurring tasks</h2>
            <ul className={styles.list}>
              {tasks.map((t) => (
                <li key={t.id} className={styles.listRow}>
                  <div>
                    <strong>{t.title}</strong>
                    <div className={styles.listMeta}>
                      {t.recurrenceFrequency
                        ? FREQUENCY_LABEL[t.recurrenceFrequency]
                        : 'recurring'}
                      {t.requiredPersonnel
                        ? ` · needs ${t.requiredPersonnel.minCount}× ${
                            t.requiredPersonnel.skillLevel ?? 'skilled'
                          }`
                        : ''}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {t.laborHrs} h · {fmtUSD(t.costUSD)}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {rollup.materials.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Materials procurement</h2>
              <ul className={styles.list}>
                {rollup.materials.map((m) => (
                  <li key={`${m.label}|${m.unit}`} className={styles.listRow}>
                    <div>
                      <strong>{m.label}</strong>
                      <div className={styles.listMeta}>
                        for {m.sources.join(', ')}
                      </div>
                    </div>
                    <div>{m.unit}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {rollup.externalPersonnel.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Skilled help beyond the household
              </h2>
              <ul className={styles.list}>
                {rollup.externalPersonnel.map((p, i) => (
                  <li key={`${p.from}-${i}`} className={styles.listRow}>
                    <div>
                      <strong>{p.skillLevel}</strong>
                      <div className={styles.listMeta}>for {p.from}</div>
                    </div>
                    <div>×{p.minCount}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {rollup.equipment.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Equipment dependency</h2>
              <ul className={styles.list}>
                {rollup.equipment.map((e) => (
                  <li key={e} className={styles.listRow}>
                    <div>{e}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
