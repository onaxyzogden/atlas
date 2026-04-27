/**
 * useTypeFitRanking — shared cross-project-type fit ranking. Extracted
 * from §19 BestUseSummaryCard so the Feasibility Command Center hero
 * and the Best Use card can derive the same TypeFit[] without duplicating
 * the weighted scoring math.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData } from '../../../store/siteDataStore.js';
import { computeAssessmentScores, type ScoredResult } from '../../../lib/computeScores.js';
import {
  computeVisionFit,
  projectTypeLabel,
  PROJECT_TYPES,
  type FitResult,
} from '../../../lib/visionFit.js';

export type TypeFitBand = 'best' | 'workable' | 'avoid';

export interface TypeFit {
  type: string;
  label: string;
  score: number;
  band: TypeFitBand;
  results: FitResult[];
  criticalChallenges: number;
  topStrength: string | null;
  topGap: string | null;
}

const WEIGHT_VALUE: Record<FitResult['weight'], number> = {
  critical: 3,
  important: 2,
  supportive: 1,
};

const STATUS_VALUE: Record<FitResult['status'], number> = {
  strong: 1,
  moderate: 0.5,
  challenge: 0,
};

function bandFor(score: number, criticalChallenges: number): TypeFitBand {
  if (criticalChallenges >= 2) return 'avoid';
  if (score >= 65 && criticalChallenges === 0) return 'best';
  if (score < 40) return 'avoid';
  return 'workable';
}

export interface TypeFitRanking {
  scores: ScoredResult[];
  fits: TypeFit[];
  best: TypeFit[];
  workable: TypeFit[];
  avoid: TypeFit[];
  currentFit: TypeFit | null;
  bestFit: TypeFit | null;
}

export function useTypeFitRanking(project: LocalProject): TypeFitRanking {
  const siteData = useSiteData(project.id);

  const scores = useMemo(() => {
    if (!siteData?.layers) return [];
    return computeAssessmentScores(siteData.layers, project.acreage);
  }, [siteData, project.acreage]);

  const fits = useMemo<TypeFit[]>(() => {
    if (scores.length === 0) return [];

    return PROJECT_TYPES.map((type) => {
      const results = computeVisionFit(type, scores);
      if (results.length === 0) {
        return {
          type,
          label: projectTypeLabel(type),
          score: 0,
          band: 'avoid' as TypeFitBand,
          results: [],
          criticalChallenges: 0,
          topStrength: null,
          topGap: null,
        };
      }

      let earned = 0;
      let possible = 0;
      let criticalChallenges = 0;
      let topStrength: FitResult | null = null;
      let topGap: FitResult | null = null;

      for (const r of results) {
        const w = WEIGHT_VALUE[r.weight];
        possible += w;
        earned += w * STATUS_VALUE[r.status];

        if (r.weight === 'critical' && r.status === 'challenge') {
          criticalChallenges += 1;
        }
        if (r.status === 'strong') {
          if (!topStrength || WEIGHT_VALUE[r.weight] > WEIGHT_VALUE[topStrength.weight]) {
            topStrength = r;
          }
        }
        if (r.status === 'challenge') {
          if (!topGap || WEIGHT_VALUE[r.weight] > WEIGHT_VALUE[topGap.weight]) {
            topGap = r;
          }
        }
      }

      const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;
      const band = bandFor(score, criticalChallenges);

      return {
        type,
        label: projectTypeLabel(type),
        score,
        band,
        results,
        criticalChallenges,
        topStrength: topStrength ? topStrength.scoreName : null,
        topGap: topGap ? topGap.scoreName : null,
      };
    }).sort((a, b) => b.score - a.score);
  }, [scores]);

  const best = fits.filter((f) => f.band === 'best');
  const workable = fits.filter((f) => f.band === 'workable');
  const avoid = fits.filter((f) => f.band === 'avoid');
  const currentFit = fits.find((f) => f.type === project.projectType) ?? null;
  const bestFit = fits[0] ?? null;

  return { scores, fits, best, workable, avoid, currentFit, bestFit };
}
