// catalogues/residential.ts
//
// RESIDENTIAL protocol deltas - SECONDARY-ONLY (residential is not a valid
// primary land-project type; it layers a dwelling/living dimension onto a host
// such as homestead, off_grid, or ecovillage). No RESIDENTIAL_PRIMARY export.
// Baseline depth.

import type { StandardProtocolTemplate } from '../../../schemas/protocol/protocol.schema.js';

export const RESIDENTIAL_SECONDARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'res2-dwelling-water-safety',
    name: 'Dwelling Water Safety',
    type: 'judgment',
    source: 'secondary',
    sourceTypeId: 'residential',
    stratumId: 's2-land-reading',
    severityTier: 'respond',
    condition: 'IF the dwelling’s potable supply has not been tested in [test interval]',
    response: 'Test potable water and address any contamination before household use.',
    rationale:
      'A residential dimension adds people living on the land daily; their drinking water becomes a direct health dependency the host plan must cover.',
    feeds: ['Hydrology', 'Risk & Compliance'],
  },
  {
    id: 'res2-dwelling-livelihood-buffer',
    name: 'Dwelling / Operation Buffer',
    type: 'judgment',
    source: 'secondary',
    sourceTypeId: 'residential',
    stratumId: 's4-foundation-decisions',
    severityTier: 'watch',
    condition: 'IF host-system operations encroach on the dwelling’s safety or amenity',
    response: 'Maintain a buffer between living areas and the working operation.',
    rationale:
      'When people live amid a working landscape, sprays, machinery, and stock need a deliberate buffer from the home zone.',
    feeds: ['Built Infrastructure', 'Risk & Compliance'],
  },
  {
    id: 'res2-household-waste',
    name: 'Household Waste Management',
    type: 'threshold',
    source: 'secondary',
    sourceTypeId: 'residential',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF household waste or septic capacity approaches [capacity limit]',
    response: 'Service or divert the household waste system before overflow.',
    rationale:
      'A dwelling adds a continuous waste stream the host land must absorb; an overrun contaminates the very system it sits in.',
    feeds: ['Hydrology', 'Risk & Compliance'],
  },
];
