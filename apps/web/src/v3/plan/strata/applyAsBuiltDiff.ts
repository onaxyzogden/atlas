/**
 * applyAsBuiltDiff -- the single, explicitly-mapped place that translates an
 * as-built attribute diff into the right geometry-store mutation, per feature
 * kind. Mirrors the ADR's "small explicit map, independently testable"
 * philosophy (see featureRefDomain.ts on the record side).
 *
 * Why a standalone module (not inline in the card): the four kinds do NOT
 * share one patch shape. cropArea / paddock / zone are flat -- the diff field
 * is a top-level entity prop, so `{ [field]: value }` patches directly.
 * structure is nested -- `label`/`notes` are top-level on the V2 entity but
 * `subtype` lives under `existing` and `phase` under `proposed`
 * (`builtEnvironmentStoreV2.updateMetadata` shallow-merges both blocks, so a
 * partial patch never wipes siblings). Geometry-coupled structure fields
 * (rotation / width / depth / height) re-shape the footprint and are a Slice 5
 * concern -- excluded from Apply here.
 *
 * `canApplyDiff` also hardens the path against bundled multi-field diffs
 * (field "name+type", object value): those are Keep-only for EVERY kind.
 *
 * Slice 6 adds the geometry branch: a geometry diff is applicable IFF it
 * carries a captured as-built polygon (`asBuilt.capturedGeometry`, redrawn in
 * Act). Apply writes that polygon to the design store - recomputing `areaM2` in
 * lockstep via geodesic `parcelAreaM2` for the three flat polygon kinds, and
 * routing structures through `updateStructure` (which feeds `updateGeometry`;
 * the parametric width/depth/rotation go stale by design, same as the Plan
 * vertex editor). Note/area-only geometry diffs (no captured polygon) stay
 * read-only evidence.
 */

import type {
  AsBuiltDiff,
  AsBuiltFeatureKind,
  AsBuiltGeometryDiff,
} from '@ogden/shared';
import { useCropStore, type CropArea } from '../../../store/cropStore.js';
import {
  useLivestockStore,
  type Paddock,
} from '../../../store/livestockStore.js';
import { useZoneStore, type LandZone } from '../../../store/zoneStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import { updateStructure } from '../../../store/builtEnvironmentSelectors.js';
import { parcelAreaM2 } from '../../../lib/geo.js';

/** Structure attribute fields the Plan Apply can reconcile: flat label/notes
 *  plus nested subtype (existing) / phase (proposed). Dims and rotation are
 *  geometry-coupled and deliberately excluded ("fix attributes, not shape"). */
const STRUCTURE_APPLY_FIELDS = new Set(['label', 'notes', 'subtype', 'phase']);

function isScalar(v: unknown): v is string | number {
  return typeof v === 'string' || typeof v === 'number';
}

/**
 * Runtime guard for the captured as-built polygon. `capturedGeometry` is typed
 * `z.unknown()` in the schema (no turf coupling); this is the single choke
 * point that proves it is a usable Polygon before any store write: a GeoJSON
 * Polygon whose outer ring has at least 4 positions (3 distinct + closing).
 */
function asCapturedPolygon(v: unknown): GeoJSON.Polygon | null {
  if (!v || typeof v !== 'object') return null;
  const g = v as { type?: unknown; coordinates?: unknown };
  if (g.type !== 'Polygon' || !Array.isArray(g.coordinates)) return null;
  const ring = g.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) return null;
  return v as GeoJSON.Polygon;
}

/**
 * True when "Apply to design" can safely partial-patch the design store for
 * this diff + kind. Requires an attribute diff carrying a SINGLE scalar field
 * (no bundled "a+b" diffs); for structures the field must be Apply-eligible.
 */
export function canApplyDiff(
  diff: AsBuiltDiff | null,
  kind: AsBuiltFeatureKind,
): boolean {
  if (!diff) return false;
  // Geometry: applicable for ALL four kinds IFF a captured polygon is present
  // (note/area-only divergence stays read-only evidence).
  if (diff.kind === 'geometry') {
    return asCapturedPolygon(diff.asBuilt.capturedGeometry) !== null;
  }
  if (diff.kind !== 'attribute') return false;
  if (diff.field.includes('+')) return false; // bundled multi-field diff
  if (!isScalar(diff.asBuilt)) return false;
  if (kind === 'structure') return STRUCTURE_APPLY_FIELDS.has(diff.field);
  // cropArea | paddock | zone: every edit-schema field is a flat entity prop.
  return kind === 'cropArea' || kind === 'paddock' || kind === 'zone';
}

/**
 * Apply the as-built value to the design store for the given feature. No-op
 * for diffs/kinds that `canApplyDiff` would reject; callers should gate on
 * `canApplyDiff` first, but this stays defensive.
 */
export function applyAsBuiltDiff(
  kind: AsBuiltFeatureKind,
  featureId: string,
  diff: AsBuiltDiff,
): void {
  if (diff.kind === 'geometry') {
    applyGeometryDiff(kind, featureId, diff);
    return;
  }
  if (diff.kind !== 'attribute') return;
  if (!isScalar(diff.asBuilt)) return;
  const { field } = diff;
  // Prefer the raw entity code (select fields carry the display label in
  // `asBuilt` but the underlying code in `asBuiltRaw`); fall back to `asBuilt`
  // for text/number fields and legacy points that predate the raw fields.
  const value = isScalar(diff.asBuiltRaw) ? diff.asBuiltRaw : diff.asBuilt;

  switch (kind) {
    case 'cropArea':
      useCropStore
        .getState()
        .updateCropArea(featureId, { [field]: value } as Partial<CropArea>);
      return;
    case 'paddock':
      useLivestockStore
        .getState()
        .updatePaddock(featureId, { [field]: value } as Partial<Paddock>);
      return;
    case 'zone':
      useZoneStore
        .getState()
        .updateZone(featureId, { [field]: value } as Partial<LandZone>);
      return;
    case 'structure': {
      const store = useBuiltEnvironmentStoreV2.getState();
      const text = String(value);
      if (field === 'label') store.updateMetadata(featureId, { label: text });
      else if (field === 'notes')
        store.updateMetadata(featureId, { notes: text });
      else if (field === 'subtype')
        store.updateMetadata(featureId, { existing: { subtype: text } });
      else if (field === 'phase')
        store.updateMetadata(featureId, { proposed: { phase: text } });
      return;
    }
  }
}

/**
 * Write the captured as-built polygon to the design store. cropArea / paddock /
 * zone patch flat `{ geometry, areaM2 }` (areaM2 recomputed in lockstep via
 * geodesic `parcelAreaM2`; omitted via guarded spread when turf returns null so
 * the non-optional `areaM2: number` field is never set to null). structure
 * routes through `updateStructure({ geometry })`, which feeds `updateGeometry`;
 * its parametric width/depth/rotation go stale by design (same accepted
 * behaviour as the Plan vertex editor). No-op when the polygon guard rejects.
 */
function applyGeometryDiff(
  kind: AsBuiltFeatureKind,
  featureId: string,
  diff: AsBuiltGeometryDiff,
): void {
  const geometry = asCapturedPolygon(diff.asBuilt.capturedGeometry);
  if (!geometry) return;
  const area = parcelAreaM2(geometry);
  const areaPatch = area != null ? { areaM2: area } : {};

  switch (kind) {
    case 'cropArea':
      useCropStore
        .getState()
        .updateCropArea(featureId, {
          geometry,
          ...areaPatch,
        } as Partial<CropArea>);
      return;
    case 'paddock':
      useLivestockStore
        .getState()
        .updatePaddock(featureId, {
          geometry,
          ...areaPatch,
        } as Partial<Paddock>);
      return;
    case 'zone':
      useZoneStore
        .getState()
        .updateZone(featureId, { geometry, ...areaPatch } as Partial<LandZone>);
      return;
    case 'structure':
      updateStructure(featureId, { geometry });
      return;
  }
}
