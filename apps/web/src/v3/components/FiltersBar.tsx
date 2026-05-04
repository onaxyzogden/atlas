/**
 * FiltersBar — top-of-board filter chips for Discover.
 *
 * Phase 6.1 (per `.claude/plans/few-concerns-shiny-quokka.md`): chips
 * are now controlled. Click cycles through `null → option[0] → … →
 * option[last] → null`; the parent owns the selection and applies
 * filtering against the candidate list. The "More filters" chip
 * remains a UI stub — that drawer ships with the v3.1 surface.
 */
import css from "./FiltersBar.module.css";

export const FILTERS = [
  { id: "acreage", label: "Acreage", options: ["< 50 ha", "50–150 ha", "> 150 ha"] },
  { id: "price", label: "Price", options: ["< $1M", "$1M–$2M", "> $2M"] },
  { id: "use-fit", label: "Use Fit", options: ["Education", "Conservation", "Mixed Use", "Tourism", "Pasture", "Silvopasture", "Agritourism"] },
] as const;

export type FilterId = (typeof FILTERS)[number]["id"];
export type FilterState = Partial<Record<FilterId, string | null>>;

export interface FiltersBarProps {
  resultCount: number;
  active: FilterState;
  onChange: (next: FilterState) => void;
  moreOpen: boolean;
  onToggleMore: () => void;
}

export default function FiltersBar({
  resultCount,
  active,
  onChange,
  moreOpen,
  onToggleMore,
}: FiltersBarProps) {
  return (
    <div className={css.bar}>
      <div className={css.chips}>
        {FILTERS.map((f) => {
          const current = active[f.id] ?? null;
          return (
            <button
              key={f.id}
              type="button"
              className={`${css.chip} ${current ? css.chipActive : ""}`}
              onClick={() => {
                const idx = current ? f.options.indexOf(current as never) : -1;
                const next = idx + 1 < f.options.length ? (f.options[idx + 1] ?? null) : null;
                onChange({ ...active, [f.id]: next });
              }}
            >
              <span className={css.chipLabel}>{f.label}</span>
              <span className={css.chipValue}>{current ?? "Any"}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={`${css.chip} ${moreOpen ? css.chipActive : ""}`}
          onClick={onToggleMore}
        >
          <span className={css.chipLabel}>More filters</span>
          <span className={css.chipValue}>{moreOpen ? "−" : "+"}</span>
        </button>
      </div>
      <span className={css.count}>{resultCount} properties</span>
    </div>
  );
}
