/**
 * Domain mapping — bidirectional lookup between dashboard sections
 * and map view context (sub-item, panel, layer activations).
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
  | 'livestock'
  | 'forestry'
  | 'cartographic'
  | 'default';

export interface DomainContext {
  subItem: SubItemId;
  panel: SidebarView;
  /** Layer types to auto-activate when entering this domain from Dashboard */
  layers: LayerType[];
  domain: DomainKey;
}

// Dashboard section → map context
export const DASHBOARD_TO_MAP: Record<string, DomainContext> = {
  'hydrology-dashboard': {
    subItem: 'hydrology-basic',
    panel: 'hydrology',
    layers: ['watershed', 'wetlands_flood'],
    domain: 'hydrology',
  },
  'terrain-dashboard': {
    subItem: 'terrain-viz',
    panel: 'layers',
    layers: ['elevation'],
    domain: 'terrain',
  },
  'cartographic': {
    subItem: 'site-data',
    panel: 'intelligence',
    layers: ['land_cover', 'zoning'],
    domain: 'cartographic',
  },
  'ecological': {
    subItem: 'site-assessment',
    panel: 'intelligence',
    layers: ['land_cover', 'soils'],
    domain: 'ecology',
  },
  'stewardship': {
    subItem: 'soil-ecology',
    panel: 'intelligence',
    layers: ['land_cover', 'soils'],
    domain: 'ecology',
  },
  'biomass': {
    subItem: 'soil-ecology',
    panel: 'intelligence',
    layers: ['land_cover', 'soils'],
    domain: 'ecology',
  },
  'grazing-analysis': {
    subItem: 'livestock',
    panel: 'livestock',
    layers: ['land_cover', 'soils'],
    domain: 'livestock',
  },
  'herd-rotation': {
    subItem: 'livestock',
    panel: 'livestock',
    layers: ['land_cover', 'soils'],
    domain: 'livestock',
  },
  'paddock-design': {
    subItem: 'livestock',
    panel: 'livestock',
    layers: ['land_cover', 'soils'],
    domain: 'livestock',
  },
  'livestock-inventory': {
    subItem: 'livestock',
    panel: 'livestock',
    layers: ['land_cover', 'soils'],
    domain: 'livestock',
  },
  'planting-tool': {
    subItem: 'crops',
    panel: 'intelligence',
    layers: ['soils', 'land_cover'],
    domain: 'forestry',
  },
  'forest-hub': {
    subItem: 'crops',
    panel: 'intelligence',
    layers: ['soils', 'land_cover'],
    domain: 'forestry',
  },
  'carbon-diagnostic': {
    subItem: 'crops',
    panel: 'intelligence',
    layers: ['soils', 'land_cover'],
    domain: 'forestry',
  },
  'nursery-ledger': {
    subItem: 'crops',
    panel: 'intelligence',
    layers: ['soils', 'land_cover'],
    domain: 'forestry',
  },
  'siting-rules': {
    subItem: 'siting-rules',
    panel: 'siting',
    layers: ['elevation', 'soils', 'watershed', 'wetlands_flood'],
    domain: 'default',
  },
};

// Map sub-item → dashboard section (reverse lookup)
// Used for DashboardMetrics mirror and reverse sync
export const MAP_TO_DASHBOARD: Partial<Record<SubItemId, string>> = {
  'terrain-viz':     'terrain-dashboard',
  'site-data':       'cartographic',
  'site-assessment': 'ecological',
  'hydrology-basic': 'hydrology-dashboard',
  'soil-ecology':    'ecological',
  'livestock':       'livestock-inventory',
  'crops':           'planting-tool',
};

export function getDomainContext(dashboardSection: string): DomainContext {
  return DASHBOARD_TO_MAP[dashboardSection] ?? {
    subItem: 'terrain-viz',
    panel: 'layers',
    layers: [],
    domain: 'default',
  };
}
