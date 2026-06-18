/**
 * CoherenceCheckReferenceRail -- the right-rail reference surface for Threshold 2,
 * mounted by PlanTierShell on the `plan/threshold/$thresholdId` route (when
 * `thresholdId === 'threshold-2'`) in place of the dashboard/detail toggle.
 * Read-only: the per-section audit tally, the coherence verdict + open-gap count,
 * the seal state, and the append-only amendments log. Mirrors
 * RealityCheckReferenceRail (the Threshold-1 template).
 *
 * It re-evaluates the same pure audit the center surface does (cheap + pure, so
 * the two stay in lock-step without prop threading through PlanTierShell).
 */

import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { CheckCircle2, Lock } from 'lucide-react';
import {
  EMPTY_COHERENCE_CHECK,
  useCoherenceCheckStore,
} from '../../../store/coherenceCheckStore.js';
import {
  COHERENCE_COPY,
  CSA_ADVISORY_COPY,
  detectCsaLikeText,
  evaluateCoherenceAudit,
  selectDesignObjectives,
} from './coherenceCheckModel.js';
import styles from './Coherence.module.css';

export interface CoherenceCheckReferenceRailProps {
  projectId: string;
  primaryTypeId: string | null | undefined;
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
}

/** YYYY-MM-DD from an epoch-ms timestamp (ASCII + deterministic). */
function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export default function CoherenceCheckReferenceRail({
  projectId,
  primaryTypeId,
  objectives,
  objectiveStatuses,
}: CoherenceCheckReferenceRailProps) {
  const record = useCoherenceCheckStore(
    (s) => s.byProject[projectId] ?? EMPTY_COHERENCE_CHECK,
  );

  const audit = evaluateCoherenceAudit({
    primaryTypeId,
    designObjectives: selectDesignObjectives(objectives),
    statuses: objectiveStatuses,
    resolutions: record.itemResolutions,
  });

  const sealed = record.sealedAt != null;
  const amendments = record.amendments;

  // Amanah: defensive only -- the store refuses CSA-like amendment text, so a
  // recorded amendment is covenant-clean by construction. This surfaces the
  // advisory should a legacy entry ever slip through.
  const csaFlagged = amendments.some((a) => detectCsaLikeText(a.amendmentText));

  return (
    <div className={styles.rail} data-testid="coherence-check-rail">
      <p className={styles.railTitle}>Threshold 2 -- progress</p>

      <div className={styles.railCard}>
        <p className={styles.railCardTitle}>Audit</p>
        <div className={styles.railStat}>
          <span>{COHERENCE_COPY.sectionA.label}</span>
          <span className={styles.railStatValue}>
            {audit.tallies.A.passed}/{audit.tallies.A.total}
          </span>
        </div>
        <div className={styles.railStat}>
          <span>{COHERENCE_COPY.sectionB.label}</span>
          <span className={styles.railStatValue}>
            {audit.tallies.B.passed}/{audit.tallies.B.total}
          </span>
        </div>
        <div className={styles.railStat}>
          <span>{COHERENCE_COPY.sectionC.label}</span>
          <span className={styles.railStatValue}>
            {audit.tallies.C.passed}/{audit.tallies.C.total}
          </span>
        </div>
        <div className={styles.railStat}>
          <span>Open gaps</span>
          <span
            className={styles.railStatValue}
            data-open={audit.openCount > 0 || undefined}
          >
            {audit.openCount}
          </span>
        </div>
        <div className={styles.railStat}>
          <span>{COHERENCE_COPY.seal.verdictLabel}</span>
          <span className={styles.railVerdict} data-verdict={audit.verdict}>
            {audit.verdict === 'pass'
              ? COHERENCE_COPY.seal.verdictPass
              : 'Forming'}
          </span>
        </div>
      </div>

      <div className={styles.railCard}>
        <p className={styles.railCardTitle}>Coherence Record</p>
        {sealed ? (
          <span className={styles.railSealed}>
            <Lock size={14} aria-hidden="true" />
            Sealed {record.sealedAt != null ? formatDay(record.sealedAt) : ''}
          </span>
        ) : audit.verdict === 'pass' ? (
          <span className={styles.railPending}>
            {COHERENCE_COPY.seal.readyLabel}
          </span>
        ) : (
          <span className={styles.railPending}>
            {COHERENCE_COPY.seal.formingTitle} -- {audit.openCount}{' '}
            {audit.openCount === 1 ? 'gap' : 'gaps'} remaining.
          </span>
        )}
      </div>

      <div className={styles.railCard}>
        <p className={styles.railCardTitle}>Amendments</p>
        {amendments.length === 0 ? (
          <p className={styles.amendLogEmpty}>
            No inline amendments recorded yet.
          </p>
        ) : (
          <ul className={styles.amendLogList}>
            {amendments.map((a) => (
              <li key={`${a.itemId}-${a.resolvedAt}`} className={styles.amendLogItem}>
                <span className={styles.amendLogId}>
                  <CheckCircle2 size={11} aria-hidden="true" />{' '}
                  {a.itemId.replace(/^c-/, 'C / ')}
                </span>
                <span className={styles.amendLogText}>{a.amendmentText}</span>
                <span className={styles.amendLogMeta}>
                  Recorded {formatDay(a.resolvedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {csaFlagged && (
        <div className={styles.advisory} role="note" data-testid="csa-advisory-rail">
          <p className={styles.advisoryTitle}>{CSA_ADVISORY_COPY.title}</p>
          <p className={styles.advisoryBody}>{CSA_ADVISORY_COPY.body}</p>
        </div>
      )}
    </div>
  );
}
