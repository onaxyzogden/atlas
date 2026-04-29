import { useEffect, useState } from "react";
import type { Project } from "../../types.js";
import css from "./railPanel.module.css";

const PROVE_ANCHORS = [
  { id: "prove-blockers",   label: "Blocking Issues" },
  { id: "prove-best-uses",  label: "Best Uses" },
  { id: "prove-vision-fit", label: "Vision Fit" },
  { id: "prove-execution",  label: "Execution Reality" },
  { id: "prove-rules",      label: "Design Rules" },
] as const;

function useScrollSpy(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0 && visible[0]) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

export default function ProveRail({ project }: { project: Project }) {
  const top = project.blockers[0];
  const activeId = useScrollSpy(PROVE_ANCHORS.map((a) => a.id));

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={css.panel}>
      <section className={css.section}>
        <span className={css.sectionLabel}>Sections</span>
        <ul className={css.list}>
          {PROVE_ANCHORS.map((a) => (
            <li
              key={a.id}
              className={`${css.listItem} ${activeId === a.id ? css.listItemActive : ""}`}
            >
              <button
                type="button"
                className={css.anchorBtn}
                onClick={() => jumpTo(a.id)}
                aria-current={activeId === a.id ? "location" : undefined}
              >
                <span className={`${css.dot} ${activeId === a.id ? css.dotActive : ""}`} />
                <span>{a.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

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
