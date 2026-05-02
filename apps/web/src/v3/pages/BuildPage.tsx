/**
 * /v3/project/:projectId/build — Build Plan.
 *
 * Layout: PageHeader → phase cards stacked. Each card shows phase
 * number/title/window, status pill, blocker count, and a checklist of
 * tasks with status pills. No interactive map (RULE 2 still applies).
 *
 * Phase 6.3 (per `.claude/plans/few-concerns-shiny-quokka.md`):
 *   - Task status pill is now a button that cycles
 *     `todo → in-progress → done → todo`. Blocked tasks click through
 *     to `todo` so a steward can unblock without leaving the page.
 *   - Each phase header carries a "Mark phase complete" action that
 *     bulk-sets every task in the phase to `done`.
 *   - Mutations land in `useBuildTaskStore` (Zustand + localStorage).
 *     The brief fixture remains the source of truth for *structure*
 *     (phase ids, task ids, owners, windows); overrides only modify
 *     `status`. A future server-side task table replaces the storage
 *     half — call sites stay stable.
 *   - Phase status is *derived* from task status: all done → complete;
 *     any non-todo → in-progress; else upcoming. The brief's
 *     hand-authored `status` is used only as a tiebreaker when no
 *     overrides exist.
 */

import { useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import PageHeader from "../components/PageHeader.js";
import { useV3Project } from "../data/useV3Project.js";
import {
  useBuildTaskStore,
  getBuildTaskOverride,
} from "../../store/buildTaskStore.js";
import type {
  BuildPhase,
  BuildPhaseStatus,
  BuildTask,
  BuildTaskStatus,
} from "../types.js";
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

function nextStatus(current: BuildTaskStatus): BuildTaskStatus {
  switch (current) {
    case "todo": return "in-progress";
    case "in-progress": return "done";
    case "done": return "todo";
    // Blocked tasks click through to todo so a steward can unblock
    // them without leaving the page; re-blocking is intentionally
    // out of scope for the inline pill.
    case "blocked": return "todo";
  }
}

function derivePhaseStatus(
  tasks: BuildTask[],
  fallback: BuildPhaseStatus,
): BuildPhaseStatus {
  if (tasks.length === 0) return fallback;
  const allDone = tasks.every((t) => t.status === "done");
  if (allDone) return "complete";
  const anyMoving = tasks.some(
    (t) => t.status === "in-progress" || t.status === "done",
  );
  if (anyMoving) return "in-progress";
  return fallback;
}

export default function BuildPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);
  const overrides = useBuildTaskStore((s) => s.overrides);
  const setStatus = useBuildTaskStore((s) => s.setStatus);
  const markPhaseComplete = useBuildTaskStore((s) => s.markPhaseComplete);

  // Merge brief tasks with stored overrides up front so headline
  // counts and per-phase derived status agree with what the user sees
  // in the list below.
  const phases = useMemo<BuildPhase[]>(() => {
    if (!project?.build) return [];
    const projectId = project.id;
    return project.build.phases.map((phase) => {
      const tasks = phase.tasks.map((t) => {
        const override = getBuildTaskOverride(overrides, projectId, t.id);
        return override ? { ...t, status: override } : t;
      });
      return {
        ...phase,
        tasks,
        status: derivePhaseStatus(tasks, phase.status),
      };
    });
  }, [overrides, project]);

  if (!project) {
    return <p className={css.empty}>No project loaded.</p>;
  }
  if (!project.build) {
    return <div className={css.page}>Build plan is not yet available for this project.</div>;
  }

  const totalTasks = phases.reduce((acc, p) => acc + p.tasks.length, 0);
  const doneTasks = phases.reduce(
    (acc, p) => acc + p.tasks.filter((t) => t.status === "done").length,
    0,
  );
  const blockedTasks = phases.reduce(
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
        {phases.map((phase) => {
          const allDone = phase.tasks.length > 0 && phase.tasks.every((t) => t.status === "done");
          return (
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
                  {!allDone && phase.tasks.length > 0 && (
                    <button
                      type="button"
                      className={css.phaseAction}
                      onClick={() =>
                        markPhaseComplete(
                          project.id,
                          phase.tasks.map((t) => t.id),
                        )
                      }
                    >
                      Mark phase complete
                    </button>
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
                      <button
                        type="button"
                        className={`${css.taskStatusPill} ${css[`tStatus-${t.status}`]}`}
                        onClick={() => setStatus(project.id, t.id, nextStatus(t.status))}
                        aria-label={`Status: ${TASK_STATUS_LABEL[t.status]}. Click to advance.`}
                      >
                        {TASK_STATUS_LABEL[t.status]}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
