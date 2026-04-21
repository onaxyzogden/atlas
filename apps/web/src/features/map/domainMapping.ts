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
  | 'paddockDesign'
  | 'herdRotation'
  | 'grazingAnalysis'
  | 'livestockInventory'
  | 'plantingTool'
  | 'forestHub'
  | 'carbonDiagnostic'
  | 'nurseryLedger'
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
  'site-intelligence': {
    subItem: 'site-assessment',
    panel: 'intelligence',
    layers: [],
    domain: 'default',
  },
  'map-layers': {
    subItem: 'terrain-viz',
    panel: 'layers',
    layers: [],
    domain: 'default',
  },
  'hydrology-dashboard': {
    subItem: 'hydrology-basic',
    panel: 'hydrology',
    layers: ['watershed', 'wetlands_flood'],
    domain: 'hydrology',
  },
  'terrain-dashboard': {
    subItem: 'terrain-viz',
    panel: 'terrain',
    layers: ['elevation'],
    domain: 'terrain',
  },
  'cartographic': {
    subItem: 'site-data',
    panel: 'cartographic',
    layers: ['land_cover', 'zoning'],
    domain: 'cartographic',
  },
  'ecological': {
    subItem: 'site-assessment',
    panel: 'ecological',
    layers: ['land_cover', 'soils'],
    domain: 'ecology',
  },
  'stewardship': {
    subItem: 'soil-ecology',
    panel: 'stewardship',
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
    panel: 'grazingAnalysis',
    layers: ['land_cover', 'soils'],
    domain: 'grazingAnalysis',
  },
  'herd-rotation': {
    subItem: 'livestock',
    panel: 'herdRotation',
    layers: ['land_cover', 'soils'],
    domain: 'herdRotation',
  },
  'paddock-design': {
    subItem: 'livestock',
    panel: 'paddockDesign',
    layers: ['land_cover', 'soils'],
    domain: 'paddockDesign',
  },
  'livestock-inventory': {
    subItem: 'livestock',
    panel: 'livestockInventory',
    layers: ['land_cover', 'soils'],
    domain: 'livestockInventory',
  },
  'planting-tool': {
    subItem: 'crops',
    panel: 'planting',
    layers: ['soils', 'land_cover'],
    domain: 'plantingTool',
  },
  'forest-hub': {
    subItem: 'crops',
    panel: 'forest',
    layers: ['soils', 'land_cover'],
    domain: 'forestHub',
  },
  'carbon-diagnostic': {
    subItem: 'crops',
    panel: 'carbon',
    layers: ['soils', 'land_cover'],
    domain: 'carbonDiagnostic',
  },
  'nursery-ledger': {
    subItem: 'crops',
    panel: 'nursery',
    layers: ['soils', 'land_cover'],
    domain: 'nurseryLedger',
  },
  'climate': {
    subItem: 'solar-climate',
    panel: 'climate',
    layers: ['climate'],
    domain: 'default',
  },
  'economics': {
    subItem: 'economics',
    panel: 'economic',
    layers: [],
    domain: 'default',
  },
  'scenarios': {
    subItem: 'scenarios',
    panel: 'scenarios',
    layers: [],
    domain: 'default',
  },
  'investor-summary': {
    subItem: 'economics',
    panel: 'economic',
    layers: [],
    domain: 'default',
  },
  'regulatory': {
    subItem: 'regulatory',
    panel: 'regulatory',
    layers: [],
    domain: 'default',
  },
  'siting-rules': {
    subItem: 'siting-rules',
    panel: 'siting',
    layers: ['elevation', 'soils', 'watershed', 'wetlands_flood'],
    domain: 'default',
  },
  'reporting': {
    subItem: 'reporting',
    panel: 'reporting',
    layers: [],
    domain: 'default',
  },
  'portal': {
    subItem: 'portal',
    panel: 'portal',
    layers: [],
    domain: 'default',
  },
  'educational': {
    subItem: 'educational',
    panel: 'educational',
    layers: [],
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
