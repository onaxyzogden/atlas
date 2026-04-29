/**
 * BlockerCard — v3 fork of BlockingIssueCard.
 *
 * Decoupled from `WeightedViolation`. Consumes the v3 `Blocker` shape,
 * which is what every v3 page already produces.
 */

import type { Blocker, BlockerSeverity } from "../types.js";
import css from "./BlockerCard.module.css";

export interface BlockerCardProps {
  blocker: Blocker;
  onAction?: (blocker: Blocker) => void;
}

const SEVERITY_LABEL: Record<BlockerSeverity, string> = {
  blocking: "Blocking",
  warning: "Warning",
  incomplete: "Incomplete",
  advisory: "Advisory",
};

export default function BlockerCard({ blocker, onAction }: BlockerCardProps) {
  return (
    <article
      className={`${css.card} ${css[`severity-${blocker.severity}`]}`}
      aria-label={`${SEVERITY_LABEL[blocker.severity]}: ${blocker.title}`}
    >
      <header className={css.header}>
        <span className={css.tag}>{SEVERITY_LABEL[blocker.severity]}</span>
      </header>

      <h4 className={css.title}>{blocker.title}</h4>
      <p className={css.description}>{blocker.description}</p>

      <p className={css.recommendation}>
        <span className={css.recLabel}>Recommended:</span> {blocker.recommendedAction}
      </p>

      {onAction && blocker.actionLabel && (
        <footer className={css.footer}>
          <button type="button" className={css.action} onClick={() => onAction(blocker)}>
            {blocker.actionLabel}
          </button>
        </footer>
      )}
    </article>
  );
}
