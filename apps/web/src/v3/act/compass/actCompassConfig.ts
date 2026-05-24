/**
 * actCompassConfig — derives the Stage Compass objectives for the Act stage
 * from existing Act constants, mirroring planCompassConfig / observeCompassConfig.
 * Segment ids/labels come from ACT_MODULES / ACT_MODULE_FULL_LABEL, each node is
 * an ACT_MODULE_GUIDANCE `how` step, the accent is ACT_MODULE_DOT, the icon is
 * the existing ACT_MODULE_ICON, and the pitfall is the module's pitfall.
 *
 * Net-new copy here is a short `summary` (right-panel body) per objective.
 * Everything else re-exports from the canonical Act sources so the wheel stays
 * in sync with the rest of Act.
 */

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

const SUMMARY: Record<ActModule, string> = {
  tracker:
    'Turn the costed, phased plan into live work — reconcile each phase task against the labour, capital, and materials actually available this window.',
  build:
    'Sequence construction water → access → structures and log spend against budget so no phase overruns the corpus that funds the next.',
  maintain:
    'Log breakages and run upkeep on a schedule so infrastructure failures arrive as feedback, not as cascading crises.',
  livestock:
    'Move the herd on observed forage recovery, not the calendar — tracking days-on, rest periods, and welfare so grazing builds soil rather than mining it.',
  harvest:
    'Record every pick against the long succession arc so replanting and gap-filling stay ahead of decline instead of chasing it.',
  review:
    'Keep an ongoing SWOT and live hazard plans so the steward steers by current reality, not the year-zero diagnosis.',
  network:
    'Keep the people-and-tech web legible — suppliers, buyers, advisers, helpers, and shared tools — so the project draws on its community.',
  schedule:
    'Align field tasks to weather and season so labour lands in the right window — the right job at the wrong time is wasted work.',
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

/** Canonical full objective set (all Act modules, default order). */
export const ACT_COMPASS_OBJECTIVES: readonly CompassObjective[] =
  ACT_MODULES.map((id, i) => buildObjective(id, i + 1));

export function actObjectiveById(id: ActModule): CompassObjective {
  const found = ACT_COMPASS_OBJECTIVES.find((o) => o.id === id);
  // ACT_COMPASS_OBJECTIVES is built from ACT_MODULES, so every valid ActModule
  // is present (and the array is never empty).
  return found ?? ACT_COMPASS_OBJECTIVES[0]!;
}
