/**
 * specTaxonomy — derives the OLOS Workflow Spec v1.0 §3.2 six-category
 * landscape taxonomy from the codebase's richer model (zone category +
 * succession stage + ground cover). The rich model stays the source of
 * truth; this is a *read-only projection* used by plan-generation
 * (regeneration forcing) and the investor report so the spec vocabulary
 * is honored without discarding existing Observe annotation work.
 *
 * Precedence is deliberate and ordered:
 *   barren_compacted > water_features > infrastructure
 *     > grazing_pasture > woodland_shelter > active_growing
 *
 * Barren/Compacted wins over everything because it carries the spec
 * §3.2.1 "system obligation": a barren zone is never treated as
 * ready-to-use land regardless of what category a steward tagged it.
 *
 * Spec ref: OLOS_Atlas_Platform_Workflow_Spec_v1.docx §3.2, §3.2.1.
 */

import type {
  LandZone,
  ZoneCategory,
  SuccessionStage,
  GroundCoverState,
} from '../../../store/zoneStore.js';
import type { VegetationPatch } from '../../../store/vegetationStore.js';
import { resolveZoneVegetation } from './vegetationResolver.js';

export type SpecLandCategory =
  | 'active_growing'
  | 'grazing_pasture'
  | 'water_features'
  | 'infrastructure'
  | 'woodland_shelter'
  | 'barren_compacted';

export const SPEC_LAND_CATEGORY_LABELS: Record<SpecLandCategory, string> = {
  active_growing: 'Active Growing Zones',
  grazing_pasture: 'Grazing & Pasture',
  water_features: 'Water Features',
  infrastructure: 'Infrastructure',
  woodland_shelter: 'Woodland / Shelter',
  barren_compacted: 'Barren / Compacted',
};

/**
 * Ground covers that signal degraded, non-productive land requiring the
 * mandatory regeneration pathway. Only `barren` qualifies: per the
 * existing model `bare-soil` is fertile-but-exposed (not degraded), and
 * `sand`/`rocky` are natural substrates, not damage. Keeping this set
 * tight avoids forcing spurious regeneration on healthy land.
 */
const DEGRADED_COVERS = new Set<GroundCoverState>(['barren']);

export function isBarrenCompactedCover(
  cover: GroundCoverState | null | undefined,
): boolean {
  return cover != null && DEGRADED_COVERS.has(cover);
}

const CATEGORY_TO_SPEC: Partial<Record<ZoneCategory, SpecLandCategory>> = {
  food_production: 'active_growing',
  livestock: 'grazing_pasture',
  water_retention: 'water_features',
  infrastructure: 'infrastructure',
  access: 'infrastructure',
  habitation: 'infrastructure',
  spiritual: 'infrastructure',
  education: 'infrastructure',
  retreat: 'infrastructure',
  conservation: 'woodland_shelter',
  commons: 'woodland_shelter',
  buffer: 'woodland_shelter',
  future_expansion: 'active_growing',
};

export interface SpecCategoryInput {
  category?: ZoneCategory | null;
  successionStage?: SuccessionStage | null;
  groundCover?: GroundCoverState | null;
}

/**
 * Resolve a single spec landscape category from any subset of the rich
 * model. Barren/Compacted is checked first (highest precedence); then
 * the explicit zone category; then ground cover / succession as
 * fallbacks when no category was tagged.
 */
export function resolveSpecCategory(input: SpecCategoryInput): SpecLandCategory {
  if (isBarrenCompactedCover(input.groundCover)) return 'barren_compacted';

  if (input.category) {
    const mapped = CATEGORY_TO_SPEC[input.category];
    if (mapped) return mapped;
  }

  // No decisive category — fall back to physical / temporal signals.
  if (input.groundCover === 'wetland') return 'water_features';
  if (input.groundCover === 'forest') return 'woodland_shelter';
  if (input.successionStage === 'climax' || input.successionStage === 'late') {
    return 'woodland_shelter';
  }
  if (
    input.groundCover === 'thriving-grasses' ||
    input.groundCover === 'sparse-grasses'
  ) {
    return 'grazing_pasture';
  }

  return 'active_growing';
}

/**
 * Resolve the spec category for a zone, reading observed vegetation
 * through the canonical resolver (override > derived > none). `patches`
 * should be project-scoped by the caller.
 */
export function resolveZoneSpecCategory(
  zone: LandZone,
  patches: VegetationPatch[],
): SpecLandCategory {
  const veg = resolveZoneVegetation(zone, patches);
  return resolveSpecCategory({
    category: zone.category,
    successionStage: veg.successionStage,
    groundCover: veg.groundCover,
  });
}

/** True when a zone resolves to Barren/Compacted (regeneration obligation). */
export function zoneRequiresRegeneration(
  zone: LandZone,
  patches: VegetationPatch[],
): boolean {
  return resolveZoneSpecCategory(zone, patches) === 'barren_compacted';
}
