import * as React from 'react';
import styles from './BarChartStrip.module.css';

export interface BarDatum {
  label: string;
  value: number;
}

export interface BarChartStripProps {
  data: readonly BarDatum[];
  /** default = max value in data */
  max?: number;
  ariaLabel?: string;
  /** optional, shown in each bar's title attr */
  unit?: string;
}

/**
 * BarChartStrip -- pure-presentation vertical bars with labels. Not interactive.
 * Each bar's height is its value as a percentage of `max`.
 */
export function BarChartStrip({
  data,
  max,
  ariaLabel,
  unit,
}: BarChartStripProps): React.JSX.Element {
  const resolvedMax =
    max ?? data.reduce((acc, d) => Math.max(acc, d.value), 0);

  return (
    <div className={styles.strip} role="img" aria-label={ariaLabel}>
      {data.map((d, i) => {
        const pct = resolvedMax > 0 ? Math.round((d.value / resolvedMax) * 100) : 0;
        return (
          <div key={`${d.label}-${i}`} className={styles.col}>
            <div
              className={styles.bar}
              style={{ height: `${pct}%` }}
              title={`${d.label}: ${d.value}${unit || ''}`}
            />
            <span className={styles.barLabel}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
