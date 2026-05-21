// apps/web/src/lib/evidence/selectors/verdict.ts
//
// Phase E.2 — LandVerdictCard evidence selector.
//
// Consumes already-derived inputs: the assessment overall score,
// the layer roster (for Tier-1 confidence signal), and the top
// contributing flags (already sorted by priority). Returns the
// canonical Tier-2 fragments the verdict card should disclose.

import type { AssessmentFlag } from '@ogden/shared';
import type { EvidenceItem, EvidenceFragment } from '../types.js';

export interface VerdictEvidenceInputs {
  overallScore: number;
  layers: ReadonlyArray<{ layerType: string; confidence?: 'high' | 'medium' | 'low' }>;
  /** Already-sorted by `compareFlags` from ruleEngine.ts (highest priority first). */
  topFlags: ReadonlyArray<AssessmentFlag>;
  /** Optional: country surfaced as a derivation context note. */
  country?: string;
}

const VERDICT_LABEL_BANDS: Array<{ min: number; label: string }> = [
  { min: 80, label: 'Strong Opportunity' },
  { min: 60, label: 'Conditional Opportunity' },
  { min: 40, label: 'Constrained Opportunity' },
  { min: 0, label: 'High-Constraint Site' },
];

function verdictLabel(score: number): string {
  for (const band of VERDICT_LABEL_BANDS) {
    if (score >= band.min) return band.label;
  }
  return 'Unknown';
}

export function selectVerdictEvidence(
  inputs: VerdictEvidenceInputs,
): EvidenceItem {
  const { overallScore, layers, topFlags, country } = inputs;
  const label = verdictLabel(overallScore);

  const evidence: EvidenceFragment[] = [];

  // Score derivation fragment.
  evidence.push({
    label: 'Overall score',
    value: Math.round(overallScore),
    unit: '/100',
    source: {
      kind: 'computed',
      derivation: 'computeOverallScore(suitability+buildability+waterResilience+agriculturalPotential)',
      confidence: 'high',
    },
    methodologyHint: 'Mean of 4 weighted scorecards; thresholds per Apricot-Lane biological-potential framing.',
  });

  // Layer-roster fragment (signals data completeness).
  const layerTypes = layers.map((l) => l.layerType).join(', ');
  evidence.push({
    label: 'Input layers',
    value: layers.length,
    unit: layers.length === 1 ? 'layer' : 'layers',
    source: {
      kind: 'computed',
      derivation: 'projectLayerRoster',
      confidence: layers.length >= 5 ? 'high' : layers.length >= 3 ? 'medium' : 'low',
    },
    methodologyHint: layerTypes.length > 0 ? `Roster: ${layerTypes}` : 'No layers fetched yet.',
  });

  // Top-3 contributing flags by priority.
  for (const flag of topFlags.slice(0, 3)) {
    evidence.push({
      label: flag.type === 'opportunity' ? 'Opportunity flag' : 'Risk flag',
      value: flag.message,
      source: {
        kind: 'rule',
        ruleId: flag.id,
        confidence:
          flag.severity === 'critical'
            ? 'high'
            : flag.severity === 'warning'
              ? 'medium'
              : 'low',
      },
      methodologyHint: flag.layerSource ? `Source layer: ${flag.layerSource}` : undefined,
    });
  }

  // Country context fragment (always present so the band threshold is auditable).
  if (country) {
    evidence.push({
      label: 'Classification context',
      value: country,
      source: {
        kind: 'fixture',
        derivation: 'projectCountry',
        confidence: 'high',
      },
      methodologyHint: 'Country determines FAO/USDA suitability class overrides.',
    });
  }

  return {
    panelKey: 'land-verdict',
    summary: { label, value: Math.round(overallScore), unit: '/100' },
    evidence,
  };
}
