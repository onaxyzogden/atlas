/**
 * ActObjectiveAmendments -- the Act-side on-objective register for the
 * Threshold-3 (Act Mandate) governance escape valve. When a concern raised
 * against THIS objective was APPROVED by the team governance during the Plan
 * ceremony, the recorded amendment is surfaced HERE, in the executing Act
 * panel, ALONGSIDE the original catalogue objective -- which is never
 * overwritten.
 *
 * This is the Act counterpart of the Plan-only ConcernAmendments overlay. The
 * Plan stage surfaces an amendment so the designer sees the recorded change in
 * context; the Act stage surfaces the SAME approved amendments so an executing
 * steward acts on the agreed change, not the superseded catalogue text. Reads
 * the same planConcernsStore; mirrors the same "approved, non-empty amendment,
 * THIS objective only" contract.
 *
 * Additive + display-only + append-only: never mutates the objective, never
 * gates or freezes the Act loop. Self-gating -- renders null when this
 * objective has no approved amendment. Carries its own green register tokens
 * (its own CSS module), reusing only the pure ACT_MANDATE_COPY copy block.
 */

import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  EMPTY_CONCERNS,
  approvedAmendmentsForObjective,
  usePlanConcernsStore,
} from '../../../store/planConcernsStore.js';
import { ACT_MANDATE_COPY } from '../../plan/threshold/actMandateModel.js';
import styles from './ActObjectiveAmendments.module.css';

export interface ActObjectiveAmendmentsProps {
  projectId: string;
  objectiveId: string;
}

/** YYYY-MM-DD from an epoch-ms timestamp (ASCII + deterministic). */
function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export default function ActObjectiveAmendments({
  projectId,
  objectiveId,
}: ActObjectiveAmendmentsProps) {
  const concerns = usePlanConcernsStore(
    (s) => s.byProject[projectId] ?? EMPTY_CONCERNS,
  );
  const amendments = useMemo(
    () => approvedAmendmentsForObjective(concerns, objectiveId),
    [concerns, objectiveId],
  );

  // Objectives with no approved amendment render nothing -- purely additive.
  if (amendments.length === 0) return null;

  return (
    <section
      className={styles.amendments}
      data-testid="act-execution-objective-amendments"
      aria-label={ACT_MANDATE_COPY.onObjective.label}
    >
      <p className={styles.amendmentsLabel}>
        {ACT_MANDATE_COPY.onObjective.label}
      </p>
      <p className={styles.amendmentsBlurb}>
        {ACT_MANDATE_COPY.onObjective.blurb}
      </p>
      <ul className={styles.amendmentsList}>
        {amendments.map((c) => (
          <li
            key={c.id}
            className={styles.amendmentItem}
            data-testid={`act-objective-amendment-${c.id}`}
          >
            <span className={styles.amendmentId}>
              <CheckCircle2 size={11} aria-hidden="true" /> Amendment
            </span>
            <span className={styles.amendmentText}>{c.amendmentText}</span>
            {c.observation.length > 0 && (
              <span className={styles.amendmentContext}>
                In response to: {c.observation}
              </span>
            )}
            <span className={styles.amendmentMeta}>
              Recorded {formatDay(c.reviewedAt ?? c.timestamp)}
              {c.reviewedBy ? ` by ${c.reviewedBy}` : ''} -- permanent; cannot be
              edited.
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
