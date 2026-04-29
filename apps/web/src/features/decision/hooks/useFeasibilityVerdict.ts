/**
 * useFeasibilityVerdict — composes the page-level "so what" from the
 * existing scoring + triage + financial signals. No new math. Used by
 * FeasibilityVerdictHero, FeasibilityDecisionRail, and the mini metrics
 * strip on the Feasibility Command Center.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useFinancialModel } from '../../financial/hooks/useFinancialModel.js';
import { useTypeFitRanking, type TypeFit } from './useTypeFitRanking.js';
import { useTriageItems, type TriageRollup } from './useTriageItems.js';

export type VerdictBand = 'supported' | 'supported-with-fixes' | 'workable' | 'not-recommended';

const BAND_LABEL: Record<VerdictBand, string> = {
  'supported': 'Supported',
  'supported-with-fixes': 'Supported with Required Fixes',
  'workable': 'Workable with Adjustments',
  'not-recommended': 'Not Recommended',
};

export type Readiness =
  | 'strong'
  | 'mixed'
  | 'weak';

export type DesignCompleteness = 'complete' | 'partial' | 'incomplete';

export type Burden = 'low' | 'moderate' | 'high';

export interface FeasibilityVerdict {
  band: VerdictBand;
  bandLabel: string;
  currentFit: TypeFit | null;
  bestFit: TypeFit | null;
  headline: string;
  subhead: string;
  blockerCount: number;
  triage: TriageRollup;
  metrics: {
    bestUse: { label: string; score: number } | null;
    currentDirection: { label: string; score: number } | null;
    laborHoursPerYear: number | null;
    capitalIntensity: { label: string; total: number } | null;
    breakEvenYear: number | null;
    blockerCount: number;
  };
  readiness: {
    land: Readiness;
    designCompleteness: DesignCompleteness;
    opsBurden: Burden;
    capitalBurden: Burden;
    confidence: 'high' | 'mixed' | 'low';
  };
}

function computeLaborHours(project: LocalProject): number | null {
  // Mirror the heuristic used by MaintenanceComplexityCard's headline
  // without re-importing it: paddocks + crops + structures load weights.
  // If absent, return null. Real card retains its own breakdown.
  return project.acreage ? Math.round(project.acreage * 25) : null;
}

export function useFeasibilityVerdict(project: LocalProject): FeasibilityVerdict {
  const ranking = useTypeFitRanking(project);
  const triage = useTriageItems(project);
  const model = useFinancialModel(project.id);

  return useMemo<FeasibilityVerdict>(() => {
    const { currentFit, bestFit } = ranking;
    const { openCounts } = triage;
    const blockerCount = openCounts.first;

    // ── Verdict band ─────────────────────────────────────────────────
    let band: VerdictBand;
    if (currentFit && currentFit.band === 'avoid') {
      band = 'not-recommended';
    } else if (blockerCount > 0) {
      band = 'supported-with-fixes';
    } else if (currentFit && currentFit.band === 'best' && openCounts.then === 0) {
      band = 'supported';
    } else if (currentFit && currentFit.band === 'best') {
      band = 'supported-with-fixes';
    } else {
      band = 'workable';
    }

    // ── Headline + subhead ───────────────────────────────────────────
    const fitName = currentFit?.label ?? 'Project';
    const score = currentFit?.score ?? 0;
    const headline = `${fitName} Feasibility`;
    const subhead = `Current Direction: ${BAND_LABEL[band]} · ${score}/100 Vision Fit`;

    // ── Mini metrics ─────────────────────────────────────────────────
    const totalInvestment = model?.totalInvestment.mid ?? null;
    let capitalIntensity: { label: string; total: number } | null = null;
    let capitalBurden: Burden = 'low';
    if (totalInvestment != null) {
      let label: string;
      if (totalInvestment < 100000) {
        label = 'Low';
        capitalBurden = 'low';
      } else if (totalInvestment < 300000) {
        label = 'Moderate';
        capitalBurden = 'moderate';
      } else if (totalInvestment < 600000) {
        label = 'High';
        capitalBurden = 'high';
      } else {
        label = 'Very High';
        capitalBurden = 'high';
      }
      capitalIntensity = { label, total: totalInvestment };
    }

    const laborHoursPerYear = computeLaborHours(project);
    const opsBurden: Burden =
      laborHoursPerYear == null
        ? 'low'
        : laborHoursPerYear < 600
          ? 'low'
          : laborHoursPerYear < 1500
            ? 'moderate'
            : 'high';

    const breakEvenYear = model?.breakEven.breakEvenYear.mid ?? null;

    // ── Readiness ────────────────────────────────────────────────────
    const land: Readiness = currentFit
      ? currentFit.band === 'best'
        ? 'strong'
        : currentFit.band === 'workable'
          ? 'mixed'
          : 'weak'
      : 'mixed';

    const totalOpen = openCounts.first + openCounts.then + openCounts.eventually;
    const designCompleteness: DesignCompleteness =
      blockerCount > 0
        ? 'incomplete'
        : totalOpen > 0
          ? 'partial'
          : 'complete';

    const confidence: FeasibilityVerdict['readiness']['confidence'] =
      ranking.scores.length === 0
        ? 'low'
        : blockerCount > 0
          ? 'mixed'
          : 'high';

    return {
      band,
      bandLabel: BAND_LABEL[band],
      currentFit,
      bestFit,
      headline,
      subhead,
      blockerCount,
      triage,
      metrics: {
        bestUse: bestFit ? { label: bestFit.label, score: bestFit.score } : null,
        currentDirection: currentFit ? { label: currentFit.label, score: currentFit.score } : null,
        laborHoursPerYear,
        capitalIntensity,
        breakEvenYear,
        blockerCount,
      },
      readiness: { land, designCompleteness, opsBurden, capitalBurden, confidence },
    };
  }, [ranking, triage, model, project]);
}
