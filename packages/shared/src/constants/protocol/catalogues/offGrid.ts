// catalogues/offGrid.ts
//
// OFF-GRID primary protocol deltas - a site carrying its own power, water, and
// waste with no utility fallback. The defining risks are autonomous-system
// reserves and failure with no safety net. Baseline depth.

import type { StandardProtocolTemplate } from '../../../schemas/protocol/protocol.schema.js';

export const OFF_GRID_PRIMARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'og-battery-state-of-charge',
    name: 'Battery State of Charge',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'off_grid',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF battery state of charge falls below [reserve floor]',
    response: 'Shed non-essential load and confirm the generation or backup source.',
    rationale:
      'Off-grid there is no grid to draw on; the reserve floor is the line between managing load and losing power entirely.',
    feeds: ['Energy & Resources'],
  },
  {
    id: 'og-water-autonomy',
    name: 'Water Autonomy Reserve',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'off_grid',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF stored water falls below [autonomy days]',
    response: 'Switch to conservation use and secure resupply or catchment.',
    rationale:
      'With no mains connection, the stored-water buffer is the whole supply; falling through the floor is a self-reliance emergency.',
    feeds: ['Hydrology'],
  },
  {
    id: 'og-system-redundancy',
    name: 'Critical System Redundancy',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'off_grid',
    stratumId: 's4-foundation-decisions',
    severityTier: 'respond',
    condition: 'IF the [redundancy review cadence] arrives',
    response: 'Test backups for power, water, and heat so a single failure is never total.',
    rationale:
      'Off-grid resilience is redundancy; an untested backup is no backup, so the test must happen before the primary fails.',
    feeds: ['Energy & Resources', 'Built Infrastructure'],
  },
  {
    id: 'og-waste-system-capacity',
    name: 'Waste System Capacity',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'off_grid',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF on-site waste or greywater capacity approaches [capacity limit]',
    response: 'Service or divert the waste system before it overflows.',
    rationale:
      'Off-grid waste has nowhere external to go; an overrun becomes a contamination and health problem on your own land.',
    feeds: ['Hydrology', 'Risk & Compliance'],
  },
];
