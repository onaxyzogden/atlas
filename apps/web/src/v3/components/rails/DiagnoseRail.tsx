import type { CategoryStatus, DiagnoseCategory, Project } from "../../types.js";
import css from "./railPanel.module.css";

const CONSTRAINT_STATUSES: ReadonlyArray<CategoryStatus> = ["blocked", "at-risk", "conditional"];

export default function DiagnoseRail({ project }: { project: Project }) {
  const brief = project.diagnose;
  const verdict = brief?.verdict ?? project.verdict;

  const constraints: DiagnoseCategory[] = brief
    ? brief.categories.filter((c) => CONSTRAINT_STATUSES.includes(c.status)).slice(0, 4)
    : [];
  const fallbackConstraints = Object.values(project.scores)
    .sort((a, b) => a.value - b.value)
    .slice(0, 3);

  const investigations = brief
    ? brief.insights.filter((i) => i.kind === "risk" || i.kind === "limitation").slice(0, 3)
    : [];

  return (
    <div className={css.panel}>
      <section className={css.section}>
        <span className={css.sectionLabel}>Land Verdict</span>
        <div className={css.card}>
          <span className={css.cardValue}>{verdict.label}</span>
          <span className={css.cardSub}>{verdict.score} / 100 · confidence {project.readiness.confidence}</span>
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
          {brief
            ? constraints.map((c) => (
                <li key={c.id} className={css.listItem}>
                  <span className={`${css.dot} ${dotForStatus(c.status)}`} />
                  <span>{c.title} — {c.statusLabel}</span>
                </li>
              ))
            : fallbackConstraints.map((s) => (
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
          {investigations.length > 0
            ? investigations.map((i) => (
                <li key={i.id} className={css.listItem}>
                  <span className={`${css.dot} ${css.dotInfo}`} />
                  <span>{i.title}</span>
                </li>
              ))
            : (
              <>
                <li className={css.listItem}><span className={`${css.dot} ${css.dotInfo}`} /><span>Soil test on north slope</span></li>
                <li className={css.listItem}><span className={`${css.dot} ${css.dotInfo}`} /><span>Confirm wetland setbacks with conservation authority</span></li>
              </>
            )}
        </ul>
      </section>

      <button type="button" className={css.cta}>Open Design Studio</button>
    </div>
  );
}

function dotForStatus(status: CategoryStatus): string {
  switch (status) {
    case "blocked":
    case "at-risk":
      return css.dotBlocking;
    case "conditional":
      return css.dotWarning;
    default:
      return css.dotInfo;
  }
}

function confidencePct(c: Project["readiness"]["confidence"]): number {
  switch (c) {
    case "high": return 90;
    case "good": return 75;
    case "mixed": return 55;
    case "low": return 30;
  }
}
