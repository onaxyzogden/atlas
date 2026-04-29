import type { Project } from "../../types.js";
import css from "./railPanel.module.css";

export default function ReportRail({ project }: { project: Project }) {
  return (
    <div className={css.panel}>
      <section className={css.section}>
        <span className={css.sectionLabel}>Report Snapshot</span>
        <div className={css.card}>
          <span className={css.cardValue}>{project.verdict.label}</span>
          <span className={css.cardSub}>{project.verdict.score} / 100 · {project.blockers.length} blockers · {project.actions.length} actions</span>
        </div>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>Sections</span>
        <ul className={css.list}>
          <li className={css.listItem}><span className={css.dot} /><span>Verdict &amp; Vision Fit</span></li>
          <li className={css.listItem}><span className={css.dot} /><span>Land Diagnosis (7 categories)</span></li>
          <li className={css.listItem}><span className={css.dot} /><span>Blockers &amp; Required Fixes</span></li>
          <li className={css.listItem}><span className={css.dot} /><span>Execution Reality</span></li>
          <li className={css.listItem}><span className={css.dot} /><span>Next Actions</span></li>
        </ul>
      </section>

      <button type="button" className={css.cta}>Generate Summary</button>
      <button type="button" className={`${css.cta} ${css.ctaSecondary}`}>Share Link</button>
    </div>
  );
}
