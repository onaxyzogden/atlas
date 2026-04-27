/**
 * Domain mapping — bidirectional lookup between dashboard sections
 * and map view context (sub-item, panel, layer activations).
 *
 * As of the #1 taxonomy sync, `DASHBOARD_TO_MAP` is derived from the canonical
 * NAV_ITEMS list in `features/navigation/taxonomy.ts` rather than hand-authored
 * here. Adding a new dashboard section now means adding one NavItem —
 * both sidebars and the map-context lookup update automatically.
 *
 * Used by:
 *   - MapView: to initialize map state when switching from Dashboard
 *   - MapView: to derive activeDomain for DomainFloatingToolbar
 *   - MapView: to mirror DashboardMetrics (replaces SUB_ITEM_TO_SECTION)
 */

import type { SidebarView, SubItemId } from '../../components/IconSidebar.js';
import type { LayerType } from '@ogden/shared';

export type DomainKey =
  | 'hydrology'
  | 'terrain'
  | 'ecology'
  | 'paddockDesign'
  | 'herdRotation'
  | 'grazingAnalysis'
  | 'livestockInventory'
  | 'plantingTool'
  | 'forestHub'
  | 'carbonDiagnostic'
  | 'nurseryLedger'
  | 'cartographic'
  | 'energy'
  | 'infrastructure'
  | 'zones'
  | 'structures'
  | 'crops'
  | 'paths'
  | 'default';

export interface DomainContext {
  subItem: SubItemId;
  panel: SidebarView;
  /** Layer types to auto-activate when entering this domain from Dashboard */
  layers: LayerType[];
  domain: DomainKey;
}

// Derive the map from the single-source taxonomy. Imported lazily at module
// load — see features/navigation/taxonomy.ts for the NAV_ITEMS schema.
import { NAV_ITEMS } from '../navigation/taxonomy.js';

const DEFAULT_CONTEXT: DomainContext = {
  subItem: 'terrain-viz',
  panel: 'layers',
  layers: [],
  domain: 'default',
};

export const DASHBOARD_TO_MAP: Record<string, DomainContext> = (() => {
  const out: Record<string, DomainContext> = {};
  for (const item of NAV_ITEMS) {
    if (item.mapOnly) continue;            // map-only items don't enter from Dashboard
    if (!item.panel) continue;             // no panel ⇒ no map context
    const key = item.dashboardRoute ?? item.id;
    out[key] = {
      subItem: (item.mapSubItem ?? 'terrain-viz') as SubItemId,
      panel: item.panel as SidebarView,
      layers: item.layers ?? [],
      domain: item.domain ?? 'default',
    };
  }
  return out;
})();

// Map sub-item → dashboard section (reverse lookup).
// Used for DashboardMetrics mirror and reverse sync.
export const MAP_TO_DASHBOARD: Partial<Record<SubItemId, string>> = (() => {
  const out: Partial<Record<SubItemId, string>> = {};
  for (const item of NAV_ITEMS) {
    if (!item.mapSubItem) continue;
    if (item.mapOnly) continue;
    // First writer wins — mirrors the hand-authored priority where a
    // SubItemId maps to a single representative dashboard section.
    if (!out[item.mapSubItem]) {
      out[item.mapSubItem] = item.dashboardRoute ?? item.id;
    }
  }
  return out;
})();

export function getDomainContext(dashboardSection: string): DomainContext {
  // Explicit sentinel for unmapped sections — lets the map rail render an
  // EmptyState instead of silently falling back to Map Layers (which is
  // semantically wrong and confuses users — see UI/UX critique #4).
  return DASHBOARD_TO_MAP[dashboardSection] ?? {
    ...DEFAULT_CONTEXT,
    panel: 'unmapped',
  };
}
