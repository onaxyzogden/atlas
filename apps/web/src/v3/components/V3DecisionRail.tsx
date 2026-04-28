/**
 * V3DecisionRail — placeholder rail for Phase 1.
 *
 * Phase 2 swaps the body for a generic stage-aware container that mounts
 * per-stage rail panels (DiscoverRail, DiagnoseRail, etc). For Phase 1 it
 * just renders a stage label + a single readiness line so the rail is never
 * empty (RULE 4).
 */

import type { LifecycleStage } from "../types.js";
import css from "./V3DecisionRail.module.css";

export interface V3DecisionRailProps {
  stage: LifecycleStage | "home";
  projectName: string;
  verdictLabel: string;
}

const STAGE_LABEL: Record<LifecycleStage | "home", string> = {
  home: "Project Home",
  discover: "Discover",
  diagnose: "Diagnose",
  design: "Design",
  prove: "Prove",
  build: "Build",
  operate: "Operate",
  report: "Report",
};

export default function V3DecisionRail({ stage, projectName, verdictLabel }: V3DecisionRailProps) {
  return (
    <div className={css.rail}>
      <header className={css.header}>
        <span className={css.eyebrow}>Decision Rail</span>
        <h3 className={css.title}>{STAGE_LABEL[stage]}</h3>
      </header>

      <section className={css.card}>
        <span className={css.cardLabel}>Current Project</span>
        <span className={css.cardValue}>{projectName}</span>
      </section>

      <section className={css.card}>
        <span className={css.cardLabel}>Current Verdict</span>
        <span className={css.cardValue}>{verdictLabel}</span>
      </section>

      <p className={css.note}>
        Stage-specific guidance, blockers, and next actions will appear here once Phase 2 wires the
        per-stage rail panels.
      </p>
    </div>
  );
}
