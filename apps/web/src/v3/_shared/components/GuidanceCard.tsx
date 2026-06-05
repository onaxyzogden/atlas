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

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import {
  OBJECTIVE_STATUS_LABEL,
  statusFromPct,
  type ObjectiveProgress,
} from '../objectiveWorkspace/objectiveStatus.js';
import css from './GuidanceCard.module.css';

export interface GuidanceCardData {
  why: string;
  how: readonly string[];
  pitfall?: string;
}

/**
 * Summary-note binding for the unified objective card. When supplied, the card
 * renders a persisted free-text completion note below the guidance. Plan and
 * Observe pass this; Act / context cards omit it (note section is hidden).
 */
export interface GuidanceCardSummary {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
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
  /**
   * Optional content rendered in the card header next to the label.
   * Plan uses this for the project-type cross-check chip; Observe / Act
   * leave it unset.
   */
  headerExtras?: ReactNode;
  /**
   * Optional completion progress (verified / total / pct). When present the
   * card shows a progress bar, an "X% ready" readout, and a status pill —
   * turning the guidance card into the unified objective workspace card
   * (Plan + Observe). Omit to render plain guidance (Act / context cards).
   */
  progress?: ObjectiveProgress;
  /**
   * Optional persisted summary note. When present a "Summary" section with a
   * textarea renders below the guidance. Pairs with `progress` for the unified
   * objective card; omit to hide the note.
   */
  summary?: GuidanceCardSummary;
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
  headerExtras,
  progress,
  summary,
}: GuidanceCardProps<M>) {
  const status = progress ? statusFromPct(progress.pct) : null;
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
        {headerExtras ? (
          <span className={css.groupHeaderExtras}>{headerExtras}</span>
        ) : null}
      </header>
      {progress && status ? (
        <div className={css.progress}>
          <div className={css.progressTop}>
            <div
              className={css.progressBar}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.pct}
              aria-label={`${label} progress`}
            >
              <span
                className={css.progressFill}
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <span
              className={`${css.statusPill} ${css[`status_${status.replace('-', '_')}`] ?? ''}`}
            >
              {OBJECTIVE_STATUS_LABEL[status]}
            </span>
          </div>
          <span className={css.progressMeta}>
            {progress.pct}% ready · {progress.verified}/{progress.total} steps
          </span>
        </div>
      ) : null}
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
      {summary ? (
        <div
          className={css.summaryBlock}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <span className={css.blockLabel}>Summary</span>
          <textarea
            className={css.summaryArea}
            value={summary.value}
            placeholder={
              summary.placeholder ??
              'Note how this objective was met — decisions, evidence, follow-ups.'
            }
            disabled={summary.disabled}
            onChange={(e) => summary.onChange(e.target.value)}
          />
        </div>
      ) : null}
    </section>
  );
}

export default GuidanceCard;
