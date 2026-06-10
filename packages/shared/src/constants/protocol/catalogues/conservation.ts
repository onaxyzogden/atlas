// catalogues/conservation.ts
//
// CONSERVATION primary protocol deltas - land managed primarily for ecological
// recovery and habitat, where the "yield" is biodiversity and ecosystem
// function. Baseline depth; thresholds stay as [tokens].

import type { StandardProtocolTemplate } from '../../../schemas/protocol/protocol.schema.js';

export const CONSERVATION_PRIMARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'cons-invasive-incursion',
    name: 'Invasive Species Incursion',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'conservation',
    stratumId: 's6-integration-design',
    severityTier: 'stop',
    condition: 'IF an invasive species is detected above [incursion threshold]',
    response: 'Contain and remove the incursion before it establishes.',
    rationale:
      'On conservation land an invasive caught early is a morning’s work; left to establish it can undo years of recovery.',
    feeds: ['Ecology', 'Plants'],
  },
  {
    id: 'cons-habitat-indicator-trend',
    name: 'Habitat Indicator Trend',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'conservation',
    stratumId: 's2-land-reading',
    objectiveId: 's2-ecology',
    severityTier: 'watch',
    condition: 'IF the [monitoring interval] arrives',
    response: 'Survey indicator species and habitat condition against the baseline.',
    rationale:
      'Recovery is invisible without measurement; an indicator cadence is the only way to know whether the land is actually healing.',
    feeds: ['Ecology', 'Animals'],
  },
  {
    id: 'cons-disturbance-event',
    name: 'Disturbance Event Response',
    type: 'judgment',
    source: 'primary',
    sourceTypeId: 'conservation',
    stratumId: 's4-foundation-decisions',
    severityTier: 'respond',
    condition: 'IF a disturbance event (fire, flood, illegal access) affects the protected area',
    response: 'Assess habitat impact and protect the recovery trajectory.',
    rationale:
      'A single disturbance can reset a habitat’s succession; a standing response keeps a shock from becoming a setback.',
    feeds: ['Ecology', 'Risk & Compliance'],
  },
];
