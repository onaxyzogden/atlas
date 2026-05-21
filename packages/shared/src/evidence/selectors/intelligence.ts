// apps/web/src/lib/evidence/selectors/intelligence.ts
//
// Phase E.2 — Intelligence-summary panel selector.
//
// Phase A.1's standalone IntelligenceSummaryCard was deemed obsolete
// (the v3 Observe IA already consolidates intelligence via
// LandVerdictCard + ObserveChecklistAside). This selector remains
// available as a composite for any future surface that wants a single
// Tier-2 disclosure covering both the verdict and the AI narrative.

import type { AssessmentFlag } from '@ogden/shared';
import type { EvidenceItem, EvidenceFragment } from '../types.js';

export interface IntelligenceEvidenceInputs {
  overallScore: number;
  layers: ReadonlyArray<{ layerType: string }>;
  topFlags: ReadonlyArray<AssessmentFlag>;
  aiModelVersion?: string;
  aiNarrativeCaveat?: string;
}

export function selectIntelligenceEvidence(
  inputs: IntelligenceEvidenceInputs,
): EvidenceItem {
  const { overallScore, layers, topFlags, aiModelVersion, aiNarrativeCaveat } =
    inputs;

  const evidence: EvidenceFragment[] = [
    {
      label: 'Synthesis score',
      value: Math.round(overallScore),
      unit: '/100',
      source: {
        kind: 'computed',
        derivation: 'computeOverallScore',
        confidence: 'high',
      },
    },
    {
      label: 'Layers analysed',
      value: layers.length,
      source: {
        kind: 'computed',
        derivation: 'projectLayerRoster',
        confidence: layers.length >= 5 ? 'high' : 'medium',
      },
      methodologyHint: layers.map((l) => l.layerType).join(', '),
    },
    {
      label: 'Flags surfaced',
      value: topFlags.length,
      source: {
        kind: 'computed',
        derivation: 'evaluateAssessmentRules',
        confidence: 'high',
      },
    },
  ];

  if (aiModelVersion) {
    evidence.push({
      label: 'AI model',
      value: aiModelVersion,
      source: {
        kind: 'computed',
        derivation: 'ClaudeClient.generateSiteNarrative',
        confidence: 'medium',
      },
      methodologyHint: 'AI synthesis is advisory; do not treat as ground truth.',
    });
  }

  if (aiNarrativeCaveat) {
    evidence.push({
      label: 'Caveat',
      value: aiNarrativeCaveat,
      source: {
        kind: 'computed',
        derivation: 'aiNarrativeCaveat',
        confidence: 'low',
      },
    });
  }

  return {
    panelKey: 'intelligence-summary',
    summary: { label: 'Site intelligence', value: Math.round(overallScore), unit: '/100' },
    evidence,
  };
}
