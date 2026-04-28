/**
 * BuildRail — right-rail companion for /v3/project/:id/build.
 *
 * Reads from project.build for phase status + open blockers count, and
 * falls back to project.blockers for the headline blocker list.
 */

import type { Project } from "../../types.js";
import css from "./railPanel.module.css";

export default function BuildRail({ project }: { project: Project }) {
  const brief = project.build;
  const activePhase = brief?.phases.find((p) => p.status === "in-progress") ?? brief?.phases[0];
  const completedCount = brief?.phases.filter((p) => p.status === "complete").length ?? 0;
  const totalPhases = brief?.phases.length ?? 0;

  const tasksAcross = brief?.phases.flatMap((p) => p.tasks) ?? [];
  const dueThisWeek = tasksAcross.filter((t) => t.status === "in-progress").length;
  const blocked = tasksAcross.filter((t) => t.status === "blocked").length;
  const todo = tasksAcross.filter((t) => t.status === "todo").length;

  return (
    <div className={css.panel}>
      <section className={css.section}>
        <span className={css.sectionLabel}>Phase Status</span>
        <div className={css.card}>
          <span className={css.cardValue}>
            {activePhase ? `Phase ${activePhase.number} of ${totalPhases}` : "No phases"}
          </span>
          <span className={css.cardSub}>
            {activePhase?.title ?? "Build plan not loaded"}
          </span>
          {totalPhases > 0 && (
            <span className={css.cardSub}>{completedCount} of {totalPhases} complete</span>
          )}
        </div>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>Open Blockers</span>
        <ul className={css.list}>
          {project.blockers.slice(0, 3).map((b) => (
            <li key={b.id} className={css.listItem}>
              <span className={`${css.dot} ${b.severity === "blocking" ? css.dotBlocking : css.dotWarning}`} />
              <span>{b.title}</span>
            </li>
          ))}
          {project.blockers.length === 0 && (
            <li className={css.listItem}><span className={css.cardSub}>No open blockers</span></li>
          )}
        </ul>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>This Week</span>
        <div className={css.card}>
          <span className={css.cardSub}>
            {dueThisWeek} in progress · {blocked} blocked · {todo} queued
          </span>
        </div>
      </section>

      <button type="button" className={css.cta}>Mark Phase Complete</button>
    </div>
  );
}
