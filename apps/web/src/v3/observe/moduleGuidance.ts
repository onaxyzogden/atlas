/**
 * Observe module guidance — Permaculture-Scholar WHY/HOW/Pitfall copy + the
 * per-module dot palette, keyed by ObserveModule.
 *
 * Extracted from ObserveChecklistAside.tsx (2026-05-24) so non-rail surfaces
 * (the Stage Compass) can reuse the same grounded copy without importing
 * component code. ObserveChecklistAside re-imports from here — single source
 * of truth, no behavior change.
 *
 * Source: notebook 5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b, conversation
 * 48a34396-5525-4a57-9884-108d93b1872f, turn 1.
 */

import type { GuidanceCardData } from '../_shared/components/GuidanceCard.js';
import type { ObserveModule } from './types.js';

export const MODULE_GUIDANCE: Record<ObserveModule, GuidanceCardData> = {
  'human-context': {
    why: 'Observe and Interact (Holmgren P1) begins with understanding the cultural, social, and economic climate of the human residents, who are the beating heart of the system (OSU PDC, Week 1).',
    how: [
      'Pin your primary dwelling or activity hub.',
      'Trace existing access roads and daily footpaths.',
      'Pin neighbour interfaces or public borders.',
    ],
    pitfall:
      'Do not design new paths yet; only map current existing human access and interaction.',
  },
  'built-environment': {
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
  'macroclimate-hazards': {
    why: 'Catching and storing energy (Holmgren P2) requires first identifying major local forces, like fire and flood, that must be deflected to protect the site’s vitality (OSU PDC, Sectors/Hazards).',
    how: [
      'Outline low-lying areas where frost settles.',
      'Draw polygons over flood plains, fire corridors, or steep slide zones.',
    ],
    pitfall:
      'Don’t confuse broad macro-hazards with microclimates; hazards are extreme regional forces acting upon the site from the outside.',
  },
  topography: {
    why: 'Water flows at right angles to contour, making landform the essential first step to creating a design structured around water abundance (OSU PDC, Matrix).',
    how: [
      'Pin the highest and lowest elevation points.',
      'Trace key contour lines across slopes.',
      'Draw drainage lines where water naturally collects and exits.',
    ],
    pitfall:
      'Don’t assume slopes are uniform; topography is infinitely varied, so track exact fall lines carefully.',
  },
  'earth-water-ecology': {
    why: 'Designing for water and soil fertility creates the bones and digestive system of your site, transforming raw materials into a vibrant ecology (OSU PDC, Land Physician).',
    how: [
      'Draw lines for existing streams, swales, or ponds.',
      'Pin locations of soil test pits.',
      'Outline distinct ecological patches (e.g., mature forest, disturbed pasture).',
    ],
    pitfall:
      'Don’t forget the scales of landscape permanence; map water supplies before analyzing and altering soil.',
  },
  'sectors-zones': {
    why: 'Design from Patterns to Details (Holmgren P7) dictates mapping wild sector forces coming in, and zones of human use radiating out, so the design directly responds to them (OSU PDC, Sectors & Zones).',
    how: [
      'Drag wedges from outside the property inward to show sun, wind, and wildlife paths.',
      'Draw concentric polygons around the house based on daily-to-yearly maintenance frequency.',
    ],
    pitfall:
      'Don’t confuse zones (internal human effort/maintenance) with sectors (external wild energies flowing into the site).',
  },
  'swot-synthesis': {
    why: 'Applying Self-Regulation and Accepting Feedback (Holmgren P4) requires an honest diagnosis of site conditions before prescribing a design treatment (OSU PDC, SWOT Analysis).',
    how: [
      'Tag specific site areas with Strengths (resources) or Weaknesses (degradation).',
      'Tag external borders with Opportunities (community) or Threats (pollution/development).',
    ],
    pitfall:
      'Don’t confuse internal factors (Strengths/Weaknesses on the land) with external ones (Opportunities/Threats from the outside).',
  },
};

/** Per-module dot palette. Mirrors the legacy `[data-module='...']` rules
 *  formerly carried by ObserveChecklistAside.module.css. */
export const OBSERVE_MODULE_DOT: Record<ObserveModule, string> = {
  'human-context': '#5dd39e',
  'built-environment': '#8a8e94',
  'macroclimate-hazards': '#e6c34a',
  topography: '#8bd16a',
  'earth-water-ecology': '#5fc7d4',
  'sectors-zones': '#d68bd0',
  'swot-synthesis': '#e88aa4',
};
