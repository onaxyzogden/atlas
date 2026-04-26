/**
 * §19 BestUseSummaryCard — "Best uses for this land / Not recommended uses"
 * cross-project-type ranking. While VisionFitAnalysis evaluates fit for the
 * *currently selected* project type, this card asks the inverse question:
 * which project types would this land actually support, and which should
 * be avoided?
 *
 * For each known project type we run computeVisionFit against the live
 * assessment scores, then collapse the per-requirement statuses into a
 * weighted 0-100 fit score. Types are sorted and bucketed into best-use,
 * workable, and not-recommended bands. The currently selected type is
 * tagged inline so the steward can see whether the chosen direction lines
 * up with the land's aptitude.
 *
 * Pure derivation — no writes, no map overlays, no shared-package math.
 */
import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData } from '../../store/siteDataStore.js';
import { computeAssessmentScores } from '../../lib/computeScores.js';
import {
  computeVisionFit,
  projectTypeLabel,
  PROJECT_TYPES,
  type FitResult,
} from '../../lib/visionFit.js';
import css from './BestUseSummaryCard.module.css';

interface BestUseSummaryCardProps {
  project: LocalProject;
}

type Band = 'best' | 'workable' | 'avoid';

interface TypeFit {
  type: string;
  label: string;
  score: number;
  band: Band;
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

function bandFor(score: number, criticalChallenges: number): Band {
  if (criticalChallenges >= 2) return 'avoid';
  if (score >= 65 && criticalChallenges === 0) return 'best';
  if (score < 40) return 'avoid';
  return 'workable';
}

export default function BestUseSummaryCard({ project }: BestUseSummaryCardProps) {
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
          band: 'avoid' as Band,
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

  const currentType = project.projectType;
  const currentFit = fits.find((f) => f.type === currentType) ?? null;

  if (scores.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.head}>
          <h3 className={css.title}>Best Use Summary</h3>
          <span className={css.badge}>HEURISTIC</span>
        </div>
        <p className={css.empty}>
          No site data layers loaded yet. Fetch terrain, soil, and water layers to rank
          which project types this land would support.
        </p>
      </div>
    );
  }

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Best Use Summary</h3>
          <p className={css.hint}>
            Cross-references the land&apos;s assessment scores against every supported
            project type to surface where this site is naturally aligned and where it
            would fight the steward.
          </p>
        </div>
        <span className={css.badge}>HEURISTIC</span>
      </div>

      {currentFit && (
        <div
          className={`${css.currentBanner} ${
            currentFit.band === 'best'
              ? css.currentGood
              : currentFit.band === 'avoid'
                ? css.currentBad
                : css.currentMid
          }`}
        >
          <div className={css.currentLabel}>Current direction</div>
          <div className={css.currentRow}>
            <span className={css.currentName}>{currentFit.label}</span>
            <span className={css.currentScore}>{currentFit.score}/100</span>
          </div>
          <div className={css.currentNote}>
            {currentFit.band === 'best' && 'This land naturally supports the chosen vision.'}
            {currentFit.band === 'workable' &&
              'Workable, but expect compromises where critical scores fall short.'}
            {currentFit.band === 'avoid' &&
              `${currentFit.criticalChallenges} critical requirement${
                currentFit.criticalChallenges === 1 ? '' : 's'
              } unmet. Consider the alternatives below before committing.`}
          </div>
        </div>
      )}

      <BandBlock
        title="Best uses for this land"
        emptyText="No project type clears the best-use threshold yet \u2014 the workable list below is the next-best fit."
        tone="good"
        currentType={currentType}
        items={best}
      />

      {workable.length > 0 && (
        <BandBlock
          title="Workable with adjustments"
          tone="mid"
          currentType={currentType}
          items={workable}
        />
      )}

      {avoid.length > 0 && (
        <BandBlock
          title="Not recommended uses"
          tone="bad"
          currentType={currentType}
          items={avoid}
        />
      )}

      <p className={css.footnote}>
        <strong>Method.</strong> Each project type has weighted score thresholds
        (critical &middot; important &middot; supportive). Met thresholds earn full credit,
        near-misses earn half, and shortfalls earn zero. Two or more unmet
        <em> critical</em> thresholds drop a type into <em>not recommended</em> regardless
        of total score.
      </p>
    </div>
  );
}

interface BandBlockProps {
  title: string;
  emptyText?: string;
  tone: 'good' | 'mid' | 'bad';
  currentType: string | null;
  items: TypeFit[];
}

function BandBlock({ title, emptyText, tone, currentType, items }: BandBlockProps) {
  const toneClass =
    tone === 'good' ? css.bandGood : tone === 'bad' ? css.bandBad : css.bandMid;

  return (
    <section className={`${css.band} ${toneClass}`}>
      <h4 className={css.bandTitle}>{title}</h4>
      {items.length === 0 ? (
        emptyText ? <p className={css.bandEmpty}>{emptyText}</p> : null
      ) : (
        <ul className={css.list}>
          {items.map((it) => (
            <li key={it.type} className={css.row}>
              <div className={css.rowMain}>
                <span className={css.rowName}>
                  {it.label}
                  {it.type === currentType && <span className={css.youAreHere}>current</span>}
                </span>
                <span className={css.rowScore}>{it.score}/100</span>
              </div>
              <div className={css.rowMeta}>
                {it.topStrength && (
                  <span className={css.metaGood}>
                    {'\u2713'} {it.topStrength}
                  </span>
                )}
                {it.topGap && (
                  <span className={css.metaBad}>
                    {'\u2717'} {it.topGap}
                  </span>
                )}
                {it.criticalChallenges > 0 && (
                  <span className={css.metaCrit}>
                    {it.criticalChallenges} critical gap
                    {it.criticalChallenges === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
