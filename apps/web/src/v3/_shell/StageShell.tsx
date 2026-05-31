/**
 * StageShell — canonical chrome for every v3 lifecycle stage.
 *
 * Slot-based: each lifecycle stage (Observe, Plan, Diagnose, Design, Prove,
 * Build, Operate, Report) passes its content via named props instead of
 * hand-rolling its own grid/aside JSX. The shell owns:
 *
 *   - Outer 8px page padding
 *   - Responsive 3-column grid (240 / 1fr / 260, collapsing at 1200/1000/820 px)
 *   - Rail asides with the display:flex clipping fix
 *   - Bottom tray slot
 *   - Overlay slot for slide-up sheets
 *
 * Each rail slot is OPTIONAL. Pages with no rails render as a clean single
 * canvas column; the responsive rules adapt via CSS `:has()`.
 *
 * The bento-panel surface treatment for rail content lives in the slot
 * fillers themselves (e.g., ObserveTools.module.css, ObserveChecklistAside
 * .module.css). StageShell is style-agnostic about its slots.
 *
 * See `wiki/decisions/2026-05-07-atlas-stage-shell-template.md` for the
 * decision record.
 */

import type { ReactNode } from 'react';
import css from './StageShell.module.css';

export interface StageShellProps {
  /** Optional left-rail bento panel (e.g., ObserveTools). */
  leftRail?: ReactNode;
  /** Required canvas content (the stage's main surface). */
  canvas: ReactNode;
  /** Optional right-rail bento panel (e.g., ObserveChecklistAside). */
  rightRail?: ReactNode;
  /** Optional bottom tray (e.g., ObserveModuleBar). */
  bottomTray?: ReactNode;
  /** Optional overlay content rendered after the layout (slide-up sheets, modals). */
  overlay?: ReactNode;
  /** Aria label for the canvas <main>. Defaults to 'Stage canvas'. */
  canvasLabel?: string;
  /** Aria label for the left-rail <aside>. Defaults to 'Stage tools'. */
  leftRailLabel?: string;
  /** Aria label for the right-rail <aside>. Defaults to 'Stage guidance'. */
  rightRailLabel?: string;
  /**
   * Where the bottom tray sits relative to the rails.
   * - 'full' (default): full-width row beneath the 3-column body — the rails
   *   stop above it. Every existing consumer keeps this behaviour.
   * - 'between-rails': the tray is nested in the center column under the canvas,
   *   so the left/right rails run full height and the tray sits between them.
   */
  bottomPlacement?: 'full' | 'between-rails';
}

export default function StageShell({
  leftRail,
  canvas,
  rightRail,
  bottomTray,
  overlay,
  canvasLabel = 'Stage canvas',
  leftRailLabel = 'Stage tools',
  rightRailLabel = 'Stage guidance',
  bottomPlacement = 'full',
}: StageShellProps) {
  const between = bottomPlacement === 'between-rails';
  const hasBottom = bottomTray !== undefined && bottomTray !== null;
  const bottom = hasBottom ? (
    <div className={css.bottom} data-stage-bottom="">
      {bottomTray}
    </div>
  ) : null;
  const main = (
    <main className={css.canvas} aria-label={canvasLabel}>
      {canvas}
    </main>
  );

  return (
    <div className={`${css.layout} ${between ? css.layoutBetween : ''}`}>
      <div className={css.body}>
        {leftRail !== undefined && leftRail !== null && (
          <aside className={css.left} aria-label={leftRailLabel}>
            {leftRail}
          </aside>
        )}
        {between ? (
          <div className={css.center}>
            {main}
            {bottom}
          </div>
        ) : (
          main
        )}
        {rightRail !== undefined && rightRail !== null && (
          <aside className={css.right} aria-label={rightRailLabel}>
            {rightRail}
          </aside>
        )}
      </div>

      {!between && bottom}

      {overlay}
    </div>
  );
}
