/**
 * LandOsShell — three-column lifecycle workspace layout.
 *
 *   sidebar | content | rail
 *
 * Layout-only. No data fetching, no store mutation. The content area keeps
 * the existing `position: absolute; inset: 0` tabPanel pattern so MapLibre's
 * resize observer is undisturbed when DashboardView/MapView swap visibility.
 */

import type { ReactNode } from 'react';
import css from './LandOsShell.module.css';

export interface LandOsShellProps {
  sidebar: ReactNode;
  rail: ReactNode;
  children: ReactNode;
}

export default function LandOsShell({ sidebar, rail, children }: LandOsShellProps) {
  return (
    <div className={css.shell}>
      <aside className={css.sidebar} aria-label="Lifecycle navigation">
        {sidebar}
      </aside>
      <section className={css.content} aria-label="Workspace content">
        {children}
      </section>
      <aside className={css.rail} aria-label="Lifecycle decision rail">
        {rail}
      </aside>
    </div>
  );
}
