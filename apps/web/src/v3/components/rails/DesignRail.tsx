import type { Project } from "../../types.js";
import css from "./railPanel.module.css";

export default function DesignRail({ project }: { project: Project }) {
  const placement = project.blockers.filter((b) => b.severity === "blocking" || b.severity === "warning").slice(0, 3);
  return (
    <div className={css.panel}>
      <section className={css.section}>
        <span className={css.sectionLabel}>Placement Warnings</span>
        <ul className={css.list}>
          {placement.length === 0 ? (
            <li className={css.listItem}><span className={`${css.dot} ${css.dotGood}`} /><span>No active warnings</span></li>
          ) : placement.map((b) => (
            <li key={b.id} className={css.listItem}>
              <span className={`${css.dot} ${b.severity === "blocking" ? css.dotBlocking : css.dotWarning}`} />
              <span>{b.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>Selected Object</span>
        <div className={css.card}>
          <span className={css.cardSub}>Nothing selected. Click an element on the map to inspect.</span>
        </div>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>Design Completeness</span>
        <div className={css.scoreRow}>
          <span className={css.scoreLabel}>Coverage</span>
          <span className={css.scoreValue}>{project.scores.designCompleteness.value} / 100</span>
        </div>
        <div className={css.bar} aria-hidden="true">
          <div className={css.barFill} style={{ width: `${project.scores.designCompleteness.value}%` }} />
        </div>
      </section>

      <button type="button" className={css.cta}>Generate Design Report</button>
    </div>
  );
}
