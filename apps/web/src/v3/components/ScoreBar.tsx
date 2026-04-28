/**
 * ScoreBar — horizontal 0–100 bar with optional benchmark tick.
 *
 * One row of the Vision Fit Analysis stack on /v3/.../prove.
 * Tone is keyed off whether the value crosses its benchmark (or 60 default).
 */

import type { VisionFitBar } from "../types.js";
import css from "./ScoreBar.module.css";

export interface ScoreBarProps {
  bar: VisionFitBar;
}

function tone(value: number, benchmark?: number): "good" | "watch" | "warning" {
  const target = benchmark ?? 60;
  if (value >= target + 10) return "good";
  if (value >= target) return "good";
  if (value >= target - 15) return "watch";
  return "warning";
}

export default function ScoreBar({ bar }: ScoreBarProps) {
  const v = Math.max(0, Math.min(100, bar.value));
  const t = tone(v, bar.benchmark);
  return (
    <div className={`${css.row} ${css[`tone-${t}`]}`}>
      <div className={css.head}>
        <span className={css.category}>{bar.category}</span>
        <span className={css.value}>{v}</span>
      </div>
      <div className={css.track} aria-hidden="true">
        <div className={css.fill} style={{ width: `${v}%` }} />
        {typeof bar.benchmark === "number" && (
          <div
            className={css.benchmark}
            style={{ left: `${Math.max(0, Math.min(100, bar.benchmark))}%` }}
            title={`Benchmark ${bar.benchmark}`}
          />
        )}
      </div>
      {bar.note && <span className={css.note}>{bar.note}</span>}
    </div>
  );
}
