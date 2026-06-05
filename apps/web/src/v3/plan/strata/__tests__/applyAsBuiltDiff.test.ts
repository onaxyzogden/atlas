/**
 * @vitest-environment happy-dom
 *
 * applyAsBuiltDiff -- Slice 4 per-kind Apply dispatcher.
 *
 * Verified behaviours:
 *   canApplyDiff:
 *     - accepts a single-scalar attribute diff for cropArea / paddock / zone
 *     - accepts label/notes/subtype/phase for structure
 *     - rejects geometry-coupled structure fields (widthM/rotationDeg/...)
 *     - rejects bundled multi-field diffs ("a+b") for every kind
 *     - rejects geometry diffs and object-valued asBuilt for every kind
 *   applyAsBuiltDiff:
 *     - cropArea / paddock / zone patch FLAT { [field]: value }
 *     - structure maps label/notes top-level, subtype -> existing.subtype,
 *       phase -> proposed.phase (nested patch -- updateMetadata shallow-merges)
 *
 * Pure unit test: store mutators are spied via getState(); no rendering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AsBuiltDiff } from '@ogden/shared';
import { applyAsBuiltDiff, canApplyDiff } from '../applyAsBuiltDiff.js';
import { useCropStore } from '../../../../store/cropStore.js';
import { useLivestockStore } from '../../../../store/livestockStore.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../../store/builtEnvironmentStoreV2.js';

function attr(field: string, asBuilt: unknown, asPlanned: unknown = 'x'): AsBuiltDiff {
  return { kind: 'attribute', field, label: field, asPlanned, asBuilt } as AsBuiltDiff;
}

// A small closed square; turf.area gives a stable positive m2 for the lockstep
// areaM2 assertions.
const SQUARE: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [0, 0.001],
      [0.001, 0.001],
      [0.001, 0],
      [0, 0],
    ],
  ],
};

/** A geometry diff carrying (or not) a captured as-built polygon. */
function geomDiff(captured?: unknown): AsBuiltDiff {
  return {
    kind: 'geometry',
    field: 'geometry',
    asPlanned: { areaM2: 800 },
    asBuilt: {
      note: 'redrawn',
      ...(captured !== undefined ? { capturedGeometry: captured } : {}),
    },
  } as AsBuiltDiff;
}

/** A select-field diff: display labels in asPlanned/asBuilt, raw codes in the
 *  *Raw companions (the shape buildAttributeDiff now emits). */
function attrRaw(
  field: string,
  builtLabel: string,
  builtRaw: string,
): AsBuiltDiff {
  return {
    kind: 'attribute',
    field,
    label: field,
    asPlanned: 'Orchard',
    asBuilt: builtLabel,
    asPlannedRaw: 'orchard',
    asBuiltRaw: builtRaw,
  } as AsBuiltDiff;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('canApplyDiff', () => {
  it('accepts a single-scalar attribute diff for the flat polygon kinds', () => {
    expect(canApplyDiff(attr('name', 'Pear'), 'cropArea')).toBe(true);
    expect(canApplyDiff(attr('species', 'sheep'), 'paddock')).toBe(true);
    expect(canApplyDiff(attr('category', 'production'), 'zone')).toBe(true);
  });

  it('accepts label/notes/subtype/phase for structure', () => {
    expect(canApplyDiff(attr('label', 'Barn'), 'structure')).toBe(true);
    expect(canApplyDiff(attr('notes', 'leaks'), 'structure')).toBe(true);
    expect(canApplyDiff(attr('subtype', 'greenhouse'), 'structure')).toBe(true);
    expect(canApplyDiff(attr('phase', 'existing'), 'structure')).toBe(true);
  });

  it('rejects geometry-coupled structure fields', () => {
    expect(canApplyDiff(attr('widthM', 12), 'structure')).toBe(false);
    expect(canApplyDiff(attr('depthM', 8), 'structure')).toBe(false);
    expect(canApplyDiff(attr('rotationDeg', 45), 'structure')).toBe(false);
    expect(canApplyDiff(attr('heightM', 4), 'structure')).toBe(false);
  });

  it('rejects bundled multi-field diffs for every kind', () => {
    const bundled = attr('name+type', { name: 'A', type: 'orchard' });
    expect(canApplyDiff(bundled, 'cropArea')).toBe(false);
    expect(canApplyDiff(bundled, 'paddock')).toBe(false);
    expect(canApplyDiff(bundled, 'zone')).toBe(false);
    expect(canApplyDiff(bundled, 'structure')).toBe(false);
  });

  it('rejects non-scalar asBuilt and note/area-only geometry diffs', () => {
    expect(canApplyDiff(attr('name', { nested: true }), 'cropArea')).toBe(false);
    const geom: AsBuiltDiff = {
      kind: 'geometry',
      field: 'geometry',
      asPlanned: { areaM2: 800 },
      asBuilt: { areaM2: 650 },
    } as AsBuiltDiff;
    // No captured polygon -> read-only evidence, not applicable.
    expect(canApplyDiff(geom, 'cropArea')).toBe(false);
    expect(canApplyDiff(null, 'cropArea')).toBe(false);
  });

  it('accepts a geometry diff carrying a captured polygon for ALL four kinds', () => {
    for (const kind of ['cropArea', 'paddock', 'zone', 'structure'] as const) {
      expect(canApplyDiff(geomDiff(SQUARE), kind)).toBe(true);
    }
  });

  it('rejects a geometry diff whose captured polygon is malformed', () => {
    const tooFewPoints: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 1], [0, 0]]], // ring length 3 < 4
    };
    expect(canApplyDiff(geomDiff(tooFewPoints), 'cropArea')).toBe(false);
    expect(canApplyDiff(geomDiff({ type: 'Point', coordinates: [0, 0] }), 'zone')).toBe(false);
    expect(canApplyDiff(geomDiff('not-an-object'), 'paddock')).toBe(false);
  });
});

describe('applyAsBuiltDiff -- captured geometry', () => {
  it('cropArea writes the polygon + recomputed areaM2 in lockstep', () => {
    const spy = vi.spyOn(useCropStore.getState(), 'updateCropArea');
    applyAsBuiltDiff('cropArea', 'crop-1', geomDiff(SQUARE));
    expect(spy).toHaveBeenCalledOnce();
    const [id, patch] = spy.mock.calls[0]!;
    expect(id).toBe('crop-1');
    expect(patch.geometry).toEqual(SQUARE);
    expect(typeof patch.areaM2).toBe('number');
    expect(patch.areaM2).toBeGreaterThan(0);
  });

  it('paddock writes the polygon + areaM2', () => {
    const spy = vi.spyOn(useLivestockStore.getState(), 'updatePaddock');
    applyAsBuiltDiff('paddock', 'pad-1', geomDiff(SQUARE));
    const [id, patch] = spy.mock.calls[0]!;
    expect(id).toBe('pad-1');
    expect(patch.geometry).toEqual(SQUARE);
    expect(typeof patch.areaM2).toBe('number');
  });

  it('zone writes the polygon + areaM2', () => {
    const spy = vi.spyOn(useZoneStore.getState(), 'updateZone');
    applyAsBuiltDiff('zone', 'zone-1', geomDiff(SQUARE));
    const [id, patch] = spy.mock.calls[0]!;
    expect(id).toBe('zone-1');
    expect(patch.geometry).toEqual(SQUARE);
    expect(typeof patch.areaM2).toBe('number');
  });

  it('structure routes the polygon through updateGeometry', () => {
    const spy = vi.spyOn(useBuiltEnvironmentStoreV2.getState(), 'updateGeometry');
    applyAsBuiltDiff('structure', 'st-1', geomDiff(SQUARE));
    expect(spy).toHaveBeenCalledWith('st-1', SQUARE);
  });

  it('is a no-op when the captured polygon is malformed', () => {
    const cropSpy = vi.spyOn(useCropStore.getState(), 'updateCropArea');
    applyAsBuiltDiff('cropArea', 'crop-1', geomDiff('garbage'));
    expect(cropSpy).not.toHaveBeenCalled();
  });
});

describe('applyAsBuiltDiff -- flat polygon kinds', () => {
  it('cropArea patches a flat { [field]: value }', () => {
    const spy = vi.spyOn(useCropStore.getState(), 'updateCropArea');
    applyAsBuiltDiff('cropArea', 'crop-1', attr('name', 'Pear Orchard'));
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]).toEqual(['crop-1', { name: 'Pear Orchard' }]);
  });

  it('paddock patches a flat { [field]: value }', () => {
    const spy = vi.spyOn(useLivestockStore.getState(), 'updatePaddock');
    applyAsBuiltDiff('paddock', 'pad-1', attr('fencing', 'permanent'));
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]).toEqual(['pad-1', { fencing: 'permanent' }]);
  });

  it('zone patches a flat { [field]: value }', () => {
    const spy = vi.spyOn(useZoneStore.getState(), 'updateZone');
    applyAsBuiltDiff('zone', 'zone-1', attr('name', 'Back Field'));
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]).toEqual(['zone-1', { name: 'Back Field' }]);
  });

  it('writes the RAW select code, not the display label', () => {
    // Regression: a select diff carries the human label ("Food forest") in
    // asBuilt for display but the enum code ("food_forest") in asBuiltRaw.
    // Apply must write the code so it never corrupts an enum-valued prop.
    const spy = vi.spyOn(useCropStore.getState(), 'updateCropArea');
    applyAsBuiltDiff(
      'cropArea',
      'crop-1',
      attrRaw('type', 'Food forest', 'food_forest'),
    );
    expect(spy.mock.calls[0]).toEqual(['crop-1', { type: 'food_forest' }]);
  });

  it('maps the raw subtype code for a structure', () => {
    const spy = vi.spyOn(useBuiltEnvironmentStoreV2.getState(), 'updateMetadata');
    applyAsBuiltDiff(
      'structure',
      'st-1',
      attrRaw('subtype', 'Greenhouse', 'greenhouse'),
    );
    expect(spy).toHaveBeenCalledWith('st-1', { existing: { subtype: 'greenhouse' } });
  });
});

describe('applyAsBuiltDiff -- structure nested patch', () => {
  it('maps label/notes to top-level metadata', () => {
    const spy = vi.spyOn(useBuiltEnvironmentStoreV2.getState(), 'updateMetadata');
    applyAsBuiltDiff('structure', 'st-1', attr('label', 'Main Barn'));
    expect(spy).toHaveBeenCalledWith('st-1', { label: 'Main Barn' });

    spy.mockClear();
    applyAsBuiltDiff('structure', 'st-1', attr('notes', 'roof leak'));
    expect(spy).toHaveBeenCalledWith('st-1', { notes: 'roof leak' });
  });

  it('maps subtype -> existing.subtype and phase -> proposed.phase', () => {
    const spy = vi.spyOn(useBuiltEnvironmentStoreV2.getState(), 'updateMetadata');
    applyAsBuiltDiff('structure', 'st-1', attr('subtype', 'greenhouse'));
    expect(spy).toHaveBeenCalledWith('st-1', { existing: { subtype: 'greenhouse' } });

    spy.mockClear();
    applyAsBuiltDiff('structure', 'st-1', attr('phase', 'existing'));
    expect(spy).toHaveBeenCalledWith('st-1', { proposed: { phase: 'existing' } });
  });

  it('is a no-op for a rejected (geometry-coupled) structure field', () => {
    const spy = vi.spyOn(useBuiltEnvironmentStoreV2.getState(), 'updateMetadata');
    // applyAsBuiltDiff stays defensive: a widthM attribute writes nothing
    // mappable, so updateMetadata is never called.
    applyAsBuiltDiff('structure', 'st-1', attr('widthM', 12));
    expect(spy).not.toHaveBeenCalled();
  });
});
