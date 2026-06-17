// @vitest-environment happy-dom
/**
 * receptionSurveys -- the five Plan-stage Stratum-3 ("Tier 2 Systems Reading")
 * survey singletons + their registry helpers. Covers:
 *   - the registry shape (5 entries, correct source objective ids, 2.5 new),
 *   - receptionSurveyFor lookup,
 *   - selectReceptionSurveyRecordCount summing drawn features across stores,
 *   - isAnyReceptionSurveyActive reflecting an open takeover,
 *   - a TARGETED sync-registration guard: each store's persist key is in
 *     SYNCED_STORES as a versioned-blob. (The generic syncManifest coverage
 *     scanner cannot discover factory-built persist keys -- they are not literal
 *     `name:` strings in a `persist(` call -- so this asserts registration
 *     directly, the way the plan's Stage-3 gate intends.)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RECEPTION_SURVEYS,
  receptionSurveyFor,
  selectReceptionSurveyRecordCount,
  isAnyReceptionSurveyActive,
  hydrologySurvey,
  soilSurvey,
  nutrientSurvey,
  pestSurvey,
  stockWaterSurvey,
} from '../receptionSurveys.js';
import type { SurveyStoreBundle } from '../createSurveyStore.js';
import { SYNCED_STORES } from '../../lib/syncManifest.js';

// The five bundles carry DIFFERENT class unions, so the array is heterogeneous;
// erase the generic to `string` (via unknown -- SurveyStoreState is invariant in
// C) so `useStore.setState`/`config` read as one uniform callable surface here.
const ALL = [
  hydrologySurvey,
  soilSurvey,
  nutrientSurvey,
  pestSurvey,
  stockWaterSurvey,
] as unknown as SurveyStoreBundle<string>[];

const SQUARE: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
  ],
};

function resetAll(): void {
  for (const s of ALL) {
    s.useStore.setState({ byProject: {}, active: false, activeProjectId: null });
  }
}

describe('RECEPTION_SURVEYS registry', () => {
  it('holds exactly the five resolved S3 surveys, in order', () => {
    expect(RECEPTION_SURVEYS.map((s) => s.objectiveId)).toEqual([
      's3-hydrology',
      's3-soil',
      'rf-s3-nutrient-cycling',
      'rf-s3-pest-pressure',
      'silv-sec-s3-stock-water',
    ]);
  });

  it('each entry binds its store bundle whose config agrees', () => {
    for (const { objectiveId, bundle } of RECEPTION_SURVEYS) {
      expect(bundle.config.sourceObjectiveId).toBe(objectiveId);
      expect(bundle.config.persistName).toMatch(/^ogden-recep-.*-survey$/);
    }
  });

  it('receptionSurveyFor resolves a known objective and rejects others', () => {
    expect(receptionSurveyFor('s3-soil')?.bundle).toBe(soilSurvey);
    expect(receptionSurveyFor('silv-sec-s3-stock-water')?.bundle).toBe(
      stockWaterSurvey,
    );
    expect(receptionSurveyFor('s3-hydrology')?.bundle).toBe(hydrologySurvey);
    expect(receptionSurveyFor('not-a-survey')).toBeUndefined();
    expect(receptionSurveyFor(null)).toBeUndefined();
    expect(receptionSurveyFor(undefined)).toBeUndefined();
  });
});

describe('selectReceptionSurveyRecordCount', () => {
  beforeEach(resetAll);

  it('is zero with no drawn features', () => {
    expect(selectReceptionSurveyRecordCount('p1')).toBe(0);
  });

  it('sums drawn features across all five stores for one project', () => {
    hydrologySurvey.useStore.getState().addFeature('p1', {
      surveyClass: 'wet-zone',
      kind: 'poly',
      geometry: SQUARE,
      measure: 3,
    });
    soilSurvey.useStore.getState().addFeature('p1', {
      surveyClass: 'compaction',
      kind: 'poly',
      geometry: SQUARE,
      measure: 2,
    });
    stockWaterSurvey.useStore.getState().addFeature('p1', {
      surveyClass: 'water-point',
      kind: 'point',
      geometry: { type: 'Point', coordinates: [0, 0] },
      measure: 1,
    });
    // A feature for a DIFFERENT project must not leak into p1's count.
    pestSurvey.useStore.getState().addFeature('p2', {
      surveyClass: 'pest-hotspot',
      kind: 'poly',
      geometry: SQUARE,
      measure: 1,
    });

    expect(selectReceptionSurveyRecordCount('p1')).toBe(3);
    expect(selectReceptionSurveyRecordCount('p2')).toBe(1);
  });
});

describe('isAnyReceptionSurveyActive', () => {
  beforeEach(resetAll);

  it('is false when no takeover is open', () => {
    expect(isAnyReceptionSurveyActive()).toBe(false);
  });

  it('is true while any one survey takeover is open, false after close', () => {
    nutrientSurvey.useStore.getState().open('p1');
    expect(isAnyReceptionSurveyActive()).toBe(true);
    nutrientSurvey.useStore.getState().close();
    expect(isAnyReceptionSurveyActive()).toBe(false);
  });
});

describe('sync registration guard (factory keys escape the generic scanner)', () => {
  it('registers all five reception survey stores as versioned-blob byProject', () => {
    const byKey = new Map(SYNCED_STORES.map((d) => [d.storeKey, d]));
    for (const bundle of ALL) {
      const descriptor = byKey.get(bundle.config.persistName);
      expect(descriptor, `${bundle.config.persistName} must be in SYNCED_STORES`).toBeDefined();
      expect(descriptor!.classification).toBe('versioned-blob');
      expect(descriptor!.scope).toBe('byProject');
      expect(typeof descriptor!.selectForProject).toBe('function');
      expect(typeof descriptor!.applyForProject).toBe('function');
    }
  });
});
