/**
 * StatusPicker — dropdown that exposes only the statuses allowed by the
 * current Stage (filtered via STATUS_BY_STAGE) and pairs the selection
 * with a live StatusChip preview of the chosen value.
 */

import { STATUS_BY_STAGE, STATUS_LABELS, type Stage } from '@ogden/shared';
import StatusChip from './StatusChip.js';
import css from './StatusPicker.module.css';

export interface StatusPickerProps {
  stage: Stage;
  value: string;
  onChange: (next: string) => void;
  id?: string;
  /**
   * When supplied, narrows the picker to a subset of the stage's allowed
   * statuses. Use this for objectives that don't permit the full set
   * (e.g., a steward role that can only mark "ready" → "in-progress").
   */
  allowed?: readonly string[];
  placeholder?: string;
}

export default function StatusPicker({
  stage,
  value,
  onChange,
  id,
  allowed,
  placeholder = 'Set status…',
}: StatusPickerProps) {
  const stageOptions = STATUS_BY_STAGE[stage] ?? [];
  const options = allowed
    ? stageOptions.filter((s) => allowed.includes(s))
    : stageOptions;

  return (
    <div className={css.wrap}>
      <div className={css.row}>
        <select
          id={id}
          className={css.select}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s] ?? s}
            </option>
          ))}
        </select>
        <StatusChip status={value || null} size="sm" />
      </div>
    </div>
  );
}
