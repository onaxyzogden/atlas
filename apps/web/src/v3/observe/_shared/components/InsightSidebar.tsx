import type { ReactNode } from 'react';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { SurfaceCard } from './SurfaceCard.js';

interface InsightSidebarProps {
  title: string;
  icon?: LucideIcon;
  intro?: string;
  children?: ReactNode;
  cta?: ReactNode;
}

export function InsightSidebar({
  title,
  icon: Icon,
  intro,
  children,
  cta,
}: InsightSidebarProps) {
  return (
    <SurfaceCard className="insight-sidebar">
      <header>
        {Icon ? <Icon aria-hidden="true" /> : null}
        <h2>{title}</h2>
      </header>
      {intro ? <p className="insight-sidebar__intro">{intro}</p> : null}
      <div className="insight-sidebar__body">{children}</div>
      {cta ? (
        <button className="sidebar-cta" type="button">
          {cta}
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </SurfaceCard>
  );
}
