import * as React from 'react';
import styles from './MonthCalendarGrid.module.css';

/** Intensity for a single month cell. */
export type MonthState = 'none' | 'low' | 'med' | 'high';

export const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const DEFAULT_CYCLE: readonly MonthState[] = ['none', 'low', 'med', 'high'];

export interface MonthCalendarGridProps {
  /** keys 0..11 (Jan..Dec); missing = 'none' */
  value: Record<number, MonthState>;
  onChange: (next: Record<number, MonthState>) => void;
  /** click cycles through these; default ['none','low','med','high'] */
  cycle?: readonly MonthState[];
  ariaLabel?: string;
}

/**
 * MonthCalendarGrid -- controlled 12-cell intensity grid (frost/season
 * calendar). Clicking a cell advances its state to the next in `cycle`
 * (wrapping) and emits the updated record. No internal state — `value` +
 * `onChange` are authoritative.
 */
export function MonthCalendarGrid({
  value,
  onChange,
  cycle = DEFAULT_CYCLE,
  ariaLabel,
}: MonthCalendarGridProps): React.JSX.Element {
  const advance = (current: MonthState): MonthState => {
    const idx = cycle.indexOf(current);
    const nextIdx = idx === -1 ? 0 : (idx + 1) % cycle.length;
    return cycle[nextIdx] ?? 'none';
  };

  const handle = (month: number): void => {
    const current = value[month] ?? 'none';
    onChange({ ...value, [month]: advance(current) });
  };

  return (
    <div role="group" aria-label={ariaLabel} className={styles.grid}>
      {MONTH_ABBR.map((abbr, i) => {
        const state = value[i] ?? 'none';
        return (
          <button
            key={i}
            type="button"
            className={styles.cell}
            data-state={state}
            aria-label={MONTH_NAMES[i]}
            onClick={() => handle(i)}
          >
            {abbr}
          </button>
        );
      })}
    </div>
  );
}
