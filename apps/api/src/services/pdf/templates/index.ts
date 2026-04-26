/**
 * Template registry — maps export types to their render functions.
 */

import type { ExportType, CreateExportInput, AssessmentFlag } from '@ogden/shared';
import type { ScoredResult } from '@ogden/shared/scoring';

// ─── Data bag passed to every template ────────────────────────────────────────

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  project_type: string | null;
  country: string;
  province_state: string | null;
  address: string | null;
  parcel_id: string | null;
  acreage: number | null;
  data_completeness_score: number | null;
  owner_notes: string | null;
  zoning_notes: string | null;
  access_notes: string | null;
  water_rights_notes: string | null;
  climate_region: string | null;
  bioregion: string | null;
  restrictions_covenants: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentRow {
  id: string;
  overall_score: number | null;
  /**
   * Canonical per-label scores from @ogden/shared/scoring, stored as jsonb.
   * Shape: ScoredResult[] — each element has {label, score, confidence,
   * score_breakdown: ScoreComponent[], …}. The legacy dict-of-dicts shape
   * (Record<string, Record<string, number>>) was retired in migration 009.
   */
  score_breakdown: ScoredResult[] | null;
  flags: AssessmentFlag[] | null;
  data_sources_used: string[] | null;
  confidence: string;
  needs_site_visit: boolean;
}

export interface LayerRow {
  layer_type: string;
  fetch_status: string;
  confidence: string;
  source_api: string | null;
  attribution_text: string | null;
  geojson_data: unknown;
}

export interface DesignFeatureRow {
  id: string;
  feature_type: string;
  subtype: string | null;
  label: string | null;
  properties: Record<string, unknown>;
  phase_tag: string | null;
  geometry_json: string;
  sort_order: number;
}

export interface ExportDataBag {
  project: ProjectRow;
  assessment: AssessmentRow | null;
  layers: LayerRow[];
  designFeatures: DesignFeatureRow[];
  payload: CreateExportInput['payload'];
  generatedAt: string;
}

export type TemplateFn = (data: ExportDataBag) => string;

// ─── Template imports ─────────────────────────────────────────────────────────

import { renderSiteAssessment } from './siteAssessment.js';
import { renderDesignBrief } from './designBrief.js';
import { renderFeatureSchedule } from './featureSchedule.js';
import { renderFieldNotes } from './fieldNotes.js';
import { renderInvestorSummary } from './investorSummary.js';
import { renderScenarioComparison } from './scenarioComparison.js';
import { renderEducationalBooklet } from './educationalBooklet.js';

export const TEMPLATE_REGISTRY: Record<ExportType, TemplateFn> = {
  site_assessment: renderSiteAssessment,
  design_brief: renderDesignBrief,
  feature_schedule: renderFeatureSchedule,
  field_notes: renderFieldNotes,
  investor_summary: renderInvestorSummary,
  scenario_comparison: renderScenarioComparison,
  educational_booklet: renderEducationalBooklet,
};
