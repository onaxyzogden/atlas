/**
 * LoopDesignScorePanel - whole-surface read-only "Loop Design Score" strip for
 * PLAN Module 5 (Slice A1). Mounts above the List/Dashboard switcher in
 * WasteVectorTool so the score is visible in both views.
 *
 * Presentational: it reads the project-scoped flows + validation, hands them to
 * the pure computeLoopDesignScore helper, and renders the result. All scoring
 * logic lives in loopDesignScore.ts (tested there); this file only wires data
 * and markup.
 */

import { useMemo } from "react";
import type { LocalProject } from "../../../store/projectStore.js";
import { useClosedLoopStore } from "../../../store/closedLoopStore.js";
import { useClosedLoopValidation } from "../useClosedLoopValidation.js";
import {
  computeLoopDesignScore,
  LOOP_DESIGN_TIER_CONFIG,
} from "./loopDesignScore.js";
import styles from "./LoopDesignScorePanel.module.css";

interface Props {
  project: LocalProject;
}

export default function LoopDesignScorePanel({ project }: Props) {
  const allFlows = useClosedLoopStore((s) => s.materialFlows);
  const flows = useMemo(
    () => allFlows.filter((f) => f.projectId === project.id),
    [allFlows, project.id],
  );

  const validation = useClosedLoopValidation(project);
  const orphanCount =
    validation.orphanFertility.length + validation.isolatedFeatures.length;

  const score = useMemo(
    () => computeLoopDesignScore(flows, orphanCount),
    [flows, orphanCount],
  );

  const tier = LOOP_DESIGN_TIER_CONFIG[score.tier];

  return (
    <section
      className={styles.panel}
      aria-label="Loop design score"
      data-testid="loop-design-score"
    >
      <div className={styles.scoreBlock}>
        <span className={styles.scoreValue} data-tone={tier.tone}>
          {score.flowCount === 0 ? "--" : score.overallScore}
        </span>
        <span className={styles.scoreOutOf}>/ 100</span>
        <span className={styles.tierBadge} data-tone={tier.tone}>
          {tier.label}
        </span>
      </div>

      <dl className={styles.metrics}>
        <div className={styles.metric}>
          <dt className={styles.metricLabel}>Closed loop</dt>
          <dd className={styles.metricValue}>{score.closedLoopPct}%</dd>
        </div>
        <div className={styles.metric}>
          <dt className={styles.metricLabel}>With cadence</dt>
          <dd className={styles.metricValue}>{score.withCadencePct}%</dd>
        </div>
        <div className={styles.metric}>
          <dt className={styles.metricLabel}>At risk</dt>
          <dd
            className={styles.metricValue}
            data-warn={score.atRiskCount > 0 ? "true" : undefined}
          >
            {score.atRiskCount}
          </dd>
        </div>
        <div className={styles.metric}>
          <dt className={styles.metricLabel}>Orphan nodes</dt>
          <dd
            className={styles.metricValue}
            data-warn={score.orphanCount > 0 ? "true" : undefined}
          >
            {score.orphanCount}
          </dd>
        </div>
      </dl>
    </section>
  );
}
