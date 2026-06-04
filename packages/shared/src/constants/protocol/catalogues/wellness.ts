// catalogues/wellness.ts
//
// WELLNESS protocol deltas - a landscape hosting retreat, therapy, or
// restorative experiences. Defining risks are guest safety/wellbeing, sanctuary
// quietude, and the integrity of the restorative setting. Baseline depth.

import type { StandardProtocolTemplate } from '../../../schemas/protocol/protocol.schema.js';

export const WELLNESS_PRIMARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'well-guest-safety-wellbeing',
    name: 'Guest Safety & Wellbeing',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'wellness',
    stratumId: 's5-system-design',
    severityTier: 'stop',
    condition: 'IF a guest stay or session begins',
    response: 'Confirm safety, accessibility, and wellbeing provisions before guests arrive.',
    rationale:
      'Guests come to a wellness site vulnerable and trusting; their safety and wellbeing gate the experience absolutely.',
    feeds: ['Risk & Compliance', 'People & Governance'],
  },
  {
    id: 'well-sanctuary-quietude',
    name: 'Sanctuary Quietude',
    type: 'judgment',
    source: 'primary',
    sourceTypeId: 'wellness',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF noise, works, or operations intrude on the restorative setting',
    response: 'Reschedule or buffer the disturbance to protect the sanctuary.',
    rationale:
      'The restorative quality IS the product here; a disturbance that would be trivial elsewhere directly degrades what guests came for.',
    feeds: ['People & Governance', 'Ecology'],
  },
  {
    id: 'well-setting-integrity',
    name: 'Restorative Setting Integrity',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'wellness',
    stratumId: 's6-integration-design',
    severityTier: 'watch',
    condition: 'IF the [setting review cadence] arrives',
    response: 'Review the gardens, trails, and spaces against the intended restorative standard.',
    rationale:
      'A restorative landscape decays gradually and invisibly; a cadence keeps the setting at the standard the experience promises.',
    feeds: ['Plants', 'Built Infrastructure'],
  },
];

export const WELLNESS_SECONDARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'well2-guest-operation-buffer',
    name: 'Guest / Operation Buffer',
    type: 'judgment',
    source: 'secondary',
    sourceTypeId: 'wellness',
    stratumId: 's6-integration-design',
    severityTier: 'watch',
    condition: 'IF host-system operations (machinery, livestock work) coincide with guest presence',
    response: 'Buffer guest areas and timing from the working operation.',
    rationale:
      'Layered onto a working landscape, wellness guests and farm operations need separating so neither degrades the other.',
    feeds: ['People & Governance', 'Risk & Compliance'],
  },
];
