/**
 * /v3/project/:projectId/build — Build Plan (Phase 8 MVP).
 *
 * Layout: PageHeader → phase cards stacked. Each card shows phase
 * number/title/window, status pill, blocker count, and a checklist of
 * tasks with status pills. No interactive map (RULE 2 still applies).
 */

import { useParams } from "@tanstack/react-router";
import PageHeader from "../components/PageHeader.js";
import { useV3Project } from "../data/useV3Project.js";
import type { BuildPhaseStatus, BuildTaskStatus } from "../types.js";
import css from "./BuildPage.module.css";

const PHASE_STATUS_LABEL: Record<BuildPhaseStatus, string> = {
  "complete": "Complete",
  "in-progress": "In progress",
  "upcoming": "Upcoming",
};

const TASK_STATUS_LABEL: Record<BuildTaskStatus, string> = {
  "todo": "Todo",
  "in-progress": "In progress",
  "done": "Done",
  "blocked": "Blocked",
};

export default function BuildPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);

  if (!project) {
    return <p className={css.empty}>No project loaded.</p>;
  }

  const brief = project.build;
  if (!brief) {
    return <div className={css.page}>Build plan is not yet available for this project.</div>;
  }

  const totalTasks = brief.phases.reduce((acc, p) => acc + p.tasks.length, 0);
  const doneTasks = brief.phases.reduce(
    (acc, p) => acc + p.tasks.filter((t) => t.status === "done").length,
    0,
  );
  const blockedTasks = brief.phases.reduce(
    (acc, p) => acc + p.tasks.filter((t) => t.status === "blocked").length,
    0,
  );

  return (
    <div className={css.page}>
      <PageHeader
        eyebrow="Build"
        title="Build Plan"
        subtitle="Turn the design into phased tasks, infrastructure, and logistics."
        actions={
          <div className={css.headerStats}>
            <span className={css.statPill}>{doneTasks}/{totalTasks} done</span>
            {blockedTasks > 0 && (
              <span className={`${css.statPill} ${css.statBlocked}`}>{blockedTasks} blocked</span>
            )}
          </div>
        }
      />

      <div className={css.phaseStack}>
        {brief.phases.map((phase) => (
          <article key={phase.id} className={`${css.phase} ${css[`phaseStatus-${phase.status}`]}`} aria-labelledby={`phase-${phase.id}`}>
            <header className={css.phaseHeader}>
              <div className={css.phaseTitleBlock}>
                <span className={css.phaseNumber}>Phase {phase.number}</span>
                <h2 id={`phase-${phase.id}`} className={css.phaseTitle}>{phase.title}</h2>
                <p className={css.phaseSummary}>{phase.summary}</p>
              </div>
              <div className={css.phaseMeta}>
                <span className={`${css.statusPill} ${css[`status-${phase.status}`]}`}>
                  {PHASE_STATUS_LABEL[phase.status]}
                </span>
                {phase.window && <span className={css.window}>{phase.window}</span>}
                {phase.blockerCount > 0 && (
                  <span className={css.blockerChip}>
                    {phase.blockerCount} blocker{phase.blockerCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </header>
            <ul className={css.taskList}>
              {phase.tasks.map((t) => (
                <li key={t.id} className={`${css.task} ${css[`taskStatus-${t.status}`]}`}>
                  <span className={`${css.taskDot} ${css[`dot-${t.status}`]}`} aria-hidden="true" />
                  <span className={css.taskTitle}>{t.title}</span>
                  <span className={css.taskMeta}>
                    {t.owner && <span className={css.owner}>{t.owner}</span>}
                    {t.dueLabel && <span className={css.due}>{t.dueLabel}</span>}
                    <span className={`${css.taskStatusPill} ${css[`tStatus-${t.status}`]}`}>
                      {TASK_STATUS_LABEL[t.status]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
