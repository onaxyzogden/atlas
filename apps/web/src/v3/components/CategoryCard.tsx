/**
 * CategoryCard — one of the 7 land-brief category tiles on /v3/.../diagnose.
 *
 * Renders a status pill, the plain-language summary, the mandated
 * "What this means" sentence, an optional headline metric, and a View → link.
 */

import type { CategoryStatus, DiagnoseCategory } from "../types.js";
import css from "./CategoryCard.module.css";

const STATUS_TONE: Record<CategoryStatus, "good" | "watch" | "warning" | "blocked" | "incomplete"> = {
  strong: "good",
  workable: "good",
  conditional: "watch",
  "at-risk": "warning",
  blocked: "blocked",
  incomplete: "incomplete",
};

export interface CategoryCardProps {
  category: DiagnoseCategory;
  onView?: (id: DiagnoseCategory["id"]) => void;
  /** When false, the View → button renders disabled with "Detail soon". */
  hasDetail?: boolean;
}

export default function CategoryCard({ category, onView, hasDetail = true }: CategoryCardProps) {
  const tone = STATUS_TONE[category.status];
  return (
    <article className={`${css.card} ${css[`tone-${tone}`]}`}>
      <header className={css.header}>
        <h3 className={css.title}>{category.title}</h3>
        <span className={`${css.pill} ${css[`pill-${tone}`]}`}>{category.statusLabel}</span>
      </header>

      <p className={css.summary}>{category.summary}</p>

      {category.metric && (
        <div className={css.metric}>
          <span className={css.metricLabel}>{category.metric.label}</span>
          <span className={css.metricValue}>{category.metric.value}</span>
        </div>
      )}

      <div className={css.meaning}>
        <span className={css.meaningLabel}>What this means</span>
        <p className={css.meaningText}>{category.meaning}</p>
      </div>

      <footer className={css.footer}>
        <button
          type="button"
          className={css.viewBtn}
          onClick={() => hasDetail && onView?.(category.id)}
          disabled={!hasDetail}
          title={hasDetail ? undefined : "Detail coming soon"}
        >
          {hasDetail ? "View →" : "Detail soon"}
        </button>
      </footer>
    </article>
  );
}
