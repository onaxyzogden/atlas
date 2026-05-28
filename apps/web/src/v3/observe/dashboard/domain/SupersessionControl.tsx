/**
 * SupersessionControl — small inline control rendered next to a
 * superseded observation row in DomainObservationList (OLOS Observe
 * Dashboard Spec §4.3, "Not a replacement" safety valve).
 *
 * Click → calls observeDataPointStore.restorePair which flips BOTH the
 * superseded row and the one that superseded it back to active. The
 * surrounding hook re-renders the list and both rows show up again.
 *
 * Virtual data points (those projected from Phase 3 ObserveFeedEntry
 * via routeToDataPoint) carry ids prefixed `feed:` and are not stored
 * in the data-point store. They cannot be superseded by Slice 4.3
 * semantics (no proximity geometry from the feed), so the control just
 * never renders for them — guarded by the parent.
 */

import { useObserveDataPointStore } from '../../../../store/observeDataPointStore.js';
import css from './SupersessionControl.module.css';

interface Props {
  projectId: string;
  supersededId: string;
  supersedingId: string;
}

export default function SupersessionControl({
  projectId,
  supersededId,
  supersedingId,
}: Props) {
  const restorePair = useObserveDataPointStore((s) => s.restorePair);
  return (
    <button
      type="button"
      className={css.control}
      onClick={() => restorePair(projectId, supersededId, supersedingId)}
      title="Both observations return to active"
    >
      Not a replacement
    </button>
  );
}
