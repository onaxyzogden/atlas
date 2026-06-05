/**
 * intakeControls — small presentational form primitives shared by the 8 True
 * North segment intake panels. Kept deliberately minimal (single-select chip
 * row, multi-select chip grid, labelled field) so each intake stays declarative
 * and the covenant-sensitive copy lives in the intake itself.
 */

import css from './intake.module.css';

export interface Option<T extends string> {
  value: T;
  label: string;
}

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div className={css.field}>
      <span className={css.fieldLabel}>{label}</span>
      {hint && <span className={css.fieldHint}>{hint}</span>}
      {children}
    </div>
  );
}

interface ChoiceRowProps<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

/** Single-select chip row (radio semantics). */
export function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: ChoiceRowProps<T>) {
  return (
    <div className={css.chipRow} role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={css.chip}
          data-selected={value === opt.value ? '' : undefined}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface MultiChoiceProps<T extends string> {
  options: readonly Option<T>[];
  values: readonly T[];
  onToggle: (value: T) => void;
  ariaLabel: string;
}

/** Multi-select chip grid (checkbox semantics). */
export function MultiChoice<T extends string>({
  options,
  values,
  onToggle,
  ariaLabel,
}: MultiChoiceProps<T>) {
  return (
    <div className={css.chipGrid} role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const selected = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            className={css.chip}
            data-selected={selected ? '' : undefined}
            onClick={() => onToggle(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
