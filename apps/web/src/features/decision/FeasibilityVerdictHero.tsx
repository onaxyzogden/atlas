/**
 * FeasibilityVerdictHero — executive hero block for the Feasibility
 * Command Center. Mirrors LandVerdictCard's visual language but speaks
 * specifically to the project-type vision-fit verdict, not raw site
 * suitability. Pure presentation — pulls all data from
 * useFeasibilityVerdict.
 */

import type { LocalProject } from '../../store/projectStore.js';
import { ScoreCircle } from '../../components/panels/sections/_shared.js';
import { useFeasibilityVerdict, type VerdictBand } from './hooks/useFeasibilityVerdict.js';
import css from './FeasibilityVerdictHero.module.css';

interface Props {
  project: LocalProject;
  onFixBlockers?: () => void;
  onOpenDesignMap?: () => void;
  onGenerateBrief?: () => void;
}

const BAND_TONE: Record<VerdictBand, string | undefined> = {
  'supported': css.verdict_strong,
  'supported-with-fixes': css.verdict_conditional,
  'workable': css.verdict_caution,
  'not-recommended': css.verdict_blocked,
};

function formatCapital(total: number): string {
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(total / 1000)}K`;
}

export default function FeasibilityVerdictHero({
  project,
  onFixBlockers,
  onOpenDesignMap,
  onGenerateBrief,
}: Props) {
  const verdict = useFeasibilityVerdict(project);
  const score = verdict.currentFit?.score ?? 0;

  return (
    <section
      className={css.card}
      role="status"
      aria-live="polite"
      aria-label={`Feasibility verdict: ${verdict.bandLabel}, score ${score} of 100`}
    >
      <div className={css.scoreCol}>
        <ScoreCircle score={score} size={68} />
        <span className={css.scoreLabel}>Vision Fit</span>
      </div>

      <div className={css.body}>
        <div className={css.headerRow}>
          <h2 className={css.title}>{verdict.headline}</h2>
          <span className={`${css.verdictBadge} ${BAND_TONE[verdict.band]}`}>
            {verdict.bandLabel}
          </span>
        </div>

        <p className={css.subhead}>{verdict.subhead}</p>

        <p className={css.interpretation}>
          {verdict.band === 'supported' &&
            'This land naturally supports the chosen vision and the design is on track. Move into detailed design.'}
          {verdict.band === 'supported-with-fixes' &&
            `This land naturally supports the chosen vision, but execution is currently blocked by ${verdict.blockerCount} unresolved item${verdict.blockerCount === 1 ? '' : 's'}. Resolve the blockers below before treating downstream feasibility as final.`}
          {verdict.band === 'workable' &&
            'Workable, but expect compromises where critical scores fall short. Validate before committing.'}
          {verdict.band === 'not-recommended' &&
            'Material risks outweigh upside under current data. Reframe scope or consider one of the better-fit project types in the Best Use Summary below.'}
        </p>

        <div className={css.factGrid}>
          <Metric
            label="Best use"
            value={verdict.metrics.bestUse ? `${verdict.metrics.bestUse.label} — ${verdict.metrics.bestUse.score}/100` : null}
          />
          <Metric
            label="Current direction"
            value={verdict.metrics.currentDirection ? `${verdict.metrics.currentDirection.label} — ${verdict.metrics.currentDirection.score}/100` : null}
          />
          <Metric
            label="Labor load"
            value={verdict.metrics.laborHoursPerYear != null ? `${verdict.metrics.laborHoursPerYear} hrs/yr` : null}
          />
          <Metric
            label="Capital intensity"
            value={verdict.metrics.capitalIntensity ? `${verdict.metrics.capitalIntensity.label} — ${formatCapital(verdict.metrics.capitalIntensity.total)}` : null}
          />
          <Metric
            label="Break-even"
            value={verdict.metrics.breakEvenYear != null ? `Year ${verdict.metrics.breakEvenYear}` : null}
          />
          <Metric
            label="Blocking issues"
            value={`${verdict.metrics.blockerCount}`}
            tone={verdict.metrics.blockerCount > 0 ? 'warn' : 'good'}
          />
        </div>

        <div className={css.ctaRow}>
          <button
            type="button"
            className={css.cta}
            onClick={onFixBlockers}
            disabled={!onFixBlockers || verdict.blockerCount === 0}
          >
            Fix Blocking Issues
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
            Generate Feasibility Brief
          </button>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | null; tone?: 'good' | 'warn' }) {
  return (
    <div>
      <div className={css.factLabel}>{label}</div>
      <div className={`${css.factValue} ${tone === 'warn' ? css.factWarn : tone === 'good' ? css.factGood : ''}`}>
        {value ?? <span className={css.factEmpty}>—</span>}
      </div>
    </div>
  );
}
