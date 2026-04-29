/**
 * ProjectTabBar — top bar with project name + the four project lenses.
 *
 * Tabs (per 2026-04-27 UI/UX upgrade brief §3):
 *   Overview | Design Map | Intelligence | Report
 */

import { Link } from '@tanstack/react-router';
import { FileText } from 'lucide-react';
import type { ProjectRole } from '@ogden/shared';
import RoleBadge from './RoleBadge.js';
import PresenceBar from './PresenceBar.js';
import css from './ProjectTabBar.module.css';

export type ProjectTab = 'overview' | 'design-map' | 'intelligence' | 'report';

interface ProjectTabBarProps {
  projectName: string;
  activeTab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
  projectRole?: ProjectRole | null;
  onGenerateBrief?: () => void;
}

const TABS: Array<{ value: ProjectTab; label: string }> = [
  { value: 'overview',     label: 'Overview' },
  { value: 'design-map',   label: 'Design Map' },
  { value: 'intelligence', label: 'Intelligence' },
  { value: 'report',       label: 'Report' },
];

export default function ProjectTabBar({ projectName, activeTab, onTabChange, projectRole, onGenerateBrief }: ProjectTabBarProps) {
  return (
    <div className={css.bar}>
      <div className={css.left}>
        <Link to="/home" className={css.backLink} aria-label="Back to projects">
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 2 4 7 9 12" />
          </svg>
        </Link>
        <span className={css.projectName}>{projectName}</span>
        <RoleBadge role={projectRole ?? null} size="sm" />
      </div>

      <div className={css.tabs} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            className={`${css.tab} ${activeTab === tab.value ? css.tabActive : ''}`}
            onClick={() => onTabChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={css.right}>
        {onGenerateBrief && (
          <button
            type="button"
            className={css.briefButton}
            onClick={onGenerateBrief}
            title="Generate Land Brief"
          >
            <FileText size={12} strokeWidth={2.2} aria-hidden="true" />
            <span>Generate Brief</span>
          </button>
        )}
        <PresenceBar />
      </div>
    </div>
  );
}
