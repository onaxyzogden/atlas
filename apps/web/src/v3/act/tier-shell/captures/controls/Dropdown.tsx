import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Dropdown.module.css';

export interface DropdownProps {
  options: readonly string[];
  /** currently-selected option label; '' => nothing selected (placeholder shown) */
  value: string;
  onChange: (next: string) => void;
  /** placeholder option label shown when value is '' (default "Select..."). */
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * Dropdown -- controlled single-select backed by a native <select>. The Act
 * Tier-0 workbench convention for single choices (replaces single-select
 * ChipSelect). No internal state -- `value` + `onChange` are authoritative.
 *
 * A native <select> is used for full keyboard / a11y support; the closed control
 * is themed to the dark workbench surface (matching VisionFormFields) with a
 * custom lucide chevron (appearance: none strips the OS arrow). The placeholder
 * option (value '') lets the selection be cleared back to "unset".
 */
export function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  ariaLabel,
  disabled = false,
}: DropdownProps): React.JSX.Element {
  // If the stored value isn't one of the options, fall back to the placeholder
  // so a stale / foreign value never renders as a silently-selected option.
  const resolved = value !== '' && options.includes(value) ? value : '';

  return (
    <div className={styles.wrap}>
      <select
        className={styles.select}
        value={resolved}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        className={styles.chevron}
        aria-hidden="true"
      />
    </div>
  );
}
