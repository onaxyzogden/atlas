/**
 * IconSidebar — full-height left navigation panel for the project view.
 * Organized by development phase (P1–P4) with accordion behavior.
 * Includes logo, phase groups, and bottom nav (new project, settings, user).
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../store/authStore.js';
import s from './IconSidebar.module.css';

// The panel a sub-item maps to (existing SidebarView panel keys)
export type SidebarView =
  | 'layers'
  | 'intelligence'
  | 'hydrology'
  | 'design'
  | 'ai'
  | 'regulatory'
  | 'economic'
  | 'timeline'
  | 'vision'
  | 'moontrance'
  | 'scenarios'
  | 'history'
  | 'collaboration'
  | 'portal'
  | 'templates'
  | 'reporting'
  | 'fieldnotes'
  | 'settings'
  | null;

// Granular navigation item id (what appears highlighted in the sidebar)
export type SubItemId =
  | 'terrain-viz' | 'site-data'
  | 'site-assessment' | 'hydrology-basic' | 'solar-climate' | 'soil-ecology'
  | 'zones' | 'structures' | 'access' | 'livestock' | 'crops' | 'utilities'
  | 'timeline' | 'vision' | 'economics' | 'regulatory'
  | 'ai' | 'scenarios' | 'collaboration' | 'moontrance' | 'educational'
  | 'templates' | 'reporting'
  | 'portal' | 'fieldwork' | 'history'
  | 'settings';

interface SubItem {
  id: SubItemId;
  label: string;
  panel: SidebarView;
}

interface PhaseGroup {
  phase: 'P1' | 'P2' | 'P3' | 'P4';
  name: string;
  desc: string;
  color: string;
  items: SubItem[];
}

const PHASE_GROUPS: PhaseGroup[] = [
  {
    phase: 'P1',
    name: 'Site Intelligence',
    desc: 'Terrain visualization, site data layers, automated site assessment',
    color: '#c4a265',
    items: [
      { id: 'terrain-viz',     label: 'Terrain Visualization', panel: 'layers' },
      { id: 'site-data',       label: 'Site Data Layers',     panel: 'intelligence' },
      { id: 'site-assessment', label: 'Site Assessment',      panel: 'intelligence' },
      { id: 'hydrology-basic', label: 'Hydrology (Basic)',    panel: 'hydrology' },
      { id: 'solar-climate',   label: 'Solar & Climate',      panel: 'intelligence' },
      { id: 'soil-ecology',    label: 'Soil & Ecology',       panel: 'intelligence' },
    ],
  },
  {
    phase: 'P2',
    name: 'Design Atlas',
    desc: 'Full structure/zone planning, hydrology, livestock, crop design',
    color: '#8a9a74',
    items: [
      { id: 'zones',       label: 'Zones & Land Use',      panel: 'design' },
      { id: 'structures',  label: 'Structures & Built',    panel: 'design' },
      { id: 'access',      label: 'Access & Circulation',  panel: 'design' },
      { id: 'livestock',   label: 'Livestock Systems',     panel: 'design' },
      { id: 'crops',       label: 'Crops & Agroforestry',  panel: 'design' },
      { id: 'utilities',   label: 'Utilities & Energy',    panel: 'design' },
      { id: 'timeline',    label: 'Timeline & Phasing',    panel: 'timeline' },
      { id: 'vision',      label: 'Vision Layer',          panel: 'vision' },
      { id: 'economics',   label: 'Economics',             panel: 'economic' },
      { id: 'regulatory',  label: 'Regulatory',            panel: 'regulatory' },
    ],
  },
  {
    phase: 'P3',
    name: 'Collaboration + AI',
    desc: 'Multi-user access, AI-assisted outputs, scenario modeling',
    color: '#7a8a9a',
    items: [
      { id: 'ai',            label: 'AI Atlas',          panel: 'ai' },
      { id: 'scenarios',     label: 'Scenarios',         panel: 'scenarios' },
      { id: 'collaboration', label: 'Collaboration',     panel: 'collaboration' },
      { id: 'moontrance',    label: 'OGDEN Identity',    panel: 'moontrance' },
      { id: 'educational',   label: 'Educational Atlas', panel: 'collaboration' },
      { id: 'templates',     label: 'Templates',         panel: 'templates' },
      { id: 'reporting',     label: 'Reports & Export',  panel: 'reporting' },
    ],
  },
  {
    phase: 'P4',
    name: 'Public + Portal',
    desc: 'Public storytelling, export suite, mobile fieldwork, templates',
    color: '#9a7a8a',
    items: [
      { id: 'portal',   label: 'Public Portal',    panel: 'portal' },
      { id: 'fieldwork', label: 'Fieldwork',       panel: 'fieldnotes' },
      { id: 'history',  label: 'Version History',  panel: 'history' },
    ],
  },
];

interface IconSidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  activeSubItem: SubItemId | null;
  onSubItemChange: (id: SubItemId, panel: SidebarView) => void;
  zoneCount: number;
  structureCount: number;
}

type PhaseKey = 'P1' | 'P2' | 'P3' | 'P4';

export default function IconSidebar({
  activeView,
  onViewChange,
  activeSubItem,
  onSubItemChange,
}: IconSidebarProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Collapsed sidebar state
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('ogden-sidebar-collapsed') === 'true'; } catch { return false; }
  });

  // Accordion: which phase is open (only one at a time)
  const [openPhase, setOpenPhase] = useState<PhaseKey>(() => {
    try {
      const stored = localStorage.getItem('ogden-sidebar-open-phase');
      if (stored === 'P1' || stored === 'P2' || stored === 'P3' || stored === 'P4') return stored;
    } catch { /* */ }
    return 'P1';
  });

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('ogden-sidebar-collapsed', String(next)); } catch { /* */ }
  };

  const togglePhase = (phase: PhaseKey) => {
    const next = openPhase === phase ? phase : phase; // always opens clicked phase
    setOpenPhase(next);
    try { localStorage.setItem('ogden-sidebar-open-phase', next); } catch { /* */ }
  };

  // When sidebar collapses, open phase stays but items are hidden
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'User Account';
  const displayInitial = (displayName[0] ?? 'U').toUpperCase();

  return (
    <aside className={`${s.sidebar} ${collapsed ? s.sidebarCollapsed : s.sidebarExpanded}`}>

      {/* ── Logo / Header ─────────────────────────────── */}
      <div className={s.logoRow}>
        {!collapsed && (
          <Link to="/" className={s.logoLink}>
            <span className={s.logoMark}>OGDEN</span>
            <span className={s.logoSub}>LAND DESIGN ATLAS</span>
          </Link>
        )}
        <button
          onClick={toggleCollapse}
          className={s.collapseBtn}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? (
              <polyline points="5 2 10 7 5 12" />
            ) : (
              <polyline points="9 2 4 7 9 12" />
            )}
          </svg>
        </button>
      </div>

      {/* ── Phase Accordion ───────────────────────────── */}
      <div className={s.phaseList}>
        {PHASE_GROUPS.map((group) => {
          const isOpen = openPhase === group.phase && !collapsed;

          return (
            <div key={group.phase} className={s.phaseGroup}>
              {/* Phase header button */}
              <button
                className={`${s.phaseHeader} ${openPhase === group.phase ? s.phaseHeaderActive : ''}`}
                onClick={() => togglePhase(group.phase)}
                aria-expanded={isOpen}
                title={collapsed ? `${group.phase} — ${group.name}` : undefined}
              >
                {/* Phase badge */}
                <span
                  className={s.phaseBadge}
                  style={{ backgroundColor: group.color + '33', color: group.color, borderColor: group.color + '55' }}
                >
                  {group.phase}
                </span>

                {!collapsed && (
                  <div className={s.phaseHeaderText}>
                    <span className={s.phaseName}>{group.name}</span>
                    <span className={s.phaseDesc}>{group.desc}</span>
                  </div>
                )}

                {!collapsed && (
                  <span className={`${s.phaseChevron} ${isOpen ? s.phaseChevronOpen : ''}`}>
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2 4 6 8 10 4" />
                    </svg>
                  </span>
                )}
              </button>

              {/* Sub-items (only when expanded and not collapsed sidebar) */}
              {isOpen && (
                <div className={s.phaseItems}>
                  {group.items.map((item) => {
                    const isActive = activeSubItem === item.id;
                    return (
                      <button
                        key={item.id}
                        className={`${s.subItem} ${isActive ? s.subItemActive : ''}`}
                        style={isActive ? { borderLeftColor: group.color } : undefined}
                        onClick={() => onSubItemChange(item.id, item.panel)}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <SubItemIcon id={item.id} active={isActive} phaseColor={group.color} />
                        <span className={s.subItemLabel}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Collapsed: show a thin color bar as phase divider */}
              {collapsed && (
                <div className={s.collapsedPhaseDivider} style={{ backgroundColor: group.color + '40' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom actions ────────────────────────────── */}
      <div className={s.bottomSection}>
        <button
          className={s.bottomBtn}
          onClick={() => navigate({ to: '/new' })}
          title="New Project"
        >
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="1" x2="7" y2="13" />
            <line x1="1" y1="7" x2="13" y2="7" />
          </svg>
          {!collapsed && <span className={s.bottomBtnLabel}>NEW PROJECT</span>}
        </button>

        <button
          className={`${s.bottomBtn} ${activeView === 'settings' ? s.bottomBtnActive : ''}`}
          onClick={() => onViewChange(activeView === 'settings' ? null : 'settings')}
          title="Settings"
        >
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="2" />
            <path d="M7 1.5L7.9 3.2L9.9 2.4L9.5 4.5L11.5 5.1L10.2 6.7L11.5 8.3L9.5 8.9L9.9 11L7.9 10.2L7 11.9L6.1 10.2L4.1 11L4.5 8.9L2.5 8.3L3.8 6.7L2.5 5.1L4.5 4.5L4.1 2.4L6.1 3.2L7 1.5Z" />
          </svg>
          {!collapsed && <span className={s.bottomBtnLabel}>SETTINGS</span>}
        </button>
      </div>

      {/* ── User account ──────────────────────────────── */}
      <div className={s.userRow} title={displayName}>
        <div className={s.userAvatar}>{displayInitial}</div>
        {!collapsed && (
          <div className={s.userInfo}>
            <span className={s.userName}>{displayName}</span>
            <span className={s.userSub}>View Profile</span>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Sub-item icons ─────────────────────────────────────────────────────────

function SubItemIcon({ id, active, phaseColor }: { id: SubItemId; active: boolean; phaseColor: string }) {
  const color = active ? phaseColor : 'var(--color-sidebar-icon, #6b7b6b)';
  const props = {
    width: 14, height: 14,
    viewBox: '0 0 14 14',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: { flexShrink: 0 },
  };

  switch (id) {
    case 'terrain-viz':
      return <svg {...props}><polyline points="1 11 4 5 7 8 10 3 13 11"/><line x1="1" y1="11" x2="13" y2="11"/></svg>;
    case 'site-data':
      return <svg {...props}><path d="M1 4L7 2L13 4L7 6L1 4Z"/><path d="M1 7L7 9L13 7"/><path d="M1 10L7 12L13 10"/></svg>;
    case 'site-assessment':
      return <svg {...props}><circle cx="7" cy="7" r="5"/><circle cx="7" cy="7" r="2"/><line x1="7" y1="1" x2="7" y2="2"/><line x1="7" y1="12" x2="7" y2="13"/><line x1="1" y1="7" x2="2" y2="7"/><line x1="12" y1="7" x2="13" y2="7"/></svg>;
    case 'hydrology-basic':
      return <svg {...props}><path d="M7 1C7 1 3 6 3 9C3 11.2 4.8 13 7 13C9.2 13 11 11.2 11 9C11 6 7 1 7 1Z"/></svg>;
    case 'solar-climate':
      return <svg {...props}><circle cx="7" cy="7" r="2.5"/><line x1="7" y1="1" x2="7" y2="2.5"/><line x1="7" y1="11.5" x2="7" y2="13"/><line x1="1" y1="7" x2="2.5" y2="7"/><line x1="11.5" y1="7" x2="13" y2="7"/><line x1="2.9" y1="2.9" x2="4" y2="4"/><line x1="10" y1="10" x2="11.1" y2="11.1"/><line x1="11.1" y1="2.9" x2="10" y2="4"/><line x1="4" y1="10" x2="2.9" y2="11.1"/></svg>;
    case 'soil-ecology':
      return <svg {...props}><path d="M7 12C7 12 3 9 3 5.5C3 3.5 4.8 2 7 2C9.2 2 11 3.5 11 5.5C11 9 7 12 7 12Z"/><line x1="7" y1="12" x2="7" y2="13"/><line x1="5" y1="13" x2="9" y2="13"/></svg>;
    case 'zones':
      return <svg {...props}><rect x="1" y="1" width="12" height="12" rx="1"/><line x1="1" y1="6" x2="13" y2="6"/><line x1="7" y1="6" x2="7" y2="13"/></svg>;
    case 'structures':
      return <svg {...props}><path d="M2 13V6L7 2L12 6V13H9V9H5V13H2Z"/></svg>;
    case 'access':
      return <svg {...props}><path d="M1 12C3 8 5 10 7 7C9 4 11 5 13 2"/><circle cx="4" cy="10" r="1" fill={color}/><circle cx="10" cy="5" r="1" fill={color}/></svg>;
    case 'livestock':
      return <svg {...props}><ellipse cx="7" cy="8" rx="4" ry="3"/><circle cx="4.5" cy="5.5" r="1.5"/><line x1="3" y1="11" x2="3" y2="13"/><line x1="7" y1="11" x2="7" y2="13"/><line x1="11" y1="11" x2="11" y2="13"/></svg>;
    case 'crops':
      return <svg {...props}><line x1="7" y1="13" x2="7" y2="5"/><path d="M7 9C7 9 5 7 3 7"/><path d="M7 7C7 7 9 5 11 5"/><path d="M7 5C7 5 5 3 4 2"/></svg>;
    case 'utilities':
      return <svg {...props}><polyline points="2 11 5 8 8 10 12 4"/><circle cx="2" cy="11" r="1" fill={color}/><circle cx="12" cy="4" r="1" fill={color}/></svg>;
    case 'timeline':
      return <svg {...props}><circle cx="7" cy="7" r="5.5"/><polyline points="7 3.5 7 7 10 8.5"/></svg>;
    case 'vision':
      return <svg {...props}><path d="M1 7C1 7 3.5 3 7 3C10.5 3 13 7 13 7C13 7 10.5 11 7 11C3.5 11 1 7 1 7Z"/><circle cx="7" cy="7" r="2"/></svg>;
    case 'economics':
      return <svg {...props}><rect x="1" y="8" width="3" height="5" rx="0.3"/><rect x="5.5" y="5" width="3" height="8" rx="0.3"/><rect x="10" y="2" width="3" height="11" rx="0.3"/></svg>;
    case 'regulatory':
      return <svg {...props}><path d="M7 1L13 3.5V7C13 10.5 10.5 12.5 7 13.5C3.5 12.5 1 10.5 1 7V3.5L7 1Z"/><polyline points="4.5 7 6.5 9.5 10 5"/></svg>;
    case 'ai':
      return <svg {...props}><path d="M7 1L8.3 5H13L9.5 7.5L11 12L7 9L3 12L4.5 7.5L1 5H5.7L7 1Z" fill={color} fillOpacity="0.2"/></svg>;
    case 'scenarios':
      return <svg {...props}><rect x="1" y="2" width="5" height="10" rx="0.5"/><rect x="8" y="2" width="5" height="10" rx="0.5" strokeDasharray="1.5 1"/></svg>;
    case 'collaboration':
      return <svg {...props}><circle cx="5" cy="5" r="2.5"/><circle cx="10" cy="5" r="2.5"/><path d="M1 13C1 10.2 2.8 8 5 8"/><path d="M13 13C13 10.2 11.2 8 9 8"/></svg>;
    case 'moontrance':
      return <svg {...props}><path d="M9 2C6.2 2 4 4.2 4 7C4 9.8 6.2 12 9 12C7 12 5 9.8 5 7C5 4.2 7 2 9 2Z" fill={color} fillOpacity="0.2"/></svg>;
    case 'educational':
      return <svg {...props}><path d="M1 4L7 2L13 4L7 6L1 4Z"/><path d="M4 5V9C4 9 5.5 11 7 11C8.5 11 10 9 10 9V5"/><line x1="13" y1="4" x2="13" y2="8"/></svg>;
    case 'templates':
      return <svg {...props}><rect x="1" y="1" width="5.5" height="5.5" rx="0.5"/><rect x="7.5" y="1" width="5.5" height="5.5" rx="0.5"/><rect x="1" y="7.5" width="5.5" height="5.5" rx="0.5"/><rect x="7.5" y="7.5" width="5.5" height="5.5" rx="0.5" strokeDasharray="1.5 1"/></svg>;
    case 'reporting':
      return <svg {...props}><path d="M3 1H10L13 4V13H3V1Z"/><polyline points="10 1 10 4 13 4"/><line x1="5" y1="7" x2="9" y2="7"/><line x1="5" y1="9.5" x2="8" y2="9.5"/></svg>;
    case 'portal':
      return <svg {...props}><circle cx="7" cy="7" r="5.5"/><ellipse cx="7" cy="7" rx="2.5" ry="5.5"/><line x1="1.5" y1="7" x2="12.5" y2="7"/></svg>;
    case 'fieldwork':
      return <svg {...props}><path d="M7 1L8.5 4H12L9.3 6L10.5 9.5L7 7.5L3.5 9.5L4.7 6L2 4H5.5L7 1Z"/><line x1="7" y1="9.5" x2="7" y2="13"/></svg>;
    case 'history':
      return <svg {...props}><circle cx="7" cy="7" r="5.5"/><polyline points="7 3.5 7 7 5 9"/><path d="M2.5 7C2.5 4.5 4.5 2.5 7 2.5" strokeDasharray="1.5 1"/></svg>;
    case 'settings':
      return <svg {...props}><circle cx="7" cy="7" r="2"/><path d="M7 1.5L8 3.5L10 2.7L9.7 4.8L11.8 5.3L10.5 7L11.8 8.7L9.7 9.2L10 11.3L8 10.5L7 12.5L6 10.5L4 11.3L4.3 9.2L2.2 8.7L3.5 7L2.2 5.3L4.3 4.8L4 2.7L6 3.5L7 1.5Z"/></svg>;
    default:
      return <svg {...props}><circle cx="7" cy="7" r="3"/></svg>;
  }
}
