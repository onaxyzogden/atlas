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

  it('rejects non-scalar asBuilt and geometry diffs', () => {
    expect(canApplyDiff(attr('name', { nested: true }), 'cropArea')).toBe(false);
    const geom: AsBuiltDiff = {
      kind: 'geometry',
      field: 'geometry',
      asPlanned: { areaM2: 800 },
      asBuilt: { areaM2: 650 },
    } as AsBuiltDiff;
    expect(canApplyDiff(geom, 'cropArea')).toBe(false);
    expect(canApplyDiff(null, 'cropArea')).toBe(false);
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
