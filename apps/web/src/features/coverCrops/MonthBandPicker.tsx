/**
 * B5.2.x.c — MonthBandPicker.
 *
 * A 12-segment horizontal band representing Jan→Dec. Click on a segment to
 * set the start month; click a second segment to set the end month. The
 * selected range highlights inclusively, with wrap support: when the end
 * segment precedes the start, the band paints {startMonth..12} ∪ {1..endMonth}.
 *
 * Controlled component — owns no state besides the "next click sets end vs
 * start" toggle. Designed as a drop-in alternative to numeric month inputs.
 *
 * Pure presentation + DOM events. No store dep, no map dep. Zero deps beyond
 * React + the sibling CSS module.
 */

import { useState } from 'react';
import css from './MonthBandPicker.module.css';

const MONTH_LABEL = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;

interface Props {
  startMonth: number;
  endMonth: number;
  onChange: (next: { startMonth: number; endMonth: number }) => void;
  ariaLabel?: string;
}

/** Inclusive range with wrap. e.g. (10, 3) → {10,11,12,1,2,3}. */
function monthsInRange(start: number, end: number): Set<number> {
  const out = new Set<number>();
  if (end >= start) {
    for (let m = start; m <= end; m++) out.add(m);
  } else {
    for (let m = start; m <= 12; m++) out.add(m);
    for (let m = 1; m <= end; m++) out.add(m);
  }
  return out;
}

export default function MonthBandPicker({
  startMonth,
  endMonth,
  onChange,
  ariaLabel,
}: Props) {
  // Toggle: which endpoint the next click sets. Begins on 'start'.
  const [next, setNext] = useState<'start' | 'end'>('start');

  const highlighted = monthsInRange(startMonth, endMonth);

  return (
    <div
      className={css.band}
      role="group"
      aria-label={ariaLabel ?? 'Month range'}
    >
      {MONTH_LABEL.map((label, idx) => {
        const month = idx + 1;
        const isStart = month === startMonth;
        const isEnd = month === endMonth;
        const isLit = highlighted.has(month);
        const cls = [
          css.cell,
          isLit ? css.cellOn : '',
          isStart ? css.cellStart : '',
          isEnd ? css.cellEnd : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={month}
            type="button"
            className={cls}
            aria-pressed={isLit}
            aria-label={`Month ${month}`}
            onClick={() => {
              if (next === 'start') {
                onChange({ startMonth: month, endMonth });
                setNext('end');
              } else {
                onChange({ startMonth, endMonth: month });
                setNext('start');
              }
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
