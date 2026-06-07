// catalogues/orchard.ts
//
// ORCHARD / FOOD FOREST protocol deltas - perennial polyculture where the
// canopy IS the long-term capital. Baseline depth, plus a secondary layer for
// when an orchard / food-forest is layered onto a host primary type.

import type { StandardProtocolTemplate } from '../../../schemas/protocol/protocol.schema.js';

export const ORCHARD_PRIMARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'orch-pest-disease-pressure',
    name: 'Pest / Disease Pressure',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'orchard_food_forest',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF pest or disease pressure on the canopy exceeds [action threshold]',
    response: 'Apply the integrated pest-management response before it spreads through the planting.',
    rationale:
      'A pest front in a perennial system threatens decades of growth, not one season; catching it at threshold protects the standing capital.',
    feeds: ['Plants', 'Ecology'],
  },
  {
    id: 'orch-pollination-window',
    name: 'Pollination Window',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'orchard_food_forest',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF the bloom / pollination window opens',
    response: 'Confirm pollinator presence and avoid any spray that would harm them during bloom.',
    rationale:
      'No pollination, no crop; the bloom window is short and irreversible, so it earns a standing protocol of its own.',
    feeds: ['Plants', 'Animals'],
  },
  {
    id: 'orch-young-tree-water',
    name: 'Young Tree Water Stress',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'orchard_food_forest',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF young trees show water stress past [stress threshold]',
    response: 'Prioritise irrigation to the establishing trees.',
    rationale:
      'A tree lost in its first years resets the whole timeline; young-tree water has priority a mature canopy does not need.',
    feeds: ['Hydrology', 'Plants'],
  },
  {
    id: 'orch-harvest-glut',
    name: 'Harvest Glut Handling',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'orchard_food_forest',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'abundance',
    condition: 'IF a harvest glut exceeds fresh-use and storage capacity',
    response: 'Route the surplus to processing, sharing, or preservation before it spoils.',
    rationale:
      'Perennial gluts are predictable abundance; a plan to receive them turns waste into stored value and shared benefit.',
    feeds: ['Plants', 'Economics'],
  },
];

export const ORCHARD_SECONDARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'orch2-canopy-shade-encroachment',
    name: 'Canopy Shade Encroachment',
    type: 'judgment',
    source: 'secondary',
    sourceTypeId: 'orchard_food_forest',
    stratumId: 's6-integration-design',
    severityTier: 'watch',
    condition: 'IF the orchard canopy shades host-system production past [threshold]',
    response: 'Review canopy placement or pruning so the host system keeps its light.',
    rationale:
      'Layered onto another system, an orchard quietly steals sun from the ground crops it shades as it matures.',
    feeds: ['Plants', 'Ecology'],
  },
  {
    id: 'orch2-perennial-water-share',
    name: 'Perennial Water Share',
    type: 'judgment',
    source: 'secondary',
    sourceTypeId: 'orchard_food_forest',
    stratumId: 's5-system-design',
    severityTier: 'watch',
    condition: 'IF perennial root demand competes with host irrigation in dry spells',
    response: 'Re-balance the irrigation allocation between perennials and the host system.',
    rationale:
      'Established perennials draw deep and steady; in a drought they can starve the host system if the share is not set deliberately.',
    feeds: ['Hydrology', 'Plants'],
  },
];
