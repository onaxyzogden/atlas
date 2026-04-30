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

/**
 * Stage = the 5-step workflow lens introduced by the 2026-04-27 UI/UX upgrade
 * brief (`atlas/docs/ui-ux-upgrade-brief.md` §4). Phase/Domain remain as
 * power-user lenses; Stage is the new default.
 */
export type StageKey = 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

/**
 * Stage3 = the 3-stage permaculture/regenerative design cycle adopted in the
 * 2026-04-29 IA restructure (Observe → Plan → Act). This is now the default
 * sidebar lens; the legacy 5-step `StageKey` is retained behind the
 * GroupingToggle for power users.
 *
 * Mapping rules (see plan `few-concerns-shiny-quokka.md`):
 *   - OBSERVE absorbs S1 (Understand the Land) + S2 (Identify Constraints)
 *   - PLAN    absorbs S3 design + S4 (Test Feasibility)
 *   - ACT     absorbs S3 operations (rotation, ledgers, fieldwork) + S5
 *             (Report / Portal / Export) and ongoing stewardship surfaces.
 */
export type Stage3Key = 'observe' | 'plan' | 'act';

// ── NavItem ──────────────────────────────────────────────────────────────────

export interface NavItem {
  /** Canonical id — used as DashboardSidebar section id unless `dashboardRoute` overrides. */
  id: string;
  label: string;

  /** Workflow group (phase grouping). */
  phase: PhaseKey;
  /** Subject group (domain grouping). */
  domainGroup: DomainGroupKey;
  /**
   * Stage in the 5-step workflow lens (Understand → Constraints → Design →
   * Feasibility → Report). Optional: cross-cutting items (settings, archive,
   * fieldwork, history) intentionally have no stage and drop out of the
   * stage-grouped sidebar.
   */
  stage?: StageKey;
  /**
   * 3-stage workflow lens (Observe / Plan / Act) — default sidebar grouping
   * since 2026-04-29. Optional for the same reason `stage` is: cross-cutting
   * infra (settings, archive) drops out of the stage-grouped sidebar.
   */
  stage3?: Stage3Key;

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

export const STAGE_META: Record<StageKey, { name: string; desc: string; color: string }> = {
  S1: {
    name: 'Understand the Land',
    desc: 'Site Intelligence, Hydrology, Soil, Climate, Terrain',
    color: phaseTokens[1],
  },
  S2: {
    name: 'Identify Constraints',
    desc: 'Regulatory, Wetlands / Flood, Zoning, Environmental Risk',
    color: groupTokens.compliance,
  },
  S3: {
    name: 'Design the System',
    desc: 'Paddocks, Planting, Forestry, Water Systems, Infrastructure',
    color: phaseTokens[2],
  },
  S4: {
    name: 'Test Feasibility',
    desc: 'Economics, Scenarios, Timeline, Biomass',
    color: phaseTokens[3],
  },
  S5: {
    name: 'Prepare the Report',
    desc: 'Public Portal, Investor Summary, Export',
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

export const STAGE3_META: Record<Stage3Key, { name: string; desc: string; color: string; principle: string }> = {
  observe: {
    name: 'Observe',
    desc: 'Roots & Diagnosis — protracted observation before design',
    color: phaseTokens[1],
    principle: 'P1: Observe and Interact',
  },
  plan: {
    name: 'Plan',
    desc: 'Trunk & Synthesis — design from patterns to details',
    color: phaseTokens[2],
    principle: 'P7: Design from Patterns to Details',
  },
  act: {
    name: 'Act',
    desc: 'Branches, Fruit & Stewardship — small/slow, accept feedback',
    color: phaseTokens[3],
    principle: 'P9 (Small & Slow) + P4 (Self-Regulate)',
  },
};

// Ordered list used when iterating groups in UI.
export const PHASE_ORDER: PhaseKey[] = ['P1', 'P2', 'P3', 'P4'];
export const STAGE_ORDER: StageKey[] = ['S1', 'S2', 'S3', 'S4', 'S5'];
export const STAGE3_ORDER: Stage3Key[] = ['observe', 'plan', 'act'];
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
  // ── Observe Hub ────────────────────────────────────────────────────────────
  // Pinned first under the OBSERVE accordion (stage3 grouping). Hybrid landing
  // page that summarises the six observation modules and links to detail
  // dashboards. Dashboard-only — there is no map-rail equivalent.
  {
    id: 'dashboard-observe-hub', label: 'Observe Hub',
    phase: 'P1', domainGroup: 'site-overview', stage: 'S1', stage3: 'observe',
    dashboardOnly: true,
  },
  // Phase 4a — Human Context surfaces (Module 1 of the Observe spec).
  {
    id: 'observe-steward-survey', label: 'Steward Survey',
    phase: 'P1', domainGroup: 'site-overview', stage: 'S1', stage3: 'observe',
    dashboardOnly: true,
  },
  {
    id: 'observe-indigenous-regional', label: 'Indigenous & Regional Context',
    phase: 'P1', domainGroup: 'site-overview', stage: 'S1', stage3: 'observe',
    dashboardOnly: true,
  },
  // Phase 4b — Macroclimate & Hazards (Module 2).
  {
    id: 'observe-hazards-log', label: 'Hazards Log',
    phase: 'P1', domainGroup: 'site-overview', stage: 'S1', stage3: 'observe',
    dashboardOnly: true,
  },
  // Phase 4c — Topography (Module 3).
  {
    id: 'observe-cross-section', label: 'A–B Cross-Section',
    phase: 'P1', domainGroup: 'hydrology-terrain', stage: 'S1', stage3: 'observe',
    dashboardOnly: true,
  },
  // Phase 4d — Earth/Water/Ecology Diagnostics (Module 4).
  {
    id: 'observe-soil-tests', label: 'Jar / Perc / Roof Catchment',
    phase: 'P1', domainGroup: 'hydrology-terrain', stage: 'S1', stage3: 'observe',
    dashboardOnly: true,
  },
  {
    id: 'observe-food-chain', label: 'Food-Chain & Succession',
    phase: 'P1', domainGroup: 'hydrology-terrain', stage: 'S1', stage3: 'observe',
    dashboardOnly: true,
  },
  // Phase 4e — Sectors & Microclimates (Module 5).
  {
    id: 'observe-sector-compass', label: 'Sector Compass',
    phase: 'P1', domainGroup: 'site-overview', stage: 'S1', stage3: 'observe',
    dashboardOnly: true,
  },
  // Phase 4f — SWOT Synthesis (Module 6).
  {
    id: 'observe-swot-journal', label: 'SWOT Journal',
    phase: 'P1', domainGroup: 'site-overview', stage: 'S1', stage3: 'observe',
    dashboardOnly: true,
  },
  {
    id: 'observe-diagnosis-report', label: 'Diagnosis Report',
    phase: 'P1', domainGroup: 'reporting-portal', stage: 'S1', stage3: 'observe',
    dashboardOnly: true,
  },

  // ── Site Overview ──────────────────────────────────────────────────────────
  // Regulatory lives at the top of Site Overview — regulatory posture is
  // part of "what is this site" more than a separate compliance workflow.
  // Collapsing it here lets the one-item Compliance group disappear.
  {
    id: 'regulatory', label: 'Regulatory',
    phase: 'P2', domainGroup: 'site-overview', stage: 'S2', stage3: 'observe',
    panel: 'regulatory', mapSubItem: 'regulatory',
  },
  {
    id: 'site-intelligence', label: 'Site Intelligence',
    phase: 'P1', domainGroup: 'site-overview', stage: 'S1', stage3: 'observe',
    panel: 'intelligence', mapSubItem: 'site-assessment',
  },
  {
    id: 'map-layers', label: 'Map Layers',
    phase: 'P1', domainGroup: 'site-overview', stage: 'S1', stage3: 'observe',
    panel: 'layers', mapSubItem: 'terrain-viz',
  },
  // §3 Site Data Layers catalog — server-authoritative view of every
  // project_layers row with coverage disclosure and completeness meter.
  // Dashboard-only: the catalog has no map-rail surface; layer *visibility*
  // is already handled by `map-layers`.
  {
    id: 'data-catalog', label: 'Data Catalog',
    phase: 'P1', domainGroup: 'site-overview', stage: 'S1', stage3: 'observe',
    dashboardOnly: true,
  },
  // ── Plan Hub ──────────────────────────────────────────────────────────────
  // Pinned first under the PLAN accordion (stage3 grouping). Hybrid landing
  // page summarising the eight Planning-spec modules and linking into both
  // the existing detail dashboards and the new PLAN-stage gap surfaces
  // (registered in subsequent phases). Dashboard-only — there is no
  // map-rail equivalent.
  {
    id: 'dashboard-plan-hub', label: 'Plan Hub',
    phase: 'P2', domainGroup: 'site-overview', stage: 'S3', stage3: 'plan',
    dashboardOnly: true,
  },

  // ── PLAN-stage spec modules (Stage 2 IA restructure, 2026-04-29) ──────────
  // 17 dashboard-only surfaces realising the eight Planning-spec modules.
  // All client-only state, persisted via zustand stores; no server-side schema.
  // See `wiki/decisions/2026-04-29-plan-stage-ia-restructure.md`.

  // Module 1 — Dynamic Layering
  {
    id: 'plan-permanence-scales', label: 'Permanence Scales',
    phase: 'P2', domainGroup: 'site-overview', stage: 'S3', stage3: 'plan',
    dashboardOnly: true,
  },
  // Module 2 — Water Management
  {
    id: 'plan-runoff-calculator', label: 'Runoff Calculator',
    phase: 'P2', domainGroup: 'hydrology-terrain', stage: 'S3', stage3: 'plan',
    dashboardOnly: true,
  },
  {
    id: 'plan-swale-drain', label: 'Swale / Drain Tool',
    phase: 'P2', domainGroup: 'hydrology-terrain', stage: 'S3', stage3: 'plan',
    dashboardOnly: true,
  },
  {
    id: 'plan-storage-infra', label: 'Cisterns / Ponds',
    phase: 'P2', domainGroup: 'hydrology-terrain', stage: 'S3', stage3: 'plan',
    dashboardOnly: true,
  },
  // Module 3 — Zone & Circulation
  {
    id: 'plan-zone-level', label: 'Zone Level Layer',
    phase: 'P2', domainGroup: 'site-overview', stage: 'S3', stage3: 'plan',
    dashboardOnly: true,
  },
  {
    id: 'plan-path-frequency', label: 'Path Frequency',
    phase: 'P2', domainGroup: 'site-overview', stage: 'S3', stage3: 'plan',
    dashboardOnly: true,
  },
  // Module 4 — Plant System & Polyculture
  {
    id: 'plan-plant-database', label: 'Plant Database',
    phase: 'P2', domainGroup: 'forestry', stage: 'S3', stage3: 'plan',
    dashboardOnly: true,
  },
  {
    id: 'plan-guild-builder', label: 'Guild Builder',
    phase: 'P2', domainGroup: 'forestry', stage: 'S3', stage3: 'plan',
    dashboardOnly: true,
  },
  {
    id: 'plan-canopy-simulator', label: 'Canopy Simulator',
    phase: 'P2', domainGroup: 'forestry', stage: 'S3', stage3: 'plan',
    dashboardOnly: true,
  },
  // Module 5 — Soil Fertility & Closed-Loop
  {
    id: 'plan-soil-fertility', label: 'Soil Fertility Designer',
    phase: 'P2', domainGroup: 'site-overview', stage: 'S3', stage3: 'plan',
    dashboardOnly: true,
  },
  {
    id: 'plan-waste-vectors', label: 'Waste-to-Resource Vectors',
    phase: 'P2', domainGroup: 'site-overview', stage: 'S3', stage3: 'plan',
    dashboardOnly: true,
  },
  // Module 6 — Cross-Section + Solar
  {
    id: 'plan-transect-vertical', label: 'Transect Vertical Editor',
    phase: 'P2', domainGroup: 'hydrology-terrain', stage: 'S3', stage3: 'plan',
    dashboardOnly: true,
  },
  {
    id: 'plan-solar-overlay', label: 'Solar Overlay',
    phase: 'P2', domainGroup: 'hydrology-terrain', stage: 'S3', stage3: 'plan',
    dashboardOnly: true,
  },
  // Module 7 — Phasing & Budgeting
  {
    id: 'plan-phasing-matrix', label: 'Phasing Matrix',
    phase: 'P2', domainGroup: 'finance', stage: 'S4', stage3: 'plan',
    dashboardOnly: true,
  },
  {
    id: 'plan-seasonal-tasks', label: 'Seasonal Tasks',
    phase: 'P2', domainGroup: 'finance', stage: 'S4', stage3: 'plan',
    dashboardOnly: true,
  },
  {
    id: 'plan-labor-budget', label: 'Labor & Budget Rollup',
    phase: 'P2', domainGroup: 'finance', stage: 'S4', stage3: 'plan',
    dashboardOnly: true,
  },
  // Module 8 — Principle Verification
  {
    id: 'plan-holmgren-checklist', label: 'Holmgren Checklist',
    phase: 'P2', domainGroup: 'site-overview', stage: 'S4', stage3: 'plan',
    dashboardOnly: true,
  },

  // ── Act Hub ────────────────────────────────────────────────────────────────
  // Pinned first under the ACT accordion (stage3 grouping). Hybrid landing
  // page summarising the five Act-spec modules and linking into both the
  // existing detail dashboards and the new ACT-stage gap surfaces below.
  // Dashboard-only — there is no map-rail equivalent.
  {
    id: 'dashboard-act-hub', label: 'Act Hub',
    phase: 'P3', domainGroup: 'site-overview', stage: 'S3', stage3: 'act',
    dashboardOnly: true,
  },

  // ── ACT-stage spec modules (Stage 3 IA restructure, 2026-04-29) ───────────
  // 13 dashboard-only surfaces realising the five Act-stage modules. All
  // client-only state, persisted via zustand stores; no server-side schema.
  // See `wiki/decisions/2026-04-29-act-stage-ia-restructure.md`.

  // Module 1 — Phased Implementation & Budgeting
  {
    id: 'act-build-gantt', label: 'Build Gantt (5-yr)',
    phase: 'P3', domainGroup: 'finance', stage: 'S4', stage3: 'act',
    dashboardOnly: true,
  },
  {
    id: 'act-budget-actuals', label: 'Budget Actuals',
    phase: 'P3', domainGroup: 'finance', stage: 'S4', stage3: 'act',
    dashboardOnly: true,
  },
  {
    id: 'act-pilot-plots', label: 'Pilot Plots',
    phase: 'P3', domainGroup: 'site-overview', stage: 'S3', stage3: 'act',
    dashboardOnly: true,
  },
  // Module 2 — Maintenance & Operations
  {
    id: 'act-maintenance-schedule', label: 'Maintenance Schedule',
    phase: 'P3', domainGroup: 'site-overview', stage: 'S3', stage3: 'act',
    dashboardOnly: true,
  },
  {
    id: 'act-irrigation-manager', label: 'Irrigation Manager',
    phase: 'P3', domainGroup: 'hydrology-terrain', stage: 'S3', stage3: 'act',
    dashboardOnly: true,
  },
  {
    id: 'act-waste-routing', label: 'Waste Routing Checklist',
    phase: 'P3', domainGroup: 'site-overview', stage: 'S3', stage3: 'act',
    dashboardOnly: true,
  },
  // Module 3 — Ecological Monitoring & Yield
  {
    id: 'act-ongoing-swot', label: 'Ongoing SWOT',
    phase: 'P3', domainGroup: 'site-overview', stage: 'S3', stage3: 'act',
    dashboardOnly: true,
  },
  {
    id: 'act-harvest-log', label: 'Harvest Log',
    phase: 'P3', domainGroup: 'forestry', stage: 'S3', stage3: 'act',
    dashboardOnly: true,
  },
  {
    id: 'act-succession-tracker', label: 'Succession Tracker',
    phase: 'P3', domainGroup: 'forestry', stage: 'S3', stage3: 'act',
    dashboardOnly: true,
  },
  // Module 4 — Social Permaculture
  {
    id: 'act-network-crm', label: 'Network CRM',
    phase: 'P3', domainGroup: 'site-overview', stage: 'S4', stage3: 'act',
    dashboardOnly: true,
  },
  {
    id: 'act-community-events', label: 'Community Events',
    phase: 'P3', domainGroup: 'site-overview', stage: 'S4', stage3: 'act',
    dashboardOnly: true,
  },
  // Module 5 — Disaster Preparedness
  {
    id: 'act-hazard-plans', label: 'Hazard Action Plans',
    phase: 'P3', domainGroup: 'site-overview', stage: 'S3', stage3: 'act',
    dashboardOnly: true,
  },
  {
    id: 'act-appropriate-tech', label: 'Appropriate-Tech Log',
    phase: 'P3', domainGroup: 'site-overview', stage: 'S3', stage3: 'act',
    dashboardOnly: true,
  },

  {
    id: 'feasibility', label: 'Feasibility',
    phase: 'P2', domainGroup: 'site-overview', stage: 'S4', stage3: 'plan',
    panel: 'feasibility', mapSubItem: 'feasibility',
  },
  // Biomass is a site-characterization readout (standing carbon / vegetation
  // load), so it belongs with Site Overview rather than the General catch-all.
  {
    id: 'biomass', label: 'Biomass',
    phase: 'P1', domainGroup: 'site-overview', stage: 'S4', stage3: 'plan',
    panel: 'biomass', mapSubItem: 'biomass',
    layers: ['land_cover'],
  },

  // ── Grazing & Livestock ────────────────────────────────────────────────────
  {
    id: 'paddock-design', label: 'Paddock Design',
    phase: 'P2', domainGroup: 'grazing-livestock', stage: 'S3', stage3: 'plan',
    panel: 'paddockDesign', mapSubItem: 'paddock',
    layers: ['land_cover', 'soils'], domain: 'paddockDesign',
  },
  {
    id: 'herd-rotation', label: 'Herd Rotation',
    phase: 'P2', domainGroup: 'grazing-livestock', stage: 'S3', stage3: 'act',
    panel: 'herdRotation', mapSubItem: 'rotation',
    layers: ['land_cover', 'soils'], domain: 'herdRotation',
  },
  {
    id: 'grazing-analysis', label: 'Grazing Analysis',
    phase: 'P2', domainGroup: 'grazing-livestock', stage: 'S3', stage3: 'plan',
    panel: 'grazingAnalysis', mapSubItem: 'grazing',
    layers: ['land_cover', 'soils'], domain: 'grazingAnalysis',
  },
  {
    id: 'livestock-inventory', label: 'Inventory & Health Ledger',
    phase: 'P2', domainGroup: 'grazing-livestock', stage: 'S3', stage3: 'act',
    panel: 'livestockInventory', mapSubItem: 'herd',
    layers: ['land_cover', 'soils'], domain: 'livestockInventory',
  },

  // ── Forestry ───────────────────────────────────────────────────────────────
  {
    id: 'planting-tool', label: 'Planting Tool',
    phase: 'P2', domainGroup: 'forestry', stage: 'S3', stage3: 'plan',
    panel: 'planting', mapSubItem: 'planting',
    layers: ['soils', 'land_cover'], domain: 'plantingTool',
  },
  {
    id: 'forest-hub', label: 'Forest Hub',
    phase: 'P2', domainGroup: 'forestry', stage: 'S3', stage3: 'plan',
    panel: 'forest', mapSubItem: 'forest',
    layers: ['soils', 'land_cover'], domain: 'forestHub',
  },
  {
    id: 'carbon-diagnostic', label: 'Carbon Diagnostic',
    phase: 'P2', domainGroup: 'forestry', stage: 'S3', stage3: 'plan',
    panel: 'carbon', mapSubItem: 'carbon',
    layers: ['soils', 'land_cover'], domain: 'carbonDiagnostic',
  },
  {
    id: 'nursery-ledger', label: 'Nursery Ledger',
    phase: 'P2', domainGroup: 'forestry', stage: 'S3', stage3: 'act',
    panel: 'nursery', mapSubItem: 'nursery',
    layers: ['soils', 'land_cover'], domain: 'nurseryLedger',
  },

  // ── Hydrology & Terrain ────────────────────────────────────────────────────
  {
    id: 'cartographic', label: 'Cartographic',
    phase: 'P1', domainGroup: 'hydrology-terrain', stage: 'S1', stage3: 'observe',
    panel: 'cartographic', mapSubItem: 'site-data',
    layers: ['land_cover', 'zoning'], domain: 'cartographic',
  },
  {
    // Canonical id `hydrology`; legacy route kept for DashboardRouter/DashboardMetrics.
    id: 'hydrology', label: 'Hydrology',
    phase: 'P1', domainGroup: 'hydrology-terrain', stage: 'S1', stage3: 'observe',
    panel: 'hydrology', mapSubItem: 'hydrology-basic',
    dashboardRoute: 'hydrology-dashboard',
    layers: ['watershed', 'wetlands_flood'], domain: 'hydrology',
  },
  {
    id: 'ecological', label: 'Ecological',
    phase: 'P1', domainGroup: 'hydrology-terrain', stage: 'S1', stage3: 'observe',
    panel: 'ecological', mapSubItem: 'site-assessment',
    layers: ['land_cover', 'soils'], domain: 'ecology',
  },
  {
    // Canonical id `terrain`; legacy route kept for DashboardRouter/DashboardMetrics.
    id: 'terrain', label: 'Terrain',
    phase: 'P1', domainGroup: 'hydrology-terrain', stage: 'S1', stage3: 'observe',
    panel: 'terrain', mapSubItem: 'terrain-viz',
    dashboardRoute: 'terrain-dashboard',
    layers: ['elevation'], domain: 'terrain',
  },
  {
    id: 'stewardship', label: 'Stewardship',
    phase: 'P1', domainGroup: 'hydrology-terrain', stage: 'S1', stage3: 'observe',
    panel: 'stewardship', mapSubItem: 'soil-ecology',
    layers: ['land_cover', 'soils'], domain: 'ecology',
  },
  {
    id: 'climate', label: 'Solar & Climate',
    phase: 'P1', domainGroup: 'hydrology-terrain', stage: 'S1', stage3: 'observe',
    panel: 'climate', mapSubItem: 'solar-climate',
    layers: ['climate'],
  },

  // ── Finance ────────────────────────────────────────────────────────────────
  {
    id: 'timeline-phasing', label: 'Timeline & Phasing',
    phase: 'P2', domainGroup: 'finance', stage: 'S4', stage3: 'plan',
    panel: 'timeline', mapSubItem: 'timeline',
  },
  {
    id: 'economics', label: 'Economics',
    phase: 'P2', domainGroup: 'finance', stage: 'S4', stage3: 'plan',
    panel: 'economic', mapSubItem: 'economics',
  },
  {
    id: 'scenarios', label: 'Scenarios',
    phase: 'P3', domainGroup: 'finance', stage: 'S4', stage3: 'plan',
    panel: 'scenarios', mapSubItem: 'scenarios',
  },
  {
    id: 'investor-summary', label: 'Investor Summary',
    phase: 'P3', domainGroup: 'finance', stage: 'S5', stage3: 'act',
    panel: 'economic', mapSubItem: 'economics',
  },

  // ── Energy & Infrastructure ────────────────────────────────────────────────
  {
    id: 'energy-offgrid', label: 'Energy & Off-Grid',
    phase: 'P2', domainGroup: 'energy-infrastructure', stage: 'S3', stage3: 'plan',
    panel: 'energy', mapSubItem: 'energy',
    layers: ['elevation'], domain: 'energy',
  },
  {
    id: 'infrastructure-utilities', label: 'Utilities & Infrastructure',
    phase: 'P2', domainGroup: 'energy-infrastructure', stage: 'S3', stage3: 'plan',
    panel: 'infrastructure', mapSubItem: 'infrastructure',
    layers: ['soils', 'watershed'], domain: 'infrastructure',
  },

  // ── Compliance ─────────────────────────────────────────────────────────────
  // (Regulatory was relocated to Site Overview; the Compliance group now
  // has no items and drops out of the sidebars automatically.)

  // ── Reporting & Portal ─────────────────────────────────────────────────────
  {
    id: 'reporting', label: 'Reports & Export',
    phase: 'P3', domainGroup: 'reporting-portal', stage: 'S5', stage3: 'act',
    panel: 'reporting', mapSubItem: 'reporting',
  },
  {
    id: 'portal', label: 'Public Portal',
    phase: 'P4', domainGroup: 'reporting-portal', stage: 'S5', stage3: 'act',
    panel: 'portal', mapSubItem: 'portal',
  },
  {
    id: 'educational', label: 'Educational Atlas',
    phase: 'P3', domainGroup: 'reporting-portal', stage: 'S5', stage3: 'act',
    panel: 'educational', mapSubItem: 'educational',
  },

  // ── General (cross-cutting) ────────────────────────────────────────────────
  {
    id: 'siting-rules', label: 'Siting Rules',
    phase: 'P2', domainGroup: 'general', stage: 'S2', stage3: 'observe',
    panel: 'siting', mapSubItem: 'siting-rules',
    layers: ['elevation', 'soils', 'watershed', 'wetlands_flood'],
  },

  // Dashboard-only (no map-rail panel yet)
  // Settings/archive are infra surfaces; intentionally untagged so they drop
  // out of the stage-grouped sidebar (settings is reachable via SidebarBottomControls).
  { id: 'dashboard-settings',  label: 'Settings', phase: 'P4', domainGroup: 'general', dashboardOnly: true },
  { id: 'archive',             label: 'Archive',  phase: 'P4', domainGroup: 'general', dashboardOnly: true },

  // ── Map-only items (Design Atlas sub-tools + fieldwork + history) ─────────
  {
    id: 'zones', label: 'Zones & Land Use',
    phase: 'P2', domainGroup: 'general', stage: 'S3', stage3: 'plan',
    panel: 'design', mapSubItem: 'zones', mapOnly: true,
  },
  {
    id: 'structures', label: 'Structures & Built',
    phase: 'P2', domainGroup: 'general', stage: 'S3', stage3: 'plan',
    panel: 'design', mapSubItem: 'structures', mapOnly: true,
  },
  {
    id: 'access', label: 'Access & Circulation',
    phase: 'P2', domainGroup: 'general', stage: 'S3', stage3: 'plan',
    panel: 'design', mapSubItem: 'access', mapOnly: true,
  },
  {
    id: 'livestock-systems', label: 'Livestock Systems',
    phase: 'P2', domainGroup: 'grazing-livestock', stage: 'S3', stage3: 'plan',
    panel: 'design', mapSubItem: 'livestock', mapOnly: true,
  },
  {
    id: 'crops', label: 'Crops & Agroforestry',
    phase: 'P2', domainGroup: 'forestry', stage: 'S3', stage3: 'plan',
    panel: 'design', mapSubItem: 'crops', mapOnly: true,
  },
  {
    id: 'utilities', label: 'Utilities & Energy',
    phase: 'P2', domainGroup: 'energy-infrastructure', stage: 'S3', stage3: 'plan',
    panel: 'design', mapSubItem: 'utilities', mapOnly: true,
  },
  // (Removed duplicate mapOnly `timeline` entry — `timeline-phasing` under
  // Finance already covers the map rail via panel: 'timeline'.)
  {
    id: 'vision', label: 'Vision Layer',
    phase: 'P2', domainGroup: 'general', stage: 'S3', stage3: 'plan',
    panel: 'vision', mapSubItem: 'vision', mapOnly: true,
  },
  {
    id: 'spiritual', label: 'Spiritual',
    phase: 'P2', domainGroup: 'general', stage: 'S3', stage3: 'plan',
    panel: 'spiritual', mapSubItem: 'spiritual', mapOnly: true,
  },
  {
    id: 'zoning', label: 'Zoning',
    phase: 'P2', domainGroup: 'general', stage: 'S2', stage3: 'observe',
    panel: 'zoning', mapSubItem: 'zoning',
  },
  {
    id: 'ai', label: 'AI Atlas',
    phase: 'P3', domainGroup: 'general', stage: 'S4', stage3: 'plan',
    panel: 'ai', mapSubItem: 'ai', mapOnly: true,
  },
  {
    id: 'collaboration', label: 'Collaboration',
    phase: 'P3', domainGroup: 'general', stage: 'S4', stage3: 'plan',
    panel: 'collaboration', mapSubItem: 'collaboration',
  },
  {
    id: 'moontrance', label: 'OGDEN Identity',
    phase: 'P3', domainGroup: 'general', stage: 'S5', stage3: 'act',
    panel: 'moontrance', mapSubItem: 'moontrance', mapOnly: true,
  },
  {
    id: 'templates', label: 'Templates',
    phase: 'P3', domainGroup: 'general', stage: 'S5', stage3: 'act',
    panel: 'templates', mapSubItem: 'templates',
  },
  // Fieldwork & history are cross-cutting; intentionally untagged so they
  // drop out of the stage-grouped sidebar (per upgrade brief §4 mapping).
  {
    id: 'fieldwork', label: 'Fieldwork',
    phase: 'P4', domainGroup: 'general', stage3: 'act',
    panel: 'fieldnotes', mapSubItem: 'fieldwork',
  },
  {
    id: 'history', label: 'Version History',
    phase: 'P4', domainGroup: 'general', stage3: 'act',
    panel: 'history', mapSubItem: 'history',
  },
];

// ── Derived helpers ──────────────────────────────────────────────────────────

/** Group a filtered item list by phase, preserving PHASE_ORDER. */
export function groupByPhase(items: NavItem[]): Record<PhaseKey, NavItem[]> {
  const out: Record<PhaseKey, NavItem[]> = { P1: [], P2: [], P3: [], P4: [] };
  for (const item of items) out[item.phase].push(item);
  return out;
}

/**
 * Group a filtered item list by stage, preserving STAGE_ORDER.
 * Items without a `stage` (cross-cutting infra: settings, archive, fieldwork,
 * history) are intentionally omitted, matching the upgrade brief §4.
 */
export function groupByStage(items: NavItem[]): Record<StageKey, NavItem[]> {
  const out: Record<StageKey, NavItem[]> = { S1: [], S2: [], S3: [], S4: [], S5: [] };
  for (const item of items) {
    if (item.stage) out[item.stage].push(item);
  }
  return out;
}

/**
 * Group a filtered item list by 3-stage lens (Observe / Plan / Act),
 * preserving STAGE3_ORDER. Items without a `stage3` (settings, archive) are
 * intentionally omitted, matching the legacy `groupByStage` contract.
 */
export function groupByStage3(items: NavItem[]): Record<Stage3Key, NavItem[]> {
  const out: Record<Stage3Key, NavItem[]> = { observe: [], plan: [], act: [] };
  for (const item of items) {
    if (item.stage3) out[item.stage3].push(item);
  }
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
