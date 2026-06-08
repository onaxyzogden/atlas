import * as React from 'react';
import styles from './ChipSelect.module.css';

export interface ChipSelectProps {
  options: readonly string[];
  /** currently-selected option labels */
  value: string[];
  onChange: (next: string[]) => void;
  /** default true; when false, selecting replaces the selection */
  multi?: boolean;
  ariaLabel?: string;
}

/**
 * ChipSelect -- controlled toggle chips. Multi-select toggles each label in/out
 * of `value`; single-select (multi={false}) replaces the selection with the
 * clicked label. No internal state — `value` + `onChange` are authoritative.
 */
export function ChipSelect({
  options,
  value,
  onChange,
  multi = true,
  ariaLabel,
}: ChipSelectProps): React.JSX.Element {
  const handle = (option: string): void => {
    const selected = value.includes(option);
    if (!multi) {
      onChange([option]);
      return;
    }
    onChange(selected ? value.filter((v) => v !== option) : [...value, option]);
  };

  return (
    <div role="group" aria-label={ariaLabel} className={styles.chipRow}>
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            className={styles.chip}
            data-on={selected}
            aria-pressed={selected}
            onClick={() => handle(option)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
