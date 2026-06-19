/**
 * RealityCheckSurface -- the center-canvas takeover for Threshold 1 (The Reality
 * Check), mounted by PlanTierShell on the `plan/threshold/$thresholdId` route in
 * place of the editable map (so NO WebGL mounts here). It owns the amber/gold
 * mode header + the Phase 1 (Review) <-> Phase 2 (Direction) switch; the actual
 * reading/decision work lives in ThresholdReviewPhase / ThresholdDirectionPhase.
 *
 * All live inputs come from `useRealityCheckData` (Tier-0 captures -> typed
 * intent + the per-survey evidence); the persisted steward state comes from
 * `useRealityCheckStore`. Both are read here and threaded down so the phase
 * components stay presentational.
 */

import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { Minus } from 'lucide-react';
import {
  EMPTY_REALITY_CHECK,
  useRealityCheckStore,
} from '../../../store/realityCheckStore.js';
import { REALITY_CHECK_COPY } from './realityCheckModel.js';
import { useRealityCheckData } from './useRealityCheckData.js';
import ThresholdReviewPhase from './ThresholdReviewPhase.js';
import ThresholdDirectionPhase from './ThresholdDirectionPhase.js';
import styles from './RealityCheck.module.css';

export interface RealityCheckSurfaceProps {
  projectId: string;
  projectName: string;
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
}

export default function RealityCheckSurface({
  projectId,
  projectName,
  objectives,
  objectiveStatuses,
}: RealityCheckSurfaceProps) {
  const { elements, perSurvey } = useRealityCheckData(
    projectId,
    objectives,
    objectiveStatuses,
  );
  const record = useRealityCheckStore(
    (s) => s.byProject[projectId] ?? EMPTY_REALITY_CHECK,
  );
  const phase: 'review' | 'direction' = record.phase1Ready
    ? 'direction'
    : 'review';

  return (
    <div
      className={styles.surface}
      data-testid="reality-check-surface"
      data-phase={phase}
    >
      <header className={styles.modeHeader}>
        <div className={styles.modeBar}>
          <span className={styles.modePill}>{REALITY_CHECK_COPY.modeLabel}</span>
          <h1 className={styles.modeTitle}>{REALITY_CHECK_COPY.title}</h1>
        </div>
        <p className={styles.modeTagline}>{REALITY_CHECK_COPY.tagline}</p>
        <ol className={styles.phaseTrack} aria-label="Threshold phases">
          <li
            className={styles.phaseStep}
            data-active={phase === 'review' || undefined}
            data-done={record.phase1Ready || undefined}
          >
            <span className={styles.phaseStepNum}>1</span>
            <span>{REALITY_CHECK_COPY.phase1.label}</span>
          </li>
          <li
            className={styles.phaseStep}
            data-active={phase === 'direction' || undefined}
          >
            <span className={styles.phaseStepNum}>2</span>
            <span>{REALITY_CHECK_COPY.phase2.label}</span>
          </li>
        </ol>
      </header>

      <div className={styles.phaseBody}>
        {phase === 'review' ? (
          <ThresholdReviewPhase
            projectId={projectId}
            elements={elements}
            perSurvey={perSurvey}
            strandFindings={record.strandFindings}
          />
        ) : (
          <ThresholdDirectionPhase
            projectId={projectId}
            projectName={projectName}
            elements={elements}
            record={record}
          />
        )}

        {/* Reassurance block: what Threshold 1 does NOT do (parity with T2/T3). */}
        <ul className={styles.notList} aria-label="What this threshold does not do">
          {REALITY_CHECK_COPY.notList.map((line) => (
            <li key={line} className={styles.notItem}>
              <Minus size={13} aria-hidden="true" className={styles.notDot} />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
