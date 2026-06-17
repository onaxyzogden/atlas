// @vitest-environment happy-dom
/**
 * receptionSurveys -- the nine Plan-stage Reception survey singletons (five
 * Stratum-3 "Tier 2 Systems Reading" + four Stratum-2 "Tier 1 Land Reading")
 * + their registry helpers. Covers:
 *   - the registry shape (9 entries, correct source objective ids, tier-1 last),
 *   - receptionSurveyFor lookup,
 *   - surveyTierOf classifying s2-* as tier1 and s3-* as tier2,
 *   - selectReceptionSurveyRecordCount summing drawn features across stores,
 *     including the optional tier scope (s2-* only / s3-* only / all),
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
  receptionSurveyForLeadItem,
  selectReceptionSurveyRecordCount,
  surveyTierOf,
  isAnyReceptionSurveyActive,
  hydrologySurvey,
  soilSurvey,
  nutrientSurvey,
  pestSurvey,
  stockWaterSurvey,
  climateSurvey,
  infrastructureSurvey,
  landHealthSurvey,
  landscapeSurvey,
} from '../receptionSurveys.js';
import type { SurveyStoreBundle } from '../createSurveyStore.js';
import { SYNCED_STORES } from '../../lib/syncManifest.js';

// The nine bundles carry DIFFERENT class unions, so the array is heterogeneous;
// erase the generic to `string` (via unknown -- SurveyStoreState is invariant in
// C) so `useStore.setState`/`config` read as one uniform callable surface here.
const ALL = [
  hydrologySurvey,
  soilSurvey,
  nutrientSurvey,
  pestSurvey,
  stockWaterSurvey,
  climateSurvey,
  infrastructureSurvey,
  landHealthSurvey,
  landscapeSurvey,
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
  it('holds the nine resolved surveys in order (five S3 then four S2)', () => {
    expect(RECEPTION_SURVEYS.map((s) => s.objectiveId)).toEqual([
      // Tier 2 -- Systems Reading (Stratum-3); indices 0-4 are load-bearing.
      's3-hydrology',
      's3-soil',
      'rf-s3-nutrient-cycling',
      'rf-s3-pest-pressure',
      'silv-sec-s3-stock-water',
      // Tier 1 -- Land Reading (Stratum-2); indices 5-8.
      's2-climate',
      's2-infrastructure',
      'rf-s2-land-health',
      'rf-s2-landscape-context',
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
    // Tier-1 (Stratum-2) surveys resolve through the same registry.
    expect(receptionSurveyFor('s2-climate')?.bundle).toBe(climateSurvey);
    expect(receptionSurveyFor('rf-s2-land-health')?.bundle).toBe(landHealthSurvey);
    expect(receptionSurveyFor('not-a-survey')).toBeUndefined();
    expect(receptionSurveyFor(null)).toBeUndefined();
    expect(receptionSurveyFor(undefined)).toBeUndefined();
  });
});

describe('surveyTierOf', () => {
  it('classifies every s2-* survey as tier1 and every s3-* survey as tier2', () => {
    for (const { objectiveId } of RECEPTION_SURVEYS) {
      expect(surveyTierOf(objectiveId)).toBe(
        objectiveId.includes('s2-') ? 'tier1' : 'tier2',
      );
    }
    // Spot-check the prefix-bearing ids (rf-/silv-sec- wrappers).
    expect(surveyTierOf('rf-s2-landscape-context')).toBe('tier1');
    expect(surveyTierOf('silv-sec-s3-stock-water')).toBe('tier2');
  });
});

describe('receptionSurveyForLeadItem', () => {
  it('resolves each Tier-1 survey from its objective lead item (-c1)', () => {
    expect(receptionSurveyForLeadItem('s2-climate-c1')?.bundle).toBe(
      climateSurvey,
    );
    expect(receptionSurveyForLeadItem('s2-infrastructure-c1')?.bundle).toBe(
      infrastructureSurvey,
    );
    expect(receptionSurveyForLeadItem('rf-s2-land-health-c1')?.bundle).toBe(
      landHealthSurvey,
    );
    expect(receptionSurveyForLeadItem('rf-s2-landscape-context-c1')?.bundle).toBe(
      landscapeSurvey,
    );
  });

  it('matches ONLY the lead item, never an objective other decision', () => {
    expect(receptionSurveyForLeadItem('s2-climate-c2')).toBeUndefined();
    expect(receptionSurveyForLeadItem('rf-s2-land-health-c8')).toBeUndefined();
    expect(receptionSurveyForLeadItem('s2-climate')).toBeUndefined();
  });

  it('excludes the Tier-2 (s3-*) surveys -- they stay deferred', () => {
    expect(receptionSurveyForLeadItem('s3-hydrology-c1')).toBeUndefined();
    expect(
      receptionSurveyForLeadItem('silv-sec-s3-stock-water-c1'),
    ).toBeUndefined();
  });

  it('is undefined for empty / nullish ids', () => {
    expect(receptionSurveyForLeadItem(null)).toBeUndefined();
    expect(receptionSurveyForLeadItem(undefined)).toBeUndefined();
    expect(receptionSurveyForLeadItem('')).toBeUndefined();
    expect(receptionSurveyForLeadItem('not-a-survey-c1')).toBeUndefined();
  });
});

describe('selectReceptionSurveyRecordCount', () => {
  beforeEach(resetAll);

  it('is zero with no drawn features', () => {
    expect(selectReceptionSurveyRecordCount('p1')).toBe(0);
  });

  it('sums drawn features across all nine stores for one project', () => {
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

  it('scopes the count by tier (s2-* surveys vs s3-* surveys)', () => {
    // Two tier-2 (s3-*) features ...
    hydrologySurvey.useStore.getState().addFeature('p1', {
      surveyClass: 'flow-path',
      kind: 'line',
      geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
      measure: 1,
    });
    soilSurvey.useStore.getState().addFeature('p1', {
      surveyClass: 'compaction',
      kind: 'poly',
      geometry: SQUARE,
      measure: 1,
    });
    // ... and three tier-1 (s2-*) features across the new Land-Reading stores.
    climateSurvey.useStore.getState().addFeature('p1', {
      surveyClass: 'fire-sector',
      kind: 'poly',
      geometry: SQUARE,
      measure: 1,
    });
    infrastructureSurvey.useStore.getState().addFeature('p1', {
      surveyClass: 'gate',
      kind: 'point',
      geometry: { type: 'Point', coordinates: [0, 0] },
      measure: 1,
    });
    landHealthSurvey.useStore.getState().addFeature('p1', {
      surveyClass: 'erosion',
      kind: 'poly',
      geometry: SQUARE,
      measure: 1,
    });

    expect(selectReceptionSurveyRecordCount('p1', 'tier2')).toBe(2);
    expect(selectReceptionSurveyRecordCount('p1', 'tier1')).toBe(3);
    // No-arg sums both tiers.
    expect(selectReceptionSurveyRecordCount('p1')).toBe(5);
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
  it('registers all nine reception survey stores as versioned-blob byProject', () => {
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
