/**
 * DiagnoseCategoryDrawer — right-side panel surfaced when a CategoryCard
 * `View →` is clicked. Shows the drill-down content (whatsHappening /
 * whatsWrong / whatNext + supporting metrics + scoped insights) for the
 * selected category. v3.2 only authors content for water + terrain.
 *
 * Affordances:
 *   - ESC closes
 *   - backdrop click closes
 *   - close button autofocused on open
 */

import { useEffect, useRef } from "react";
import type {
  CategoryDetail,
  DiagnoseCategory,
  Insight,
  InsightKind,
} from "../types.js";
import css from "./DiagnoseCategoryDrawer.module.css";

const KIND_LABEL: Record<InsightKind, string> = {
  risk: "Risk",
  opportunity: "Opportunity",
  limitation: "Limitation",
};

export interface DiagnoseCategoryDrawerProps {
  category: DiagnoseCategory;
  detail: CategoryDetail;
  insights: Insight[];
  onClose: () => void;
}

export default function DiagnoseCategoryDrawer({
  category,
  detail,
  insights,
  onClose,
}: DiagnoseCategoryDrawerProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={css.scrim} role="presentation" onClick={onClose}>
      <aside
        className={css.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`${category.title} detail`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={css.header}>
          <div className={css.titleBlock}>
            <span className={css.eyebrow}>Land Brief · drill-down</span>
            <h2 className={css.title}>{category.title}</h2>
            <span className={css.statusPill}>{category.statusLabel}</span>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={css.close}
            onClick={onClose}
            aria-label="Close drill-down"
          >
            ×
          </button>
        </header>

        <div className={css.body}>
          <Section label="What's happening" body={detail.whatsHappening} />
          <Section label="What's wrong" body={detail.whatsWrong} tone="warn" />
          <Section label="What next" body={detail.whatNext} tone="action" />

          {detail.metrics && detail.metrics.length > 0 && (
            <section className={css.section} aria-labelledby="metrics-heading">
              <h3 id="metrics-heading" className={css.sectionLabel}>
                Supporting metrics
              </h3>
              <ul className={css.metricGrid}>
                {detail.metrics.map((m) => (
                  <li key={m.label} className={css.metricCard}>
                    <span className={css.metricLabel}>{m.label}</span>
                    <span className={css.metricValue}>{m.value}</span>
                    {m.hint && <span className={css.metricHint}>{m.hint}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {insights.length > 0 && (
            <section className={css.section} aria-labelledby="insights-heading">
              <h3 id="insights-heading" className={css.sectionLabel}>
                Related risks, opportunities &amp; limitations
              </h3>
              <ul className={css.insightList}>
                {insights.map((i) => (
                  <li key={i.id} className={`${css.insight} ${css[`kind-${i.kind}`]}`}>
                    <span className={css.insightKind}>{KIND_LABEL[i.kind]}</span>
                    <span className={css.insightTitle}>{i.title}</span>
                    <span className={css.insightDetail}>{i.detail}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {detail.mapHint && (
            <p className={css.mapHint}>
              <span className={css.mapHintLabel}>On the map</span>
              {detail.mapHint}
            </p>
          )}
        </div>

        <footer className={css.footer}>
          <button type="button" className={css.secondaryBtn} onClick={onClose}>
            Close
          </button>
          <button type="button" className={css.primaryBtn} disabled title="Coming in v3.3">
            Open on map
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Section({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone?: "warn" | "action";
}) {
  return (
    <section
      className={`${css.section} ${tone ? css[`section-${tone}`] : ""}`.trim()}
      aria-label={label}
    >
      <h3 className={css.sectionLabel}>{label}</h3>
      <p className={css.sectionBody}>{body}</p>
    </section>
  );
}
