/**
 * Navigation Taxonomy — single source of truth for both sidebars.
 *
 * Problem this solves: `IconSidebar` (map rail, phase-grouped) and
 * `DashboardSidebar` (domain-grouped) used to carry overlapping but drift-prone
 * taxonomies. Every new domain had to be hand-wired into three places
 * (IconSidebar PHASE_GROUPS, DashboardSidebar DASHBOARD_GROUPS, and
 * domainMapping.DASHBOARD_TO_MAP). Items silently dropped out of sync.
 *
 * This file declares one flat list of NavItems. Each item carries BOTH its
 * phase (workflow group) and its domainGroup (subject group), so either
 * sidebar can consume the same list and group by the user's preferred lens.
 *
 * Consumers:
 *   - IconSidebar:      groupByPhase()  or groupByDomain(), mapOnly items only
 *   - DashboardSidebar: groupByPhase()  or groupByDomain(), dashboardOnly + both
 *   - domainMapping.ts: DASHBOARD_TO_MAP derived from items with panel + dashboardRoute
 *
 * Canonical ids:
 *   The NavItem `id` is the canonical concept id. For two legacy ids
 *   (`terrain-dashboard`, `hydrology-dashboard`) that are already wired into
 *   DashboardRouter + DashboardMetrics, the taxonomy preserves them via
 *   `dashboardRoute` to avoid a breaking rename. All other ids match their
 *   dashboard-section ids directly.
 */

import type { SidebarView, SubItemId } from '../../components/IconSidebar.js';
import type { LayerType } from '@ogden/shared';
import type { DomainKey } from '../map/domainMapping.js';
import { group as groupTokens, phase as phaseTokens } from '../../lib/tokens.js';

// ── Keys ─────────────────────────────────────────────────────────────────────

export type PhaseKey = 'P1' | 'P2' | 'P3' | 'P4';

export type DomainGroupKey =
  | 'site-overview'
  | 'grazing-livestock'
  | 'forestry'
  | 'hydrology-terrain'
  | 'finance'
  | 'energy-infrastructure'
  | 'compliance'
  | 'reporting-portal'
  | 'general';

// ── NavItem ──────────────────────────────────────────────────────────────────

export interface NavItem {
  /** Canonical id — used as DashboardSidebar section id unless `dashboardRoute` overrides. */
  id: string;
  label: string;

  /** Workflow group (phase grouping). */
  phase: PhaseKey;
  /** Subject group (domain grouping). */
  domainGroup: DomainGroupKey;

  /** Map-rail panel to mount. Omit if item has no map view. */
  panel?: Exclude<SidebarView, null>;
  /** Sub-item id shown in IconSidebar rail. Defaults to `id` if omitted. */
  mapSubItem?: SubItemId;
  /** Dashboard section route id. Defaults to `id` if omitted — used for the two legacy `*-dashboard` ids. */
  dashboardRoute?: string;

  /** Layers to auto-activate when switching from Dashboard to Map for this item. */
  layers?: LayerType[];
  /** DomainFloatingToolbar key. */
  domain?: DomainKey;

  /** Only show in DashboardSidebar (e.g. biomass, archive, dashboard-settings). */
  dashboardOnly?: boolean;
  /** Only show in IconSidebar (e.g. zones, structures, fieldwork, history). */
  mapOnly?: boolean;
}

// ── Group metadata ───────────────────────────────────────────────────────────

export const PHASE_META: Record<PhaseKey, { name: string; desc: string; color: string }> = {
  P1: {
    name: 'Site Intelligence',
    desc: 'Terrain visualization, site data layers, automated site assessment',
    color: phaseTokens[1],
  },
  P2: {
    name: 'Design Atlas',
    desc: 'Full structure/zone planning, hydrology, livestock, crop design',
    color: phaseTokens[2],
  },
  P3: {
    name: 'Collaboration + AI',
    desc: 'Multi-user access, AI-assisted outputs, scenario modeling',
    color: phaseTokens[3],
  },
  P4: {
    name: 'Public + Portal',
    desc: 'Public storytelling, export suite, mobile fieldwork, templates',
    color: phaseTokens[4],
  },
};

export const DOMAIN_META: Record<DomainGroupKey, { name: string; color: string }> = {
  'site-overview':         { name: 'Site Overview',         color: groupTokens.hydrology },
  'grazing-livestock':     { name: 'Grazing & Livestock',   color: groupTokens.livestock },
  'forestry':              { name: 'Forestry',              color: groupTokens.forestry },
  'hydrology-terrain':     { name: 'Hydrology & Terrain',   color: groupTokens.hydrology },
  'finance':               { name: 'Finance',               color: groupTokens.finance },
  'energy-infrastructure': { name: 'Energy & Infrastructure', color: groupTokens.finance },
  'compliance':            { name: 'Compliance',            color: groupTokens.compliance },
  'reporting-portal':      { name: 'Reporting & Portal',    color: groupTokens.reporting },
  'general':               { name: 'General',               color: groupTokens.general },
};

// Ordered list used when iterating groups in UI.
export const PHASE_ORDER: PhaseKey[] = ['P1', 'P2', 'P3', 'P4'];
export const DOMAIN_ORDER: DomainGroupKey[] = [
  'site-overview',
  'energy-infrastructure',
  'grazing-livestock',
  'forestry',
  'hydrology-terrain',
  'finance',
  'compliance',
  'reporting-portal',
  'general',
];

// ── NAV_ITEMS ────────────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  // ── Site Overview ──────────────────────────────────────────────────────────
  {
    id: 'site-intelligence', label: 'Site Intelligence',
    phase: 'P1', domainGroup: 'site-overview',
    panel: 'intelligence', mapSubItem: 'site-assessment',
  },
  {
    id: 'map-layers', label: 'Map Layers',
    phase: 'P1', domainGroup: 'site-overview',
    panel: 'layers', mapSubItem: 'terrain-viz',
  },
  {
    id: 'feasibility', label: 'Feasibility',
    phase: 'P2', domainGroup: 'site-overview',
    panel: 'feasibility', mapSubItem: 'feasibility',
  },

  // ── Grazing & Livestock ────────────────────────────────────────────────────
  {
    id: 'paddock-design', label: 'Paddock Design',
    phase: 'P2', domainGroup: 'grazing-livestock',
    panel: 'paddockDesign', mapSubItem: 'livestock',
    layers: ['land_cover', 'soils'], domain: 'paddockDesign',
  },
  {
    id: 'herd-rotation', label: 'Herd Rotation',
    phase: 'P2', domainGroup: 'grazing-livestock',
    panel: 'herdRotation', mapSubItem: 'livestock',
    layers: ['land_cover', 'soils'], domain: 'herdRotation',
  },
  {
    id: 'grazing-analysis', label: 'Grazing Analysis',
    phase: 'P2', domainGroup: 'grazing-livestock',
    panel: 'grazingAnalysis', mapSubItem: 'livestock',
    layers: ['land_cover', 'soils'], domain: 'grazingAnalysis',
  },
  {
    id: 'livestock-inventory', label: 'Inventory & Health Ledger',
    phase: 'P2', domainGroup: 'grazing-livestock',
    panel: 'livestockInventory', mapSubItem: 'livestock',
    layers: ['land_cover', 'soils'], domain: 'livestockInventory',
  },

  // ── Forestry ───────────────────────────────────────────────────────────────
  {
    id: 'planting-tool', label: 'Planting Tool',
    phase: 'P2', domainGroup: 'forestry',
    panel: 'planting', mapSubItem: 'crops',
    layers: ['soils', 'land_cover'], domain: 'plantingTool',
  },
  {
    id: 'forest-hub', label: 'Forest Hub',
    phase: 'P2', domainGroup: 'forestry',
    panel: 'forest', mapSubItem: 'crops',
    layers: ['soils', 'land_cover'], domain: 'forestHub',
  },
  {
    id: 'carbon-diagnostic', label: 'Carbon Diagnostic',
    phase: 'P2', domainGroup: 'forestry',
    panel: 'carbon', mapSubItem: 'crops',
    layers: ['soils', 'land_cover'], domain: 'carbonDiagnostic',
  },
  {
    id: 'nursery-ledger', label: 'Nursery Ledger',
    phase: 'P2', domainGroup: 'forestry',
    panel: 'nursery', mapSubItem: 'crops',
    layers: ['soils', 'land_cover'], domain: 'nurseryLedger',
  },

  // ── Hydrology & Terrain ────────────────────────────────────────────────────
  {
    id: 'cartographic', label: 'Cartographic',
    phase: 'P1', domainGroup: 'hydrology-terrain',
    panel: 'cartographic', mapSubItem: 'site-data',
    layers: ['land_cover', 'zoning'], domain: 'cartographic',
  },
  {
    // Canonical id `hydrology`; legacy route kept for DashboardRouter/DashboardMetrics.
    id: 'hydrology', label: 'Hydrology',
    phase: 'P1', domainGroup: 'hydrology-terrain',
    panel: 'hydrology', mapSubItem: 'hydrology-basic',
    dashboardRoute: 'hydrology-dashboard',
    layers: ['watershed', 'wetlands_flood'], domain: 'hydrology',
  },
  {
    id: 'ecological', label: 'Ecological',
    phase: 'P1', domainGroup: 'hydrology-terrain',
    panel: 'ecological', mapSubItem: 'site-assessment',
    layers: ['land_cover', 'soils'], domain: 'ecology',
  },
  {
    // Canonical id `terrain`; legacy route kept for DashboardRouter/DashboardMetrics.
    id: 'terrain', label: 'Terrain',
    phase: 'P1', domainGroup: 'hydrology-terrain',
    panel: 'terrain', mapSubItem: 'terrain-viz',
    dashboardRoute: 'terrain-dashboard',
    layers: ['elevation'], domain: 'terrain',
  },
  {
    id: 'stewardship', label: 'Stewardship',
    phase: 'P1', domainGroup: 'hydrology-terrain',
    panel: 'stewardship', mapSubItem: 'soil-ecology',
    layers: ['land_cover', 'soils'], domain: 'ecology',
  },
  {
    id: 'climate', label: 'Solar & Climate',
    phase: 'P1', domainGroup: 'hydrology-terrain',
    panel: 'climate', mapSubItem: 'solar-climate',
    layers: ['climate'],
  },

  // ── Finance ────────────────────────────────────────────────────────────────
  {
    id: 'economics', label: 'Economics',
    phase: 'P2', domainGroup: 'finance',
    panel: 'economic', mapSubItem: 'economics',
  },
  {
    id: 'scenarios', label: 'Scenarios',
    phase: 'P3', domainGroup: 'finance',
    panel: 'scenarios', mapSubItem: 'scenarios',
  },
  {
    id: 'investor-summary', label: 'Investor Summary',
    phase: 'P3', domainGroup: 'finance',
    panel: 'economic', mapSubItem: 'economics',
  },

  // ── Energy & Infrastructure ────────────────────────────────────────────────
  {
    id: 'energy-offgrid', label: 'Energy & Off-Grid',
    phase: 'P2', domainGroup: 'energy-infrastructure',
    panel: 'energy', mapSubItem: 'utilities',
    layers: ['elevation'], domain: 'energy',
  },
  {
    id: 'infrastructure-utilities', label: 'Utilities & Infrastructure',
    phase: 'P2', domainGroup: 'energy-infrastructure',
    panel: 'infrastructure', mapSubItem: 'utilities',
    layers: ['soils', 'watershed'], domain: 'infrastructure',
  },

  // ── Compliance ─────────────────────────────────────────────────────────────
  {
    id: 'regulatory', label: 'Regulatory',
    phase: 'P2', domainGroup: 'compliance',
    panel: 'regulatory', mapSubItem: 'regulatory',
  },

  // ── Reporting & Portal ─────────────────────────────────────────────────────
  {
    id: 'reporting', label: 'Reports & Export',
    phase: 'P3', domainGroup: 'reporting-portal',
    panel: 'reporting', mapSubItem: 'reporting',
  },
  {
    id: 'portal', label: 'Public Portal',
    phase: 'P4', domainGroup: 'reporting-portal',
    panel: 'portal', mapSubItem: 'portal',
  },
  {
    id: 'educational', label: 'Educational Atlas',
    phase: 'P3', domainGroup: 'reporting-portal',
    panel: 'educational', mapSubItem: 'educational',
  },

  // ── General (cross-cutting) ────────────────────────────────────────────────
  {
    id: 'siting-rules', label: 'Siting Rules',
    phase: 'P2', domainGroup: 'general',
    panel: 'siting', mapSubItem: 'siting-rules',
    layers: ['elevation', 'soils', 'watershed', 'wetlands_flood'],
  },

  // Dashboard-only (no map-rail panel yet)
  { id: 'biomass',             label: 'Biomass',  phase: 'P1', domainGroup: 'general', dashboardOnly: true },
  { id: 'dashboard-settings',  label: 'Settings', phase: 'P4', domainGroup: 'general', dashboardOnly: true },
  { id: 'archive',             label: 'Archive',  phase: 'P4', domainGroup: 'general', dashboardOnly: true },

  // ── Map-only items (Design Atlas sub-tools + fieldwork + history) ─────────
  {
    id: 'zones', label: 'Zones & Land Use',
    phase: 'P2', domainGroup: 'general',
    panel: 'design', mapSubItem: 'zones', mapOnly: true,
  },
  {
    id: 'structures', label: 'Structures & Built',
    phase: 'P2', domainGroup: 'general',
    panel: 'design', mapSubItem: 'structures', mapOnly: true,
  },
  {
    id: 'access', label: 'Access & Circulation',
    phase: 'P2', domainGroup: 'general',
    panel: 'design', mapSubItem: 'access', mapOnly: true,
  },
  {
    id: 'livestock-systems', label: 'Livestock Systems',
    phase: 'P2', domainGroup: 'grazing-livestock',
    panel: 'design', mapSubItem: 'livestock', mapOnly: true,
  },
  {
    id: 'crops', label: 'Crops & Agroforestry',
    phase: 'P2', domainGroup: 'forestry',
    panel: 'design', mapSubItem: 'crops', mapOnly: true,
  },
  {
    id: 'utilities', label: 'Utilities & Energy',
    phase: 'P2', domainGroup: 'energy-infrastructure',
    panel: 'design', mapSubItem: 'utilities', mapOnly: true,
  },
  {
    id: 'timeline', label: 'Timeline & Phasing',
    phase: 'P2', domainGroup: 'general',
    panel: 'timeline', mapSubItem: 'timeline', mapOnly: true,
  },
  {
    id: 'vision', label: 'Vision Layer',
    phase: 'P2', domainGroup: 'general',
    panel: 'vision', mapSubItem: 'vision', mapOnly: true,
  },
  {
    id: 'spiritual', label: 'Spiritual',
    phase: 'P2', domainGroup: 'general',
    panel: 'spiritual', mapSubItem: 'spiritual', mapOnly: true,
  },
  {
    id: 'zoning', label: 'Zoning',
    phase: 'P2', domainGroup: 'general',
    panel: 'zoning', mapSubItem: 'zoning', mapOnly: true,
  },
  {
    id: 'ai', label: 'AI Atlas',
    phase: 'P3', domainGroup: 'general',
    panel: 'ai', mapSubItem: 'ai', mapOnly: true,
  },
  {
    id: 'collaboration', label: 'Collaboration',
    phase: 'P3', domainGroup: 'general',
    panel: 'collaboration', mapSubItem: 'collaboration', mapOnly: true,
  },
  {
    id: 'moontrance', label: 'OGDEN Identity',
    phase: 'P3', domainGroup: 'general',
    panel: 'moontrance', mapSubItem: 'moontrance', mapOnly: true,
  },
  {
    id: 'templates', label: 'Templates',
    phase: 'P3', domainGroup: 'general',
    panel: 'templates', mapSubItem: 'templates', mapOnly: true,
  },
  {
    id: 'fieldwork', label: 'Fieldwork',
    phase: 'P4', domainGroup: 'general',
    panel: 'fieldnotes', mapSubItem: 'fieldwork', mapOnly: true,
  },
  {
    id: 'history', label: 'Version History',
    phase: 'P4', domainGroup: 'general',
    panel: 'history', mapSubItem: 'history', mapOnly: true,
  },
];

// ── Derived helpers ──────────────────────────────────────────────────────────

/** Group a filtered item list by phase, preserving PHASE_ORDER. */
export function groupByPhase(items: NavItem[]): Record<PhaseKey, NavItem[]> {
  const out: Record<PhaseKey, NavItem[]> = { P1: [], P2: [], P3: [], P4: [] };
  for (const item of items) out[item.phase].push(item);
  return out;
}

/** Group a filtered item list by domainGroup, preserving DOMAIN_ORDER. */
export function groupByDomain(items: NavItem[]): Record<DomainGroupKey, NavItem[]> {
  const out: Record<DomainGroupKey, NavItem[]> = {
    'site-overview': [],
    'grazing-livestock': [],
    'forestry': [],
    'hydrology-terrain': [],
    'finance': [],
    'energy-infrastructure': [],
    'compliance': [],
    'reporting-portal': [],
    'general': [],
  };
  for (const item of items) out[item.domainGroup].push(item);
  return out;
}

/** Items visible in DashboardSidebar (excludes mapOnly). */
export const DASHBOARD_ITEMS: NavItem[] = NAV_ITEMS.filter((i) => !i.mapOnly);

/** Items visible in IconSidebar (excludes dashboardOnly; panel is required for rail). */
export const MAP_ITEMS: NavItem[] = NAV_ITEMS.filter((i) => !i.dashboardOnly && i.panel);

/**
 * Lookup table: DashboardSidebar section id → NavItem.
 * Uses `dashboardRoute ?? id` as key so legacy routes still resolve.
 */
export const DASHBOARD_ROUTE_INDEX: Map<string, NavItem> = (() => {
  const m = new Map<string, NavItem>();
  for (const item of NAV_ITEMS) {
    if (item.mapOnly) continue;
    m.set(item.dashboardRoute ?? item.id, item);
  }
  return m;
})();

/** Resolve dashboard section id → NavItem (or undefined). */
export function findByDashboardRoute(sectionId: string): NavItem | undefined {
  return DASHBOARD_ROUTE_INDEX.get(sectionId);
}

/**
 * Reverse lookup: given a map rail sub-item + its destination panel, return
 * the dashboard section id that should be "active" in the Dashboard view.
 * Used by ProjectPage to keep `activeDashboardSection` in sync when the user
 * navigates via the IconSidebar — keeps the DomainFloatingToolbar domain
 * tint aligned with what the rail is showing.
 *
 * If multiple NavItems share the same (mapSubItem, panel) pair (e.g. the
 * four livestock dashboards all resolve from `livestock` sub-item), we
 * prefer the first NavItem whose `panel` matches the supplied panel exactly
 * so each rail panel still maps to its own dashboard route.
 */
export function resolveDashboardSectionFromRail(
  subItem: string,
  panel: string,
): string | undefined {
  for (const item of NAV_ITEMS) {
    if (item.mapOnly) continue;
    if (item.mapSubItem === subItem && item.panel === panel) {
      return item.dashboardRoute ?? item.id;
    }
  }
  return undefined;
}
