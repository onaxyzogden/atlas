// @vitest-environment happy-dom
/**
 * FIELD_REMOVERS — contract test for the post-draw Cancel discard path.
 *
 * The slide-up's `onCancel` invokes `FIELD_REMOVERS[active.kind](id)`
 * when the active form carries `discardOnCancel: true` (set by draw
 * tools after `createWithDefaults` wrote a provisional stub). This
 * test asserts the table dispatches into the right namespace store
 * for representative kinds across all backing stores:
 *
 *   - building            → useBuiltEnvironmentStore.removeBuilding (→ V2 delete)
 *   - swotTag             → useSwotStore.removeSwot
 *   - hazardZone          → useExternalForcesStore.removeHazard
 *   - frostPocket         → useExternalForcesStore.removeHazard (shared with hazardZone)
 *   - contourLine         → useTopographyStore.removeContour
 *   - drainageLine        → useTopographyStore.removeDrainageLine
 *   - watercourse         → useWaterSystemsStore.removeWatercourse
 *   - vegetation          → useVegetationStore.removePatch
 *   - soilSample          → useSoilSampleStore.deleteSample
 *   - neighbourPin        → useHumanContextStore.removeNeighbour
 *
 * Records are injected as minimal `{ id }` stubs via setState's untyped
 * escape hatch — only the id matters for the filter-by-id remover. The
 * full-shape concern is the schema's `save` test surface, not this one.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FIELD_REMOVERS } from '../annotationFieldSchemas.js';
import { useBuiltEnvironmentStoreV2 } from '../../../../../store/builtEnvironmentStoreV2.js';
import { useSwotStore } from '../../../../../store/swotStore.js';
import { useExternalForcesStore } from '../../../../../store/externalForcesStore.js';
import { useTopographyStore } from '../../../../../store/topographyStore.js';
import { useWaterSystemsStore } from '../../../../../store/waterSystemsStore.js';
import { useVegetationStore } from '../../../../../store/vegetationStore.js';
import { useSoilSampleStore } from '../../../../../store/soilSampleStore.js';
import { useHumanContextStore } from '../../../../../store/humanContextStore.js';

const PROJECT = 'p-cancel-discard';

const SQUARE: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
};

/** Inject a minimal `{ id }` record into a store collection. The shape
 *  is irrelevant — every remover is `arr.filter(r => r.id !== id)`. */
function inject<K extends string>(
  setStateFn: (patch: Record<K, unknown[]>) => void,
  key: K,
  id: string,
): void {
  setStateFn({ [key]: [{ id }] } as Record<K, unknown[]>);
}

describe('FIELD_REMOVERS — Cancel discard contract', () => {
  beforeEach(() => {
    useBuiltEnvironmentStoreV2.setState({ entities: [] });
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('building → removes from V2 entity store', () => {
    const entity = useBuiltEnvironmentStoreV2.getState().create({
      projectId: PROJECT,
      kind: 'building',
      state: 'existing',
      geometry: SQUARE,
      label: 'x',
    });
    expect(useBuiltEnvironmentStoreV2.getState().entities.some((e) => e.id === entity.id)).toBe(true);
    FIELD_REMOVERS.building(entity.id);
    expect(useBuiltEnvironmentStoreV2.getState().entities.some((e) => e.id === entity.id)).toBe(false);
  });

  it('swotTag → removes from swotStore', () => {
    inject((p) => useSwotStore.setState(p as never), 'swot', 'sw-1');
    expect(useSwotStore.getState().swot.some((e) => e.id === 'sw-1')).toBe(true);
    FIELD_REMOVERS.swotTag('sw-1');
    expect(useSwotStore.getState().swot.some((e) => e.id === 'sw-1')).toBe(false);
  });

  it('hazardZone → removes from externalForces.hazards', () => {
    inject((p) => useExternalForcesStore.setState(p as never), 'hazards', 'hz-1');
    FIELD_REMOVERS.hazardZone('hz-1');
    expect(useExternalForcesStore.getState().hazards.some((h) => h.id === 'hz-1')).toBe(false);
  });

  it('frostPocket → also removes from hazards (shares the table)', () => {
    inject((p) => useExternalForcesStore.setState(p as never), 'hazards', 'fp-1');
    FIELD_REMOVERS.frostPocket('fp-1');
    expect(useExternalForcesStore.getState().hazards.some((h) => h.id === 'fp-1')).toBe(false);
  });

  it('contourLine → removes from topography.contours', () => {
    inject((p) => useTopographyStore.setState(p as never), 'contours', 'ct-1');
    FIELD_REMOVERS.contourLine('ct-1');
    expect(useTopographyStore.getState().contours.some((c) => c.id === 'ct-1')).toBe(false);
  });

  it('drainageLine → removes from topography.drainageLines (not waterSystems)', () => {
    inject((p) => useTopographyStore.setState(p as never), 'drainageLines', 'dr-1');
    FIELD_REMOVERS.drainageLine('dr-1');
    expect(useTopographyStore.getState().drainageLines.some((d) => d.id === 'dr-1')).toBe(false);
  });

  it('watercourse → removes from waterSystems.watercourses', () => {
    inject((p) => useWaterSystemsStore.setState(p as never), 'watercourses', 'wc-1');
    FIELD_REMOVERS.watercourse('wc-1');
    expect(useWaterSystemsStore.getState().watercourses.some((w) => w.id === 'wc-1')).toBe(false);
  });

  it('vegetation → removes from vegetationStore.patches', () => {
    inject((p) => useVegetationStore.setState(p as never), 'patches', 'ec-1');
    FIELD_REMOVERS.vegetation('ec-1');
    expect(useVegetationStore.getState().patches.some((e) => e.id === 'ec-1')).toBe(false);
  });

  it('soilSample → uses deleteSample (not remove)', () => {
    inject((p) => useSoilSampleStore.setState(p as never), 'samples', 'ss-1');
    FIELD_REMOVERS.soilSample('ss-1');
    expect(useSoilSampleStore.getState().samples.some((s) => s.id === 'ss-1')).toBe(false);
  });

  it('neighbourPin → removes from humanContext.neighbours', () => {
    inject((p) => useHumanContextStore.setState(p as never), 'neighbours', 'nb-1');
    FIELD_REMOVERS.neighbourPin('nb-1');
    expect(useHumanContextStore.getState().neighbours.some((n) => n.id === 'nb-1')).toBe(false);
  });
});
