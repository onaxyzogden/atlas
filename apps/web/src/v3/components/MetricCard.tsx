/**
 * MetricCard — small label/value tile used across v3 pages.
 *
 * Used by:
 *   - Home: "Project Health" 6-tile strip
 *   - Prove: "Execution Reality" stats row
 *   - Operate: "Today on the Land" tile row
 *   - Design Studio: bottom strip (area, perimeter, etc.)
 *
 * Variants:
 *   - default       → just label/value/subtext
 *   - status-pill   → adds a colored status pill (e.g. "On track")
 *   - score         → renders value as `n / 100` with a progress bar
 */

import type { ReactNode } from "react";
import "../styles/chrome.css";
import css from "./MetricCard.module.css";

export type MetricStatus =
  | "neutral"
  | "good"
  | "watch"
  | "warning"
  | "blocked"
  | "info";

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  /** Right-of-value unit ("%", "ha", etc.). */
  unit?: string;
  /** Sub-text below the value (e.g. "of 100", "next check at 10:00"). */
  subtext?: string;
  /** Status pill rendered top-right. */
  status?: { label: string; tone: MetricStatus };
  /** 0–100 score progress bar. */
  score?: number;
  /** Optional click target (renders as button). */
  onClick?: () => void;
  /** Quiet 1px ring + inset shadow for hero KPI emphasis (no glow). */
  accent?: "quiet-ring";
  /** Optional sparkline rendered above the subtext. */
  trend?: ReactNode;
}

export default function MetricCard({
  label,
  value,
  unit,
  subtext,
  status,
  score,
  onClick,
  accent,
  trend,
}: MetricCardProps) {
  const Tag = onClick ? "button" : "div";
  const accentClass = accent === "quiet-ring" ? "verdict-ring-quiet" : "";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`${css.tile} ${onClick ? css.clickable : ""} ${accentClass}`.trim()}
      onClick={onClick}
    >
      <header className={css.header}>
        <span className={css.label}>{label}</span>
        {status && (
          <span className={`${css.pill} ${css[`tone-${status.tone}`]}`}>{status.label}</span>
        )}
      </header>
      <div className={css.valueRow}>
        <span className={css.value}>{value}</span>
        {unit && <span className={css.unit}>{unit}</span>}
        {score !== undefined && <span className={css.denom}>/ 100</span>}
      </div>
      {score !== undefined && (
        <div className={css.bar} aria-hidden="true">
          <div
            className={`${css.barFill} ${css[`tone-${pickToneFromScore(score)}`]}`}
            style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
          />
        </div>
      )}
      {trend && <div className={css.trend}>{trend}</div>}
      {subtext && <p className={css.subtext}>{subtext}</p>}
    </Tag>
  );
}

function pickToneFromScore(score: number): MetricStatus {
  if (score >= 80) return "good";
  if (score >= 60) return "watch";
  if (score >= 40) return "warning";
  return "blocked";
}
