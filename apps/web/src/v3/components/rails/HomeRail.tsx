import type { Project } from "../../types.js";
import { LIFECYCLE_STAGES } from "../../../features/land-os/lifecycle.js";
import railCss from "./railPanel.module.css";
import css from "./HomeRail.module.css";

const READINESS_TONE: Record<string, string> = {
  high: "toneGood",
  good: "toneGood",
  strong: "toneGood",
  light: "toneGood",
  mixed: "toneWatch",
  moderate: "toneWatch",
  low: "toneWarning",
  heavy: "toneWarning",
  incomplete: "toneWarning",
};

function readinessLabel(value: string): string {
  switch (value) {
    case "high": return "Strong";
    case "good": return "Good";
    case "mixed": return "Mixed";
    case "low": return "Incomplete";
    case "light": return "Light";
    case "moderate": return "Moderate";
    case "heavy": return "Heavy";
    default: return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

export default function HomeRail({ project }: { project: Project }) {
  const stages = LIFECYCLE_STAGES;
  const currentIdx = stages.findIndex((s) => s.id === project.stage);
  const currentStage = stages[currentIdx >= 0 ? currentIdx : 0];
  // Stage progress is currently a fixture value (mock-only) rather than derived
  // from completed actions. Reference design shows 60% on Discover.
  const progressPct = 60;
  const segments = 5;
  const filledSegments = Math.round((progressPct / 100) * segments);

  const stageDescriptions: Record<string, string> = {
    discover: "Understand the land and opportunities",
    diagnose: "Evaluate feasibility and risks",
    design: "Create resilient land designs",
    prove: "Validate outcomes and stress test",
    build: "Plan implementation and logistics",
    operate: "Manage systems and monitor performance",
    report: "Measure impact and communicate results",
  };

  const topBlocker = project.blockers[0];
  const nextActions = project.actions.filter((a) => a.type !== "decision").slice(0, 3);

  const readinessRows: { label: string; value: string }[] = [
    { label: "Land Fit", value: readinessLabel(project.readiness.landFit) },
    { label: "Design Completeness", value: readinessLabel(project.readiness.designCompleteness) },
    { label: "Operations Burden", value: readinessLabel(project.readiness.opsBurden) },
    { label: "Capital Burden", value: readinessLabel(project.readiness.capitalBurden) },
    { label: "Confidence", value: readinessLabel(project.readiness.confidence) },
  ];

  return (
    <div className={railCss.panel}>
      <section className={railCss.section}>
        <span className={railCss.sectionLabel}>Current Stage</span>
        <div className={railCss.card}>
          <h3 className={css.stageHeading}>{currentStage.label}</h3>
          <span className={css.stageSub}>{stageDescriptions[currentStage.id]}</span>
          <div className={css.segments} aria-label={`Stage progress ${progressPct}%`}>
            {Array.from({ length: segments }).map((_, i) => (
              <span key={i} className={`${css.seg} ${i < filledSegments ? css.segOn : ""}`} />
            ))}
          </div>
          <div className={css.progressMeta}>
            <span className={css.progressLabel}>Stage Progress</span>
            <span className={css.progressValue}>{progressPct}%</span>
          </div>
        </div>
      </section>

      {topBlocker && (
        <section className={railCss.section}>
          <span className={railCss.sectionLabel}>Top Blocker</span>
          <div className={railCss.card}>
            <div className={css.blockerBody}>
              <span className={css.blockerTitle}>{topBlocker.title}</span>
              <span className={css.blockerDesc}>{topBlocker.description}</span>
              {topBlocker.actionLabel && (
                <button type="button" className={css.blockerCta}>{topBlocker.actionLabel}</button>
              )}
            </div>
          </div>
        </section>
      )}

      <section className={railCss.section}>
        <span className={railCss.sectionLabel}>Next 3 Actions</span>
        <div className={railCss.card}>
          <ol className={css.numbered}>
            {nextActions.map((a, i) => (
              <li key={a.id} className={css.numberedItem}>
                <span className={css.num}>{i + 1}</span>
                <span className={css.numText}>{a.title}</span>
              </li>
            ))}
          </ol>
          <div className={css.viewAllRow}>
            <button type="button" className={css.viewAll}>View All Actions</button>
          </div>
        </div>
      </section>

      <section className={railCss.section}>
        <span className={railCss.sectionLabel}>Readiness Summary</span>
        <div className={railCss.card}>
          {readinessRows.map((row) => {
            const toneKey = READINESS_TONE[row.value.toLowerCase()] ?? "toneNeutral";
            return (
              <div key={row.label} className={css.readinessRow}>
                <span className={css.readinessLabel}>{row.label}</span>
                <span className={`${css.readinessValue} ${css[toneKey]}`}>{row.value}</span>
              </div>
            );
          })}
          <button type="button" className={css.fullReport}>View Full Readiness Report</button>
        </div>
      </section>
    </div>
  );
}
