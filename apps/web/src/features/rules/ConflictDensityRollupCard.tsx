/**
 * §17 ConflictDensityRollupCard — per-feature conflict-density rollup
 * with explainable rationale chains.
 *
 * The existing SitingPanel Alerts tab lists violations as a flat
 * severity-grouped feed: blocking-then-warning-then-advisory across
 * every feature in the project. That answers "what's wrong?" but
 * obscures "where is the wrongness concentrated?" — a steward looking
 * at a 40-violation project needs to know which two structures are
 * carrying half the weight, not scroll a 40-card list.
 *
 * This card flips the view: groups violations by `affectedElementId`,
 * sorts features by an aggregate weighted-severity score (blocking=10,
 * warning=4, advisory=1, scaled by `weightValue`/100), and surfaces the
 * top 5 hot-spot features with each rule hit shown as an explainable
 * chain — title -> category -> data source -> suggestion. The score
 * makes priority obvious; the chain makes the recommendation auditable.
 *
 * Closes manifest §17 `rule-scoring-conflict-alerts-explainable-recommendations`
 * (P3) partial -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useSitingEvaluation,
  type WeightedViolation,
  type EffectiveSeverity,
} from '../../hooks/useSitingEvaluation.js';
import css from './ConflictDensityRollupCard.module.css';

interface Props {
  project: LocalProject;
}

interface FeatureGroup {
  elementId: string;
  elementName: string;
  violations: WeightedViolation[];
  score: number;
  blocking: number;
  warning: number;
  advisory: number;
}

const SEVERITY_WEIGHT: Record<EffectiveSeverity, number> = {
  blocking: 10,
  warning: 4,
  advisory: 1,
};

function severityScore(v: WeightedViolation): number {
  const base = SEVERITY_WEIGHT[v.effectiveSeverity];
  // Weight slider runs 0..100 — treat 50 as neutral. Multiplier in [0.5, 1.5].
  const mult = 0.5 + v.weightValue / 100;
  return base * mult;
}

const TOP_N = 5;

export default function ConflictDensityRollupCard({ project }: Props) {
  const evaluation = useSitingEvaluation(project);

  const groups = useMemo<FeatureGroup[]>(() => {
    const map = new Map<string, FeatureGroup>();
    for (const v of evaluation.violations) {
      let g = map.get(v.affectedElementId);
      if (!g) {
        g = {
          elementId: v.affectedElementId,
          elementName: v.affectedElementName,
          violations: [],
          score: 0,
          blocking: 0,
          warning: 0,
          advisory: 0,
        };
        map.set(v.affectedElementId, g);
      }
      g.violations.push(v);
      g.score += severityScore(v);
      if (v.effectiveSeverity === 'blocking') g.blocking++;
      else if (v.effectiveSeverity === 'warning') g.warning++;
      else g.advisory++;
    }
    return Array.from(map.values()).sort((a, b) => b.score - a.score);
  }, [evaluation.violations]);

  const totalScore = groups.reduce((sum, g) => sum + g.score, 0);
  const topGroups = groups.slice(0, TOP_N);
  const topShare = totalScore > 0
    ? Math.round((topGroups.reduce((s, g) => s + g.score, 0) / totalScore) * 100)
    : 0;
  const overflow = Math.max(0, groups.length - TOP_N);

  // Overall design-quality score: 100 minus normalized weighted load,
  // floored at 0. Treats 30 score-units as the threshold for "healthy".
  const qualityScore = Math.max(0, Math.round(100 - totalScore * (100 / Math.max(30, totalScore + 1))));

  let qualityBand: 'good' | 'fair' | 'poor';
  let qualityLabel: string;
  if (evaluation.totalCount === 0) {
    qualityBand = 'good';
    qualityLabel = 'No conflicts';
  } else if (evaluation.blockingCount === 0 && totalScore <= 12) {
    qualityBand = 'good';
    qualityLabel = 'Healthy';
  } else if (evaluation.blockingCount <= 1 && totalScore <= 30) {
    qualityBand = 'fair';
    qualityLabel = 'Workable';
  } else {
    qualityBand = 'poor';
    qualityLabel = 'Hot spots';
  }

  const bandClass =
    qualityBand === 'good' ? css.bandGood : qualityBand === 'fair' ? css.bandFair : css.bandPoor;

  return (
    <section className={css.card} aria-label="Conflict density rollup">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Conflict density rollup <span className={css.badge}>EXPLAINABLE</span>
          </h3>
          <p className={css.cardHint}>
            Groups every active siting-rule violation by the feature it
            affects, scores each feature by weighted severity, and surfaces
            the top hot spots with the full rationale chain for each rule
            hit. Designed to answer <em>where is the conflict concentrated</em>,
            not just <em>what conflicts exist</em>.
          </p>
        </div>
        <div className={`${css.bandPill} ${bandClass}`}>
          <span className={css.bandLabel}>{qualityLabel}</span>
          <span className={css.bandScore}>{qualityScore}/100</span>
        </div>
      </header>

      <div className={css.statsRow}>
        <div className={css.stat}>
          <span className={css.statLabel}>Features with hits</span>
          <span className={css.statValue}>
            {groups.length}
            <span className={css.statDim}> / {evaluation.featureCount}</span>
          </span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Total alerts</span>
          <span className={css.statValue}>{evaluation.totalCount}</span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Blocking</span>
          <span className={`${css.statValue} ${css.statBlocking}`}>
            {evaluation.blockingCount}
          </span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Top {Math.min(TOP_N, groups.length)} share</span>
          <span className={css.statValue}>{topShare}%</span>
        </div>
      </div>

      {evaluation.totalCount === 0 ? (
        <div className={css.cleanNote}>
          <span className={css.cleanIcon}>{'\u2713'}</span>
          <span>
            No siting-rule violations across the {evaluation.featureCount}{' '}
            placed feature{evaluation.featureCount === 1 ? '' : 's'}. Density
            rollup will activate as soon as a rule fires.
          </span>
        </div>
      ) : (
        <ol className={css.groupList}>
          {topGroups.map((g, idx) => {
            const sharePct = totalScore > 0 ? Math.round((g.score / totalScore) * 100) : 0;
            return (
              <li key={g.elementId} className={css.group}>
                <header className={css.groupHead}>
                  <span className={css.groupRank}>#{idx + 1}</span>
                  <span className={css.groupName}>{g.elementName}</span>
                  <span className={css.groupScore}>
                    {g.score.toFixed(1)} pts
                    <span className={css.groupShare}> &middot; {sharePct}%</span>
                  </span>
                </header>
                <div className={css.groupCounts}>
                  {g.blocking > 0 && (
                    <span className={`${css.countChip} ${css.chipBlocking}`}>
                      {g.blocking} blocking
                    </span>
                  )}
                  {g.warning > 0 && (
                    <span className={`${css.countChip} ${css.chipWarning}`}>
                      {g.warning} warning{g.warning === 1 ? '' : 's'}
                    </span>
                  )}
                  {g.advisory > 0 && (
                    <span className={`${css.countChip} ${css.chipAdvisory}`}>
                      {g.advisory} advisory
                    </span>
                  )}
                </div>
                <ul className={css.chainList}>
                  {g.violations.map((v) => (
                    <li key={v.ruleId} className={css.chainItem}>
                      <div className={css.chainHead}>
                        <span
                          className={
                            v.effectiveSeverity === 'blocking'
                              ? css.sevBlock
                              : v.effectiveSeverity === 'warning'
                              ? css.sevWarn
                              : css.sevAdv
                          }
                        >
                          {v.effectiveSeverity}
                        </span>
                        <span className={css.chainTitle}>{v.title}</span>
                        <span className={css.chainScore}>
                          {severityScore(v).toFixed(1)} pts
                        </span>
                      </div>
                      <div className={css.chainCrumbs}>
                        <span className={css.crumb}>{v.ruleWeightCategory}</span>
                        <span className={css.crumbSep}>{'\u203A'}</span>
                        <span className={css.crumb}>{v.category}</span>
                        <span className={css.crumbSep}>{'\u203A'}</span>
                        <span className={css.crumbSource}>{v.dataSource}</span>
                      </div>
                      <p className={css.chainBecause}>
                        <em>Because:</em> {v.description}
                      </p>
                      <p className={css.chainSuggest}>
                        <em>Recommend:</em> {v.suggestion}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}

      {overflow > 0 && (
        <p className={css.overflow}>
          {overflow} additional feature{overflow === 1 ? '' : 's'} with rule
          hits not shown — see the Alerts tab below for the full feed.
        </p>
      )}

      <p className={css.footnote}>
        <em>Scoring:</em> blocking = 10 pts, warning = 4 pts, advisory = 1 pt,
        each scaled by the weight slider for that rule&apos;s category
        (multiplier 0.5 at weight 0, 1.0 at weight 50, 1.5 at weight 100).
        Quality score is a soft normalization — it answers &ldquo;is this
        design clean or hot-spotted?&rdquo;, not a benchmark against other
        sites.
      </p>
    </section>
  );
}
