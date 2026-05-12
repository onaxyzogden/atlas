import type { ReactNode } from 'react';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { SurfaceCard } from './SurfaceCard.js';
import styles from './InsightSidebar.module.css';

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
    <SurfaceCard className={styles.sidebar}>
      <header>
        {Icon ? <Icon aria-hidden="true" /> : null}
        <h2>{title}</h2>
      </header>
      {intro ? <p className={styles.intro}>{intro}</p> : null}
      <div>{children}</div>
      {cta ? (
        <button className={styles.cta} type="button">
          {cta}
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </SurfaceCard>
  );
}
