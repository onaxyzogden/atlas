// catalogues/agritourism.ts
//
// AGRITOURISM protocol deltas - inviting the public onto a working landscape
// for stays, visits, and experiences. The defining risks are visitor safety,
// host-system disturbance, and (on the sales side) the Amanah caution on
// advance sale of experiences not yet delivered. Baseline depth.

import type { StandardProtocolTemplate } from '../../../schemas/protocol/protocol.schema.js';

/**
 * Amanah caution carried VERBATIM on advance-sale protocols. Selling an
 * experience or yield not yet in hand risks bayʿ mā laysa ʿindak (the sale of
 * what one does not yet possess). Never stripped or reworded.
 */
const ADVANCE_SALE_SCOPE_NOTE =
  'Amanah caution: pre-selling an experience tied to a future harvest or an as-yet-undelivered season risks bayʿ mā laysa ʿindak (the sale of what one does not yet possess). A booking for a defined, deliverable service on a set date is ordinarily sound; a subscription to "this year’s harvest experience" before it exists is not. Permitted alternatives: charitable donation, restricted donation, qard ḥasan (interest-free loan), in-kind contribution, sponsorship. Review under the Amanah gate before committing.';

export const AGRITOURISM_PRIMARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'agri-visitor-safety-check',
    name: 'Visitor Safety Check',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'agritourism',
    stratumId: 's5-system-design',
    severityTier: 'stop',
    condition: 'IF a public-access period opens OR the [safety inspection cadence] arrives',
    response: 'Inspect visitor areas, signage, and hazards before the public arrives.',
    rationale:
      'Inviting the public onto a working farm imports duty-of-care risk that field-only operations never carry; the inspection is non-negotiable.',
    feeds: ['Risk & Compliance', 'People & Governance'],
  },
  {
    id: 'agri-visitor-load-disturbance',
    name: 'Visitor Load Disturbance',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'agritourism',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF visitor numbers exceed the [carrying capacity] of a sensitive area',
    response: 'Cap or redirect access to protect the land and the host operation.',
    rationale:
      'Agritourism only works while the working landscape stays healthy; unmanaged footfall degrades the very thing visitors came to see.',
    feeds: ['Ecology', 'Animals'],
  },
  {
    id: 'agri-biosecurity-visitor',
    name: 'Visitor Biosecurity',
    type: 'judgment',
    source: 'primary',
    sourceTypeId: 'agritourism',
    stratumId: 's4-foundation-decisions',
    severityTier: 'respond',
    condition: 'IF visitors will contact livestock, soil, or planting areas',
    response: 'Apply biosecurity measures (hygiene, route control) before contact.',
    rationale:
      'Visitors carry disease vectors between farms; a biosecurity protocol protects the host stock and crop from imported pathogens.',
    feeds: ['Animals', 'Risk & Compliance'],
  },
  {
    id: 'agri-experience-presale',
    name: 'Experience Pre-Sale Review',
    type: 'judgment',
    source: 'primary',
    sourceTypeId: 'agritourism',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'respond',
    condition: 'IF an experience tied to a future season is offered for advance purchase',
    response: 'Review the offer against the Amanah gate before selling it.',
    rationale:
      'Advance-sold seasonal experiences blur into selling what does not yet exist; a standing review keeps the revenue model halal.',
    feeds: ['Economics', 'Risk & Compliance'],
    scopeNotes: ADVANCE_SALE_SCOPE_NOTE,
  },
];

export const AGRITOURISM_SECONDARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'agri2-host-disturbance-window',
    name: 'Host Operation Disturbance Window',
    type: 'judgment',
    source: 'secondary',
    sourceTypeId: 'agritourism',
    stratumId: 's6-integration-design',
    severityTier: 'watch',
    condition: 'IF visitor activity coincides with a sensitive host-operation window (e.g. calving, harvest)',
    response: 'Restrict or reschedule visitor access around the host’s critical windows.',
    rationale:
      'Bolted onto a working operation, agritourism can put visitors in the way of exactly the moments the host can least afford disturbance.',
    feeds: ['Animals', 'People & Governance'],
  },
];
