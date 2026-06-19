/**
 * ActMandateEntryCue -- the deliberate Plan-only doorway into Threshold 3 (The
 * Act Mandate). Mounted at the top of the terminal-stratum (s7) objective detail
 * in the Plan shell, beside CoherenceGateBanner. Self-gates: renders ONLY when
 * the selected objective belongs to the Launch-Preparation stratum (s7) --
 * nothing anywhere else. It NEVER blocks and touches no prerequisite; it is
 * purely the intentional entrance to the Act Mandate ceremony.
 *
 * DECOUPLE (2026-06-19): the T3 spine divider stays a decorative separator
 * (REACHABLE_THRESHOLD_IDS = [threshold-1, threshold-2], so it is not
 * spine-clickable). The Act Mandate surface is reached by a deep-link OR by this
 * deliberate s7-terminal cue -- the one-way Begin-Act crossing should be entered
 * intentionally, not bounced into mid-plan by a casual spine click. Route
 * reachability is owned separately by ROUTABLE_THRESHOLD_IDS.
 *
 * Plan-only: imported solely by PlanTierShell, so the Act stage + the shared
 * ObjectiveDetailPanel stay byte-identical. Mirrors CoherenceGateBanner (the
 * Threshold-2 soft gate); the cue depends only on the stratum, so its props are
 * just `{ projectId, stratumId }`.
 */

import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Flag } from 'lucide-react';
import { ACT_MANDATE_COPY, LAUNCH_PREP_STRATUM_ID } from './actMandateModel.js';
import styles from './ActMandate.module.css';

/** The Threshold-3 id (matches the global THRESHOLDS marker after s7). */
const THRESHOLD_ID = 'threshold-3';

export interface ActMandateEntryCueProps {
  projectId: string;
  /** The stratum the selected objective belongs to (arms on s7 only). */
  stratumId: string | null | undefined;
}

export default function ActMandateEntryCue({
  projectId,
  stratumId,
}: ActMandateEntryCueProps) {
  const navigate = useNavigate();

  // Self-gate: only on the terminal Launch-Preparation stratum (s7). The cue is
  // silent everywhere else, so design surfaces are undisturbed.
  if (stratumId !== LAUNCH_PREP_STRATUM_ID) return null;

  // Deliberate doorway: navigates to the Threshold-3 surface. It never blocks
  // and never locks anything -- Begin Act (on that surface) is the only gate.
  const enterMandate = () => {
    void navigate({
      to: '/v3/project/$projectId/plan/threshold/$thresholdId',
      params: { projectId, thresholdId: THRESHOLD_ID },
    });
  };

  const copy = ACT_MANDATE_COPY.entryCue;
  return (
    <div className={styles.entryCue} data-testid="act-mandate-entry-cue" role="note">
      <div className={styles.entryCueHead}>
        <Flag size={15} aria-hidden="true" className={styles.entryCueIcon} />
        <span className={styles.entryCuePill}>{copy.pill}</span>
      </div>
      <p className={styles.entryCueTitle}>{copy.title}</p>
      <p className={styles.entryCueBody}>{copy.body}</p>
      <button
        type="button"
        className={styles.entryCueAction}
        data-testid="act-mandate-enter-button"
        onClick={enterMandate}
      >
        {copy.button}
        <ArrowRight size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
