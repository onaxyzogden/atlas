/**
 * ProjectTabBar — thin top bar with project name + Dashboard / Map View tabs.
 */

import { Link } from '@tanstack/react-router';
import css from './ProjectTabBar.module.css';

interface ProjectTabBarProps {
  projectName: string;
  activeTab: 'dashboard' | 'map';
  onTabChange: (tab: 'dashboard' | 'map') => void;
}

export default function ProjectTabBar({ projectName, activeTab, onTabChange }: ProjectTabBarProps) {
  return (
    <div className={css.bar}>
      <div className={css.left}>
        <Link to="/" className={css.backLink} aria-label="Back to projects">
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 2 4 7 9 12" />
          </svg>
        </Link>
        <span className={css.projectName}>{projectName}</span>
      </div>

      <div className={css.tabs} role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'dashboard'}
          className={`${css.tab} ${activeTab === 'dashboard' ? css.tabActive : ''}`}
          onClick={() => onTabChange('dashboard')}
        >
          Dashboard
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'map'}
          className={`${css.tab} ${activeTab === 'map' ? css.tabActive : ''}`}
          onClick={() => onTabChange('map')}
        >
          Map View
        </button>
      </div>

      <div className={css.right} />
    </div>
  );
}
