// protocol catalogues/index.ts
//
// Registry for the per-type protocol catalogue - the single place that knows
// which primary and secondary project types have encoded protocol deltas
// (mirrors constants/plan/catalogues/index.ts on the objective side). The
// resolveProjectProtocols engine goes through this file; adding a new per-type
// protocol catalogue means wiring it here and nowhere else.
//
// Every project gets the UNIVERSAL_PROTOCOL_TEMPLATES baseline (all 7 strata).
// A primary type adds its own protocols; a compatible secondary type adds
// additive protocols and/or patches that amend an existing protocol.

import type {
  ProtocolPatchRecord,
  StandardProtocolTemplate,
} from '../../../schemas/protocol/protocol.schema.js';
import type { ProjectTypeId } from '../../../schemas/plan/projectTypeTaxonomy.schema.js';
import { UNIVERSAL_PROTOCOL_TEMPLATES } from './universal.js';
import { HOMESTEAD_PRIMARY_PROTOCOLS } from './homestead.js';
import {
  SILVOPASTURE_PRIMARY_PROTOCOLS,
  SILVOPASTURE_SECONDARY_PROTOCOLS,
  SILVOPASTURE_SECONDARY_PATCHES,
} from './silvopasture.js';
import { REGEN_FARM_PRIMARY_PROTOCOLS } from './regenFarm.js';
import {
  MARKET_GARDEN_PRIMARY_PROTOCOLS,
  MARKET_GARDEN_SECONDARY_PROTOCOLS,
} from './marketGarden.js';
import {
  ORCHARD_PRIMARY_PROTOCOLS,
  ORCHARD_SECONDARY_PROTOCOLS,
} from './orchard.js';
import { ECOVILLAGE_PRIMARY_PROTOCOLS } from './ecovillage.js';
import {
  AGRITOURISM_PRIMARY_PROTOCOLS,
  AGRITOURISM_SECONDARY_PROTOCOLS,
} from './agritourism.js';
import {
  EDUCATION_PRIMARY_PROTOCOLS,
  EDUCATION_SECONDARY_PROTOCOLS,
} from './education.js';
import { CONSERVATION_PRIMARY_PROTOCOLS } from './conservation.js';
import { OFF_GRID_PRIMARY_PROTOCOLS } from './offGrid.js';
import {
  WELLNESS_PRIMARY_PROTOCOLS,
  WELLNESS_SECONDARY_PROTOCOLS,
} from './wellness.js';
import {
  NURSERY_PRIMARY_PROTOCOLS,
  NURSERY_SECONDARY_PROTOCOLS,
} from './nursery.js';
import {
  LIVESTOCK_PRIMARY_PROTOCOLS,
  LIVESTOCK_SECONDARY_PROTOCOLS,
} from './livestockOperation.js';
import { RESIDENTIAL_SECONDARY_PROTOCOLS } from './residential.js';

export { UNIVERSAL_PROTOCOL_TEMPLATES };

/** The universal baseline plus a primary type's own protocols. */
export interface PrimaryProtocolCatalogue {
  /** The universal protocols, shared by every project (all 7 strata). */
  universal: readonly StandardProtocolTemplate[];
  /** The primary type's own protocols (empty for not-yet-encoded types). */
  primary: readonly StandardProtocolTemplate[];
}

/** A secondary type's additive protocols plus its modifying patch records. */
export interface SecondaryProtocolCatalogue {
  additive: readonly StandardProtocolTemplate[];
  patches: readonly ProtocolPatchRecord[];
}

const EMPTY: readonly StandardProtocolTemplate[] = [];

/**
 * Resolve the primary-layer protocol catalogue for a primary type. Always
 * returns the universal baseline; `primary` is the type's own protocols when
 * encoded, else an empty list (the type runs universal-only).
 */
export function getPrimaryProtocolCatalogue(
  primaryTypeId: ProjectTypeId,
): PrimaryProtocolCatalogue {
  const primary: readonly StandardProtocolTemplate[] =
    primaryTypeId === 'homestead'
      ? HOMESTEAD_PRIMARY_PROTOCOLS
      : primaryTypeId === 'silvopasture'
        ? SILVOPASTURE_PRIMARY_PROTOCOLS
        : primaryTypeId === 'regenerative_farm'
          ? REGEN_FARM_PRIMARY_PROTOCOLS
          : primaryTypeId === 'market_garden'
            ? MARKET_GARDEN_PRIMARY_PROTOCOLS
            : primaryTypeId === 'orchard_food_forest'
              ? ORCHARD_PRIMARY_PROTOCOLS
              : primaryTypeId === 'ecovillage'
                ? ECOVILLAGE_PRIMARY_PROTOCOLS
                : primaryTypeId === 'agritourism'
                  ? AGRITOURISM_PRIMARY_PROTOCOLS
                  : primaryTypeId === 'education'
                    ? EDUCATION_PRIMARY_PROTOCOLS
                    : primaryTypeId === 'conservation'
                      ? CONSERVATION_PRIMARY_PROTOCOLS
                      : primaryTypeId === 'off_grid'
                        ? OFF_GRID_PRIMARY_PROTOCOLS
                        : primaryTypeId === 'wellness'
                          ? WELLNESS_PRIMARY_PROTOCOLS
                          : primaryTypeId === 'nursery'
                            ? NURSERY_PRIMARY_PROTOCOLS
                            : primaryTypeId === 'livestock_operation'
                              ? LIVESTOCK_PRIMARY_PROTOCOLS
                              : EMPTY;
  return { universal: UNIVERSAL_PROTOCOL_TEMPLATES, primary };
}

/**
 * Resolve the secondary-layer protocol catalogue for a secondary type, or
 * `undefined` when the type is not yet encoded (the resolver layers nothing).
 */
export function getSecondaryProtocolCatalogue(
  secondaryTypeId: ProjectTypeId,
): SecondaryProtocolCatalogue | undefined {
  switch (secondaryTypeId) {
    case 'silvopasture':
      return {
        additive: SILVOPASTURE_SECONDARY_PROTOCOLS,
        patches: SILVOPASTURE_SECONDARY_PATCHES,
      };
    case 'market_garden':
      return { additive: MARKET_GARDEN_SECONDARY_PROTOCOLS, patches: [] };
    case 'orchard_food_forest':
      return { additive: ORCHARD_SECONDARY_PROTOCOLS, patches: [] };
    case 'agritourism':
      return { additive: AGRITOURISM_SECONDARY_PROTOCOLS, patches: [] };
    case 'education':
      return { additive: EDUCATION_SECONDARY_PROTOCOLS, patches: [] };
    case 'wellness':
      return { additive: WELLNESS_SECONDARY_PROTOCOLS, patches: [] };
    case 'nursery':
      return { additive: NURSERY_SECONDARY_PROTOCOLS, patches: [] };
    case 'livestock_operation':
      return { additive: LIVESTOCK_SECONDARY_PROTOCOLS, patches: [] };
    case 'residential':
      return { additive: RESIDENTIAL_SECONDARY_PROTOCOLS, patches: [] };
    default:
      return undefined;
  }
}
