/**
 * BestUsesTable — ranked list of land uses scored against the project vision.
 *
 * Each row: use type, vision fit (0–100), fit-quality dot pattern (1–4 dots),
 * and a one-line note. Used on /v3/.../prove.
 */

import type { BestUse, FitQuality } from "../types.js";
import css from "./BestUsesTable.module.css";

const QUALITY_DOTS: Record<FitQuality, number> = {
  excellent: 4,
  good: 3,
  moderate: 2,
  poor: 1,
};

const QUALITY_TONE: Record<FitQuality, "good" | "watch" | "warning" | "blocked"> = {
  excellent: "good",
  good: "good",
  moderate: "watch",
  poor: "warning",
};

const QUALITY_LABEL: Record<FitQuality, string> = {
  excellent: "Excellent",
  good: "Good",
  moderate: "Moderate",
  poor: "Poor",
};

export interface BestUsesTableProps {
  uses: BestUse[];
}

export default function BestUsesTable({ uses }: BestUsesTableProps) {
  return (
    <div className={css.tableWrap} role="region" aria-label="Best uses for this parcel">
      <table className={css.table}>
        <thead>
          <tr>
            <th className={css.th}>Use Type</th>
            <th className={`${css.th} ${css.thFit}`}>Vision Fit</th>
            <th className={`${css.th} ${css.thQuality}`}>Quality</th>
            <th className={css.th}>Note</th>
          </tr>
        </thead>
        <tbody>
          {uses.map((u) => {
            const tone = QUALITY_TONE[u.fitQuality];
            const dots = QUALITY_DOTS[u.fitQuality];
            return (
              <tr key={u.id} className={css.row}>
                <td className={css.tdUse}>{u.useType}</td>
                <td className={css.tdFit}>
                  <span className={css.fitValue}>{u.visionFit}</span>
                  <span className={css.fitDenom}>/ 100</span>
                </td>
                <td className={css.tdQuality}>
                  <span className={`${css.quality} ${css[`tone-${tone}`]}`}>
                    <span className={css.dots} aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className={`${css.dot} ${i < dots ? css.dotOn : css.dotOff}`} />
                      ))}
                    </span>
                    <span className={css.qualityLabel}>{QUALITY_LABEL[u.fitQuality]}</span>
                  </span>
                </td>
                <td className={css.tdNote}>{u.note ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
