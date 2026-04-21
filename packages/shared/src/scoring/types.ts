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
 */

import type { LayerType } from '../constants/dataSources.js';

export interface MockLayerResult {
  layerType: LayerType;
  fetchStatus: 'complete' | 'pending' | 'failed' | 'unavailable';
  confidence: 'high' | 'medium' | 'low';
  dataDate: string;
  sourceApi: string;
  attribution: string;
  summary: Record<string, unknown>;
}
