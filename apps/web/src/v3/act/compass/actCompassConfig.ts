/**
 * actCompassConfig — derives the Stage Compass objectives for the Act stage
 * from existing Act constants (slice 3b+3c: rebased onto UniversalDomain).
 * Segment ids/labels come from ACT_MODULES (= the 16 universal domains),
 * each node is an ACT_MODULE_GUIDANCE `how` step, the accent is
 * ACT_MODULE_DOT, the icon is ACT_MODULE_ICON, and the pitfall is the
 * domain's pitfall.
 *
 * Net-new copy: a short `summary` per domain — first-wins from the legacy
 * stage-local map via ACT_MODULE_TO_DOMAIN; unauthored domains fall back
 * to empty summary. Collision domains (built-infrastructure,
 * monitoring-records) pick the canonical-first legacy module's summary.
 */

import type { UniversalDomain } from '@ogden/shared';
import {
  ACT_MODULES,
  ACT_MODULE_FULL_LABEL,
  ACT_MODULE_ICON,
  type ActModule,
} from '../types.js';
import { ACT_MODULE_DOT } from '../data/actModulePalette.js';
import { ACT_MODULE_GUIDANCE } from '../data/actModuleGuidance.js';
import type { CompassObjective } from '../../compass/compassTypes.js';

// Re-export the shared shapes so existing importers of this module keep working.
export type { CompassNode, CompassObjective } from '../../compass/compassTypes.js';

const SUMMARY: Record<UniversalDomain, string> = {
  'vision-intent':        '',
  'land-base':            '',
  'climate':              '',
  'topography':           '',
  'hydrology':            '',
  'soil':                 '',
  'ecology':              '',
  'plants-food':
    'Record every pick against the long succession arc so replanting and gap-filling stay ahead of decline instead of chasing it.',
  'animals-livestock':
    'Move the herd on observed forage recovery, not the calendar — tracking days-on, rest periods, and welfare so grazing builds soil rather than mining it.',
  'built-infrastructure':
    'Sequence construction water → access → structures and log spend against budget so no phase overruns the corpus that funds the next.',
  'access-circulation':   '',
  'energy-resources':     '',
  'people-governance':
    'Keep the people-and-tech web legible — suppliers, buyers, advisers, helpers, and shared tools — so the project draws on its community.',
  'economics-capacity':
    'Align field tasks to weather and season so labour lands in the right window — the right job at the wrong time is wasted work.',
  'risk-compliance':      '',
  'monitoring-records':
    'Turn the costed, phased plan into live work — reconcile each phase task against the labour, capital, and materials actually available this window.',
};

function buildObjective(id: ActModule, ordinal: number): CompassObjective {
  return {
    id,
    ordinal,
    label: ACT_MODULE_FULL_LABEL[id],
    icon: ACT_MODULE_ICON[id],
    accent: ACT_MODULE_DOT[id],
    summary: SUMMARY[id],
    nodes: ACT_MODULE_GUIDANCE[id].how.map((label, index) => ({
      index,
      label,
    })),
    pitfall: ACT_MODULE_GUIDANCE[id].pitfall,
  };
}

/** Canonical full objective set (all 16 domains, canonical order). */
export const ACT_COMPASS_OBJECTIVES: readonly CompassObjective[] =
  ACT_MODULES.map((id, i) => buildObjective(id, i + 1));

export function actObjectiveById(id: ActModule): CompassObjective {
  const found = ACT_COMPASS_OBJECTIVES.find((o) => o.id === id);
  // ACT_COMPASS_OBJECTIVES is built from ACT_MODULES, so every valid domain
  // is present (and the array is never empty).
  return found ?? ACT_COMPASS_OBJECTIVES[0]!;
}
