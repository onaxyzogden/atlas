/**
 * Scoring-module shared types.
 *
 * `MockLayerResult` is the input shape consumed by computeAssessmentScores
 * and the rule engine. The name is historical: the shape originated in the
 * web app's mockLayerData.ts but is also the adapter target for API callers
 * that read real `project_layers` rows (apps/api/src/services/assessments/
 * SiteAssessmentWriter.ts → layerRowsToMockLayers).
 *
 * Keeping the type here decouples scoring from web's mock fixtures.
 *
 * As of 2026-04-21 (audit §5.6 closure) the `summary` field is a
 * discriminated-union payload keyed by `layerType` — see `./layerSummary.ts`.
 * Fetchers must pass raw summaries through `normalizeSummary()` before
 * constructing a `MockLayerResult`.
 */

import type { FeatureCollection } from 'geojson';
import type { LayerType } from '../constants/dataSources.js';
import type { LayerSummaryMap } from './layerSummary.js';

interface BaseLayerFields {
  fetchStatus: 'complete' | 'pending' | 'failed' | 'unavailable';
  confidence: 'high' | 'medium' | 'low';
  dataDate: string;
  sourceApi: string;
  attribution: string;
  /** Optional spatial payload retained alongside the summary so downstream
   *  features (auto-zoning, design rules, suitability) can sample real
   *  geometry instead of just per-site means. Web stores this in IndexedDB
   *  rather than localStorage — see apps/web/src/lib/layerFetcher.ts. */
  spatial?: SpatialLayerPayload;
}

/** Vector spatial payload. A discriminated union leaves room for a future
 *  `{ kind: 'raster'; ... }` variant when slope grids and land-cover tiles
 *  get their own caching strategy. */
export type SpatialLayerPayload = {
  kind: 'vector';
  features: FeatureCollection;
  bbox: [number, number, number, number];
};

/** Discriminated union keyed by `layerType`. Consumers narrow via
 *  `if (layer.layerType === 'climate') { layer.summary.annual_precip_mm }`. */
export type MockLayerResult = {
  [K in LayerType]: BaseLayerFields & {
    layerType: K;
    summary: LayerSummaryMap[K] & Record<string, unknown>;
  };
}[LayerType];

/** Helper alias: `LayerResultFor<'climate'>` → the climate variant. */
export type LayerResultFor<K extends LayerType> = Extract<MockLayerResult, { layerType: K }>;
