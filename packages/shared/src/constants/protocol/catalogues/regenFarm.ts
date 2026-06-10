// catalogues/regenFarm.ts
//
// REGENERATIVE FARM primary protocol deltas - commercial-scale regenerative
// production (mixed cropping / grazing) where soil-building and yield run
// together. Baseline depth. Thresholds stay as [tokens] for the operator.

import type { StandardProtocolTemplate } from '../../../schemas/protocol/protocol.schema.js';

export const REGEN_FARM_PRIMARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'rf-ground-cover-floor',
    name: 'Living Ground Cover Floor',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF living ground cover on any block falls below [cover floor]',
    response: 'Adjust grazing or cropping to restore cover before bare soil sets in.',
    rationale:
      'Bare soil is the failure mode regenerative farming exists to prevent; a cover floor turns "keep it covered" into an actionable trigger.',
    feeds: ['Soil', 'Plants'],
  },
  {
    id: 'rf-rotation-rest-period',
    name: 'Pasture Rest Period',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF a paddock is re-grazed before its [recovery period] elapses',
    response: 'Hold stock off and extend the rotation until the pasture recovers.',
    rationale:
      'Recovery time, not stocking rate, is what regenerates a pasture; re-grazing early is the most common way the rotation degrades.',
    feeds: ['Plants', 'Animals'],
  },
  {
    id: 'rf-soil-carbon-trend',
    name: 'Soil Carbon / Organic Matter Trend',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    stratumId: 's2-land-reading',
    objectiveId: 's2-terrain',
    severityTier: 'watch',
    condition: 'IF the [soil monitoring interval] arrives',
    response: 'Re-test soil organic matter and compare against the baseline trend.',
    rationale:
      'The whole thesis of the farm is a rising soil-carbon trend; only a measured cadence proves the system is regenerating, not just holding.',
    feeds: ['Soil'],
  },
  {
    id: 'rf-input-dependency',
    name: 'External Input Dependency',
    type: 'judgment',
    source: 'primary',
    sourceTypeId: 'regenerative_farm',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'watch',
    condition: 'IF reliance on purchased fertiliser or feed rises above [input ceiling]',
    response: 'Review on-farm fertility and feed cycles to reduce external dependency.',
    rationale:
      'A regenerative farm is meant to close its own loops; a rising input bill is the early signal those loops are leaking.',
    feeds: ['Economics', 'Soil'],
  },
];
