/**
 * RaiseNeedForm — the shared "Raise observation need" form. Purely
 * presentational: it owns only the field state and hands a validated
 * `RaiseNeedInput` (plus the chosen module) back to its host, which owns id
 * generation, the target, the origin, and persistence. Used from two places:
 *   - the Capture Workspace, raising a follow-up from a recorded observation
 *     (module inherited from the parent need, so the picker is hidden);
 *   - the Command Centre, raising a manual need (the picker is shown).
 */

import { useState } from 'react';
import {
  OBSERVE_MODULES,
  OBSERVE_MODULE_LABEL,
  type ObserveModule,
} from '../types.js';

/** Default domain when a host doesn't supply one (manual needs). */
const DEFAULT_MODULE: ObserveModule = 'people-governance';
import type {
  ObservationNeedPriority,
  PlanImpact,
  RaiseNeedInput,
} from '../../observation-needs/observationNeed.js';
import css from './RaiseNeedForm.module.css';

/** Pre-fill for edit mode — the current values of an already-raised need. */
export interface RaiseNeedFormInitial {
  module: ObserveModule;
  title: string;
  reason: string;
  priority: ObservationNeedPriority;
  trigger?: string;
  planImpact?: PlanImpact;
}

interface Props {
  /** Show the module selector (manual needs); hide it for follow-ups. */
  showModulePicker?: boolean;
  /** Module pre-selected / inherited from the parent need. */
  defaultModule?: ObserveModule;
  /** When editing an existing need, the values to pre-fill (overrides defaults). */
  initial?: RaiseNeedFormInitial;
  /** Submit button label — defaults to "Raise need". */
  submitLabel?: string;
  onSubmit: (input: RaiseNeedInput & { module: ObserveModule }) => void;
  onCancel: () => void;
}

const PRIORITIES: ObservationNeedPriority[] = ['low', 'medium', 'high'];
const PRIORITY_LABEL: Record<ObservationNeedPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const PLAN_IMPACTS: PlanImpact[] = ['none', 'possible', 'likely'];
const PLAN_IMPACT_LABEL: Record<PlanImpact, string> = {
  none: 'None',
  possible: 'Possible',
  likely: 'Likely',
};

export default function RaiseNeedForm({
  showModulePicker = false,
  defaultModule,
  initial,
  submitLabel = 'Raise need',
  onSubmit,
  onCancel,
}: Props) {
  const [module, setModule] = useState<ObserveModule>(
    initial?.module ?? defaultModule ?? DEFAULT_MODULE,
  );
  const [title, setTitle] = useState(initial?.title ?? '');
  const [reason, setReason] = useState(initial?.reason ?? '');
  const [priority, setPriority] = useState<ObservationNeedPriority>(
    initial?.priority ?? 'medium',
  );
  const [trigger, setTrigger] = useState(initial?.trigger ?? '');
  const [planImpact, setPlanImpact] = useState<PlanImpact>(
    initial?.planImpact ?? 'none',
  );

  const canSubmit = title.trim().length > 0 && reason.trim().length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      module,
      title,
      reason,
      priority,
      trigger: trigger.trim() || undefined,
      planImpact: planImpact === 'none' ? undefined : planImpact,
    });
  };

  return (
    <form className={css.form} onSubmit={submit} aria-label="Raise observation need">
      {showModulePicker && (
        <label className={css.field}>
          <span className={css.label}>Domain</span>
          <select
            className={css.select}
            value={module}
            onChange={(e) => setModule(e.target.value as ObserveModule)}
          >
            {OBSERVE_MODULES.map((m) => (
              <option key={m} value={m}>
                {OBSERVE_MODULE_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className={css.field}>
        <span className={css.label}>
          Title<span className={css.req}>*</span>
        </span>
        <input
          className={css.input}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs observing?"
          autoFocus
        />
      </label>

      <label className={css.field}>
        <span className={css.label}>
          Reason<span className={css.req}>*</span>
        </span>
        <textarea
          className={css.textarea}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why does this need exist?"
          rows={2}
        />
      </label>

      <div className={css.row}>
        <label className={css.field}>
          <span className={css.label}>Priority</span>
          <select
            className={css.select}
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as ObservationNeedPriority)
            }
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </label>

        <label className={css.field}>
          <span className={css.label}>Plan impact</span>
          <select
            className={css.select}
            value={planImpact}
            onChange={(e) => setPlanImpact(e.target.value as PlanImpact)}
          >
            {PLAN_IMPACTS.map((p) => (
              <option key={p} value={p}>
                {PLAN_IMPACT_LABEL[p]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={css.field}>
        <span className={css.label}>Re-observation trigger</span>
        <input
          className={css.input}
          type="text"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="e.g. recheck after next rainfall (optional)"
        />
      </label>

      <div className={css.actions}>
        <button type="button" className={css.ghostBtn} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={css.primaryBtn} disabled={!canSubmit}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
