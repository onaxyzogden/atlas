/**
 * IconSidebar — full-height left navigation panel for the project (map) view.
 *
 * Now driven by the canonical taxonomy (`features/navigation/taxonomy.ts`)
 * and respects the shared `sidebarGrouping` preference (phase vs. domain).
 * The accordion behavior (one group open at a time, collapsed-icon mode)
 * is unchanged. The localStorage key generalizes from
 * `ogden-sidebar-open-phase` → `ogden-sidebar-open-group` to hold either a
 * PhaseKey or DomainGroupKey depending on the active preference.
 */

import { useState } from 'react';
import { useUIStore } from '../store/uiStore.js';
import { GroupingToggle } from './ui/GroupingToggle.js';
import { DelayedTooltip } from './ui/DelayedTooltip.js';
import SidebarBottomControls from './SidebarBottomControls.js';
import {
  MAP_ITEMS,
  PHASE_META,
  PHASE_ORDER,
  DOMAIN_META,
  DOMAIN_ORDER,
  STAGE_META,
  STAGE_ORDER,
  STAGE3_META,
  STAGE3_ORDER,
  groupByPhase,
  groupByDomain,
  groupByStage,
  groupByStage3,
  type NavItem,
  type PhaseKey,
  type DomainGroupKey,
  type StageKey,
  type Stage3Key,
} from '../features/navigation/taxonomy.js';
import s from './IconSidebar.module.css';

// ── Re-exports (kept stable for downstream consumers) ───────────────────────

export type SidebarView =
  | 'layers'
  | 'intelligence'
  | 'hydrology'
  | 'design'
  | 'ai'
  | 'regulatory'
  | 'feasibility'
  | 'energy'
  | 'infrastructure'
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
  | 'livestock'
  | 'educational'
  | 'spiritual'
  | 'zoning'
  | 'siting'
  | 'settings'
  | 'unmapped'
  | 'terrain'
  | 'cartographic'
  | 'ecological'
  | 'stewardship'
  | 'climate'
  | 'planting'
  | 'forest'
  | 'carbon'
  | 'nursery'
  | 'biomass'
  | 'paddockDesign'
  | 'herdRotation'
  | 'grazingAnalysis'
  | 'livestockInventory'
  | null;

export type SubItemId =
  | 'terrain-viz' | 'site-data'
  | 'site-assessment' | 'hydrology-basic' | 'solar-climate' | 'soil-ecology'
  | 'zones' | 'structures' | 'access' | 'livestock' | 'crops' | 'utilities'
  // Grazing & Livestock dashboards — distinct from 'livestock' (which is the
  // Design Atlas livestock-systems sub-tool).
  | 'paddock' | 'rotation' | 'grazing' | 'herd'
  // Forestry dashboards — distinct from 'crops' (Design Atlas crops sub-tool).
  | 'planting' | 'forest' | 'carbon' | 'nursery' | 'biomass'
  // Energy / Infrastructure dashboards — distinct from 'utilities' (Design
  // Atlas utilities sub-tool).
  | 'energy' | 'infrastructure'
  | 'timeline' | 'vision' | 'economics' | 'regulatory' | 'feasibility'
  | 'ai' | 'scenarios' | 'collaboration' | 'moontrance' | 'educational' | 'spiritual' | 'zoning' | 'siting-rules'
  | 'templates' | 'reporting'
  | 'portal' | 'fieldwork' | 'history'
  | 'settings';

interface IconSidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  activeSubItem: SubItemId | null;
  onSubItemChange: (id: SubItemId, panel: SidebarView) => void;
}

// Some nav items share the same `mapSubItem` (e.g. Site Intelligence and
// Ecological both surface `site-assessment`). Disambiguate by also
// comparing the panel — the route the click would open — so only one row
// reads as active at a time.
const isItemActive = (
  item: NavItem,
  activeSubItem: SubItemId | null,
  activeView: SidebarView,
): boolean => {
  const subId = (item.mapSubItem ?? item.id) as SubItemId;
  if (activeSubItem !== subId) return false;
  if (item.panel) return activeView === (item.panel as SidebarView);
  return true;
};

type GroupKey = Stage3Key | StageKey | PhaseKey | DomainGroupKey;

const LS_OPEN_GROUP = 'ogden-sidebar-open-group';
const LS_LEGACY_OPEN_PHASE = 'ogden-sidebar-open-phase';

export default function IconSidebar({
  activeView,
  onViewChange,
  activeSubItem,
  onSubItemChange,
}: IconSidebarProps) {
  const grouping = useUIStore((st) => st.sidebarGrouping);

  // Collapsed sidebar state (unchanged)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('ogden-sidebar-collapsed') === 'true'; } catch { return false; }
  });

  // Which group is currently open. Stored once; applies to whichever grouping
  // is active. We migrate the legacy `ogden-sidebar-open-phase` key once.
  const [openGroup, setOpenGroup] = useState<GroupKey>(() => {
    try {
      const stored = localStorage.getItem(LS_OPEN_GROUP) ?? localStorage.getItem(LS_LEGACY_OPEN_PHASE);
      if (stored) return stored as GroupKey;
    } catch { /* noop */ }
    return 'S1';
  });

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('ogden-sidebar-collapsed', String(next)); } catch { /* */ }
  };

  const setOpen = (key: GroupKey) => {
    setOpenGroup(key);
    try { localStorage.setItem(LS_OPEN_GROUP, key); } catch { /* */ }
  };

  // Build display groups from taxonomy based on current preference.
  interface DisplayGroup {
    key: GroupKey;
    badge: string;     // short label for the left badge (e.g. "P1" or a 2-letter abbr)
    name: string;
    desc: string;
    color: string;
    items: NavItem[];
  }

  const groups: DisplayGroup[] =
    grouping === 'stage3'
      ? (() => {
          const byStage3 = groupByStage3(MAP_ITEMS);
          return STAGE3_ORDER.map((s, idx) => ({
            key: s,
            badge: String(idx + 1),
            name: STAGE3_META[s].name,
            desc: STAGE3_META[s].desc,
            color: STAGE3_META[s].color,
            items: byStage3[s],
          })).filter((g) => g.items.length > 0);
        })()
      : grouping === 'stage'
      ? (() => {
          const byStage = groupByStage(MAP_ITEMS);
          return STAGE_ORDER.map((s, idx) => ({
            key: s,
            badge: String(idx + 1),
            name: STAGE_META[s].name,
            desc: STAGE_META[s].desc,
            color: STAGE_META[s].color,
            items: byStage[s],
          })).filter((g) => g.items.length > 0);
        })()
      : grouping === 'phase'
      ? (() => {
          const byPhase = groupByPhase(MAP_ITEMS);
          return PHASE_ORDER.map((p) => ({
            key: p,
            badge: p,
            name: PHASE_META[p].name,
            desc: PHASE_META[p].desc,
            color: PHASE_META[p].color,
            items: byPhase[p],
          })).filter((g) => g.items.length > 0);
        })()
      : (() => {
          const byDomain = groupByDomain(MAP_ITEMS);
          return DOMAIN_ORDER.map((d) => ({
            key: d,
            badge: domainBadge(d),
            name: DOMAIN_META[d].name,
            desc: '',
            color: DOMAIN_META[d].color,
            items: byDomain[d],
          })).filter((g) => g.items.length > 0);
        })();

  // If the persisted openGroup doesn't exist in the current grouping, fall back
  // to the first available group. This handles the stage↔phase↔domain toggle cleanly.
  const resolvedOpenGroup: GroupKey = groups.some((g) => g.key === openGroup)
    ? openGroup
    : (groups[0]?.key ?? 'S1');

  return (
    <nav aria-label="Atlas domains" className={`${s.sidebar} ${collapsed ? s.sidebarCollapsed : s.sidebarExpanded}`}>

      {/* ── Collapse toggle ────────────────────────────
          The OGDEN logo Link previously rendered here was removed
          (project-page chrome audit, 2026-04-25): `ProjectTabBar`
          already owns back-to-home navigation, and `DashboardSidebar`
          has no equivalent header — keeping the rails symmetric. */}
      <div className={s.logoRow}>
        <DelayedTooltip
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          position="right"
        >
          <button
            onClick={toggleCollapse}
            className={s.collapseBtn}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? (
                <polyline points="5 2 10 7 5 12" />
              ) : (
                <polyline points="9 2 4 7 9 12" />
              )}
            </svg>
          </button>
        </DelayedTooltip>
      </div>

      {/* ── Grouping toggle (hidden when collapsed) ───── */}
      {!collapsed && (
        <div className={s.toggleWrap}>
          <GroupingToggle size="compact" />
        </div>
      )}

      {/* ── Group accordion ───────────────────────────── */}
      <div className={s.phaseList}>
        {groups.map((group) => {
          const isOpen = resolvedOpenGroup === group.key && !collapsed;

          return (
            <div key={group.key} className={s.phaseGroup}>
              <DelayedTooltip
                label={
                  group.desc ? (
                    // Two-line tooltip restores the description that
                    // appears next to the name in expanded mode, so
                    // collapsed-rail users get the same context
                    // (chrome audit, 2026-04-25).
                    <span className={s.tooltipMultiline}>
                      <span className={s.tooltipTitle}>{group.badge} — {group.name}</span>
                      <span className={s.tooltipDesc}>{group.desc}</span>
                    </span>
                  ) : (
                    `${group.badge} — ${group.name}`
                  )
                }
                position="right"
                disabled={!collapsed}
              >
              <button
                className={`${s.phaseHeader} ${resolvedOpenGroup === group.key ? s.phaseHeaderActive : ''}`}
                onClick={() => setOpen(group.key)}
                aria-expanded={isOpen}
              >
                <span
                  className={`${s.phaseBadge} ${collapsed ? s.phaseBadgeCollapsed : ''}`}
                  style={
                    collapsed
                      ? { backgroundColor: group.color + '4D', color: group.color, borderColor: group.color + '99' }
                      : { backgroundColor: group.color + '33', color: group.color, borderColor: group.color + '55' }
                  }
                >
                  {group.badge}
                </span>

                {!collapsed && (
                  <div className={s.phaseHeaderText}>
                    <span className={s.phaseName}>{group.name}</span>
                    {group.desc && <span className={s.phaseDesc}>{group.desc}</span>}
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
              </DelayedTooltip>

              {isOpen && (
                <div className={s.phaseItems}>
                  {group.items.map((item) => {
                    const subId = (item.mapSubItem ?? item.id) as SubItemId;
                    const panel = item.panel as SidebarView;
                    const isActive = isItemActive(item, activeSubItem, activeView);
                    return (
                      <button
                        key={item.id}
                        className={`${s.subItem} ${isActive ? s.subItemActive : ''}`}
                        style={isActive ? { borderLeftColor: group.color } : undefined}
                        onClick={() => onSubItemChange(subId, panel)}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <SubItemIcon id={subId} active={isActive} phaseColor={group.color} />
                        <span className={s.subItemLabel}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Collapsed-mode divider removed (chrome audit, 2026-04-25):
                  the badge itself is now the phase color cue, so the
                  redundant 3px stripe just added visual noise. */}
            </div>
          );
        })}
      </div>

      <SidebarBottomControls
        collapsed={collapsed}
        settingsActive={activeView === 'settings'}
        onSettingsClick={() => onViewChange(activeView === 'settings' ? null : 'settings')}
      />
    </nav>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function domainBadge(d: DomainGroupKey): string {
  switch (d) {
    case 'site-overview':         return 'SO';
    case 'grazing-livestock':     return 'GL';
    case 'forestry':              return 'FR';
    case 'hydrology-terrain':     return 'HT';
    case 'finance':               return 'FN';
    case 'energy-infrastructure': return 'EI';
    case 'compliance':            return 'CP';
    case 'reporting-portal':      return 'RP';
    case 'general':               return 'GN';
  }
}

// ── Sub-item icons (unchanged) ──────────────────────────────────────────────

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
    // ── Livestock group ─────────────────────────────────────────────────
    case 'paddock':
      // Paddock Design — 3×2 fenced grid
      return <svg {...props}><rect x="1.5" y="3" width="11" height="8" rx="0.5"/><line x1="5" y1="3" x2="5" y2="11"/><line x1="9" y1="3" x2="9" y2="11"/><line x1="1.5" y1="7" x2="12.5" y2="7"/></svg>;
    case 'rotation':
      // Herd Rotation — circular arrows
      return <svg {...props}><path d="M11.5 7C11.5 9.5 9.5 11.5 7 11.5C5.2 11.5 3.6 10.5 2.8 9"/><polyline points="2.5 11.5 2.8 9 5.3 9.3"/><path d="M2.5 7C2.5 4.5 4.5 2.5 7 2.5C8.8 2.5 10.4 3.5 11.2 5"/><polyline points="11.5 2.5 11.2 5 8.7 4.7"/></svg>;
    case 'grazing':
      // Grazing Analysis — grass blades + baseline
      return <svg {...props}><line x1="1" y1="12" x2="13" y2="12"/><path d="M3 12C3 10 2.5 8 2 7"/><path d="M3 12C3 10 3.5 8.5 4.5 7.5"/><path d="M7 12C7 9.5 6.3 7 5.5 5.5"/><path d="M7 12C7 9.5 7.7 7.5 9 6"/><path d="M11 12C11 10 10.5 8 10 7"/><path d="M11 12C11 10 11.5 8.5 12.5 7.5"/></svg>;
    case 'herd':
      // Livestock Inventory & Health Ledger — stacked count bars + tick
      return <svg {...props}><rect x="1.5" y="2" width="8" height="2.2" rx="0.3"/><rect x="1.5" y="5.6" width="6" height="2.2" rx="0.3"/><rect x="1.5" y="9.2" width="9.5" height="2.2" rx="0.3"/><polyline points="10.5 3.5 11.5 4.5 13 2.5"/></svg>;
    // ── Forestry group ──────────────────────────────────────────────────
    case 'planting':
      // Planting Tool — trowel / spade
      return <svg {...props}><path d="M9.5 2.5L11.5 4.5"/><path d="M8 4L10 6"/><path d="M3 13L8 8L6 6L2 10C1.5 10.5 1.5 11.5 2 12L2 12C2.5 12.5 3 13 3 13Z" fill={color} fillOpacity="0.15"/></svg>;
    case 'forest':
      // Forest Hub — three trees of varying heights
      return <svg {...props}><path d="M3.5 11L3.5 8"/><path d="M2 8L3.5 4L5 8Z" fill={color} fillOpacity="0.2"/><path d="M7 12L7 7"/><path d="M5 7L7 2L9 7Z" fill={color} fillOpacity="0.2"/><path d="M10.5 11L10.5 8"/><path d="M9 8L10.5 4L12 8Z" fill={color} fillOpacity="0.2"/></svg>;
    case 'carbon':
      // Carbon Diagnostic — leaf with downward arrow (sequestration)
      return <svg {...props}><path d="M11 2C11 2 5 2 3 6C1.5 9 3 12 6 12C10 12 12 8 11 2Z" fill={color} fillOpacity="0.15"/><line x1="5" y1="10" x2="9" y2="6"/><polyline points="4.5 13 4.5 10 7.5 10" stroke="none" fill="none"/></svg>;
    case 'nursery':
      // Nursery Ledger — seedling in pot / tray
      return <svg {...props}><path d="M7 7L7 3"/><path d="M7 5C6 5 5 4 4.5 3"/><path d="M7 5C8 5 9 4 9.5 3"/><path d="M3 7L11 7L10 12L4 12Z"/><line x1="3" y1="9" x2="11" y2="9"/></svg>;
    // ── Energy / Infrastructure group ───────────────────────────────────
    case 'energy':
      // Energy & Off-Grid — lightning bolt inside circle
      return <svg {...props}><circle cx="7" cy="7" r="5.5"/><path d="M7.5 3L5 7.5L7 7.5L6.5 11L9 6.5L7 6.5L7.5 3Z" fill={color} fillOpacity="0.2"/></svg>;
    case 'infrastructure':
      // Utilities & Infrastructure — pylon / transmission tower
      return <svg {...props}><path d="M4 13L7 1L10 13"/><line x1="5.5" y1="7" x2="8.5" y2="7"/><line x1="5" y1="9" x2="9" y2="9"/><line x1="4.5" y1="11" x2="9.5" y2="11"/></svg>;
    case 'timeline':
      return <svg {...props}><circle cx="7" cy="7" r="5.5"/><polyline points="7 3.5 7 7 10 8.5"/></svg>;
    case 'vision':
      return <svg {...props}><path d="M1 7C1 7 3.5 3 7 3C10.5 3 13 7 13 7C13 7 10.5 11 7 11C3.5 11 1 7 1 7Z"/><circle cx="7" cy="7" r="2"/></svg>;
    case 'economics':
      return <svg {...props}><rect x="1" y="8" width="3" height="5" rx="0.3"/><rect x="5.5" y="5" width="3" height="8" rx="0.3"/><rect x="10" y="2" width="3" height="11" rx="0.3"/></svg>;
    case 'regulatory':
      return <svg {...props}><path d="M7 1L13 3.5V7C13 10.5 10.5 12.5 7 13.5C3.5 12.5 1 10.5 1 7V3.5L7 1Z"/><polyline points="4.5 7 6.5 9.5 10 5"/></svg>;
    case 'feasibility':
      return <svg {...props}><rect x="2" y="1.5" width="10" height="11" rx="1"/><polyline points="4.5 5 5.5 6 7 4.5"/><polyline points="4.5 8 5.5 9 7 7.5"/><line x1="8.5" y1="5" x2="11" y2="5"/><line x1="8.5" y1="8" x2="11" y2="8"/></svg>;
    case 'ai':
      return <svg {...props}><path d="M7 1L8.3 5H13L9.5 7.5L11 12L7 9L3 12L4.5 7.5L1 5H5.7L7 1Z" fill={color} fillOpacity="0.2"/></svg>;
    case 'scenarios':
      return <svg {...props}><rect x="1" y="2" width="5" height="10" rx="0.5"/><rect x="8" y="2" width="5" height="10" rx="0.5" strokeDasharray="1.5 1"/></svg>;
    case 'collaboration':
      return <svg {...props}><circle cx="5" cy="5" r="2.5"/><circle cx="10" cy="5" r="2.5"/><path d="M1 13C1 10.2 2.8 8 5 8"/><path d="M13 13C13 10.2 11.2 8 9 8"/></svg>;
    case 'moontrance':
      return <svg {...props}><path d="M9 2C6.2 2 4 4.2 4 7C4 9.8 6.2 12 9 12C7 12 5 9.8 5 7C5 4.2 7 2 9 2Z" fill={color} fillOpacity="0.2"/></svg>;
    case 'spiritual':
      return <svg {...props}><circle cx="7" cy="7" r="5.5"/><path d="M7 3L8.2 6.5L7 11L5.8 6.5Z" fill={color} fillOpacity="0.2"/><circle cx="7" cy="7" r="1"/></svg>;
    case 'zoning':
      return <svg {...props}><rect x="1" y="1" width="12" height="12" rx="1" strokeDasharray="2 1.5"/><line x1="5" y1="1" x2="5" y2="13"/><line x1="9" y1="1" x2="9" y2="13"/><line x1="1" y1="5" x2="13" y2="5"/><line x1="1" y1="9" x2="13" y2="9"/></svg>;
    case 'siting-rules':
      return <svg {...props}><path d="M7 1L13 3.5V7C13 10.5 10.5 12.5 7 13.5C3.5 12.5 1 10.5 1 7V3.5L7 1Z"/><line x1="4.5" y1="6.5" x2="6" y2="8.5"/><line x1="6" y1="8.5" x2="9.5" y2="5"/></svg>;
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
