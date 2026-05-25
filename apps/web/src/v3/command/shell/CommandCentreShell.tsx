/**
 * CommandCentreShell — the stage-agnostic full-bleed dashboard scaffold shared by
 * every stage Command Centre (Observe / Plan / Act). It owns ONLY the grid
 * structure; each region arrives as a slot so the per-stage pages keep all their
 * own state, hooks, filters, and nav helpers:
 *
 *   ┌ tabs ─ module-tab strip ──────────────────────────────────────────┐
 *   ├ body ─┬ sidebar ─┬ siteMap ─────────────────────┬ rail ───────────┤
 *   │       │ filter   │                               │ (per-stage)     │
 *   │       │ layers   │                               │                 │
 *   ├───────┴ bottom tray ─ open-items carousel ───────────────────────┤
 *
 * This mirrors the `StageCompassView` precedent (a pure presentational shell fed
 * by thin per-stage wrappers) and retires the by-hand grid duplication that lived
 * in ObserveCommandCentrePage / PlanCommandCentrePage / ActCommandCentrePage.
 *
 * The `rail` slot is rendered inside `css.rail`; stages that need an extra wrapper
 * (e.g. Act's `ActOpsAside` `.aside` surface) pass that wrapper as part of the
 * slot, so the shell needn't know about per-stage rail CSS.
 *
 * Rendered full-bleed by V3ProjectLayout (the `command-centre` path skips
 * LandOsShell).
 */

import type { ReactNode } from 'react';
import css from '../ObserveCommandCentrePage.module.css';

export interface CommandCentreShellProps {
  /** Module-tab strip row (top). */
  tabs: ReactNode;
  /** Left column: map filter / layer toggles / base-map switcher. */
  sidebar: ReactNode;
  /** Centre column: the site map panel. */
  siteMap: ReactNode;
  /** Right column content, rendered inside `css.rail`. */
  rail: ReactNode;
  /** Bottom row: the open-items carousel. */
  tray: ReactNode;
  /** Drives the `data-sidebar` layout attribute on the body. */
  sidebarCollapsed: boolean;
}

export default function CommandCentreShell({
  tabs,
  sidebar,
  siteMap,
  rail,
  tray,
  sidebarCollapsed,
}: CommandCentreShellProps) {
  return (
    <div className={css.shell}>
      {tabs}

      <div
        className={css.body}
        data-sidebar={sidebarCollapsed ? 'collapsed' : 'expanded'}
      >
        {sidebar}
        {siteMap}
        <div className={css.rail}>{rail}</div>
      </div>

      <div className={css.bottomTray}>{tray}</div>
    </div>
  );
}
