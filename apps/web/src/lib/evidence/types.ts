// apps/web/src/lib/evidence/types.ts
//
// Phase E.2 — Tier-2 Evidence layer types.
//
// The Evidence layer sits between the Tier-1 summary scalars (the
// numbers a card displays today) and the Tier-3 geospatial detail
// (raw layer GeoJSON + summary_data blobs). It answers "show me *why*
// this number is what it is" in a structured, panel-agnostic shape.
//
// Selectors are pure functions: they consume already-fetched inputs
// (layers, flags, computed scalars) and return an EvidenceItem. The
// Tier-2 disclosure UI (<EvidenceSection> in E.3) renders the
// EvidenceFragment[] as a 2-column grid; the Tier-3 <DetailsDrawer>
// uses `details.*Ref` pointers to fetch raw payloads on demand.
//
// See ADR 2026-MM-DD-atlas-phase-e-tier2-evidence-and-protocol-rerun.md.

/**
 * Stable panel identifiers. Selectors dispatch on this key via
 * `selectEvidenceFor(panelKey, inputs)`.
 */
export type PanelKey =
  | 'land-verdict'
  | 'decision-triad'
  | 'intelligence-summary'
  | 'site-narrative'
  | 'water-storage'
  | 'three-ethics'
  | 'water-router'
  | 'capital-partner';

/**
 * Where an EvidenceFragment's value originated.
 *
 * - `layer`: a Tier-1 summary scalar from a project_layers row
 *   (`layerType` populated).
 * - `rule`: an assessment-rule evaluation outcome from `ruleEngine.ts`
 *   (`ruleId` populated).
 * - `computed`: a deterministic derivation over other inputs
 *   (`derivation` populated, e.g., 'computeCarbonSequestration').
 * - `fixture`: a hard-coded constant or migration-seeded value
 *   (e.g., the 200-acre fixture's pinned flags).
 */
export type EvidenceSourceKind = 'layer' | 'rule' | 'computed' | 'fixture';

export interface EvidenceSource {
  kind: EvidenceSourceKind;
  /** For `kind === 'layer'`: e.g., 'soils', 'wetlands_flood'. */
  layerType?: string;
  /** For `kind === 'rule'`: the rule id from `assessmentRules.ts`. */
  ruleId?: string;
  /** For `kind === 'computed'`: short label, e.g., 'computeCarbonSequestration'. */
  derivation?: string;
  /** Confidence in this fragment's value. */
  confidence?: 'low' | 'medium' | 'high';
}

export interface EvidenceFragment {
  label: string;
  value: string | number;
  unit?: string;
  source: EvidenceSource;
  /** ≤ 120 chars; surfaced in DetailsDrawer's per-fragment tooltip. */
  methodologyHint?: string;
}

export interface EvidenceItem {
  panelKey: PanelKey;
  summary: { label: string; value: string | number; unit?: string };
  /** 3–8 fragments per panel; selectors trim to top-N when needed. */
  evidence: EvidenceFragment[];
  /** Pointers to raw payloads — NEVER the payload itself. */
  details?: { rawGeoJsonRef?: string; rawSummaryRef?: string };
}
