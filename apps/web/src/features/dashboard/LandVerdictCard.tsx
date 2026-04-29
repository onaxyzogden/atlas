/**
 * LandVerdictCard — executive verdict hero block (2026-04-27 brief §3 / Phase 3).
 *
 * Re-presents the existing suitability score and assessment flags as an
 * opinionated, advisory verdict rather than a raw number. Consumes the
 * canonical scoring helpers in @ogden/shared so verdict and breakdown can
 * never disagree.
 *
 * Verdict bands (per brief):
 *   80-100 → Strong Fit
 *   60-79  → Conditional Opportunity
 *   40-59  → Proceed with Caution
 *    0-39  → Not Recommended
 */

import { useMemo } from 'react';
import {
  computeAssessmentScores,
  computeOverallScore,
  deriveOpportunities,
  deriveRisks,
} from '../../lib/computeScores.js';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData } from '../../store/siteDataStore.js';
import type { MockLayerResult } from '../../lib/mockLayerData.js';
import { ScoreCircle } from '../../components/panels/sections/_shared.js';
import css from './LandVerdictCard.module.css';

const EMPTY_LAYERS: MockLayerResult[] = [];

export type VerdictBand = 'strong' | 'conditional' | 'caution' | 'blocked';

interface VerdictMeta {
  band: VerdictBand;
  label: string;
  interpretation: (score: number) => string;
}

const VERDICT_META: Record<VerdictBand, VerdictMeta> = {
  strong: {
    band: 'strong',
    label: 'Strong Fit',
    interpretation: (s) => `Site scores ${s}/100 — most regenerative uses are viable here. Move directly into design.`,
  },
  conditional: {
    band: 'conditional',
    label: 'Conditional Opportunity',
    interpretation: (s) => `Site scores ${s}/100 — viable for specific uses once the constraints below are resolved.`,
  },
  caution: {
    band: 'caution',
    label: 'Proceed with Caution',
    interpretation: (s) => `Site scores ${s}/100 — meaningful limitations. Validate constraints with a site visit before committing.`,
  },
  blocked: {
    band: 'blocked',
    label: 'Not Recommended',
    interpretation: (s) => `Site scores ${s}/100 — material risks outweigh upside under current data. Reframe scope or look elsewhere.`,
  },
};

function bandFor(score: number): VerdictBand {
  if (score >= 80) return 'strong';
  if (score >= 60) return 'conditional';
  if (score >= 40) return 'caution';
  return 'blocked';
}

interface LandVerdictCardProps {
  project: LocalProject;
  onViewConstraints?: () => void;
  onOpenDesignMap?: () => void;
  onGenerateBrief?: () => void;
}

export default function LandVerdictCard({
  project,
  onViewConstraints,
  onOpenDesignMap,
  onGenerateBrief,
}: LandVerdictCardProps) {
  const siteData = useSiteData(project.id);
  const layers = siteData?.layers ?? EMPTY_LAYERS;

  const overallScore = useMemo(() => {
    const scores = computeAssessmentScores(layers, project.acreage ?? null, project.country);
    return computeOverallScore(scores);
  }, [layers, project.acreage, project.country]);

  const risks = useMemo(
    () => deriveRisks(layers, project.country),
    [layers, project.country],
  );

  const opportunities = useMemo(
    () => deriveOpportunities(layers, project.country),
    [layers, project.country],
  );

  const blockingFlag = useMemo(() => {
    const critical = risks.filter((r) => r.severity === 'critical');
    if (critical.length === 0) return null;
    return [...critical].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
  }, [risks]);

  const bestFit = useMemo(() => {
    if (opportunities.length === 0) return null;
    return [...opportunities].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
  }, [opportunities]);

  const verdict = VERDICT_META[bandFor(overallScore)];

  return (
    <section
      className={css.card}
      role="status"
      aria-live="polite"
      aria-label={`Land verdict: ${verdict.label}, score ${overallScore} of 100`}
    >
      <div className={css.scoreCol}>
        <ScoreCircle score={overallScore} size={68} />
        <span className={css.scoreLabel}>Suitability</span>
      </div>

      <div className={css.body}>
        <div className={css.headerRow}>
          <span className={`${css.verdictBadge} ${css[`verdict_${verdict.band}`]}`}>
            {verdict.label}
          </span>
        </div>

        <p className={css.interpretation}>{verdict.interpretation(overallScore)}</p>

        <div className={css.factGrid}>
          <div>
            <div className={css.factLabel}>Main blocker</div>
            <div className={css.factValue}>
              {blockingFlag ? (
                blockingFlag.message
              ) : (
                <span className={css.factEmpty}>No critical blockers detected</span>
              )}
            </div>
          </div>
          <div>
            <div className={css.factLabel}>Best-fit use</div>
            <div className={css.factValue}>
              {bestFit ? (
                bestFit.message
              ) : (
                <span className={css.factEmpty}>Awaiting site data</span>
              )}
            </div>
          </div>
        </div>

        <div className={css.ctaRow}>
          <button
            type="button"
            className={css.cta}
            onClick={onViewConstraints}
            disabled={!onViewConstraints}
          >
            View Constraints
          </button>
          <button
            type="button"
            className={css.cta}
            onClick={onOpenDesignMap}
            disabled={!onOpenDesignMap}
          >
            Open Design Map
          </button>
          <button
            type="button"
            className={`${css.cta} ${css.ctaPrimary}`}
            onClick={onGenerateBrief}
            disabled={!onGenerateBrief}
          >
            Generate Brief
          </button>
        </div>
      </div>
    </section>
  );
}
