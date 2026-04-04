/**
 * DashboardPlaceholder — "Coming Soon" state for unbuilt dashboard sections.
 */

import css from './DashboardPlaceholder.module.css';

interface DashboardPlaceholderProps {
  sectionId: string;
  sectionLabel: string;
}

export default function DashboardPlaceholder({ sectionLabel }: DashboardPlaceholderProps) {
  return (
    <div className={css.wrapper}>
      <div className={css.icon}>
        <svg width={48} height={48} viewBox="0 0 48 48" fill="none" stroke="rgba(180,165,140,0.3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="6" width="36" height="36" rx="4" />
          <line x1="6" y1="18" x2="42" y2="18" />
          <line x1="18" y1="18" x2="18" y2="42" />
        </svg>
      </div>
      <h2 className={css.title}>{sectionLabel}</h2>
      <p className={css.desc}>This dashboard section is under development.</p>
      <div className={css.badge}>Coming Soon</div>
    </div>
  );
}
