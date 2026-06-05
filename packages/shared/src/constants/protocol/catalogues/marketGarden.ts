// catalogues/marketGarden.ts
//
// MARKET GARDEN protocol deltas - intensive small-footprint horticulture for
// direct and local market sales. Baseline depth. Carries the Amanah caution on
// CSA-style advance sale (bayʿ mā laysa ʿindak) verbatim on any protocol whose
// response touches a sales channel (per the operator's standing CSA ruling).

import type { StandardProtocolTemplate } from '../../../schemas/protocol/protocol.schema.js';

/**
 * Amanah caution carried VERBATIM on sales-channel protocols. A CSA-style
 * advance-purchase subscription sells produce not yet in hand - bayʿ mā laysa
 * ʿindak (the sale of what one does not yet possess). Never stripped or reworded.
 */
const CSA_SCOPE_NOTE =
  'Amanah caution: a CSA-style advance-purchase subscription sells produce not yet in hand — bayʿ mā laysa ʿindak (the sale of what one does not yet possess). Do not structure the channel as advance sale of unharvested yield. Permitted alternatives: charitable donation, restricted donation, qard ḥasan (interest-free loan), in-kind contribution, sponsorship, or a post-harvest membership yield-share designed afresh under Scholar Council review.';

export const MARKET_GARDEN_PRIMARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'mg-bed-rotation-soil-health',
    name: 'Bed Rotation Soil Health',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'market_garden',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF a bed rotation cycle completes',
    response: 'Record soil condition and residue, and plan the cover crop before replanting.',
    rationale:
      'Intensive beds mine fertility fast; closing each rotation with a soil read and a cover crop is what keeps the system regenerative.',
    feeds: ['Soil', 'Plants'],
  },
  {
    id: 'mg-harvest-window-quality',
    name: 'Harvest Window Quality',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'market_garden',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF a crop reaches its [harvest maturity window]',
    response: 'Harvest and route to market within the quality window.',
    rationale:
      'For a market garden the margin lives in the harvest window; a day late is shrink, waste, and a lost sale.',
    feeds: ['Plants', 'Economics'],
  },
  {
    id: 'mg-irrigation-demand-peak',
    name: 'Peak Irrigation Demand',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'market_garden',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF crop water demand exceeds the [supply rate] in peak season',
    response: 'Prioritise beds and review the irrigation system against peak load.',
    rationale:
      'Intensive horticulture is water-hungry at the worst possible time; a standing trigger keeps a heatwave from cooking the whole planting.',
    feeds: ['Hydrology', 'Plants'],
  },
  {
    id: 'mg-market-channel-advance-sale',
    name: 'Market Channel Review',
    type: 'judgment',
    source: 'primary',
    sourceTypeId: 'market_garden',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'respond',
    condition:
      'IF a sales channel proposes advance purchase of future harvest (e.g. a CSA subscription)',
    response: 'Review the channel structure against the Amanah gate before committing.',
    rationale:
      'The cash-flow appeal of advance sale is exactly where an impermissible structure slips in; a standing review keeps the channel halal.',
    feeds: ['Economics'],
    scopeNotes: CSA_SCOPE_NOTE,
  },
];

export const MARKET_GARDEN_SECONDARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'mg2-host-resource-competition',
    name: 'Host Resource Competition',
    type: 'judgment',
    source: 'secondary',
    sourceTypeId: 'market_garden',
    stratumId: 's6-integration-design',
    severityTier: 'watch',
    condition:
      'IF market beds compete with the host system for water or labour past [threshold]',
    response: 'Re-balance water and labour allocation between the market garden and the host system.',
    rationale:
      'A market garden bolted onto another system quietly draws the scarce inputs toward the cash crop; watching the balance keeps the host whole.',
    feeds: ['Economics', 'Hydrology'],
  },
  {
    id: 'mg2-surplus-market-channel',
    name: 'Surplus Market Channel Review',
    type: 'judgment',
    source: 'secondary',
    sourceTypeId: 'market_garden',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'respond',
    condition: 'IF host-system surplus is routed to a market sale channel',
    response: 'Review the channel against the Amanah gate (no advance sale of unharvested yield).',
    rationale:
      'Selling a host system’s surplus is permissible, but the moment it is pre-sold it inherits the same bayʿ mā laysa ʿindak risk.',
    feeds: ['Economics'],
    scopeNotes: CSA_SCOPE_NOTE,
  },
];
