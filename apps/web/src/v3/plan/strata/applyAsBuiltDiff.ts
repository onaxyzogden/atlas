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
 */

import type { AsBuiltDiff, AsBuiltFeatureKind } from '@ogden/shared';
import { useCropStore, type CropArea } from '../../../store/cropStore.js';
import {
  useLivestockStore,
  type Paddock,
} from '../../../store/livestockStore.js';
import { useZoneStore, type LandZone } from '../../../store/zoneStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';

/** Structure attribute fields the Plan Apply can reconcile: flat label/notes
 *  plus nested subtype (existing) / phase (proposed). Dims and rotation are
 *  geometry-coupled and deliberately excluded ("fix attributes, not shape"). */
const STRUCTURE_APPLY_FIELDS = new Set(['label', 'notes', 'subtype', 'phase']);

function isScalar(v: unknown): v is string | number {
  return typeof v === 'string' || typeof v === 'number';
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
  if (!diff || diff.kind !== 'attribute') return false;
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
  if (diff.kind !== 'attribute') return;
  if (!isScalar(diff.asBuilt)) return;
  const { field } = diff;
  const value = diff.asBuilt;

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
