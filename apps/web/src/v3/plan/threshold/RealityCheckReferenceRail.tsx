/**
 * RealityCheckReferenceRail -- the right-rail reference surface for Threshold 1,
 * mounted by PlanTierShell on the `plan/threshold/$thresholdId` route in place of
 * the dashboard/detail toggle. Read-only: a progress digest (strands read,
 * elements classified, per-status tally), the approval state, and -- when any
 * declared intent or annotation resembles advance-sale / subscription / CSA
 * framing -- the non-blocking Amanah advisory.
 *
 * It re-reads the same `useRealityCheckData` inputs the center surface does (the
 * derivation is cheap + memoised) so the two stay in lock-step without prop
 * threading through PlanTierShell.
 */

import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { Check } from 'lucide-react';
import {
  EMPTY_REALITY_CHECK,
  useRealityCheckStore,
} from '../../../store/realityCheckStore.js';
import {
  CSA_ADVISORY_COPY,
  detectCsaLikeText,
  EVIDENCE_STRANDS,
  STATUS_META,
  type RealityCheckStatus,
} from './realityCheckModel.js';
import { useRealityCheckData } from './useRealityCheckData.js';
import styles from './RealityCheck.module.css';

const STATUS_ORDER: readonly RealityCheckStatus[] = [
  'feasible',
  'conditional',
  'deferred',
  'released',
];

export interface RealityCheckReferenceRailProps {
  projectId: string;
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
}

export default function RealityCheckReferenceRail({
  projectId,
  objectives,
  objectiveStatuses,
}: RealityCheckReferenceRailProps) {
  const { elements } = useRealityCheckData(
    projectId,
    objectives,
    objectiveStatuses,
  );
  const record = useRealityCheckStore(
    (s) => s.byProject[projectId] ?? EMPTY_REALITY_CHECK,
  );

  const strandsRead = Object.keys(record.strandFindings).length;
  const totalStrands = EVIDENCE_STRANDS.length;
  const classifiedCount = elements.filter(
    (e) => record.classifications[e.id]?.status != null,
  ).length;
  const totalElements = elements.length;
  const classifiedPct =
    totalElements === 0
      ? 0
      : Math.round((classifiedCount / totalElements) * 100);

  const tally: Record<RealityCheckStatus, number> = {
    feasible: 0,
    conditional: 0,
    deferred: 0,
    released: 0,
  };
  for (const e of elements) {
    const s = record.classifications[e.id]?.status;
    if (s != null) tally[s] += 1;
  }

  // Amanah: surface the advisory in the rail if ANY entered text is CSA-like.
  const csaFlagged = elements.some((e) => {
    const c = record.classifications[e.id];
    return (
      detectCsaLikeText(e.text) ||
      detectCsaLikeText(c?.condition) ||
      detectCsaLikeText(c?.note) ||
      detectCsaLikeText(c?.gapNote)
    );
  });

  const approved = record.approvedAt != null;

  return (
    <div className={styles.rail} data-testid="reality-check-rail">
      <p className={styles.railTitle}>Threshold 1 -- progress</p>

      <div className={styles.railCard}>
        <p className={styles.railCardTitle}>Phase 1 -- Review</p>
        <div className={styles.railStat}>
          <span>Strands annotated</span>
          <span className={styles.railStatValue}>
            {strandsRead} / {totalStrands}
          </span>
        </div>
        <div className={styles.railStat}>
          <span>Status</span>
          <span className={styles.railStatValue}>
            {record.phase1Ready ? 'Read' : 'In progress'}
          </span>
        </div>
      </div>

      <div className={styles.railCard}>
        <p className={styles.railCardTitle}>Phase 2 -- Direction</p>
        <div className={styles.railStat}>
          <span>Elements classified</span>
          <span className={styles.railStatValue}>
            {classifiedCount} / {totalElements}
          </span>
        </div>
        <div className={styles.railProgressTrack} aria-hidden="true">
          <div
            className={styles.railProgressFill}
            style={{ width: `${classifiedPct}%` }}
          />
        </div>
        {STATUS_ORDER.map((s) => (
          <div key={s} className={styles.railStat}>
            <span>{STATUS_META[s].label}</span>
            <span className={styles.railStatValue}>{tally[s]}</span>
          </div>
        ))}
      </div>

      <div className={styles.railCard}>
        <p className={styles.railCardTitle}>Planning Direction</p>
        {approved ? (
          <span className={styles.railApproved}>
            <Check size={14} aria-hidden="true" />
            Approved
          </span>
        ) : (
          <span className={styles.railPending}>
            Not yet approved -- Mode 4 Design proceeds from this mandate.
          </span>
        )}
      </div>

      {csaFlagged && (
        <div className={styles.advisory} data-testid="csa-advisory-rail" role="note">
          <p className={styles.advisoryTitle}>{CSA_ADVISORY_COPY.title}</p>
          <p className={styles.advisoryBody}>{CSA_ADVISORY_COPY.body}</p>
        </div>
      )}
    </div>
  );
}
