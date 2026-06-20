/**
 * ConcernAmendments -- the Plan-only on-objective overlay for Threshold 3 (The
 * Act Mandate). When a concern raised against THIS objective during Act was
 * APPROVED by the team governance, the recorded amendment is surfaced here as a
 * read-only "Act Mandate amendments" register beneath the design content --
 * ALONGSIDE the original objective, which is never overwritten.
 *
 * Additive + display-only: the catalogue design above is never mutated -- these
 * are permanent, timestamped overlays held in planConcernsStore. Self-gating:
 * renders null when this objective has no APPROVED amendment, so a non-amended
 * objective is untouched. Mounted Plan-only in ObjectiveDetailPanel (Act renders
 * a different tree), so the Act stage stays byte-identical. Direct analog of
 * CoherenceObjectiveAmendments in the green Act-Mandate register.
 */

import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  EMPTY_CONCERNS,
  approvedAmendmentsForObjective,
  usePlanConcernsStore,
} from '../../../store/planConcernsStore.js';
import { ACT_MANDATE_COPY } from './actMandateModel.js';
import styles from './ActMandate.module.css';

export interface ConcernAmendmentsProps {
  projectId: string;
  objectiveId: string;
}

/** YYYY-MM-DD from an epoch-ms timestamp (ASCII + deterministic). */
function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export default function ConcernAmendments({
  projectId,
  objectiveId,
}: ConcernAmendmentsProps) {
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
      className={styles.concernAmend}
      data-testid="objective-act-mandate-amendments"
      aria-label={ACT_MANDATE_COPY.onObjective.label}
    >
      <p className={styles.concernAmendLabel}>
        {ACT_MANDATE_COPY.onObjective.label}
      </p>
      <p className={styles.concernAmendBlurb}>
        {ACT_MANDATE_COPY.onObjective.blurb}
      </p>
      <ul className={styles.concernAmendList}>
        {amendments.map((c) => (
          <li
            key={c.id}
            className={styles.concernAmendItem}
            data-testid={`concern-amendment-${c.id}`}
          >
            <span className={styles.concernAmendId}>
              <CheckCircle2 size={11} aria-hidden="true" /> Amendment
            </span>
            <span className={styles.concernAmendText}>{c.amendmentText}</span>
            {c.observation.length > 0 && (
              <span className={styles.concernAmendContext}>
                In response to: {c.observation}
              </span>
            )}
            <span className={styles.concernAmendMeta}>
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
