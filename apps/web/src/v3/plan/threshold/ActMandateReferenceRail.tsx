/**
 * ActMandateReferenceRail -- the right-rail reference surface for Threshold 3,
 * mounted by PlanTierShell on the `plan/threshold/$thresholdId` route (when
 * `thresholdId === 'threshold-3'`) in place of the dashboard/detail toggle.
 * Read-only: the three key documents' presence, the handoff tally (derived +
 * synthetic), and the advisory readiness. Mirrors CoherenceCheckReferenceRail
 * (the Threshold-2 template).
 *
 * It re-assembles the same pure model the center surface does (cheap + pure, so
 * the two stay in lock-step without prop threading through PlanTierShell).
 */

import {
  findPlanStratum,
  type PlanStratumObjective,
  type PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { CheckCircle2, Circle } from 'lucide-react';
import {
  EMPTY_REALITY_CHECK,
  useRealityCheckStore,
} from '../../../store/realityCheckStore.js';
import {
  EMPTY_COHERENCE_CHECK,
  useCoherenceCheckStore,
} from '../../../store/coherenceCheckStore.js';
import { ACT_MANDATE_COPY, assembleActMandate } from './actMandateModel.js';
import styles from './ActMandate.module.css';

export interface ActMandateReferenceRailProps {
  projectId: string;
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
}

function PresenceValue({ present }: { present: boolean }) {
  return (
    <span className={styles.railPresence} data-present={present || undefined}>
      {present ? (
        <CheckCircle2 size={13} aria-hidden="true" />
      ) : (
        <Circle size={13} aria-hidden="true" />
      )}
      {present ? 'In hand' : 'Pending'}
    </span>
  );
}

export default function ActMandateReferenceRail({
  projectId,
  objectives,
  objectiveStatuses,
}: ActMandateReferenceRailProps) {
  const realityRecord = useRealityCheckStore(
    (s) => s.byProject[projectId] ?? EMPTY_REALITY_CHECK,
  );
  const coherenceRecord = useCoherenceCheckStore(
    (s) => s.byProject[projectId] ?? EMPTY_COHERENCE_CHECK,
  );

  const model = assembleActMandate({
    objectives,
    statuses: objectiveStatuses,
    planningDirection: realityRecord,
    coherenceRecord,
    stratumTitleFor: (stratumId) => findPlanStratum(stratumId)?.title ?? stratumId,
  });

  const { keyDocuments, readiness } = model;
  const docs = ACT_MANDATE_COPY.documents;
  const items = ACT_MANDATE_COPY.begin.readinessItems;

  const presenceByKind = new Map(keyDocuments.map((d) => [d.kind, d.present] as const));

  return (
    <div className={styles.rail} data-testid="act-mandate-rail">
      <p className={styles.railTitle}>Threshold 3 -- handoff</p>

      <div className={styles.railCard}>
        <p className={styles.railCardTitle}>{docs.heading}</p>
        <div className={styles.railStat}>
          <span>{docs.planningDirection.name}</span>
          <PresenceValue present={presenceByKind.get('planning-direction') ?? false} />
        </div>
        <div className={styles.railStat}>
          <span>{docs.coherenceRecord.name}</span>
          <PresenceValue present={presenceByKind.get('coherence-record') ?? false} />
        </div>
        <div className={styles.railStat}>
          <span>{docs.integratedDesign.name}</span>
          <PresenceValue present={presenceByKind.get('integrated-design') ?? false} />
        </div>
      </div>

      <div className={styles.railCard}>
        <p className={styles.railCardTitle}>{ACT_MANDATE_COPY.handoffs.heading}</p>
        <div className={styles.railStat}>
          <span>Total packages</span>
          <span className={styles.railStatValue}>{readiness.handoffCount}</span>
        </div>
        <div className={styles.railStat}>
          <span>{ACT_MANDATE_COPY.handoffs.derivedBadge}s</span>
          <span className={styles.railStatValue}>{readiness.derivedCount}</span>
        </div>
        <div className={styles.railStat}>
          <span>{ACT_MANDATE_COPY.handoffs.syntheticBadge}s</span>
          <span className={styles.railStatValue}>{readiness.syntheticCount}</span>
        </div>
      </div>

      <div className={styles.railCard}>
        <p className={styles.railCardTitle}>
          {ACT_MANDATE_COPY.begin.readinessHeading}
        </p>
        <div className={styles.railStat}>
          <span>{items.t1}</span>
          <PresenceValue present={readiness.t1Approved} />
        </div>
        <div className={styles.railStat}>
          <span>{items.t2}</span>
          <PresenceValue present={readiness.t2Sealed} />
        </div>
        <div className={styles.railStat}>
          <span>{items.launch}</span>
          <span className={styles.railStatValue}>
            {readiness.launchPrep.complete}/{readiness.launchPrep.total}
          </span>
        </div>
        <div className={styles.railStat}>
          <span>Overall</span>
          <span className={styles.railVerdict} data-ready={readiness.ready || undefined}>
            {readiness.ready ? 'Ready' : 'Advisory'}
          </span>
        </div>
      </div>
    </div>
  );
}
