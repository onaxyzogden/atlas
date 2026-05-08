/**
 * GuidanceCard — shared right-rail guidance card used by Observe / Plan / Act.
 *
 * Pure presentational. The parent stage owns the store; it passes the current
 * `checkedList` for this module + an `onToggle(stepIndex)` callback. Per-module
 * dot colour is set inline via the `--group-dot` CSS variable; each stage owns
 * its own palette in a small `MODULE_DOT_COLOR` map.
 *
 * The Pitfall block is optional — Observe surfaces a Permaculture-Scholar
 * pitfall sentence below How; Plan and Act omit it.
 */

import type { CSSProperties, KeyboardEvent } from 'react';
import css from './GuidanceCard.module.css';

export interface GuidanceCardData {
  why: string;
  how: readonly string[];
  pitfall?: string;
}

export interface GuidanceCardProps<M extends string> {
  moduleKey: M;
  label: string;
  dotColor: string;
  active: boolean;
  slideUpOpen: boolean;
  guidance: GuidanceCardData;
  checkedList: readonly number[];
  onToggle: (stepIndex: number) => void;
  onSelect: () => void;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
  checksDisabled?: boolean;
}

export function GuidanceCard<M extends string>({
  moduleKey,
  label,
  dotColor,
  active,
  slideUpOpen,
  guidance,
  checkedList,
  onToggle,
  onSelect,
  onOpenSlideUp,
  onCloseSlideUp,
  checksDisabled = false,
}: GuidanceCardProps<M>) {
  const handleCardClick = () => {
    if (active) {
      if (slideUpOpen) onCloseSlideUp();
      else onOpenSlideUp();
      return;
    }
    onSelect();
  };

  const handleKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  const title = active
    ? slideUpOpen
      ? `Close ${label} details`
      : `Open ${label} details`
    : `Switch to ${label}`;

  const style = { ['--group-dot' as never]: dotColor } as CSSProperties;

  return (
    <section
      className={`${css.group} ${active ? css.groupActive : ''}`}
      data-module={moduleKey}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      title={title}
      style={style}
      onClick={handleCardClick}
      onKeyDown={handleKey}
    >
      <header className={css.groupHeader}>
        <span className={css.dot} aria-hidden="true" />
        <span className={css.groupLabel}>{label}</span>
      </header>
      <p className={css.why}>{guidance.why}</p>
      <div className={css.howBlock}>
        <span className={css.blockLabel}>How</span>
        <ul className={css.howList}>
          {guidance.how.map((step, i) => {
            const checked = checkedList.includes(i);
            return (
              <li key={i} className={css.howItem}>
                {/* stopPropagation keeps a checkbox toggle from also firing
                    the section's module-select / slide-up handler. */}
                <label
                  className={`${css.howCheck} ${checked ? css.howCheckDone : ''}`}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={checksDisabled}
                    onChange={() => !checksDisabled && onToggle(i)}
                  />
                  <span className={css.howText}>{step}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      {guidance.pitfall && (
        <div className={css.pitfall}>
          <span className={css.blockLabel}>Pitfall</span>
          <p className={css.pitfallText}>{guidance.pitfall}</p>
        </div>
      )}
    </section>
  );
}

export default GuidanceCard;
