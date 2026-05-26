/**
 * StageSelector — 3-segment toggle for the OLOS Stage axis.
 *
 * Stage determines the user's relationship to a Domain: Observe documents,
 * Plan decides, Act executes + proves + verifies. See OLOS dev specs §3.
 */

import {
  STAGES,
  STAGE_LABELS,
  STAGE_CORE_QUESTION,
  type Stage,
} from '@ogden/shared';
import css from './StageSelector.module.css';

export interface StageSelectorProps {
  value: Stage;
  onChange: (next: Stage) => void;
  className?: string;
}

export default function StageSelector({
  value,
  onChange,
  className,
}: StageSelectorProps) {
  return (
    <div className={[css.wrap, className].filter(Boolean).join(' ')}>
      <div className={css.segment} role="tablist" aria-label="OLOS Stage">
        {STAGES.map((stage) => (
          <button
            type="button"
            key={stage}
            role="tab"
            aria-selected={value === stage}
            className={[css.btn, value === stage ? css.btnActive : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChange(stage)}
          >
            {STAGE_LABELS[stage]}
          </button>
        ))}
      </div>
      <p className={css.question}>{STAGE_CORE_QUESTION[value]}</p>
    </div>
  );
}
