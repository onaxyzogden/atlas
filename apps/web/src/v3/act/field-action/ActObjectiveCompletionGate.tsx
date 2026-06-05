/**
 * ActObjectiveCompletionGate — bottom anchor of View A per spec §5.2.
 *
 * Greyed until every field action under the active objective reaches
 * `verified`. Once the gate is green the steward can mark the objective
 * decision complete — Slice 3.5 will wire this into the Plan stage's
 * cyclical review trigger so the parent objective transitions from
 * `active` to `complete`. For Slice 3.3 the click is a no-op stub so
 * the visual state is verifiable.
 */

import type { FieldAction } from '@ogden/shared';
import css from './ActObjectiveCompletionGate.module.css';

interface Props {
  tasks: ReadonlyArray<FieldAction>;
  onComplete?: () => void;
}

export default function ActObjectiveCompletionGate({ tasks, onComplete }: Props) {
  const total = tasks.length;
  const verified = tasks.filter((t) => t.status === 'verified').length;
  const ready = total > 0 && verified === total;
  const remaining = total - verified;

  const detail = ready
    ? 'All field actions verified. Ready to close out this objective.'
    : total === 0
      ? 'Add field actions to begin executing this objective.'
      : `${remaining} of ${total} task${total === 1 ? '' : 's'} still pending verification.`;

  return (
    <div className={css.gate} data-ready={ready ? 'true' : 'false'}>
      <div className={css.message}>
        <span className={css.label}>Objective gate</span>
        <span className={css.detail}>{detail}</span>
      </div>
      <button
        type="button"
        className={css.button}
        disabled={!ready}
        onClick={onComplete}
        data-testid="act-objective-complete"
        title={ready ? 'Slice 3.5 wires this to the cyclical review trigger.' : undefined}
      >
        Mark objective complete
      </button>
    </div>
  );
}
