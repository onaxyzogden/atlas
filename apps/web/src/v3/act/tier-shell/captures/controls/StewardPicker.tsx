import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  encodeStewardRef,
  type StewardOption,
  type StewardRef,
} from '../stewardRef.js';
import styles from './StewardPicker.module.css';

export interface StewardPickerProps {
  /** Selectable identities, from buildStewardOptions(roster, stewardModel). */
  options: readonly StewardOption[];
  /** Currently-linked ref; null => the off-platform sentinel is shown. */
  value: StewardRef;
  /**
   * Fires on selection. Picking a person emits (ref, that person's label) so the
   * host can fill the name field AND record the ref in one gesture; picking the
   * sentinel emits (null, '') and the host falls back to its free-text input.
   */
  onChange: (ref: StewardRef, label: string) => void;
  /** Label for the trailing off-platform sentinel option. */
  sentinelLabel?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * StewardPicker -- controlled single-select that links a named steward back to
 * the canonical roster (Option 1; see stewardRef.ts). Mirrors `Dropdown`: a
 * themed native <select> with a custom lucide chevron. Option values are the
 * compact steward-ref tokens (`u:`/`e:`); the empty token is the off-platform
 * sentinel. A stored ref that is no longer in `options` resolves to the
 * sentinel (graceful fallback -- the host keeps its free-text name).
 */
export function StewardPicker({
  options,
  value,
  onChange,
  sentinelLabel = 'Someone not listed (off-platform)',
  ariaLabel,
  disabled = false,
}: StewardPickerProps): React.JSX.Element {
  const token = encodeStewardRef(value);
  const known = options.some((o) => encodeStewardRef(o.ref) === token);
  const resolved = token !== '' && known ? token : '';

  return (
    <div className={styles.wrap}>
      <select
        className={styles.select}
        value={resolved}
        disabled={disabled}
        aria-label={ariaLabel ?? 'Link to a steward'}
        onChange={(e) => {
          const next = e.target.value;
          if (next === '') {
            onChange(null, '');
            return;
          }
          const opt = options.find((o) => encodeStewardRef(o.ref) === next);
          if (opt) onChange(opt.ref, opt.label);
          else onChange(null, '');
        }}
      >
        {options.map((opt) => {
          const optToken = encodeStewardRef(opt.ref);
          const suffix =
            opt.sub.trim() !== '' && opt.sub.trim() !== opt.label.trim()
              ? ` -- ${opt.sub}`
              : '';
          return (
            <option key={optToken} value={optToken}>
              {opt.label}
              {suffix}
            </option>
          );
        })}
        <option value="">{sentinelLabel}</option>
      </select>
      <ChevronDown size={15} className={styles.chevron} aria-hidden="true" />
    </div>
  );
}
