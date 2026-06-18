/**
 * CoherenceGateBanner -- the SOFT Threshold-2 seal banner. A display-only,
 * derived banner mounted at the top of every downstream (s6 / s7) objective
 * detail in the Plan shell. It NEVER blocks navigation and NEVER touches any
 * prerequisite: it is purely a standing reminder + a sealed-record reading.
 *
 *   - On a downstream stratum (s6 / s7), NOT yet sealed -> an amber-leaning
 *     reminder that the Coherence Check is unsealed, with a shortcut that
 *     NAVIGATES to Threshold 2. Navigation here is not blocked -- the steward
 *     may keep working; the verdict simply is not set yet.
 *   - On a downstream stratum, sealed -> a calm "sealed" confirmation with a
 *     link to review the Coherence Record.
 *   - Off s6 / s7 -> renders nothing.
 *
 * Plan-only: mounted at the PlanTierShell objective-detail call-site beside
 * RealityCheckGateBanner, so the Act stage + the shared ObjectiveDetailPanel
 * stay byte-identical. Mirrors RealityCheckGateBanner (the Threshold-1 soft
 * gate); the gate depends only on the stratum + the store's `sealedAt`, so its
 * props are just `{ projectId, stratumId }`.
 */

import { useNavigate } from '@tanstack/react-router';
import { CheckCircle2, Flag } from 'lucide-react';
import {
  EMPTY_COHERENCE_CHECK,
  useCoherenceCheckStore,
} from '../../../store/coherenceCheckStore.js';
import {
  COHERENCE_GATE_COPY,
  coherenceGateState,
} from './coherenceCheckModel.js';
import styles from './Coherence.module.css';

/** The Threshold-2 id (matches the global THRESHOLDS marker after s5). */
const THRESHOLD_ID = 'threshold-2';

export interface CoherenceGateBannerProps {
  projectId: string;
  /** The stratum the selected objective belongs to (arms on s6 / s7 only). */
  stratumId: string | null | undefined;
}

export default function CoherenceGateBanner({
  projectId,
  stratumId,
}: CoherenceGateBannerProps) {
  const navigate = useNavigate();
  const sealedAt = useCoherenceCheckStore(
    (s) => (s.byProject[projectId] ?? EMPTY_COHERENCE_CHECK).sealedAt,
  );

  const gate = coherenceGateState(stratumId, sealedAt);

  // Off a downstream stratum the gate is silent -- design surfaces unaffected.
  if (!gate.downstream) return null;

  // SOFT: the shortcut navigates to the threshold; it never locks the surface.
  const openThreshold = () => {
    void navigate({
      to: '/v3/project/$projectId/plan/threshold/$thresholdId',
      params: { projectId, thresholdId: THRESHOLD_ID },
    });
  };

  if (gate.pending) {
    const copy = COHERENCE_GATE_COPY.pending;
    return (
      <div
        className={`${styles.gate} ${styles.gatePending}`}
        data-testid="coherence-check-gate"
        data-state="pending"
        role="status"
      >
        <div className={styles.gateHead}>
          <Flag size={15} aria-hidden="true" className={styles.gateIcon} />
          <span className={styles.gatePill}>{copy.pill}</span>
        </div>
        <p className={styles.gateTitle}>{copy.title}</p>
        <p className={styles.gateBody}>{copy.body}</p>
        <button
          type="button"
          className={styles.gateAction}
          data-testid="coherence-gate-open-threshold"
          onClick={openThreshold}
        >
          {copy.action}
        </button>
      </div>
    );
  }

  // Sealed: the calm "sealed" reading + a review link.
  const copy = COHERENCE_GATE_COPY.sealed;
  return (
    <div
      className={`${styles.gate} ${styles.gateSealed}`}
      data-testid="coherence-check-gate"
      data-state="sealed"
      role="note"
    >
      <div className={styles.gateHead}>
        <CheckCircle2 size={15} aria-hidden="true" className={styles.gateIcon} />
        <span className={styles.gatePill}>{copy.pill}</span>
      </div>
      <p className={styles.gateTitle}>{copy.title}</p>
      <p className={styles.gateBody}>{copy.body}</p>
      <button
        type="button"
        className={styles.gateAction}
        data-testid="coherence-gate-open-threshold"
        onClick={openThreshold}
      >
        {copy.action}
      </button>
    </div>
  );
}
