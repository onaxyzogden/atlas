/**
 * DivergenceTypeSelector — chip group for the six DivergenceType values
 * defined in OLOS Act Command Center Spec v1 §6.3. Single-select. Used
 * inside DivergenceCaptureForm.
 */

import type { DivergenceType } from '@ogden/shared';
import css from './Divergence.module.css';

interface Props {
  value: DivergenceType | null;
  onChange: (value: DivergenceType) => void;
  disabled?: boolean;
}

interface Option {
  value: DivergenceType;
  label: string;
}

const OPTIONS: readonly Option[] = [
  { value: 'physical_constraint', label: 'Physical constraint' },
  { value: 'new_discovery', label: 'New discovery' },
  { value: 'access_issue', label: 'Access issue' },
  { value: 'resource_constraint', label: 'Resource constraint' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'plan_error', label: 'Plan error' },
];

export default function DivergenceTypeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className={css.typeGrid} role="radiogroup" aria-label="Divergence type">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-selected={selected}
            disabled={disabled}
            className={css.typeChip}
            onClick={() => onChange(opt.value)}
            data-testid={`divergence-type-${opt.value}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
