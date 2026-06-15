// catalogues/nursery.ts
//
// NURSERY protocol deltas - propagating plant stock for sale or for the site's
// own plantings. Defining risks are propagation health, stock-readiness timing,
// and the Amanah caution on pre-selling stock not yet grown. Baseline depth.

import type { StandardProtocolTemplate } from '../../../schemas/protocol/protocol.schema.js';

/**
 * Amanah caution carried VERBATIM on stock pre-sale protocols. Taking payment
 * for plants not yet propagated to a deliverable state risks bayʿ mā laysa
 * ʿindak (the sale of what one does not yet possess). Never stripped or reworded.
 */
const STOCK_PRESALE_SCOPE_NOTE =
  'Amanah caution: pre-selling nursery stock that is not yet propagated to a deliverable state risks bayʿ mā laysa ʿindak (the sale of what one does not yet possess). Sale of stock already grown and on hand is sound; advance sale of a future, not-yet-existent crop of plants is not. Permitted alternatives: charitable donation, restricted donation, qard ḥasan (interest-free loan), in-kind contribution, sponsorship. Review under the Amanah gate before committing.';

export const NURSERY_PRIMARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'nur-propagation-health',
    name: 'Propagation Health',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'nursery',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF damping-off, pest, or disease in propagation exceeds [action threshold]',
    response: 'Isolate affected stock and apply the propagation-hygiene response.',
    rationale:
      'Disease in a propagation bench spreads to the whole batch fast; catching it at threshold saves the cohort, not just a tray.',
    feeds: ['Plants', 'Risk & Compliance'],
  },
  {
    id: 'nur-stock-readiness',
    name: 'Stock Readiness Window',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'nursery',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'respond',
    condition: 'IF stock approaches its [saleable / plantable readiness window]',
    response: 'Pot on, harden off, or route the stock before it becomes root-bound or overgrown.',
    rationale:
      'Nursery value lives in a narrow readiness window; stock held past it becomes unsellable and unplantable in one slide.',
    feeds: ['Plants', 'Economics'],
  },
  {
    id: 'nur-environmental-control',
    name: 'Propagation Environment Control',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'nursery',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF propagation temperature, humidity, or moisture leaves the [tolerance band]',
    response: 'Restore the controlled environment before the stock is set back.',
    rationale:
      'Young propagation is unforgiving of swings; a brief excursion outside the band can lose weeks of growth or a whole batch.',
    feeds: ['Built Infrastructure', 'Plants'],
  },
  {
    id: 'nur-stock-presale',
    name: 'Stock Pre-Sale Review',
    type: 'judgment',
    source: 'primary',
    sourceTypeId: 'nursery',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'respond',
    condition: 'IF stock not yet grown to a deliverable state is offered for advance purchase',
    response: 'Review the offer against the Amanah gate before selling it.',
    rationale:
      'Advance-sold future stock is precisely the sale of what is not yet possessed; a standing review keeps the channel halal.',
    feeds: ['Economics', 'Risk & Compliance'],
    scopeNotes: STOCK_PRESALE_SCOPE_NOTE,
  },
];

export const NURSERY_SECONDARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'nur2-own-planting-supply',
    name: 'Own-Planting Supply Sync',
    type: 'judgment',
    source: 'secondary',
    sourceTypeId: 'nursery',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'watch',
    condition: 'IF the host system’s planting schedule outpaces nursery stock readiness',
    response: 'Re-time propagation to meet the host system’s planting windows.',
    rationale:
      'A nursery serving its own site fails quietly when stock is not ready for the host’s planting season; syncing the two keeps the loop closed.',
    feeds: ['Plants', 'Economics'],
  },

  // Operational overlays for a LAYERED (secondary) nursery — the secondary
  // analogues of the rich nursery primary protocols, so a nursery layered onto a
  // host gets propagation monitoring, not just supply-sync. The primary `nur-*`
  // ids stay primary-only; the bayʿ mā laysa ʿindak presale guard is deliberately
  // NOT mirrored here (the secondary set has no advance-sale surface). 2026-06-14.
  {
    id: 'nur2-propagation-health',
    name: 'Propagation Health',
    type: 'threshold',
    source: 'secondary',
    sourceTypeId: 'nursery',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF damping-off, pest, or disease in propagation exceeds [action threshold]',
    response: 'Isolate affected stock and apply the propagation-hygiene response before it spreads through the layer.',
    rationale:
      'A nursery layered onto a host still propagates in batches; disease caught at threshold saves the cohort the host system is counting on, not just a tray.',
    feeds: ['Plants', 'Risk & Compliance'],
  },
  {
    id: 'nur2-stock-readiness',
    name: 'Stock Readiness Window',
    type: 'cyclical',
    source: 'secondary',
    sourceTypeId: 'nursery',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'respond',
    condition: 'IF stock approaches its [saleable / plantable readiness window]',
    response: 'Pot on, harden off, or route the stock before it becomes root-bound or overgrown.',
    rationale:
      'Whether routed to the host plantings or sold on, nursery value lives in a narrow readiness window; stock held past it becomes unusable in one slide.',
    feeds: ['Plants', 'Economics'],
  },
  {
    id: 'nur2-environmental-control',
    name: 'Propagation Environment Control',
    type: 'threshold',
    source: 'secondary',
    sourceTypeId: 'nursery',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF propagation temperature, humidity, or moisture leaves the [tolerance band]',
    response: 'Restore the controlled environment before the stock is set back.',
    rationale:
      'Young propagation is unforgiving of swings; a brief excursion outside the band can lose weeks of growth the host system was relying on.',
    feeds: ['Built Infrastructure', 'Plants'],
  },
];
