import type { Project } from "../../types.js";
import css from "./railPanel.module.css";

export default function OperateRail({ project }: { project: Project }) {
  return (
    <div className={css.panel}>
      <section className={css.section}>
        <span className={css.sectionLabel}>Today's Priorities</span>
        <ul className={css.list}>
          <li className={css.listItem}><span className={css.dot} /><span>Rotate paddock A → B at 09:00</span></li>
          <li className={css.listItem}><span className={css.dot} /><span>Water check at livestock tank</span></li>
          <li className={css.listItem}><span className={css.dot} /><span>Inspect fence line east of barn</span></li>
        </ul>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>Animal &amp; Water Alerts</span>
        <ul className={css.list}>
          <li className={css.listItem}><span className={`${css.dot} ${css.dotWarning}`} /><span>Tank 2 at 35% — refill today</span></li>
          <li className={css.listItem}><span className={`${css.dot} ${css.dotInfo}`} /><span>Heifer #14 due for vet check</span></li>
        </ul>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>Recent Activity</span>
        <ul className={css.list}>
          {project.activity.slice(0, 2).map((a) => (
            <li key={a.id} className={css.listItem}>
              <span className={`${css.dot} ${css.dotGood}`} />
              <span>{a.title} · {a.timestamp}</span>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className={css.cta}>Create Field Task</button>
      <button type="button" className={`${css.cta} ${css.ctaSecondary}`}>Log Observation</button>
    </div>
  );
}
