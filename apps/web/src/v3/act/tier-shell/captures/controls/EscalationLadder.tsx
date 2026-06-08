import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './EscalationLadder.module.css';

export interface EscalationTier {
  title: string;
  body: React.ReactNode;
}

export interface EscalationLadderProps {
  tiers: readonly EscalationTier[];
  ariaLabel?: string;
  /** which tier starts expanded; default 0; -1 = all collapsed */
  defaultOpenIndex?: number;
}

/**
 * EscalationLadder -- numbered collapsible tiers (dispute escalation / hardship
 * protocol). Holds local open/collapsed disclosure state only — it carries no
 * data value. Clicking a head toggles that tier; collapsed bodies are not
 * rendered.
 */
export function EscalationLadder({
  tiers,
  ariaLabel,
  defaultOpenIndex = 0,
}: EscalationLadderProps): React.JSX.Element {
  const [openIndex, setOpenIndex] = React.useState<number>(defaultOpenIndex);

  const toggle = (i: number): void => {
    setOpenIndex((current) => (current === i ? -1 : i));
  };

  return (
    <ol className={styles.ladder} aria-label={ariaLabel}>
      {tiers.map((tier, i) => {
        const open = openIndex === i;
        return (
          <li key={i} className={styles.tier}>
            <button
              type="button"
              className={styles.tierHead}
              aria-expanded={open}
              data-step={i + 1}
              onClick={() => toggle(i)}
            >
              <span className={styles.stepNum}>{i + 1}</span>
              <span className={styles.tierTitle}>{tier.title}</span>
              <ChevronDown
                className={styles.chevron}
                data-open={open}
                size={16}
                aria-hidden="true"
              />
            </button>
            {open ? <div className={styles.tierBody}>{tier.body}</div> : null}
          </li>
        );
      })}
    </ol>
  );
}
