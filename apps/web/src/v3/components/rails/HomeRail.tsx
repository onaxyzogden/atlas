import type { Project } from "../../types.js";
import css from "./railPanel.module.css";

export default function HomeRail({ project }: { project: Project }) {
  const topBlocker = project.blockers[0];
  const nextActions = project.actions.slice(0, 3);
  return (
    <div className={css.panel}>
      <section className={css.section}>
        <span className={css.sectionLabel}>Current Stage</span>
        <div className={css.card}>
          <span className={css.cardLabel}>{project.verdict.scoreLabel ?? "Verdict"}</span>
          <span className={css.cardValue}>{project.verdict.label}</span>
          <span className={css.cardSub}>{project.verdict.score} / 100</span>
        </div>
      </section>

      {topBlocker && (
        <section className={css.section}>
          <span className={css.sectionLabel}>Top Blocker</span>
          <div className={css.card}>
            <span className={css.cardValue}>{topBlocker.title}</span>
            <span className={css.cardSub}>{topBlocker.recommendedAction}</span>
          </div>
        </section>
      )}

      <section className={css.section}>
        <span className={css.sectionLabel}>Next 3 Actions</span>
        <ul className={css.list}>
          {nextActions.map((a) => (
            <li key={a.id} className={css.listItem}>
              <span className={css.dot} />
              <span>{a.title}{a.dueLabel ? ` — ${a.dueLabel}` : ""}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>Readiness</span>
        <div className={css.card}>
          <span className={css.cardSub}>
            Land Fit <strong>{project.readiness.landFit}</strong> · Design <strong>{project.readiness.designCompleteness}</strong> · Confidence <strong>{project.readiness.confidence}</strong>
          </span>
        </div>
      </section>

      <button type="button" className={css.cta}>Continue Project</button>
    </div>
  );
}
