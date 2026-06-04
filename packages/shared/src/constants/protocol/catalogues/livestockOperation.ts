// catalogues/livestockOperation.ts
//
// LIVESTOCK OPERATION protocol deltas - animals as the primary enterprise.
// Complements the existing enterprise-scoped standardTemplates.ts (sheep_beef /
// poultry); these are type-level protocols that apply to the operation as a
// whole regardless of enterprise. Baseline depth.

import type { StandardProtocolTemplate } from '../../../schemas/protocol/protocol.schema.js';

export const LIVESTOCK_PRIMARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'lvo-stocking-rate-carrying-capacity',
    name: 'Stocking Rate vs Carrying Capacity',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'livestock_operation',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF stocking rate exceeds the land’s [carrying capacity] for the season',
    response: 'Destock, agist, or supplement before the pasture is overgrazed.',
    rationale:
      'Overstocking degrades the land that feeds the herd; matching stock to carrying capacity is the core discipline of the operation.',
    feeds: ['Animals', 'Plants'],
  },
  {
    id: 'lvo-feed-reserve',
    name: 'Feed Reserve',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'livestock_operation',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'respond',
    condition: 'IF feed or fodder reserve falls below [reserve days]',
    response: 'Secure feed before the gap, by purchase or by reducing demand.',
    rationale:
      'A feed gap with animals on the ground is a welfare and financial emergency at once; the reserve floor must be acted on, not discovered.',
    feeds: ['Animals', 'Economics'],
  },
  {
    id: 'lvo-herd-health-surveillance',
    name: 'Herd Health Surveillance',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'livestock_operation',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF the [health monitoring cadence] arrives OR disease signs are observed',
    response: 'Inspect the herd and act on any health or biosecurity finding.',
    rationale:
      'Disease moves through a herd faster than casual observation catches it; a surveillance cadence is the difference between one case and an outbreak.',
    feeds: ['Animals', 'Risk & Compliance'],
  },
  {
    id: 'lvo-water-access',
    name: 'Stock Water Access',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'livestock_operation',
    stratumId: 's5-system-design',
    severityTier: 'stop',
    condition: 'IF stock water supply or access fails',
    response: 'Restore water access immediately; it is a same-day welfare imperative.',
    rationale:
      'Animals can fail within hours without water; no other operational concern outranks restoring their access.',
    feeds: ['Hydrology', 'Animals'],
  },
];

export const LIVESTOCK_SECONDARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'lvo2-integration-grazing-pressure',
    name: 'Integrated Grazing Pressure',
    type: 'judgment',
    source: 'secondary',
    sourceTypeId: 'livestock_operation',
    stratumId: 's6-integration-design',
    severityTier: 'watch',
    condition: 'IF grazing pressure damages the host system’s crops, trees, or soil',
    response: 'Adjust timing, fencing, or stocking to protect the host system.',
    rationale:
      'Added to a cropping or perennial system, livestock can graze or trample the very assets the host is building.',
    feeds: ['Animals', 'Plants'],
  },
  {
    id: 'lvo2-manure-nutrient-load',
    name: 'Manure Nutrient Load',
    type: 'threshold',
    source: 'secondary',
    sourceTypeId: 'livestock_operation',
    stratumId: 's6-integration-design',
    severityTier: 'watch',
    condition: 'IF manure nutrient load on an area exceeds [nutrient ceiling]',
    response: 'Redistribute animals so nutrient return enriches rather than pollutes.',
    rationale:
      'Integrated manure is a fertility gift up to a point and a runoff hazard beyond it; the ceiling keeps the gift from becoming pollution.',
    feeds: ['Soil', 'Hydrology'],
  },
];
