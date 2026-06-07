// catalogues/ecovillage.ts
//
// ECOVILLAGE primary protocol deltas - a residential community sharing land,
// systems, and governance. The defining risks are social and shared-resource,
// not agronomic. Baseline depth; thresholds stay as [tokens].

import type { StandardProtocolTemplate } from '../../../schemas/protocol/protocol.schema.js';

export const ECOVILLAGE_PRIMARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'eco-governance-decision-cadence',
    name: 'Governance Decision Cadence',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'ecovillage',
    stratumId: 's1-project-foundation',
    severityTier: 'respond',
    condition: 'IF the [governance review cadence] arrives OR an unresolved dispute is open past [window]',
    response: 'Convene the agreed decision process and resolve or escalate the open matters.',
    rationale:
      'A community fails on unmade decisions long before it fails on land; a standing cadence keeps governance from silently stalling.',
    feeds: ['People & Governance'],
  },
  {
    id: 'eco-shared-resource-load',
    name: 'Shared Resource Load',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'ecovillage',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF shared water, energy, or waste capacity approaches [load ceiling]',
    response: 'Review demand and shared-system capacity before the limit is hit.',
    rationale:
      'Shared infrastructure sized for a smaller community fails for everyone at once; the ceiling is a community-level threshold to act on early.',
    feeds: ['Hydrology', 'Energy & Resources'],
  },
  {
    id: 'eco-common-land-stewardship',
    name: 'Common Land Stewardship',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'ecovillage',
    stratumId: 's6-integration-design',
    severityTier: 'watch',
    condition: 'IF the [commons review cadence] arrives',
    response: 'Review care of the shared land against the agreed stewardship standard.',
    rationale:
      'The commons is everyone’s and so easily no one’s; a cadence assigns the care that diffuse ownership tends to drop.',
    feeds: ['Ecology', 'People & Governance'],
  },
  {
    id: 'eco-member-capacity-balance',
    name: 'Member Contribution Balance',
    type: 'judgment',
    source: 'primary',
    sourceTypeId: 'ecovillage',
    stratumId: 's1-project-foundation',
    severityTier: 'watch',
    condition: 'IF contribution load becomes unevenly distributed across members',
    response: 'Review roles and contribution agreements to restore a fair balance.',
    rationale:
      'Resentment over uneven effort is the quiet dissolver of intentional communities; surfacing it early keeps the covenant intact.',
    feeds: ['People & Governance'],
  },
];
