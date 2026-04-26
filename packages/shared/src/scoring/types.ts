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

import type { LayerType } from '../constants/dataSources.js';
import type { LayerSummaryMap } from './layerSummary.js';

interface BaseLayerFields {
  fetchStatus: 'complete' | 'pending' | 'failed' | 'unavailable';
  confidence: 'high' | 'medium' | 'low';
  dataDate: string;
  sourceApi: string;
  attribution: string;
}

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
