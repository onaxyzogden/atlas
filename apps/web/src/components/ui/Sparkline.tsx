import React from 'react';

/* --------------------------------------------------------------------------
 * Sparkline — UX Scholar §5 (P1)
 * Inline SVG micro-chart for surfacing trend/momentum next to a KPI without
 * stealing the eye from the primary value. Neutral stroke, optional semantic
 * accent on the endpoint dot only (per Scholar guidance: reserve semantic
 * color for status/quality, not trend information).
 *
 * Zero dependencies — plain SVG. Safe inside KPI rows: fixed default
 * 60×18 footprint, inline-block, shrinks gracefully.
 * -------------------------------------------------------------------------- */

export type SparklineAccent = 'neutral' | 'success' | 'warning' | 'error' | 'primary';

export interface SparklineProps {
  /** Numeric series. Requires ≥2 points; renders nothing otherwise. */
  values: readonly number[];
  width?: number;
  height?: number;
  /** Stroke color token; defaults to neutral border. */
  stroke?: string;
  /** Semantic accent applied to the endpoint dot only. */
  accent?: SparklineAccent;
  /** Accessible label for screen readers. */
  ariaLabel?: string;
  className?: string;
}

const ACCENT_VAR: Record<SparklineAccent, string> = {
  neutral: 'var(--color-border-strong, #c4b49a)',
  success: 'var(--color-success, #7fb98a)',
  warning: 'var(--color-warning, #d4a847)',
  error:   'var(--color-error, #d07b7b)',
  primary: 'var(--color-primary, #d4af5f)',
};

export const Sparkline: React.FC<SparklineProps> = ({
  values,
  width = 60,
  height = 18,
  stroke = 'var(--color-border-strong, #c4b49a)',
  accent = 'neutral',
  ariaLabel,
  className,
}) => {
  if (!values || values.length < 2) return null;

  const padX = 1;
  const padY = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1e-9);
  const stepX = (width - padX * 2) / (values.length - 1);

  const points = values.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + (height - padY * 2) * (1 - (v - min) / range);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = points[points.length - 1]!.split(',').map(Number) as [number, number];
  const dotColor = ACCENT_VAR[accent];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      style={{ display: 'inline-block', verticalAlign: 'middle', overflow: 'visible' }}
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth={1}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.75}
      />
      <circle cx={last[0]} cy={last[1]} r={1.75} fill={dotColor} />
    </svg>
  );
};

Sparkline.displayName = 'Sparkline';
