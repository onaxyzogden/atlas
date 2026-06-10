/**
 * @vitest-environment happy-dom
 *
 * objectiveFeatureRegistry — pure resolution + derive/delete smoke tests.
 *
 * happy-dom (not the repo-default `node` env) is required: importing this
 * registry transitively loads the vegetation/slope survey stores, whose persist
 * middleware uses the browser default `localStorage` storage. Under the `node`
 * env that storage resolves to `undefined`, so zustand skips attaching
 * `store.persist`, and each store's module-load `rehydrateWithLogging(...)`
 * throws on `store.persist.getOptions()`. A DOM env supplies `localStorage`/
 * `window` so `.persist` attaches exactly as it does in the browser app.
 *
 * The render path (panel markup, map fly-to) is verified in-browser; the
 * testable core is (1) which store-family descriptors an objective's armed map
 * tools resolve to, and (2) that a descriptor's `build` lists a store's project
 * features and binds a working `remove()`. Bounded forks pool (Windows) per
 * the repo's vitest hygiene.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { MapToolId } from '../../../../v3/observe/components/measure/useMapToolStore.js';
import type { PlanStratumObjective } from '@ogden/shared';
import {
  matchedSources,
  matchedDescriptors,
  objectiveMapToolIds,
  PLACED_FEATURE_DESCRIPTORS,
} from '../objectiveFeatureRegistry.js';
import { useWaterSystemsStore, type Earthwork } from '../../../../store/waterSystemsStore.js';
import { useVegetationSurveyStore } from '../../../../store/vegetationSurveyStore.js';
import { useLandDesignStore } from '../../../../store/landDesignStore.js';
import type { DesignElement } from '../../../../store/designElementsStore.js';

const PID = 'proj-test-registry';

function descriptor(source: string) {
  const d = PLACED_FEATURE_DESCRIPTORS.find((x) => x.source === source);
  if (!d) throw new Error(`no descriptor for ${source}`);
  return d;
}

describe('matchedSources — store-family resolution', () => {
  it('resolves crop + livestock from their literal tool ids', () => {
    const ids = ['plan.plant-systems.crop-area', 'plan.livestock.paddock'] as MapToolId[];
    expect(matchedSources(ids).sort()).toEqual(['crop', 'livestock']);
  });

  it('prefix-matches the slope survey family (act.terrain.slope-*)', () => {
    expect(matchedSources(['act.terrain.slope-steep' as MapToolId])).toEqual(['slope-survey']);
    expect(matchedSources(['act.terrain.slope-flat' as MapToolId])).toEqual(['slope-survey']);
  });

  it('prefix-matches the water family (plan.water-management.*)', () => {
    expect(matchedSources(['plan.water-management.swale' as MapToolId])).toEqual(['water']);
    expect(matchedSources(['plan.water-management.storage' as MapToolId])).toEqual(['water']);
  });

  it('routes elementCatalog kinds (orchard) to the design store, not crops', () => {
    expect(matchedSources(['plan.plant-systems.orchard' as MapToolId])).toEqual(['design']);
  });

  it('prefix-matches the built-environment family', () => {
    expect(matchedSources(['observe.built-environment.barn' as MapToolId])).toEqual(['built']);
  });

  it('returns nothing for an out-of-scope (topography annotation) tool', () => {
    expect(matchedSources(['observe.topography.contour-line' as MapToolId])).toEqual([]);
  });

  it('returns nothing for an empty tool set', () => {
    expect(matchedSources([])).toEqual([]);
  });

  it('dedupes when two tools share a store (crops + beds → one crop descriptor)', () => {
    const ids = ['plan.plant-systems.crop-area', 'plan.plant-systems.crop-area'] as MapToolId[];
    expect(matchedSources(ids)).toEqual(['crop']);
  });
});

describe('objectiveMapToolIds — catalogue join, map-arms only', () => {
  // s6-integration-design is not in OBJECTIVE_ACT_TOOLS_OVERRIDE, so it resolves
  // via STRATUM_ACT_TOOLS_DEFAULT['s6-integration-design'] = crops, orchards,
  // paddocks, beds, compost, harvest, livestock, flow-connector. (The default
  // map is keyed by the FULL stratum id, hence stratumId below is the full id,
  // not 's6'.) harvest/livestock are log arms and flow-connector a flow arm —
  // all must be dropped; the spatial ones must resolve.
  const s6 = {
    id: 's6-integration-design',
    stratumId: 's6-integration-design',
  } as unknown as PlanStratumObjective;

  it('keeps only map-arm tools (drops harvest/livestock logs + flow-connector)', () => {
    const ids = objectiveMapToolIds(s6);
    expect(ids).toContain('plan.plant-systems.crop-area'); // crops + beds
    expect(ids).toContain('plan.plant-systems.orchard'); // orchards
    expect(ids).toContain('plan.livestock.paddock'); // paddocks
    expect(ids).toContain('observe.built-environment.compost'); // compost
    // log/flow arms produce no mapToolId
    expect(ids).not.toContain('plants-food');
  });

  it('resolves s6 to the crop, livestock, built, and design store families', () => {
    const sources = matchedSources(objectiveMapToolIds(s6));
    expect(sources).toEqual(expect.arrayContaining(['crop', 'livestock', 'built', 'design']));
    expect(sources).not.toContain('slope-survey');
  });

  it('a form-only objective (s1-vision) resolves to no descriptors', () => {
    const s1 = { id: 's1-vision', stratumId: 's1' } as unknown as PlanStratumObjective;
    // Whatever s1-vision arms, none are placed-feature map tools.
    expect(matchedDescriptors(objectiveMapToolIds(s1))).toEqual([]);
  });
});

describe('descriptor.build — lists project features + binds remove()', () => {
  beforeEach(() => {
    useWaterSystemsStore.setState({
      earthworks: [],
      storageInfra: [],
      watercourses: [],
      waterbodies: [],
      waterNodes: [],
    });
    useVegetationSurveyStore.setState({ byProject: {} });
    useLandDesignStore.setState({ byProject: {} });
  });

  it('water (flat store): builds a row per earthwork and remove() deletes it', () => {
    const e: Earthwork = {
      id: 'ew-1',
      projectId: PID,
      type: 'swale',
      geometry: { type: 'LineString', coordinates: [[0, 0], [0.001, 0.001]] },
      lengthM: 120,
      createdAt: '2026-06-10T00:00:00.000Z',
    };
    useWaterSystemsStore.getState().addEarthwork(e);
    // an earthwork for another project must NOT appear
    useWaterSystemsStore.getState().addEarthwork({ ...e, id: 'ew-other', projectId: 'other' });

    const rows = descriptor('water').build(PID);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.id).toBe('ew-1');
    expect(row.source).toBe('water');
    expect(row.label).toBe('Swale');
    expect(row.centroid).not.toBeNull();

    row.remove();
    expect(useWaterSystemsStore.getState().earthworks.find((x) => x.id === 'ew-1')).toBeUndefined();
    // the other-project earthwork survives
    expect(useWaterSystemsStore.getState().earthworks.find((x) => x.id === 'ew-other')).toBeDefined();
  });

  it('vegetation survey (byProject store): builds rows + remove() deletes by (pid,id)', () => {
    const poly: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 0.001], [0.001, 0.001], [0, 0]]],
    };
    const f = useVegetationSurveyStore
      .getState()
      .addFeature(PID, { community: 'riparian', geometry: poly, acreage: 2.5 });

    const rows = descriptor('veg-survey').build(PID);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.id).toBe(f.id);
    expect(row.source).toBe('veg-survey');
    expect(row.kind).toBe('riparian');
    expect(row.meta).toBe('2.50 ac');
    expect(row.centroid).not.toBeNull();

    row.remove();
    expect(useVegetationSurveyStore.getState().listForProject(PID)).toHaveLength(0);
  });

  it('land-design (byProject store): skips drafts, builds row + remove() deletes by (pid,id)', () => {
    const poly: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 0.001], [0.001, 0.001], [0, 0]]],
    };
    const orchard: DesignElement = {
      id: 'de-1',
      category: 'grazing',
      kind: 'orchard',
      geometry: poly,
      phase: 'trees',
      label: 'North orchard',
      createdAt: '2026-06-10T00:00:00.000Z',
    };
    // A draft element of the same project must be filtered out by build().
    const draft = { ...orchard, id: 'de-draft', draft: true } as DesignElement & {
      draft: boolean;
    };
    useLandDesignStore.getState().add(PID, orchard);
    useLandDesignStore.getState().add(PID, draft);
    // An element under another project must not appear either.
    useLandDesignStore.getState().add('other', { ...orchard, id: 'de-other' });

    const rows = descriptor('design').build(PID);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.id).toBe('de-1');
    expect(row.source).toBe('design');
    expect(row.label).toBe('North orchard');
    expect(row.centroid).not.toBeNull();

    row.remove();
    expect(useLandDesignStore.getState().byProject[PID] ?? []).toHaveLength(1); // only the draft remains
    expect(
      (useLandDesignStore.getState().byProject[PID] ?? []).find((el) => el.id === 'de-1'),
    ).toBeUndefined();
    // other-project element survives
    expect(useLandDesignStore.getState().byProject['other'] ?? []).toHaveLength(1);
  });
});
