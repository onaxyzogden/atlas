import * as React from 'react';
import styles from './CapacityCeilingBlock.module.css';

export interface CapacityCeilingBlockProps {
  /** e.g. "Carrying capacity ceiling" */
  label: string;
  /** the computed ceiling */
  value: number;
  /** e.g. "AU", "head" */
  unit?: string;
  /** default 'pass' */
  tone?: 'pass' | 'warn' | 'fail';
  /** optional explanatory line */
  note?: React.ReactNode;
}

/**
 * CapacityCeilingBlock -- a large computed max + pass/warn/fail surface
 * (carrying-capacity synthesis). Tone drives the accent + figure color via a
 * data-tone attribute.
 */
export function CapacityCeilingBlock({
  label,
  value,
  unit,
  tone = 'pass',
  note,
}: CapacityCeilingBlockProps): React.JSX.Element {
  return (
    <div className={styles.block} data-tone={tone}>
      <span className={styles.label}>{label}</span>
      <span className={styles.figure}>
        {value}
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </span>
      {note ? <div className={styles.note}>{note}</div> : null}
    </div>
  );
}
