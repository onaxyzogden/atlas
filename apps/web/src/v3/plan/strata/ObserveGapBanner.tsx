// ObserveGapBanner - transient teal banner shown at the top of the Plan
// spine after a mid-project secondary addition introduced objectives that
// depend on field data not yet gathered (OLOS Plan Navigation Spec v1.1
// section 9 - the Observe-stage gap). It tells the steward that some of the
// new planning work cannot be satisfied until those observations are made in
// Observe. Plan-side surfacing only; the Observe-stage render of the gap is a
// separate seam (flagged out of scope for v1).
//
// Dismiss is transient component state owned by the parent (PlanStratumShell)
// - no persist bump. Re-adding a gap-bearing secondary re-raises it.

import { Telescope, X } from 'lucide-react';
import css from './ObserveGapBanner.module.css';

interface Props {
  /** Number of objectives that need new field observations. */
  count: number;
  onDismiss: () => void;
}

export default function ObserveGapBanner({ count, onDismiss }: Props) {
  return (
    <aside
      className={css.banner}
      role="status"
      aria-label="Observe-stage data gap"
      data-testid="plan-observe-gap-banner"
    >
      <div className={css.iconWrap} aria-hidden>
        <Telescope size={16} />
      </div>
      <div className={css.body}>
        <p className={css.eyebrow}>New observations needed</p>
        <p className={css.copy}>
          {count} new objective{count === 1 ? '' : 's'} need
          {count === 1 ? 's' : ''} field data gathered in Observe before
          {count === 1 ? ' it' : ' they'} can be satisfied.
        </p>
      </div>
      <button
        type="button"
        className={css.dismiss}
        onClick={onDismiss}
        aria-label="Dismiss observation notice"
        data-testid="plan-observe-gap-dismiss"
      >
        <X size={15} aria-hidden />
      </button>
    </aside>
  );
}
