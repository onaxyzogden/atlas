/**
 * ScoreMetric — compact key/value tile used in the decision rail metric grid.
 */

import css from './ScoreMetric.module.css';

export type MetricTone = 'neutral' | 'success' | 'warning' | 'error' | 'info';

export interface ScoreMetricProps {
  label: string;
  value: number | string;
  denominator?: number | string;
  unit?: string;
  tone?: MetricTone;
  /** 0..1 progress fill. */
  progress?: number;
  source?: string;
}

export default function ScoreMetric({
  label,
  value,
  denominator,
  unit,
  tone = 'neutral',
  progress,
  source,
}: ScoreMetricProps) {
  return (
    <div className={`${css.tile} ${css[`tone-${tone}`]}`}>
      <span className={css.label}>{label}</span>
      <div className={css.valueRow}>
        <span className={css.value}>{value}</span>
        {denominator !== undefined && <span className={css.denom}>/ {denominator}</span>}
        {unit && <span className={css.unit}>{unit}</span>}
      </div>
      {progress !== undefined && (
        <div className={css.progressTrack} aria-hidden="true">
          <div className={css.progressFill} style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
        </div>
      )}
      {source && <span className={css.source} title={source}>{source}</span>}
    </div>
  );
}
