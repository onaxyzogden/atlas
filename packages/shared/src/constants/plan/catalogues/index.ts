// catalogues/index.ts
//
// Catalogue registry - the single place that knows which primary and secondary
// project types are encoded (OLOS Project-Type + Secondary-Layer Spec v1.2).
// The resolver and Act label lookups go through this file; fanning out a new
// catalogue means adding it here and nowhere else.
//
// Currently encoded: regenerative_farm (primary, anchor v1.3) and ecovillage
// (primary, v1.2) on the primary side; residential (secondary, v1.0) on the
// secondary side. Every other primary resolves to the universal-only baseline;
// every other secondary returns undefined (nothing to layer).

import type {
  PatchRecord,
  PlanTierObjective,
} from '../../../schemas/plan/planTierObjective.schema.js';
import type { ProjectTypeId } from '../../../schemas/plan/projectTypeTaxonomy.schema.js';
import { UNIVERSAL_PLAN_OBJECTIVES, findUniversalObjective } from './universal.js';
import { REGEN_FARM_PRIMARY_OBJECTIVES } from './regenFarm.js';
import { ECOVILLAGE_PRIMARY_OBJECTIVES } from './ecovillage.js';
import {
  RESIDENTIAL_ADDITIVE_OBJECTIVES,
  RESIDENTIAL_PATCHES,
} from './residential.js';

export {
  UNIVERSAL_PLAN_OBJECTIVES,
  findUniversalObjective,
  REGEN_FARM_PRIMARY_OBJECTIVES,
  ECOVILLAGE_PRIMARY_OBJECTIVES,
  RESIDENTIAL_ADDITIVE_OBJECTIVES,
  RESIDENTIAL_PATCHES,
};

/** The universal baseline plus a primary type's own objectives. */
export interface PrimaryCatalogue {
  /** The 19 universal objectives, shared by every project. */
  universal: readonly PlanTierObjective[];
  /** The primary type's own objectives (empty for not-yet-encoded types). */
  primary: readonly PlanTierObjective[];
}

/** A secondary type's additive objectives plus its modifying patch records. */
export interface SecondaryCatalogue {
  additive: readonly PlanTierObjective[];
  patches: readonly PatchRecord[];
}

/**
 * Resolve the primary-layer catalogue for a primary type. Always returns the
 * universal baseline; `primary` is the type's own objectives when encoded, else
 * an empty list (the type renders universal-only).
 */
export function getPrimaryCatalogue(
  primaryTypeId: ProjectTypeId,
): PrimaryCatalogue {
  const primary: readonly PlanTierObjective[] =
    primaryTypeId === 'regenerative_farm'
      ? REGEN_FARM_PRIMARY_OBJECTIVES
      : primaryTypeId === 'ecovillage'
        ? ECOVILLAGE_PRIMARY_OBJECTIVES
        : [];
  return { universal: UNIVERSAL_PLAN_OBJECTIVES, primary };
}

/**
 * Resolve the secondary-layer catalogue for a secondary type, or `undefined`
 * when the type is not yet encoded (the resolver then layers nothing for it).
 */
export function getSecondaryCatalogue(
  secondaryTypeId: ProjectTypeId,
): SecondaryCatalogue | undefined {
  if (secondaryTypeId === 'residential') {
    return {
      additive: RESIDENTIAL_ADDITIVE_OBJECTIVES,
      patches: RESIDENTIAL_PATCHES,
    };
  }
  return undefined;
}

// --- Cross-catalogue union lookup (Act label resolution, Sub-slice D cat. C) --
// Act surfaces an objective title from just an id, without knowing the project
// type. This union covers every standalone objective in every encoded
// catalogue (universal + all primaries + all secondary additive). Patch-
// injected items are not standalone objectives - they live inside their target
// objective's checklist in the resolved set - so they are intentionally absent.

const ALL_CATALOGUE_OBJECTIVES: readonly PlanTierObjective[] = (() => {
  const byId = new Map<string, PlanTierObjective>();
  for (const o of [
    ...UNIVERSAL_PLAN_OBJECTIVES,
    ...REGEN_FARM_PRIMARY_OBJECTIVES,
    ...ECOVILLAGE_PRIMARY_OBJECTIVES,
    ...RESIDENTIAL_ADDITIVE_OBJECTIVES,
  ]) {
    if (!byId.has(o.id)) byId.set(o.id, o);
  }
  return [...byId.values()];
})();

/** Every standalone objective across all encoded catalogues, de-duplicated by id. */
export function allCatalogueObjectives(): readonly PlanTierObjective[] {
  return ALL_CATALOGUE_OBJECTIVES;
}

const ALL_CATALOGUE_OBJECTIVES_BY_ID: ReadonlyMap<string, PlanTierObjective> =
  new Map(ALL_CATALOGUE_OBJECTIVES.map((o) => [o.id, o]));

/**
 * Find an objective by id across all encoded catalogues. Used by Act to resolve
 * a title without a project context. Returns undefined for ids that only exist
 * as patch-injected checklist items or in not-yet-encoded catalogues.
 */
export function findObjectiveAcrossCatalogues(
  id: string,
): PlanTierObjective | undefined {
  return ALL_CATALOGUE_OBJECTIVES_BY_ID.get(id);
}
