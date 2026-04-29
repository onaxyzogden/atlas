/**
 * Sparkline — minimal SVG primitive (UX Scholar §5, 2026-04-23 audit).
 *
 * Closes the long-open P1 from `design-system/ogden-atlas/ui-ux-scholar-audit.md`.
 *
 * Design rules:
 *   • Neutral stroke for the line (text-muted), full-width.
 *   • Semantic accent ONLY at the endpoint dot (success/warning/error) when a
 *     `trend` is supplied. Confidence-vs-Quality split: this dot represents
 *     QUALITY direction, not data confidence.
 *   • No grid, no axes — boring beats clever for inline KPI rows.
 *   • Pure SVG, no chart-lib dependency.
 */
import type { CSSProperties } from "react";

export type SparklineTrend = "up" | "down" | "flat";

export interface SparklineProps {
  values: readonly number[];
  width?: number;
  height?: number;
  /** When supplied, paints the endpoint dot using the matching semantic token. */
  trend?: SparklineTrend;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

const TREND_COLOR: Record<SparklineTrend, string> = {
  up:   "var(--color-success)",
  down: "var(--color-warning)",
  flat: "var(--color-text-muted)",
};

export default function Sparkline({
  values,
  width = 80,
  height = 22,
  trend,
  ariaLabel,
  className,
  style,
}: SparklineProps) {
  if (values.length < 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const lastX = (values.length - 1) * stepX;
  const lastY = height - (((values[values.length - 1] ?? 0) - min) / range) * height;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? "Trend"}
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
      <circle
        cx={lastX}
        cy={lastY}
        r={2.25}
        fill={trend ? TREND_COLOR[trend] : "var(--color-text-muted)"}
      />
    </svg>
  );
}
