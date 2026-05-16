/**
 * Goal Compass intervention catalog — assembled barrel.
 *
 * `SHARED_INTERVENTIONS` holds the 22 universal entries (untagged ⇒
 * eligible under every archetype — the legacy non-regressive baseline).
 * Each per-archetype module adds objects tagged
 * `projectTypes: ['<archetype>']`, which the sequencing engine's
 * eligibility filter restricts to runs under that archetype.
 *
 * Public API (`INTERVENTION_CATALOG`, `getIntervention`) is identical to
 * the pre-split `interventionCatalog.ts`, so every importer resolving
 * `'.../data/interventionCatalog.js'` is untouched (that file is now a
 * thin re-export of this barrel).
 */

import type { Intervention } from '../goalCompassTypes.js';
import { SHARED_INTERVENTIONS } from './_shared.js';
import { HOMESTEAD_INTERVENTIONS } from './homestead.js';
import { REGENERATIVE_FARM_INTERVENTIONS } from './regenerativeFarm.js';
import { RETREAT_INTERVENTIONS } from './retreat.js';
import { EDUCATION_INTERVENTIONS } from './education.js';
import { CONSERVATION_INTERVENTIONS } from './conservation.js';
import { MULTI_ENTERPRISE_INTERVENTIONS } from './multiEnterprise.js';

export const INTERVENTION_CATALOG: Intervention[] = [
  ...SHARED_INTERVENTIONS,
  ...HOMESTEAD_INTERVENTIONS,
  ...REGENERATIVE_FARM_INTERVENTIONS,
  ...RETREAT_INTERVENTIONS,
  ...EDUCATION_INTERVENTIONS,
  ...CONSERVATION_INTERVENTIONS,
  ...MULTI_ENTERPRISE_INTERVENTIONS,
];

export function getIntervention(id: string) {
  return INTERVENTION_CATALOG.find((i) => i.id === id) ?? null;
}
