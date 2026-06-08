import * as React from 'react';
import styles from './AmountRow.module.css';

export interface AmountRowProps {
  label: string;
  /** controlled text value of the number input */
  value: string;
  onChange: (next: string) => void;
  /** shown after the input, e.g. "mm", "$" */
  unit?: string;
  placeholder?: string;
  /** optional node rendered below (e.g. an InterpretationBlock) */
  interpretation?: React.ReactNode;
  /** default 'decimal' */
  inputMode?: 'numeric' | 'decimal';
  id?: string;
}

/**
 * AmountRow -- controlled label + numeric text input + unit, with an optional
 * live-interpretation slot rendered below. No internal state — `value` +
 * `onChange` are authoritative.
 */
export function AmountRow({
  label,
  value,
  onChange,
  unit,
  placeholder,
  interpretation,
  inputMode = 'decimal',
  id,
}: AmountRowProps): React.JSX.Element {
  return (
    <div className={styles.root}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          type="text"
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          id={id}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {interpretation && <div className={styles.interp}>{interpretation}</div>}
    </div>
  );
}
