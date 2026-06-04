// catalogues/education.ts
//
// EDUCATION protocol deltas - a landscape run as a teaching site (courses,
// school visits, demonstration). Defining risks are learner safety, demo-plot
// integrity, and curriculum-to-season alignment. Baseline depth.

import type { StandardProtocolTemplate } from '../../../schemas/protocol/protocol.schema.js';

export const EDUCATION_PRIMARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'edu-learner-safety',
    name: 'Learner Safety Check',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'education',
    stratumId: 's5-system-design',
    severityTier: 'stop',
    condition: 'IF a teaching session with learners on site is scheduled',
    response: 'Confirm supervision ratios, hazard control, and first-aid cover before learners arrive.',
    rationale:
      'A duty of care to learners — often children — sits above every teaching goal; the safety check gates the session.',
    feeds: ['Risk & Compliance', 'People & Governance'],
  },
  {
    id: 'edu-demo-plot-integrity',
    name: 'Demonstration Plot Integrity',
    type: 'judgment',
    source: 'primary',
    sourceTypeId: 'education',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF a demonstration plot degrades below a teachable standard',
    response: 'Restore the plot or adjust the curriculum so the lesson still holds.',
    rationale:
      'A demo plot teaches whether it is healthy or not; a failing one quietly teaches the wrong lesson unless it is caught and addressed.',
    feeds: ['Plants', 'Soil'],
  },
  {
    id: 'edu-curriculum-season-align',
    name: 'Curriculum / Season Alignment',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'education',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'watch',
    condition: 'IF the teaching calendar is set against the coming season',
    response: 'Align session topics with what the land will actually be doing.',
    rationale:
      'Land-based teaching lands only when the lesson matches the season; misalignment wastes the living curriculum the site provides.',
    feeds: ['People & Governance', 'Plants'],
  },
];

export const EDUCATION_SECONDARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'edu2-teaching-disturbance',
    name: 'Teaching Activity Disturbance',
    type: 'judgment',
    source: 'secondary',
    sourceTypeId: 'education',
    stratumId: 's6-integration-design',
    severityTier: 'watch',
    condition: 'IF teaching groups disturb sensitive host-system areas or operations',
    response: 'Route teaching activity away from the host’s sensitive zones and windows.',
    rationale:
      'Layered onto a working system, groups of learners can trample or interrupt exactly what the host most needs left alone.',
    feeds: ['Ecology', 'People & Governance'],
  },
];
