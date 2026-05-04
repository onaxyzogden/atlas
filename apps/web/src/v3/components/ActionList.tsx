/**
 * ActionList — generic actionable-items list used by Home page columns
 * "Top Decisions Needed" and "Next Actions". Filter the input upstream;
 * this just renders.
 */

import type { Action, ActionImpact, ActionType } from "../types.js";
import css from "./ActionList.module.css";

const TYPE_LABEL: Record<ActionType, string> = {
  decision: "Decision",
  design: "Design",
  investigation: "Investigation",
  build: "Build",
  ops: "Operations",
};

const IMPACT_TONE: Record<ActionImpact, string> = {
  high: "tone-high",
  medium: "tone-medium",
  low: "tone-low",
};

export interface ActionListProps {
  actions: Action[];
  emptyMessage?: string;
}

export default function ActionList({ actions, emptyMessage = "Nothing here yet." }: ActionListProps) {
  if (actions.length === 0) {
    return <p className={css.empty}>{emptyMessage}</p>;
  }
  return (
    <ul className={css.list}>
      {actions.map((a) => (
        <li key={a.id} className={css.item}>
          <div className={css.header}>
            <span className={css.title}>{a.title}</span>
            {a.impact && (
              <span className={`${css.impact} ${css[IMPACT_TONE[a.impact]]}`}>{a.impact}</span>
            )}
          </div>
          <div className={css.meta}>
            <span className={css.type}>{TYPE_LABEL[a.type]}</span>
            {a.dueLabel && <span className={css.due}>· {a.dueLabel}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
