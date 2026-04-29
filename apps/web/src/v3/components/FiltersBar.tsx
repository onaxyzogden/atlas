/**
 * FiltersBar — top-of-board filter chips for Discover.
 *
 * Mock-only per RULE 1: clicking a chip toggles a UI active state but does
 * not actually filter the candidate list. Real filtering is v3.1.
 */

import { useState } from "react";
import css from "./FiltersBar.module.css";

const FILTERS = [
  { id: "acreage", label: "Acreage", options: ["< 50 ha", "50–150 ha", "> 150 ha"] },
  { id: "price", label: "Price", options: ["< $1M", "$1M–$2M", "> $2M"] },
  { id: "use-fit", label: "Use Fit", options: ["Education", "Conservation", "Mixed Use", "Tourism"] },
] as const;

export interface FiltersBarProps {
  resultCount: number;
}

export default function FiltersBar({ resultCount }: FiltersBarProps) {
  const [active, setActive] = useState<Record<string, string | null>>({});
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className={css.bar}>
      <div className={css.chips}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`${css.chip} ${active[f.id] ? css.chipActive : ""}`}
            onClick={() => {
              setActive((prev) => {
                const idx = f.options.indexOf((prev[f.id] ?? "") as never);
                const next = idx + 1 < f.options.length ? (f.options[idx + 1] ?? null) : null;
                return { ...prev, [f.id]: next };
              });
            }}
          >
            <span className={css.chipLabel}>{f.label}</span>
            <span className={css.chipValue}>{active[f.id] ?? "Any"}</span>
          </button>
        ))}
        <button
          type="button"
          className={`${css.chip} ${moreOpen ? css.chipActive : ""}`}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <span className={css.chipLabel}>More filters</span>
          <span className={css.chipValue}>{moreOpen ? "−" : "+"}</span>
        </button>
      </div>
      <span className={css.count}>{resultCount} properties</span>
    </div>
  );
}
