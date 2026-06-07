// catalogues/index.ts
//
// Catalogue registry - the single place that knows which primary and secondary
// project types are encoded (OLOS Project-Type + Secondary-Layer Spec v1.2).
// The resolver and Act label lookups go through this file; fanning out a new
// catalogue means adding it here and nowhere else.
//
// Currently encoded: regenerative_farm (primary, anchor v1.3), ecovillage
// (primary, v1.2), agritourism (primary, v1.0), wellness (primary, v1.0),
// silvopasture (primary, v1.0), orchard_food_forest (primary, v1.0), and
// homestead (primary, v1.1 - 15 primary objectives, no base secondary layer),
// education (primary, v1.0 - 22 primary objectives, no base secondary layer),
// conservation (primary, v1.0 - 30 primary objectives, no base secondary layer),
// market_garden (primary, v1.0 - 24 primary objectives, no base secondary layer),
// off_grid (primary, v1.0 - 27 primary objectives, no base secondary layer), and
// livestock_operation (primary, v1.0 - 23 primary objectives; added 2026-06-03,
// the dedicated home for the 6 livestock/grazing formula ids - distinct from
// silvopasture, which integrates trees + forage + livestock; PLUS a secondary
// layer added 2026-06-03: 7 additive + 3 universal patches, the standalone
// animal enterprise folded onto a host primary) on the primary side; residential
// (secondary, v1.0) and wellness (secondary, authored
// overlay per the 2026-05-30 derive+author ruling) on the secondary side. Every
// other primary resolves to the universal-only baseline; every other secondary
// returns undefined (nothing to layer). agritourism canBeSecondary in the
// taxonomy, but its catalogue doc carries only a primary layer - no secondary
// spec yet. The Nursery secondary (8 additive, no patches) is encoded verbatim
// from the operator docx; the Silvopasture secondary (5 additive + 3 universal
// patches) and the Orchard secondary (5 additive + 4 universal patches incl.
// pollinator) are DERIVED under the operator's scoped 2026-05-31 "spec +
// expertise" authorization. The primary-sourced universal-augmentation patches
// remain pending an operator source file (no primary->universal seam yet).

import type {
  PatchRecord,
  PlanStratumObjective,
} from '../../../schemas/plan/planStratumObjective.schema.js';
import type { ProjectTypeId } from '../../../schemas/plan/projectTypeTaxonomy.schema.js';
import { UNIVERSAL_PLAN_OBJECTIVES, findUniversalObjective } from './universal.js';
import { REGEN_FARM_PRIMARY_OBJECTIVES } from './regenFarm.js';
import { ECOVILLAGE_PRIMARY_OBJECTIVES } from './ecovillage.js';
import { AGRITOURISM_PRIMARY_OBJECTIVES } from './agritourism.js';
import {
  RESIDENTIAL_ADDITIVE_OBJECTIVES,
  RESIDENTIAL_PATCHES,
} from './residential.js';
import {
  WELLNESS_PRIMARY_OBJECTIVES,
  WELLNESS_SECONDARY_OBJECTIVES,
} from './wellness.js';
import {
  SILVOPASTURE_PRIMARY_OBJECTIVES,
  SILVOPASTURE_SECONDARY_OBJECTIVES,
  SILVOPASTURE_SECONDARY_PATCHES,
} from './silvopasture.js';
import {
  ORCHARD_PRIMARY_OBJECTIVES,
  ORCHARD_SECONDARY_OBJECTIVES,
  ORCHARD_SECONDARY_PATCHES,
} from './orchard.js';
import { NURSERY_SECONDARY_OBJECTIVES } from './nursery.js';
import { HOMESTEAD_PRIMARY_OBJECTIVES } from './homestead.js';
import { EDUCATION_PRIMARY_OBJECTIVES } from './education.js';
import { CONSERVATION_PRIMARY_OBJECTIVES } from './conservation.js';
import { MARKET_GARDEN_PRIMARY_OBJECTIVES } from './marketGarden.js';
import { OFF_GRID_PRIMARY_OBJECTIVES } from './offGrid.js';
import {
  LIVESTOCK_PRIMARY_OBJECTIVES,
  LIVESTOCK_SECONDARY_OBJECTIVES,
  LIVESTOCK_SECONDARY_PATCHES,
} from './livestockOperation.js';

export {
  UNIVERSAL_PLAN_OBJECTIVES,
  findUniversalObjective,
  REGEN_FARM_PRIMARY_OBJECTIVES,
  ECOVILLAGE_PRIMARY_OBJECTIVES,
  AGRITOURISM_PRIMARY_OBJECTIVES,
  RESIDENTIAL_ADDITIVE_OBJECTIVES,
  RESIDENTIAL_PATCHES,
  WELLNESS_PRIMARY_OBJECTIVES,
  WELLNESS_SECONDARY_OBJECTIVES,
  SILVOPASTURE_PRIMARY_OBJECTIVES,
  SILVOPASTURE_SECONDARY_OBJECTIVES,
  SILVOPASTURE_SECONDARY_PATCHES,
  ORCHARD_PRIMARY_OBJECTIVES,
  ORCHARD_SECONDARY_OBJECTIVES,
  ORCHARD_SECONDARY_PATCHES,
  NURSERY_SECONDARY_OBJECTIVES,
  HOMESTEAD_PRIMARY_OBJECTIVES,
  EDUCATION_PRIMARY_OBJECTIVES,
  CONSERVATION_PRIMARY_OBJECTIVES,
  MARKET_GARDEN_PRIMARY_OBJECTIVES,
  OFF_GRID_PRIMARY_OBJECTIVES,
  LIVESTOCK_PRIMARY_OBJECTIVES,
  LIVESTOCK_SECONDARY_OBJECTIVES,
  LIVESTOCK_SECONDARY_PATCHES,
};

/** The universal baseline plus a primary type's own objectives. */
export interface PrimaryCatalogue {
  /** The 19 universal objectives, shared by every project. */
  universal: readonly PlanStratumObjective[];
  /** The primary type's own objectives (empty for not-yet-encoded types). */
  primary: readonly PlanStratumObjective[];
}

/** A secondary type's additive objectives plus its modifying patch records. */
export interface SecondaryCatalogue {
  additive: readonly PlanStratumObjective[];
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
  const primary: readonly PlanStratumObjective[] =
    primaryTypeId === 'regenerative_farm'
      ? REGEN_FARM_PRIMARY_OBJECTIVES
      : primaryTypeId === 'ecovillage'
        ? ECOVILLAGE_PRIMARY_OBJECTIVES
        : primaryTypeId === 'agritourism'
          ? AGRITOURISM_PRIMARY_OBJECTIVES
          : primaryTypeId === 'wellness'
            ? WELLNESS_PRIMARY_OBJECTIVES
            : primaryTypeId === 'silvopasture'
              ? SILVOPASTURE_PRIMARY_OBJECTIVES
              : primaryTypeId === 'orchard_food_forest'
                ? ORCHARD_PRIMARY_OBJECTIVES
                : primaryTypeId === 'homestead'
                  ? HOMESTEAD_PRIMARY_OBJECTIVES
                  : primaryTypeId === 'education'
                    ? EDUCATION_PRIMARY_OBJECTIVES
                    : primaryTypeId === 'conservation'
                      ? CONSERVATION_PRIMARY_OBJECTIVES
                      : primaryTypeId === 'market_garden'
                        ? MARKET_GARDEN_PRIMARY_OBJECTIVES
                        : primaryTypeId === 'off_grid'
                          ? OFF_GRID_PRIMARY_OBJECTIVES
                          : primaryTypeId === 'livestock_operation'
                            ? LIVESTOCK_PRIMARY_OBJECTIVES
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
  if (secondaryTypeId === 'wellness') {
    return {
      additive: WELLNESS_SECONDARY_OBJECTIVES,
      patches: [],
    };
  }
  if (secondaryTypeId === 'nursery') {
    return {
      additive: NURSERY_SECONDARY_OBJECTIVES,
      patches: [],
    };
  }
  if (secondaryTypeId === 'silvopasture') {
    return {
      additive: SILVOPASTURE_SECONDARY_OBJECTIVES,
      patches: SILVOPASTURE_SECONDARY_PATCHES,
    };
  }
  if (secondaryTypeId === 'orchard_food_forest') {
    return {
      additive: ORCHARD_SECONDARY_OBJECTIVES,
      patches: ORCHARD_SECONDARY_PATCHES,
    };
  }
  if (secondaryTypeId === 'livestock_operation') {
    return {
      additive: LIVESTOCK_SECONDARY_OBJECTIVES,
      patches: LIVESTOCK_SECONDARY_PATCHES,
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

const ALL_CATALOGUE_OBJECTIVES: readonly PlanStratumObjective[] = (() => {
  const byId = new Map<string, PlanStratumObjective>();
  for (const o of [
    ...UNIVERSAL_PLAN_OBJECTIVES,
    ...REGEN_FARM_PRIMARY_OBJECTIVES,
    ...ECOVILLAGE_PRIMARY_OBJECTIVES,
    ...AGRITOURISM_PRIMARY_OBJECTIVES,
    ...RESIDENTIAL_ADDITIVE_OBJECTIVES,
    ...WELLNESS_PRIMARY_OBJECTIVES,
    ...WELLNESS_SECONDARY_OBJECTIVES,
    ...NURSERY_SECONDARY_OBJECTIVES,
    ...SILVOPASTURE_PRIMARY_OBJECTIVES,
    ...SILVOPASTURE_SECONDARY_OBJECTIVES,
    ...ORCHARD_PRIMARY_OBJECTIVES,
    ...ORCHARD_SECONDARY_OBJECTIVES,
    ...HOMESTEAD_PRIMARY_OBJECTIVES,
    ...EDUCATION_PRIMARY_OBJECTIVES,
    ...CONSERVATION_PRIMARY_OBJECTIVES,
    ...MARKET_GARDEN_PRIMARY_OBJECTIVES,
    ...OFF_GRID_PRIMARY_OBJECTIVES,
    ...LIVESTOCK_PRIMARY_OBJECTIVES,
    ...LIVESTOCK_SECONDARY_OBJECTIVES,
  ]) {
    if (!byId.has(o.id)) byId.set(o.id, o);
  }
  return [...byId.values()];
})();

/** Every standalone objective across all encoded catalogues, de-duplicated by id. */
export function allCatalogueObjectives(): readonly PlanStratumObjective[] {
  return ALL_CATALOGUE_OBJECTIVES;
}

const ALL_CATALOGUE_OBJECTIVES_BY_ID: ReadonlyMap<string, PlanStratumObjective> =
  new Map(ALL_CATALOGUE_OBJECTIVES.map((o) => [o.id, o]));

/**
 * Find an objective by id across all encoded catalogues. Used by Act to resolve
 * a title without a project context. Returns undefined for ids that only exist
 * as patch-injected checklist items or in not-yet-encoded catalogues.
 */
export function findObjectiveAcrossCatalogues(
  id: string,
): PlanStratumObjective | undefined {
  return ALL_CATALOGUE_OBJECTIVES_BY_ID.get(id);
}
