import type { Project } from "../../types.js";
import css from "./railPanel.module.css";

export default function ProveRail({ project }: { project: Project }) {
  const top = project.blockers[0];
  const next = project.actions.slice(0, 3);
  return (
    <div className={css.panel}>
      <section className={css.section}>
        <span className={css.sectionLabel}>Current Verdict</span>
        <div className={css.card}>
          <span className={css.cardValue}>{project.verdict.label}</span>
          <span className={css.cardSub}>{project.verdict.score} / 100 Vision Fit</span>
        </div>
      </section>

      {top && (
        <section className={css.section}>
          <span className={css.sectionLabel}>Top Blocker</span>
          <div className={css.card}>
            <span className={css.cardValue}>{top.title}</span>
            <span className={css.cardSub}>{top.recommendedAction}</span>
          </div>
        </section>
      )}

      <section className={css.section}>
        <span className={css.sectionLabel}>Next 3 Actions</span>
        <ul className={css.list}>
          {next.map((a) => (
            <li key={a.id} className={css.listItem}>
              <span className={css.dot} />
              <span>{a.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>Readiness Summary</span>
        <div className={css.card}>
          <span className={css.cardSub}>
            Capital <strong>{project.readiness.capitalBurden}</strong> · Ops <strong>{project.readiness.opsBurden}</strong> · Confidence <strong>{project.readiness.confidence}</strong>
          </span>
        </div>
      </section>

      <button type="button" className={css.cta}>Fix on Map</button>
      <button type="button" className={`${css.cta} ${css.ctaSecondary}`}>Generate Brief</button>
    </div>
  );
}
