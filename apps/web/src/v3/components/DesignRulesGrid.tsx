/**
 * DesignRulesGrid — Pass / Warning / Blocked checks for the design.
 *
 * Six-row grid on /v3/.../prove showing which design rules and safety
 * checks the current design satisfies.
 */

import type { DesignRule, DesignRuleStatus } from "../types.js";
import css from "./DesignRulesGrid.module.css";

const STATUS_LABEL: Record<DesignRuleStatus, string> = {
  pass: "Pass",
  warning: "Warning",
  blocked: "Blocked",
};

export interface DesignRulesGridProps {
  rules: DesignRule[];
}

export default function DesignRulesGrid({ rules }: DesignRulesGridProps) {
  return (
    <ul className={css.grid}>
      {rules.map((r) => (
        <li key={r.id} className={`${css.row} ${css[`status-${r.status}`]}`}>
          <span className={`${css.pill} ${css[`pillStatus-${r.status}`]}`}>{STATUS_LABEL[r.status]}</span>
          <div className={css.body}>
            <span className={css.rule}>{r.rule}</span>
            <span className={css.detail}>{r.detail}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
