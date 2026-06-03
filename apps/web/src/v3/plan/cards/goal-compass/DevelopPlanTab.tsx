/**
 * Goal Compass tab 4/5 — bridge from the generated proposal to
 * Phasing & Budgeting.
 *
 * Shows a summary of the generated proposal (phase count, total
 * labor, total cost) and a CTA to open the Phasing & Budgeting
 * module where the steward refines the plan.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useProjectStore } from '../../../../store/projectStore.js';
import { usePhaseStore } from '../../../../store/phaseStore.js';
import { scheduleTasksToCalendar } from '../../engine/goalCompass/scheduleTasksToCalendar.js';
import { pushGoalCompassToSpine } from '../../engine/goalCompass/goalCompassSpineSync.js';
import type { PlanModule } from '../../types.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchModule: (mod: PlanModule) => void;
}

export default function DevelopPlanTab({ project, onSwitchModule }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);
  const replaceGoalCompassRows = usePhaseStore((s) => s.replaceGoalCompassRows);
  const updateProject = useProjectStore((s) => s.updateProject);
  const projectStartDate = useProjectStore(
    (s) => s.projects.find((p) => p.id === project.id)?.startDate ?? null,
  );
  const projectCommencementDate = useProjectStore(
    (s) => s.projects.find((p) => p.id === project.id)?.commencementDate ?? null,
  );

  const generatedPhases = useMemo(
    () => allPhases.filter((p) => p.projectId === project.id && p.generatedFromGoalCompass),
    [allPhases, project.id],
  );

  const hasProposal = generatedPhases.length > 0;

  const handleReschedule = () => {
    if (!hasProposal) return;
    const taskEntries = generatedPhases.flatMap((p) =>
      (p.tasks ?? []).map((task) => ({ phaseId: p.id, task })),
    );
    const scheduled = scheduleTasksToCalendar(
      generatedPhases,
      taskEntries,
      projectStartDate,
    );
    replaceGoalCompassRows(project.id, generatedPhases, scheduled);
    pushGoalCompassToSpine(project.id, generatedPhases, scheduled);
  };

  const totals = useMemo(() => {
    let laborHrs = 0;
    let costUSD = 0;
    for (const phase of generatedPhases) {
      for (const task of phase.tasks ?? []) {
        laborHrs += task.laborHrs;
        costUSD += task.costUSD;
      }
    }
    return { laborHrs, costUSD };
  }, [generatedPhases]);

  return (
    <div className={styles.page}>
      <div className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Goal Compass · 4 of 5</span>
        <h2 className={styles.title}>Develop plan</h2>
        <p className={styles.lede}>
          Your proposal is live in Phasing &amp; Budgeting. Refine phase
          names, costs, timelines, and seasonal tasks there — then return
          to Criteria forecast to see if your goals are on track.
        </p>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Schedule anchor</h3>
        <div className={styles.grid} style={{ marginBottom: 12 }}>
          <div className={styles.field}>
            <label htmlFor="gc-project-start-date">Project start date</label>
            <input
              id="gc-project-start-date"
              type="date"
              value={projectStartDate ?? ''}
              onChange={(e) =>
                updateProject(project.id, { startDate: e.target.value || null })
              }
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="gc-project-commencement-date">Establishment start (land)</label>
            <input
              id="gc-project-commencement-date"
              type="date"
              value={projectCommencementDate ?? ''}
              onChange={(e) =>
                updateProject(project.id, { commencementDate: e.target.value || null })
              }
            />
          </div>
        </div>
        {hasProposal ? (
          <div className={styles.btnRow}>
            <button type="button" className={styles.btn} onClick={handleReschedule}>
              Re-schedule tasks
            </button>
            <span className={styles.hint}>
              Recomputes calendar dates from the current start date.
            </span>
          </div>
        ) : null}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Proposal status</h3>

        {hasProposal ? (
          <>
            <div className={styles.grid} style={{ marginBottom: 16 }}>
              <Stat label="Phases" value={String(generatedPhases.length)} />
              <Stat label="Total labor" value={`${totals.laborHrs} hrs`} />
              <Stat label="Est. cost" value={fmtUSD(totals.costUSD)} />
            </div>
            <div className={styles.btnRow}>
              <button
                type="button"
                className={styles.btn}
                onClick={() => onSwitchModule('economics-capacity')}
              >
                Open Phasing &amp; Budgeting
              </button>
              <span className={styles.hint}>
                Proposal rows are already live — go there to refine them.
              </span>
            </div>
          </>
        ) : (
          <div className={styles.empty}>
            No proposal yet — generate one in the{' '}
            <strong>Proposal</strong> tab first.
          </div>
        )}
      </section>
    </div>
  );
}

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <label style={{ fontSize: 11, color: 'rgba(232,220,200,0.55)', textTransform: 'uppercase' }}>
        {label}
      </label>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'rgba(232,220,200,0.9)', paddingTop: 4 }}>
        {value}
      </div>
    </div>
  );
}
