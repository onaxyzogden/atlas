// apps/web/src/lib/evidence/selectors/triad.ts
//
// Phase E.2 — DecisionTriad / FlagCard evidence selector.
//
// Per-flag selector: a Triad row already displays one AssessmentFlag,
// and the disclosure exposes the rule id + source layer + confidence
// that produced it. The caller invokes this once per visible flag.

import type { AssessmentFlag } from '../../schemas/assessment.schema.js';
import type { EvidenceItem, EvidenceFragment } from '../types.js';

export interface TriadEvidenceInputs {
  flag: AssessmentFlag;
  bucket: 'risk' | 'opportunity' | 'limitation';
}

export function selectTriadEvidence(
  inputs: TriadEvidenceInputs,
): EvidenceItem {
  const { flag, bucket } = inputs;

  const evidence: EvidenceFragment[] = [
    {
      label: 'Rule',
      value: flag.id,
      source: {
        kind: 'rule',
        ruleId: flag.id,
        confidence: 'high',
      },
      methodologyHint: 'Rule definition in assessmentRules.ts; condition() + message() pure-functions.',
    },
    {
      label: 'Severity',
      value: flag.severity,
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
    },
    {
      label: 'Category',
      value: flag.category,
      source: {
        kind: 'rule',
        ruleId: flag.id,
        confidence: 'high',
      },
    },
    {
      label: 'Priority',
      value: flag.priority,
      unit: '/100',
      source: {
        kind: 'rule',
        ruleId: flag.id,
        confidence: 'high',
      },
      methodologyHint: 'Higher = surfaces sooner in the sorted flag list.',
    },
  ];

  if (flag.layerSource) {
    evidence.push({
      label: 'Source layer',
      value: flag.layerSource,
      source: {
        kind: 'layer',
        layerType: flag.layerSource,
        confidence: 'high',
      },
      methodologyHint: 'Layer that supplied the scalar input(s) to the rule condition.',
    });
  }

  return {
    panelKey: 'decision-triad',
    summary: { label: bucket, value: flag.message },
    evidence,
  };
}
