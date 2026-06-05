// catalogues/homestead.ts
//
// HOMESTEAD primary protocol deltas - family-scale self-reliance (food, water,
// shelter, resilience for the household). Layered on top of the universal set
// by resolveProjectProtocols. Vertical-slice depth (drafted for operator review
// per the 2026-06-03 ruling; thresholds stay as [tokens]).

import type { StandardProtocolTemplate } from '../../../schemas/protocol/protocol.schema.js';

export const HOMESTEAD_PRIMARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'hs-household-water-test',
    name: 'Household Water Test',
    type: 'judgment',
    source: 'primary',
    sourceTypeId: 'homestead',
    stratumId: 's2-land-reading',
    severityTier: 'respond',
    condition: 'IF the household water source has not been tested in [test interval]',
    response: 'Test potable water quality and address any contamination before household use.',
    rationale:
      'Household water is a direct life-and-health dependency; testing on a cadence catches contamination before anyone drinks it.',
    feeds: ['Hydrology', 'Risk & Compliance'],
  },
  {
    id: 'hs-rainwater-tank-reserve',
    name: 'Rainwater Tank Reserve',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'homestead',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF rainwater storage falls below [household reserve days]',
    response: 'Switch to conservation use and confirm the backup water supply.',
    rationale:
      'A homestead that runs its tank dry has no municipal fallback; the reserve floor is the line to act on, not to discover.',
    feeds: ['Hydrology'],
  },
  {
    id: 'hs-heating-fuel-reserve',
    name: 'Heating Fuel Reserve',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'homestead',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF firewood or heating fuel falls below the [winter reserve]',
    response: 'Replenish heating fuel before the cold season.',
    rationale:
      'Heating is a seasonal life-safety need; fuel gathered late is wet, expensive, or unavailable when it is needed most.',
    feeds: ['Energy & Resources'],
  },
  {
    id: 'hs-home-food-production-gap',
    name: 'Home Food Production Gap',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'homestead',
    stratumId: 's6-integration-design',
    severityTier: 'watch',
    condition: 'IF household staple production falls below the [self-reliance target] for a season',
    response: 'Review the garden, orchard, and storage plan against the household food need.',
    rationale:
      'Self-reliance is the homestead’s whole point; a production gap caught at season scale is a planting decision, not a shortage.',
    feeds: ['Plants', 'Economics'],
  },
  {
    id: 'hs-preserved-food-stock',
    name: 'Preserved Food Stock Review',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'homestead',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF the [pantry review date] arrives OR preserved stock falls below the [winter reserve]',
    response: 'Review preservation and storage before the cold season.',
    rationale:
      'Stored abundance is what carries a household through the lean season; reviewing it on a cadence keeps the harvest from spoiling uncounted.',
    feeds: ['Plants'],
  },
  {
    id: 'hs-small-livestock-welfare',
    name: 'Household Animal Welfare Check',
    type: 'judgment',
    source: 'primary',
    sourceTypeId: 'homestead',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF no welfare check on household animals has been recorded in [window]',
    response: 'Conduct a welfare, feed, and water check on household animals.',
    rationale:
      'Small household flocks and herds are easy to overlook; a cadence check upholds the duty of care owed to animals in our keeping.',
    feeds: ['Animals'],
  },
  {
    id: 'hs-household-labour-balance',
    name: 'Household Labour Balance',
    type: 'judgment',
    source: 'primary',
    sourceTypeId: 'homestead',
    stratumId: 's1-project-foundation',
    severityTier: 'watch',
    condition: 'IF homestead maintenance load is observed to exceed family capacity',
    response: 'Re-scope homestead systems to the family time budget.',
    rationale:
      'A homestead is meant to support the family, not consume it; when the work outgrows the hands, the design has overreached.',
    feeds: ['People & Governance'],
  },
];
