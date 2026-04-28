import type { Project } from "../../types.js";
import css from "./railPanel.module.css";

export default function BuildRail({ project }: { project: Project }) {
  return (
    <div className={css.panel}>
      <section className={css.section}>
        <span className={css.sectionLabel}>Phase Status</span>
        <div className={css.card}>
          <span className={css.cardValue}>Phase 1 of 3</span>
          <span className={css.cardSub}>Site preparation &amp; water infrastructure</span>
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
        </ul>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>This Week</span>
        <div className={css.card}>
          <span className={css.cardSub}>3 tasks due · 2 in progress · 1 blocked</span>
        </div>
      </section>

      <button type="button" className={css.cta}>Mark Phase Complete</button>
    </div>
  );
}
