/**
 * SEED_OBSERVATION_NEEDS — the client-side catalog of observation packages for
 * the sample project (`mtc`). Coordinates sit inside the MTC parcel boundary
 * (see `mockProject.ts`); titles mirror the design comps ("Revisit slope 12A
 * after rainfall", "Verify trail condition at River Bend", …). No backend —
 * this is the static half of the model; run state lives in
 * `observationNeedStore`. Every seed carries `origin: 'seed'` and a `reason`
 * explaining why it needs observing. No assignee, no due-date: who does the
 * work and when is an Act concern.
 */

import type { ObservationNeed } from './observationNeed.js';

export const SEED_OBSERVATION_NEEDS: ObservationNeed[] = [
  {
    id: 'obj-slope-12a-rainfall',
    projectId: 'mtc',
    stage: 'observe',
    module: 'topography',
    title: 'Revisit slope 12A after rainfall',
    description:
      'Inspect the runoff path and erosion points on slope 12A following the recent rainfall event.',
    target: { center: [-78.2, 44.4975], zoom: 16 },
    requiredTools: [
      'observe.topography.drainage-line',
      'observe.topography.contour-line',
      'observe.topography.high-point',
      'observe.topography.erosion-flag',
      'observe.topography.runoff-path',
    ],
    requiredLayers: ['topography', 'hydrology'],
    checklist: [
      { id: 'inspect-runoff', label: 'Inspect runoff path', required: true },
      { id: 'note-new-channels', label: 'Note any new channels', required: true },
      { id: 'identify-erosion', label: 'Identify erosion points', required: true },
      { id: 'overview-photos', label: 'Capture 2 overview photos', required: true },
      { id: 'closeup-photo', label: 'Capture 1 close-up of affected area', required: false },
    ],
    evidence: [
      { id: 'photos', kind: 'photo', label: 'Site photos', min: 3, required: true },
      { id: 'annotation', kind: 'annotation', label: 'Runoff annotation', min: 1, required: true },
      { id: 'summary', kind: 'note', label: 'Summary note', required: true },
    ],
    recordingRule: {
      requireAllRequiredChecklist: true,
      requireAllRequiredEvidence: true,
      requireSummary: true,
    },
    priority: 'high',
    origin: 'seed',
    reason:
      'Runoff and erosion on slope 12A may have shifted after the recent rainfall — recheck before the next storm.',
    trigger: 'Recheck after next rainfall',
    planImpact: 'possible',
  },
  {
    id: 'obj-trail-river-bend',
    projectId: 'mtc',
    stage: 'observe',
    module: 'built-environment',
    title: 'Verify trail condition at River Bend',
    description:
      'Confirm the route is passable, inspect signage and erosion, and log any access issues.',
    target: { center: [-78.19, 44.5], zoom: 16 },
    requiredTools: ['observe.built-environment.driveway', 'observe.human-context.access-road'],
    requiredLayers: ['built-environment'],
    checklist: [
      { id: 'route-passable', label: 'Confirm route path is still passable', required: true },
      { id: 'inspect-erosion', label: 'Inspect erosion points', required: true },
      { id: 'inspect-signage', label: 'Inspect signage condition', required: true },
      { id: 'checkpoint-photos', label: 'Record photo at 3 checkpoints', required: true },
      { id: 'log-access', label: 'Log access issues if present', required: false },
    ],
    evidence: [
      { id: 'photos', kind: 'photo', label: 'Checkpoint photos', min: 3, required: true },
      { id: 'route-confirm', kind: 'confirmation', label: 'Route passable confirmation', required: true },
      { id: 'summary', kind: 'note', label: 'Summary note', required: true },
    ],
    recordingRule: {
      requireAllRequiredChecklist: true,
      requireAllRequiredEvidence: true,
      requireSummary: true,
    },
    priority: 'medium',
    origin: 'seed',
    reason:
      'River Bend access has not been verified this season — confirm it is still passable for field work.',
  },
  {
    id: 'obj-interview-west-ridge',
    projectId: 'mtc',
    stage: 'observe',
    module: 'human-context',
    title: 'Interview neighbouring steward near West Ridge',
    description:
      'Record land-use notes, access concerns, and seasonal observations from the neighbour at West Ridge.',
    target: { center: [-78.206, 44.4989], zoom: 16 },
    requiredTools: [
      'observe.human-context.neighbour-pin',
      'observe.human-context.steward',
      'observe.human-context.access-road',
    ],
    requiredLayers: ['human-context'],
    checklist: [
      { id: 'confirm-identity', label: 'Confirm steward identity', required: true },
      { id: 'land-use-notes', label: 'Record key land-use notes', required: true },
      { id: 'access-concerns', label: 'Record access concerns', required: true },
      { id: 'seasonal-notes', label: 'Note seasonal observations shared', required: false },
      { id: 'tag-followup', label: 'Tag follow-up if needed', required: false },
    ],
    evidence: [
      { id: 'neighbour-pin', kind: 'annotation', label: 'Neighbour marker placed', min: 1, required: true },
      { id: 'summary', kind: 'note', label: 'Interview summary', required: true },
    ],
    recordingRule: {
      requireAllRequiredChecklist: true,
      requireAllRequiredEvidence: true,
      requireSummary: true,
    },
    priority: 'medium',
    origin: 'seed',
    reason:
      'The West Ridge neighbour holds undocumented land-use and access knowledge that affects boundary planning.',
  },
  {
    id: 'obj-photograph-east-gate',
    projectId: 'mtc',
    stage: 'observe',
    module: 'built-environment',
    title: 'Photograph east boundary gate',
    description: 'Document the condition of the east boundary gate and surrounding fence line.',
    target: { center: [-78.1938, 44.5014], zoom: 17 },
    requiredTools: ['observe.built-environment.gate', 'observe.built-environment.fence'],
    requiredLayers: ['built-environment'],
    checklist: [
      { id: 'photo-gate', label: 'Photograph the gate', required: true },
      { id: 'check-fence', label: 'Inspect adjoining fence line', required: true },
      { id: 'note-condition', label: 'Note any damage or repair needs', required: false },
    ],
    evidence: [
      { id: 'photos', kind: 'photo', label: 'Gate photos', min: 2, required: true },
    ],
    recordingRule: {
      requireAllRequiredChecklist: true,
      requireAllRequiredEvidence: true,
      requireSummary: false,
    },
    priority: 'low',
    origin: 'seed',
    reason:
      'The east boundary gate condition is undocumented — a photo record is needed for the infrastructure baseline.',
  },
  {
    id: 'obj-soil-sample-north-field',
    projectId: 'mtc',
    stage: 'observe',
    module: 'earth-water-ecology',
    title: 'Take soil samples in the north field',
    description: 'Collect soil samples at three points across the north field for the baseline test.',
    target: { center: [-78.2, 44.502], zoom: 16 },
    requiredTools: [
      'observe.earth-water-ecology.soil-sample',
      'observe.earth-water-ecology.vegetation',
    ],
    requiredLayers: ['earth-water-ecology'],
    checklist: [
      { id: 'sample-pt-1', label: 'Sample point 1', required: true },
      { id: 'sample-pt-2', label: 'Sample point 2', required: true },
      { id: 'sample-pt-3', label: 'Sample point 3', required: true },
      { id: 'label-bags', label: 'Label and bag samples', required: true },
    ],
    evidence: [
      { id: 'sample-markers', kind: 'annotation', label: 'Soil sample markers', min: 3, required: true },
      { id: 'photos', kind: 'photo', label: 'Field photos', min: 1, required: false },
      { id: 'summary', kind: 'note', label: 'Sampling notes', required: true },
    ],
    recordingRule: {
      requireAllRequiredChecklist: true,
      requireAllRequiredEvidence: true,
      requireSummary: true,
    },
    priority: 'high',
    origin: 'seed',
    reason:
      'No soil baseline exists for the north field — samples are needed before any planting decisions.',
    planImpact: 'possible',
  },
  {
    id: 'obj-watercourse-south-boundary',
    projectId: 'mtc',
    stage: 'observe',
    module: 'earth-water-ecology',
    title: 'Map watercourse along south boundary',
    description: 'Trace the watercourse running along the southern boundary and note flow direction.',
    target: { center: [-78.2, 44.4965], zoom: 16 },
    requiredTools: [
      'observe.earth-water-ecology.watercourse',
      'observe.topography.drainage-line',
    ],
    requiredLayers: ['earth-water-ecology', 'hydrology'],
    checklist: [
      { id: 'trace-course', label: 'Trace the watercourse path', required: true },
      { id: 'flow-direction', label: 'Note flow direction', required: true },
      { id: 'wet-points', label: 'Mark standing-water points', required: false },
    ],
    evidence: [
      { id: 'watercourse-line', kind: 'annotation', label: 'Watercourse line drawn', min: 1, required: true },
      { id: 'summary', kind: 'note', label: 'Hydrology notes', required: false },
    ],
    recordingRule: {
      requireAllRequiredChecklist: true,
      requireAllRequiredEvidence: true,
      requireSummary: false,
    },
    priority: 'medium',
    origin: 'seed',
    reason:
      'The south-boundary watercourse is unmapped — its flow path affects drainage and siting downstream.',
  },
  {
    id: 'obj-frost-pocket-low-corner',
    projectId: 'mtc',
    stage: 'observe',
    module: 'macroclimate-hazards',
    title: 'Flag frost pocket in the low corner',
    description: 'Mark the frost-prone low corner identified during the last cold snap.',
    target: { center: [-78.209, 44.497], zoom: 16 },
    requiredTools: [
      'observe.macroclimate-hazards.frost-pocket',
      'observe.macroclimate-hazards.hazard-zone',
    ],
    requiredLayers: ['macroclimate-hazards'],
    checklist: [
      { id: 'mark-pocket', label: 'Mark the frost pocket extent', required: true },
      { id: 'note-cause', label: 'Note the cold-air drainage cause', required: false },
    ],
    evidence: [
      { id: 'frost-marker', kind: 'annotation', label: 'Frost pocket marker', min: 1, required: true },
    ],
    recordingRule: {
      requireAllRequiredChecklist: true,
      requireAllRequiredEvidence: true,
      requireSummary: false,
    },
    priority: 'low',
    origin: 'seed',
    reason:
      'A frost pocket spotted during the last cold snap needs marking so siting avoids the cold-air sink.',
  },
  {
    id: 'obj-sun-sector-orchard',
    projectId: 'mtc',
    stage: 'observe',
    module: 'sectors-zones',
    title: 'Record summer sun sector over the orchard site',
    description: 'Capture the summer sun arc across the proposed orchard area for siting.',
    target: { center: [-78.204, 44.5025], zoom: 16 },
    requiredTools: [
      'observe.sectors-zones.sun-summer',
      'observe.sectors-zones.view',
    ],
    requiredLayers: ['sectors-zones'],
    checklist: [
      { id: 'sun-arc', label: 'Draw the summer sun arc', required: true },
      { id: 'shade-points', label: 'Note shading from tree line', required: false },
    ],
    evidence: [
      { id: 'sun-sector', kind: 'annotation', label: 'Sun sector drawn', min: 1, required: true },
      { id: 'photos', kind: 'photo', label: 'Site photo', min: 1, required: false },
    ],
    recordingRule: {
      requireAllRequiredChecklist: true,
      requireAllRequiredEvidence: true,
      requireSummary: false,
    },
    priority: 'low',
    origin: 'seed',
    reason:
      'The summer sun arc over the proposed orchard is unrecorded — needed to site rows for light exposure.',
  },
];

/** Observation needs scoped to one project. */
export function seedObservationNeedsForProject(projectId: string): ObservationNeed[] {
  return SEED_OBSERVATION_NEEDS.filter((n) => n.projectId === projectId);
}
