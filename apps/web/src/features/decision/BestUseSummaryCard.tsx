/**
 * §19 BestUseSummaryCard — "Best uses for this land / Not recommended uses"
 * cross-project-type ranking. While VisionFitAnalysis evaluates fit for the
 * *currently selected* project type, this card asks the inverse question:
 * which project types would this land actually support, and which should
 * be avoided?
 *
 * Pure derivation — no writes, no map overlays, no shared-package math.
 * Ranking math lives in `hooks/useTypeFitRanking.ts` so the Feasibility
 * Command Center hero can reuse the same TypeFit[] without duplicating it.
 */
import type { LocalProject } from '../../store/projectStore.js';
import { useTypeFitRanking, type TypeFit } from './hooks/useTypeFitRanking.js';
import css from './BestUseSummaryCard.module.css';

interface BestUseSummaryCardProps {
  project: LocalProject;
}

export default function BestUseSummaryCard({ project }: BestUseSummaryCardProps) {
  const { scores, best, workable, avoid, currentFit } = useTypeFitRanking(project);
  const currentType = project.projectType;

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
        emptyText="No project type clears the best-use threshold yet — the workable list below is the next-best fit."
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
                    {'✓'} {it.topStrength}
                  </span>
                )}
                {it.topGap && (
                  <span className={css.metaBad}>
                    {'✗'} {it.topGap}
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
