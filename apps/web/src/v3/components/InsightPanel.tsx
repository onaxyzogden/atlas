/**
 * InsightPanel — one column of the Risks / Opportunities / Limitations row.
 *
 * Each panel renders a coloured header tile + a list of findings. Designed
 * to sit in a 3-column grid inside DiagnosePage.
 */

import type { Insight, InsightKind } from "../types.js";
import css from "./InsightPanel.module.css";

const KIND_LABEL: Record<InsightKind, string> = {
  risk: "Risks",
  opportunity: "Opportunities",
  limitation: "Limitations",
};

const KIND_TAGLINE: Record<InsightKind, string> = {
  risk: "What could derail the plan",
  opportunity: "Conditions worth designing into",
  limitation: "Constraints to plan around",
};

export interface InsightPanelProps {
  kind: InsightKind;
  items: Insight[];
}

export default function InsightPanel({ kind, items }: InsightPanelProps) {
  return (
    <section className={`${css.panel} ${css[`kind-${kind}`]}`} aria-label={KIND_LABEL[kind]}>
      <header className={css.header}>
        <h3 className={css.title}>{KIND_LABEL[kind]}</h3>
        <span className={css.count}>{items.length}</span>
      </header>
      <p className={css.tagline}>{KIND_TAGLINE[kind]}</p>
      <ul className={css.list}>
        {items.map((item) => (
          <li key={item.id} className={css.item}>
            <span className={css.itemTitle}>{item.title}</span>
            <span className={css.itemDetail}>{item.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
