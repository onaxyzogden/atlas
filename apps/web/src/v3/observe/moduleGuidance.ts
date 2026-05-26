/**
 * Observe module guidance — Permaculture-Scholar WHY/HOW/Pitfall copy + the
 * per-module dot palette, keyed by UniversalDomain (slice 3b+3c).
 *
 * Observe is collision-free (7 legacy modules → 7 distinct domains). The
 * remaining 9 unauthored domain cells ship with empty guidance + a neutral
 * fallback palette colour, accumulating as a content-authoring backlog.
 * See ADR 2026-05-26-atlas-universal-domain-step3-cutover.
 */

import type { GuidanceCardData } from '../_shared/components/GuidanceCard.js';
import type { UniversalDomain } from '@ogden/shared';

const EMPTY: GuidanceCardData = { why: '', how: [], pitfall: '' };
const FALLBACK_DOT = '#9CA3AF';

export const MODULE_GUIDANCE: Record<UniversalDomain, GuidanceCardData> = {
  'vision-intent':        EMPTY,
  'land-base':            EMPTY,
  'climate': {
    // ← macroclimate-hazards
    why: 'Catching and storing energy (Holmgren P2) requires first identifying major local forces, like fire and flood, that must be deflected to protect the site’s vitality (OSU PDC, Sectors/Hazards).',
    how: [
      'Outline low-lying areas where frost settles.',
      'Draw polygons over flood plains, fire corridors, or steep slide zones.',
    ],
    pitfall:
      'Don’t confuse broad macro-hazards with microclimates; hazards are extreme regional forces acting upon the site from the outside.',
  },
  'topography': {
    why: 'Water flows at right angles to contour, making landform the essential first step to creating a design structured around water abundance (OSU PDC, Matrix).',
    how: [
      'Pin the highest and lowest elevation points.',
      'Trace key contour lines across slopes.',
      'Draw drainage lines where water naturally collects and exits.',
    ],
    pitfall:
      'Don’t assume slopes are uniform; topography is infinitely varied, so track exact fall lines carefully.',
  },
  'hydrology': {
    // ← earth-water-ecology
    why: 'Designing for water and soil fertility creates the bones and digestive system of your site, transforming raw materials into a vibrant ecology (OSU PDC, Land Physician).',
    how: [
      'Draw lines for existing streams, swales, or ponds.',
      'Pin locations of soil test pits.',
      'Outline distinct ecological patches (e.g., mature forest, disturbed pasture).',
    ],
    pitfall:
      'Don’t forget the scales of landscape permanence; map water supplies before analyzing and altering soil.',
  },
  'soil':                 EMPTY,
  'ecology':              EMPTY,
  'plants-food':          EMPTY,
  'animals-livestock':    EMPTY,
  'built-infrastructure': {
    // ← built-environment
    why: 'Existing infrastructure shapes what design moves are even possible — a buried gas line vetoes earthworks across it, a strong well sets your irrigation budget, fence lines define livestock subdivision options.',
    how: [
      'Trace buildings and outbuildings.',
      'Mark wells (with depth/flow if known) and septic systems.',
      'Sketch power lines and buried utilities; walk the fence lines.',
      'Drop gates and trace existing driveways.',
    ],
    pitfall:
      'Don’t skip "invisible" assets — buried lines and utility easements bind the design more than visible structures.',
  },
  'access-circulation': {
    // ← sectors-zones
    why: 'Design from Patterns to Details (Holmgren P7) dictates mapping wild sector forces coming in, and zones of human use radiating out, so the design directly responds to them (OSU PDC, Sectors & Zones).',
    how: [
      'Drag wedges from outside the property inward to show sun, wind, and wildlife paths.',
      'Draw concentric polygons around the house based on daily-to-yearly maintenance frequency.',
    ],
    pitfall:
      'Don’t confuse zones (internal human effort/maintenance) with sectors (external wild energies flowing into the site).',
  },
  'energy-resources':     EMPTY,
  'people-governance': {
    // ← human-context
    why: 'Observe and Interact (Holmgren P1) begins with understanding the cultural, social, and economic climate of the human residents, who are the beating heart of the system (OSU PDC, Week 1).',
    how: [
      'Pin your primary dwelling or activity hub.',
      'Trace existing access roads and daily footpaths.',
      'Pin neighbour interfaces or public borders.',
    ],
    pitfall:
      'Do not design new paths yet; only map current existing human access and interaction.',
  },
  'economics-capacity':   EMPTY,
  'risk-compliance':      EMPTY,
  'monitoring-records': {
    // ← swot-synthesis
    why: 'Applying Self-Regulation and Accepting Feedback (Holmgren P4) requires an honest diagnosis of site conditions before prescribing a design treatment (OSU PDC, SWOT Analysis).',
    how: [
      'Tag specific site areas with Strengths (resources) or Weaknesses (degradation).',
      'Tag external borders with Opportunities (community) or Threats (pollution/development).',
    ],
    pitfall:
      'Don’t confuse internal factors (Strengths/Weaknesses on the land) with external ones (Opportunities/Threats from the outside).',
  },
};

/** Per-domain dot palette. First-wins from legacy via OBSERVE_MODULE_TO_DOMAIN;
 *  fallback `'#9CA3AF'` for unauthored cells. */
export const OBSERVE_MODULE_DOT: Record<UniversalDomain, string> = {
  'vision-intent':        FALLBACK_DOT,
  'land-base':            FALLBACK_DOT,
  'climate':              '#e6c34a', // ← macroclimate-hazards
  'topography':           '#8bd16a',
  'hydrology':            '#5fc7d4', // ← earth-water-ecology
  'soil':                 FALLBACK_DOT,
  'ecology':              FALLBACK_DOT,
  'plants-food':          FALLBACK_DOT,
  'animals-livestock':    FALLBACK_DOT,
  'built-infrastructure': '#8a8e94', // ← built-environment
  'access-circulation':   '#d68bd0', // ← sectors-zones
  'energy-resources':     FALLBACK_DOT,
  'people-governance':    '#5dd39e', // ← human-context
  'economics-capacity':   FALLBACK_DOT,
  'risk-compliance':      FALLBACK_DOT,
  'monitoring-records':   '#e88aa4', // ← swot-synthesis
};
