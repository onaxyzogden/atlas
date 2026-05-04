/**
 * ActivityList — chronological feed of recent project activity.
 * Used in the Home page "Recent Activity" column.
 */

import type { ActivityEntry } from "../types.js";
import css from "./ActivityList.module.css";

const CATEGORY_LABEL: Record<ActivityEntry["category"], string> = {
  water: "Water",
  access: "Access",
  soil: "Soil",
  feasibility: "Feasibility",
  regulation: "Regulation",
  design: "Design",
  ops: "Operations",
};

export interface ActivityListProps {
  entries: ActivityEntry[];
  limit?: number;
}

export default function ActivityList({ entries, limit }: ActivityListProps) {
  const visible = limit ? entries.slice(0, limit) : entries;
  return (
    <ul className={css.list}>
      {visible.map((e) => (
        <li key={e.id} className={css.item}>
          <span className={`${css.dot} ${css[`cat-${e.category}`]}`} aria-hidden="true" />
          <div className={css.body}>
            <div className={css.row}>
              <span className={css.title}>{e.title}</span>
              <span className={css.timestamp}>{e.timestamp}</span>
            </div>
            <span className={css.detail}>{e.detail}</span>
            <span className={css.category}>{CATEGORY_LABEL[e.category]}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
