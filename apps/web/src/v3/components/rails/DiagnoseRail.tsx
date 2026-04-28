import type { Project } from "../../types.js";
import css from "./railPanel.module.css";

export default function DiagnoseRail({ project }: { project: Project }) {
  const lowest = Object.values(project.scores).sort((a, b) => a.value - b.value).slice(0, 3);
  return (
    <div className={css.panel}>
      <section className={css.section}>
        <span className={css.sectionLabel}>Land Verdict</span>
        <div className={css.card}>
          <span className={css.cardValue}>{project.verdict.label}</span>
          <span className={css.cardSub}>{project.verdict.score} / 100 · confidence {project.readiness.confidence}</span>
        </div>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>Confidence</span>
        <div className={css.bar} aria-hidden="true">
          <div className={css.barFill} style={{ width: `${confidencePct(project.readiness.confidence)}%` }} />
        </div>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>Top Constraints</span>
        <ul className={css.list}>
          {lowest.map((s) => (
            <li key={s.category} className={css.listItem}>
              <span className={`${css.dot} ${s.value < 50 ? css.dotBlocking : css.dotWarning}`} />
              <span>{s.category} — {s.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>Recommended Investigations</span>
        <ul className={css.list}>
          <li className={css.listItem}><span className={`${css.dot} ${css.dotInfo}`} /><span>Soil test on north slope</span></li>
          <li className={css.listItem}><span className={`${css.dot} ${css.dotInfo}`} /><span>Confirm wetland setbacks with conservation authority</span></li>
        </ul>
      </section>

      <button type="button" className={css.cta}>Open Design Studio</button>
    </div>
  );
}

function confidencePct(c: Project["readiness"]["confidence"]): number {
  switch (c) {
    case "high": return 90;
    case "good": return 75;
    case "mixed": return 55;
    case "low": return 30;
  }
}
