/**
 * FieldMapPlaceholder — pre-Phase-9 stand-in for the live field map.
 *
 * RULE 2 forbids MapboxGL imports in v3.0. Renders a styled SVG canvas
 * with abstract parcel polygons and the operate-brief field flags placed
 * by their pseudo-coordinates, plus a "Live map — Phase 9" notice.
 */

import type { FieldFlag } from "../types.js";
import css from "./FieldMapPlaceholder.module.css";

const KIND_LABEL: Record<FieldFlag["kind"], string> = {
  livestock: "🐄",
  water: "💧",
  fence: "▦",
  weather: "❄",
  team: "✦",
};

export interface FieldMapPlaceholderProps {
  flags: FieldFlag[];
}

export default function FieldMapPlaceholder({ flags }: FieldMapPlaceholderProps) {
  return (
    <div className={css.wrap} aria-label="Field activity map (placeholder)">
      <div className={css.canvas}>
        <svg
          className={css.svg}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polygon points="6,12 48,8 54,40 24,46 12,40" className={css.parcelA} />
          <polygon points="48,8 92,14 88,46 54,40" className={css.parcelB} />
          <polygon points="12,40 54,40 60,72 22,74" className={css.parcelC} />
          <polygon points="54,40 88,46 86,80 60,72" className={css.parcelD} />
          <path d="M0,55 C20,52 50,68 100,60" className={css.stream} />
        </svg>

        {flags.map((f) => (
          <span
            key={f.id}
            className={`${css.flag} ${css[`tone-${f.tone}`]}`}
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
            title={f.label}
          >
            <span className={css.glyph} aria-hidden="true">{KIND_LABEL[f.kind]}</span>
            <span className={css.flagLabel}>{f.label}</span>
          </span>
        ))}
      </div>

      <div className={css.notice}>
        <span className={css.noticeBadge}>Phase 9</span>
        <span className={css.noticeText}>Live MapboxGL field map arrives in v3.1 — flags and parcels above are illustrative.</span>
      </div>
    </div>
  );
}
