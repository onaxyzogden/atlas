/**
 * openBeInlineEdit — single entrypoint for routing a Built-Environment
 * entity into the floating `<InlineFeaturePopover>` (Plan's surface, now
 * also mounted in Observe per Phase 4.4).
 *
 * Two callers today:
 *   - Observe `<SelectionFloater>` Edit-button click (single selection).
 *   - Plan `<PlanObserveSelectionHandler>` mousedown on Observe-anno BE
 *     layer (still routes through its own dispatch since it already has
 *     the layer-id → V2-kind table; this helper is the Observe-side
 *     equivalent that maps from the legacy Observe AnnotationKind string).
 *
 * Returns `true` if the popover was opened, `false` if the kind isn't BE
 * (caller should fall through to its existing surface).
 */

import * as turf from '@turf/turf';
import type { BuiltEnvironmentEntity } from '@ogden/shared';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import { useInlineFormStore } from '../../plan/draw/inlineFormStore.js';
import {
  buildBuildingEditSchema,
  buildWellEditSchema,
  buildSepticEditSchema,
  buildPowerLineEditSchema,
  buildBuriedUtilityEditSchema,
  buildFenceEditSchema,
  buildGateEditSchema,
  buildDrivewayEditSchema,
  buildGenericBeEditSchema,
} from '../../plan/layers/inlineEditSchemas.js';

type BeKindV2 = BuiltEnvironmentEntity['kind'];

type SchemaBuilder = (
  e: BuiltEnvironmentEntity,
) => ReturnType<typeof buildBuildingEditSchema>;

/**
 * Map from Observe's legacy `AnnotationKind` (camelCase) to V2's kebab-case
 * `BuiltEnvironmentEntity['kind']`. Only the 8 BE kinds are listed; other
 * Observe kinds (sectors, ecology, soil, etc.) are not BE and get `null`.
 */
const OBSERVE_KIND_TO_V2: Readonly<Record<string, BeKindV2>> = {
  building: 'building',
  well: 'well',
  septic: 'septic',
  powerLine: 'power-line',
  buriedUtility: 'buried-utility',
  fence: 'fence',
  gate: 'gate',
  existingDriveway: 'driveway',
};

/**
 * Per-kind builders for the 8 BE kinds with bespoke edit forms. Any kind
 * NOT in this table falls back to `buildGenericBeEditSchema` (Phase 5.2.B
 * — covers the 23 registry kinds that share the floor schema). Adding a
 * per-kind builder later is just dropping it in here.
 */
const SCHEMA_BUILDERS: Readonly<Partial<Record<string, SchemaBuilder>>> = {
  building: buildBuildingEditSchema,
  well: buildWellEditSchema,
  septic: buildSepticEditSchema,
  'power-line': buildPowerLineEditSchema,
  'buried-utility': buildBuriedUtilityEditSchema,
  fence: buildFenceEditSchema,
  gate: buildGateEditSchema,
  driveway: buildDrivewayEditSchema,
};

function pickBuilder(kind: string): SchemaBuilder {
  return SCHEMA_BUILDERS[kind] ?? buildGenericBeEditSchema;
}

function entityAnchor(entity: BuiltEnvironmentEntity): [number, number] | null {
  const g = entity.geometry;
  try {
    if (g.type === 'Point') {
      const lng = g.coordinates[0];
      const lat = g.coordinates[1];
      if (typeof lng !== 'number' || typeof lat !== 'number') return null;
      return [lng, lat];
    }
    const c = turf.centroid(g).geometry.coordinates as [number, number];
    return c;
  } catch {
    return null;
  }
}

/**
 * Attempt to open the BE inline-edit popover for a clicked / selected
 * Observe annotation. Returns `true` when intercepted; `false` lets the
 * caller fall through to its existing edit surface (slide-up etc.).
 */
export function openBeInlineEditByObserveKind(
  observeKind: string,
  id: string,
  /** Optional fallback anchor (e.g. the click's lng/lat). If omitted,
   *  the entity's geometry centroid is used. */
  fallbackAnchor?: [number, number],
): boolean {
  const v2Kind = OBSERVE_KIND_TO_V2[observeKind];
  if (!v2Kind) return false;

  const entity = useBuiltEnvironmentStoreV2
    .getState()
    .entities.find((x) => x.id === id && x.kind === v2Kind);
  if (!entity) return false;

  const anchor = fallbackAnchor ?? entityAnchor(entity);
  if (!anchor) return false;

  const schema = pickBuilder(entity.kind)(entity);
  useInlineFormStore.getState().open({ ...schema, anchor });
  return true;
}

/**
 * Phase 5.2.B — open the BE inline-edit popover for a V2 entity by id.
 * Used by the new `BeV2GenericLayer` whose features carry V2 ids directly
 * (no Observe-AnnotationKind translation step). Returns `true` when
 * intercepted, `false` if the id isn't in V2 or anchor resolution fails.
 */
export function openBeInlineEditById(
  id: string,
  fallbackAnchor?: [number, number],
): boolean {
  const entity = useBuiltEnvironmentStoreV2
    .getState()
    .entities.find((x) => x.id === id);
  if (!entity) return false;

  const anchor = fallbackAnchor ?? entityAnchor(entity);
  if (!anchor) return false;

  const schema = pickBuilder(entity.kind)(entity);
  useInlineFormStore.getState().open({ ...schema, anchor });
  return true;
}
