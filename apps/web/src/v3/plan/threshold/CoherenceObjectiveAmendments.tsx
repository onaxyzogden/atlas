/**
 * CoherenceObjectiveAmendments -- the Plan-only on-objective overlay for
 * Threshold 2. When the Coherence Check recorded a steward amendment that
 * touches THIS objective (a Section-C coverage gap on it, or a Section-A/B
 * integration / loop item citing it as evidence), it surfaces those amendments
 * as a read-only "Threshold 2 amendments" register beneath the design content.
 *
 * Additive + display-only: the catalogue design above is never mutated -- these
 * are permanent, timestamped overlays held in the store. Self-gating: renders
 * null when this objective has no recorded amendment, so a non-amended objective
 * is untouched. Mounted Plan-only in ObjectiveDetailPanel (Act renders a
 * different tree), so the Act stage stays byte-identical.
 */

import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  EMPTY_COHERENCE_CHECK,
  useCoherenceCheckStore,
} from '../../../store/coherenceCheckStore.js';
import { amendmentsForObjective, COHERENCE_COPY } from './coherenceCheckModel.js';
import styles from './Coherence.module.css';

export interface CoherenceObjectiveAmendmentsProps {
  projectId: string;
  objectiveId: string;
}

/** YYYY-MM-DD from an epoch-ms timestamp (ASCII + deterministic). */
function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export default function CoherenceObjectiveAmendments({
  projectId,
  objectiveId,
}: CoherenceObjectiveAmendmentsProps) {
  const amendments = useCoherenceCheckStore(
    (s) => (s.byProject[projectId] ?? EMPTY_COHERENCE_CHECK).amendments,
  );
  const forObjective = useMemo(
    () => amendmentsForObjective(objectiveId, amendments),
    [objectiveId, amendments],
  );

  // Untouched objectives render nothing -- the overlay is purely additive.
  if (forObjective.length === 0) return null;

  return (
    <section
      className={styles.objAmend}
      data-testid="objective-coherence-amendments"
      aria-label={COHERENCE_COPY.onObjective.label}
    >
      <p className={styles.objAmendLabel}>{COHERENCE_COPY.onObjective.label}</p>
      <p className={styles.objAmendBlurb}>{COHERENCE_COPY.onObjective.blurb}</p>
      <ul className={styles.objAmendList}>
        {forObjective.map((a) => (
          <li
            key={`${a.itemId}-${a.resolvedAt}`}
            className={styles.objAmendItem}
            data-testid={`coherence-amendment-${a.itemId}`}
          >
            <span className={styles.objAmendId}>
              <CheckCircle2 size={11} aria-hidden="true" />{' '}
              {a.itemId.replace(/^c-/, 'C / ')}
            </span>
            <span className={styles.objAmendText}>{a.amendmentText}</span>
            <span className={styles.objAmendMeta}>
              Recorded {formatDay(a.resolvedAt)} -- permanent; cannot be edited.
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
