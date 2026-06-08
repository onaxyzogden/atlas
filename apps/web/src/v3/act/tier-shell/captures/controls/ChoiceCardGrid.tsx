import * as React from 'react';
import styles from './ChoiceCardGrid.module.css';

export interface ChoiceCardOption {
  id: string;
  title: string;
  description?: string;
  /** a Lucide icon component (or any component with the same minimal props) */
  icon?: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
}

export interface ChoiceCardGridProps {
  options: readonly ChoiceCardOption[];
  /** selected option ids */
  value: string[];
  onChange: (next: string[]) => void;
  /** default false (single-select); true toggles each card in/out */
  multi?: boolean;
  /** CSS grid-template-columns count; default 2 */
  columns?: number;
  ariaLabel?: string;
}

/**
 * ChoiceCardGrid -- controlled single/multi-select cards (icon + title + desc).
 * Single-select replaces `value` with the clicked id; multi toggles it. No
 * internal state — `value` + `onChange` are authoritative.
 */
export function ChoiceCardGrid({
  options,
  value,
  onChange,
  multi = false,
  columns = 2,
  ariaLabel,
}: ChoiceCardGridProps): React.JSX.Element {
  const handle = (id: string): void => {
    const selected = value.includes(id);
    if (!multi) {
      onChange([id]);
      return;
    }
    onChange(selected ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={styles.grid}
      style={{ '--cols': columns } as React.CSSProperties}
    >
      {options.map((option) => {
        const selected = value.includes(option.id);
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            className={styles.card}
            data-selected={selected}
            aria-pressed={selected}
            onClick={() => handle(option.id)}
          >
            {Icon ? <Icon size={18} aria-hidden /> : null}
            <span className={styles.cardTitle}>{option.title}</span>
            {option.description ? (
              <span className={styles.cardDesc}>{option.description}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
