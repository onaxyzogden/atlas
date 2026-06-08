import * as React from 'react';
import styles from './Stepper.module.css';

export interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  /** default 0 */
  min?: number;
  /** default Infinity */
  max?: number;
  /** default 1 */
  step?: number;
  /** optional quick-set buttons */
  presets?: readonly number[];
  /** optional suffix label, e.g. "hrs" */
  unit?: string;
  ariaLabel?: string;
}

/**
 * Stepper -- controlled numeric value with -/+ buttons and optional presets.
 * No internal state — `value` + `onChange` are authoritative. Decrease clamps
 * at `min`, increase clamps at `max`, presets are clamped into [min, max].
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  presets,
  unit,
  ariaLabel,
}: StepperProps): React.JSX.Element {
  const clamp = (n: number): number => Math.min(max, Math.max(min, n));

  return (
    <div role="group" aria-label={ariaLabel} className={styles.root}>
      <button
        type="button"
        className={styles.step}
        aria-label="Decrease"
        onClick={() => onChange(clamp(value - step))}
      >
        −
      </button>
      <span className={styles.value}>
        {value}
        {unit && <span className={styles.unit}> {unit}</span>}
      </span>
      <button
        type="button"
        className={styles.step}
        aria-label="Increase"
        onClick={() => onChange(clamp(value + step))}
      >
        +
      </button>
      {presets?.map((p) => (
        <button
          key={p}
          type="button"
          className={styles.preset}
          data-on={value === p}
          onClick={() => onChange(clamp(p))}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
