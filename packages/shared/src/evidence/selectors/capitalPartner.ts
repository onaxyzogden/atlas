// apps/web/src/lib/evidence/selectors/capitalPartner.ts
//
// Phase E.2 — Capital Partner Summary modal evidence selector.
//
// Surfaces the assumption + derivation chain behind the web export
// modal: cost-line-item sources, enterprise selection, the J-curve
// trough/breakeven scalars (D.7), the SOM trajectory state (D.3),
// and the natural-capital appreciation USD/tC assumption.
//
// Covenant: appreciation of stewarded land value, not investor yield.
// No ROI/yield framing — labels stay neutral.

import type { EvidenceItem, EvidenceFragment } from '../types.js';

export interface CapitalPartnerEvidenceInputs {
  totalCapitalUsd: number;
  enterpriseCount: number;
  costLineItemCount: number;
  revenueStreamCount: number;
  /** Natural-capital monetised, year-1 (USD/yr). */
  natCapUsdYr?: number;
  natCapUsdPerTc?: number;
  /** D.7 J-curve scalars. */
  troughYear?: number | null;
  troughValueUsd?: number;
  breakevenYear?: number | null;
  /** SOM trajectory state. */
  somHasTrajectory: boolean;
  somHorizonYears?: number;
  /** Mission-score rubric value. */
  missionScore?: number;
  /** Assumption count surfaced in PDF (truncation context). */
  pdfAssumptionCount?: number;
}

export function selectCapitalPartnerEvidence(
  inputs: CapitalPartnerEvidenceInputs,
): EvidenceItem {
  const {
    totalCapitalUsd,
    enterpriseCount,
    costLineItemCount,
    revenueStreamCount,
    natCapUsdYr,
    natCapUsdPerTc,
    troughYear,
    troughValueUsd,
    breakevenYear,
    somHasTrajectory,
    somHorizonYears,
    missionScore,
    pdfAssumptionCount,
  } = inputs;

  const evidence: EvidenceFragment[] = [
    {
      label: 'Total capital partner contribution',
      value: Math.round(totalCapitalUsd),
      unit: 'USD',
      source: {
        kind: 'computed',
        derivation: 'sum(costLineItem.amount.mid)',
        confidence: 'high',
      },
      methodologyHint: 'Charitable + restricted + qarḍ ḥasan + in-kind + sponsorship; not advance-purchase.',
    },
    {
      label: 'Cost line items',
      value: costLineItemCount,
      source: {
        kind: 'computed',
        derivation: 'enterpriseDetector + cashflowEngine',
        confidence: 'high',
      },
    },
    {
      label: 'Revenue streams',
      value: revenueStreamCount,
      source: {
        kind: 'computed',
        derivation: 'revenueEngine.computeRevenueStreams',
        confidence: 'high',
      },
    },
    {
      label: 'Enterprises',
      value: enterpriseCount,
      source: {
        kind: 'computed',
        derivation: 'enterpriseDetector.detect',
        confidence: 'high',
      },
    },
  ];

  if (typeof natCapUsdYr === 'number') {
    evidence.push({
      label: 'Natural-capital appreciation (yr 1)',
      value: Math.round(natCapUsdYr),
      unit: 'USD/yr',
      source: {
        kind: 'computed',
        derivation: 'selectEcosystemValuationFromLayers',
        confidence: 'medium',
      },
      methodologyHint: 'Appreciation of stewarded land value, not investor yield.',
    });
  }

  if (typeof natCapUsdPerTc === 'number') {
    evidence.push({
      label: 'USD per tonne carbon',
      value: natCapUsdPerTc,
      unit: 'USD/tC',
      source: {
        kind: 'fixture',
        derivation: 'USD_PER_TC_DEFAULT',
        confidence: 'low',
      },
      methodologyHint: 'Mid-range social-cost-of-carbon proxy; D.7 plumbs a configurable price later.',
    });
  }

  if (typeof troughYear === 'number') {
    evidence.push({
      label: 'J-curve trough',
      value: `Year ${troughYear} (${Math.round(troughValueUsd ?? 0)} USD)`,
      source: {
        kind: 'computed',
        derivation: 'jCurveTrough.argmin(cumulativeNet)',
        confidence: 'high',
      },
    });
  }

  if (typeof breakevenYear === 'number') {
    evidence.push({
      label: 'J-curve breakeven',
      value: `Year ${breakevenYear}`,
      source: {
        kind: 'computed',
        derivation: 'jCurveTrough.firstNonNegativeCumulative',
        confidence: 'high',
      },
    });
  } else if (breakevenYear === null) {
    evidence.push({
      label: 'J-curve breakeven',
      value: 'beyond horizon',
      source: {
        kind: 'computed',
        derivation: 'jCurveTrough.firstNonNegativeCumulative',
        confidence: 'medium',
      },
    });
  }

  evidence.push({
    label: 'SOM trajectory',
    value: somHasTrajectory
      ? `${somHorizonYears ?? 10} years available`
      : 'not yet recomputed',
    source: {
      kind: 'computed',
      derivation: 'projectSomTrajectory',
      confidence: somHasTrajectory ? 'medium' : 'low',
    },
  });

  if (typeof missionScore === 'number') {
    evidence.push({
      label: 'Mission alignment',
      value: missionScore,
      unit: '/100',
      source: {
        kind: 'computed',
        derivation: 'missionScore rubric',
        confidence: 'medium',
      },
    });
  }

  if (typeof pdfAssumptionCount === 'number') {
    evidence.push({
      label: 'Assumptions in PDF',
      value: pdfAssumptionCount,
      source: {
        kind: 'fixture',
        derivation: 'capitalPartnerSummary template (15 on PDF page 1, remainder continued on page 2)',
        confidence: 'high',
      },
    });
  }

  return {
    panelKey: 'capital-partner',
    summary: {
      label: 'Capital partner summary',
      value: Math.round(totalCapitalUsd),
      unit: 'USD total',
    },
    evidence,
  };
}
