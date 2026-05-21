/**
 * MobileProjectShell — phone/tablet layout for `/project/$projectId`
 * (2026-04-27 brief §6 / Phase 6).
 *
 * Replaces the desktop tab bar + sidebar layout when `useIsMobile()` is true.
 * The shell:
 *   - Top app bar: back link, project name, Generate Brief icon
 *   - Content area: one of four tab panels (Overview / Design / Intel / Report)
 *   - Sticky "Next Action" button above the bottom nav (Overview only)
 *   - Bottom nav: Overview · Design · Intelligence · Report
 *   - Horizontal swipe between the four tabs
 *
 * The Overview panel is a vertical stack of the executive components built in
 * Phases 3–5 (LandVerdictCard, CriticalConstraintAlert, DecisionTriad,
 * NextBestActionsPanel). Other tabs reuse DashboardRouter / MapView.
 */

import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, FileText, Compass, Map as MapIcon, Brain, FileBarChart, MoreVertical } from 'lucide-react';
import type { LandZone } from '../store/zoneStore.js';
import type { ProjectedStructure as Structure } from '@ogden/shared';
import type { LocalProject } from '../store/projectStore.js';
import { useUIStore } from '../store/uiStore.js';
import LandVerdictCard from '../features/dashboard/LandVerdictCard.js';
import CriticalConstraintAlert from '../features/dashboard/CriticalConstraintAlert.js';
import DecisionTriad from '../features/dashboard/DecisionTriad.js';
import NextBestActionsPanel from '../features/dashboard/NextBestActionsPanel.js';
const DesignMapGeneratorModal = lazy(() => import('../features/dashboard/DesignMapGeneratorModal.js'));
import DashboardRouter from '../features/dashboard/DashboardRouter.js';
import MapView from '../features/map/MapView.js';
import css from './MobileProjectShell.module.css';

type MobileTab = 'overview' | 'design' | 'intelligence' | 'report';

const TABS: Array<{ value: MobileTab; label: string; icon: typeof Compass }> = [
  { value: 'overview',     label: 'Overview',     icon: Compass },
  { value: 'design',       label: 'Design',       icon: MapIcon },
  { value: 'intelligence', label: 'Intelligence', icon: Brain },
  { value: 'report',       label: 'Report',       icon: FileBarChart },
];

const TAB_TO_SECTION: Record<Exclude<MobileTab, 'overview' | 'design'>, string> = {
  intelligence: 'data-catalog',
  report:       'reporting',
};

const SWIPE_THRESHOLD = 60;

function menuItemStyle(): React.CSSProperties {
  return {
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    padding: '8px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
  };
}

interface MobileProjectShellProps {
  project: LocalProject;
  zones: LandZone[];
  structures: Structure[];
  onEdit: () => void;
  onExport: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onDuplicate: () => void;
  onGenerateBrief: () => void;
}

export default function MobileProjectShell({
  project,
  zones,
  structures,
  onEdit,
  onExport,
  onDelete,
  onArchive,
  onDuplicate,
  onGenerateBrief,
}: MobileProjectShellProps) {
  const [tab, setTab] = useState<MobileTab>('overview');
  const [isDesignMapOpen, setIsDesignMapOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const showOverflow = !project.isBuiltin && (Boolean(onArchive) || Boolean(onDelete));
  const setActiveDashboardSection = useUIStore((s) => s.setActiveDashboardSection);
  const touchStartX = useRef<number | null>(null);
  const apiProjectId = project.serverId ?? project.id;

  // Sync the persisted dashboard section when entering Intelligence / Report
  // so deep-link copies of the URL still resolve to the right inner panel.
  useEffect(() => {
    if (tab === 'intelligence' || tab === 'report') {
      setActiveDashboardSection(TAB_TO_SECTION[tab]);
    }
  }, [tab, setActiveDashboardSection]);

  const switchToDesign = () => setTab('design');

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const dx = end - start;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    const idx = TABS.findIndex((t) => t.value === tab);
    const next = dx < 0 ? Math.min(idx + 1, TABS.length - 1) : Math.max(idx - 1, 0);
    setTab(TABS[next]!.value);
  };

  return (
    <div className={css.shell}>
      <header className={css.topBar}>
        <Link to="/home" className={css.iconLink} aria-label="Back to projects">
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <span className={css.projectName}>{project.name}</span>
        <button
          type="button"
          className={css.iconLink}
          onClick={onGenerateBrief}
          aria-label="Generate Land Brief"
          title="Generate Land Brief"
        >
          <FileText size={18} strokeWidth={2} />
        </button>
        {showOverflow && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={css.iconLink}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="More project actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreVertical size={18} strokeWidth={2} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  minWidth: 180,
                  background: 'var(--color-surface, #0f172a)',
                  border: '1px solid var(--color-border, #334155)',
                  borderRadius: 8,
                  boxShadow: '0 10px 24px rgba(0,0,0,0.4)',
                  padding: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  zIndex: 50,
                }}
              >
                {onArchive && (
                  <button
                    type="button"
                    role="menuitem"
                    style={menuItemStyle()}
                    onClick={() => {
                      setMenuOpen(false);
                      onArchive();
                    }}
                  >
                    Archive project
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  style={{ ...menuItemStyle(), color: '#f87171' }}
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                >
                  Delete forever
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <div
        className={css.content}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        role="region"
        aria-label="Project content"
      >
        {tab === 'overview' && (
          /*
           * Mobile <30s glance order (Phase A.3): Verdict + first Next Best
           * Action above the fold, then constraint alert + decision triad.
           * Stack stays flat — no <details>, no compact mode.
           */
          <div className={css.overviewStack}>
            <LandVerdictCard
              project={project}
              onViewConstraints={() => setActiveDashboardSection('regulatory')}
              onOpenDesignMap={switchToDesign}
              onGenerateBrief={onGenerateBrief}
            />
            <NextBestActionsPanel
              project={project}
              onGenerateBrief={onGenerateBrief}
              onSwitchToMap={switchToDesign}
              onGenerateDesignMap={() => setIsDesignMapOpen(true)}
            />
            <CriticalConstraintAlert
              project={project}
              onCreateChecklist={() => setActiveDashboardSection('regulatory')}
            />
            <DecisionTriad project={project} />
          </div>
        )}

        {tab === 'design' && (
          <MapView
            project={project}
            zones={zones}
            structures={structures}
            onEdit={onEdit}
            onExport={onExport}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        )}

        {(tab === 'intelligence' || tab === 'report') && (
          <div className={css.dashboardWrap}>
            <DashboardRouter
              section={TAB_TO_SECTION[tab]}
              project={project}
              onSwitchToMap={switchToDesign}
            />
          </div>
        )}
      </div>

      {tab === 'overview' && (
        <button type="button" className={css.stickyAction} onClick={onGenerateBrief}>
          <FileText size={14} strokeWidth={2.2} aria-hidden="true" />
          <span>Generate Land Brief</span>
        </button>
      )}

      {isDesignMapOpen && (
        <Suspense fallback={null}>
          <DesignMapGeneratorModal
            projectId={apiProjectId}
            onClose={() => setIsDesignMapOpen(false)}
          />
        </Suspense>
      )}

      <nav className={css.bottomNav} role="tablist">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.value === tab;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${css.navButton} ${active ? css.navActive : ''}`}
              onClick={() => setTab(t.value)}
            >
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
