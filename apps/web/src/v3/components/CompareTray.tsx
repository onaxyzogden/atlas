/**
 * CompareTray — bottom drawer summarizing the user's compare selection.
 *
 * Hidden when nothing is selected. When active, shows mini-cards for each
 * selected candidate plus a "Compare Selected" CTA. Mock-only — clicking
 * Compare just logs.
 */

import type { Candidate } from "../types.js";
import { MAX_COMPARE } from "../data/discoverStore.js";
import css from "./CompareTray.module.css";

export interface CompareTrayProps {
  selected: Candidate[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onCompare: () => void;
}

export default function CompareTray({ selected, onRemove, onClear, onCompare }: CompareTrayProps) {
  if (selected.length === 0) return null;
  return (
    <div className={css.tray} role="region" aria-label="Compare tray">
      <div className={css.trayBody}>
        <div className={css.header}>
          <span className={css.title}>Compare</span>
          <span className={css.count}>{selected.length} selected · max {MAX_COMPARE}</span>
        </div>
        <ul className={css.chips}>
          {selected.map((c) => (
            <li key={c.id} className={css.chip}>
              <span className={css.chipName}>{c.name}</span>
              <button
                type="button"
                className={css.removeBtn}
                onClick={() => onRemove(c.id)}
                aria-label={`Remove ${c.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className={css.actions}>
          <button type="button" className={css.clearBtn} onClick={onClear}>Clear</button>
          <button
            type="button"
            className={css.compareBtn}
            onClick={onCompare}
            disabled={selected.length < 2}
          >
            Compare Selected
          </button>
        </div>
      </div>
    </div>
  );
}
