/**
 * FeasibilityDecisionRail — sticky right-rail "decision brain" for the
 * Feasibility Command Center. Surfaces verdict, top blocker, next 3
 * actions, readiness chips, and primary CTAs. All data flows from
 * useFeasibilityVerdict — no derivation of its own.
 */

import type { LocalProject } from '../../store/projectStore.js';
import { useFeasibilityVerdict, type Burden, type Readiness, type DesignCompleteness } from './hooks/useFeasibilityVerdict.js';
import css from './FeasibilityDecisionRail.module.css';

interface Props {
  project: LocalProject;
  onFixOnMap?: () => void;
  onGenerateBrief?: () => void;
  onScrollToBlockers?: () => void;
}

const READINESS_TONE: Record<Readiness | DesignCompleteness | Burden | 'high' | 'mixed' | 'low', 'good' | 'mid' | 'bad'> = {
  strong: 'good',
  mixed: 'mid',
  weak: 'bad',
  complete: 'good',
  partial: 'mid',
  incomplete: 'bad',
  low: 'good',
  moderate: 'mid',
  high: 'bad',
};

function chipTone(value: string): 'good' | 'mid' | 'bad' {
  return READINESS_TONE[value as keyof typeof READINESS_TONE] ?? 'mid';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function FeasibilityDecisionRail({
  project,
  onFixOnMap,
  onGenerateBrief,
  onScrollToBlockers,
}: Props) {
  const verdict = useFeasibilityVerdict(project);
  const blockers = verdict.triage.grouped.first;
  const topBlocker = blockers[0] ?? null;
  const nextActions = blockers.slice(0, 3);

  // Capital burden inverted for chip text (high = bad, but label is what user wants to see)
  const capitalLabel: Record<Burden, string> = { low: 'Low', moderate: 'Moderate', high: 'High' };
  const opsLabel: Record<Burden, string> = { low: 'Light', moderate: 'Moderate', high: 'Heavy' };
  const landLabel: Record<Readiness, string> = { strong: 'Strong', mixed: 'Mixed', weak: 'Weak' };
  const designLabel: Record<DesignCompleteness, string> = {
    complete: 'Complete',
    partial: 'Partial',
    incomplete: 'Incomplete',
  };
  const confLabel: Record<'high' | 'mixed' | 'low', string> = {
    high: 'High',
    mixed: 'Mixed',
    low: 'Low',
  };

  return (
    <aside className={css.rail} aria-label="Decision rail">
      <Section title="Current Verdict">
        <div className={`${css.verdictBadge} ${css[`verdict_${verdict.band.replace(/-/g, '_')}`]}`}>
          {verdict.bandLabel}
        </div>
        <p className={css.verdictNote}>
          {verdict.metrics.currentDirection
            ? `${verdict.metrics.currentDirection.label} · ${verdict.metrics.currentDirection.score}/100`
            : 'No project type selected'}
        </p>
      </Section>

      <Section title="Top Blocker">
        {topBlocker ? (
          <button
            type="button"
            className={css.blockerLink}
            onClick={onScrollToBlockers}
            disabled={!onScrollToBlockers}
          >
            <span className={css.blockerDot} aria-hidden="true" />
            <span className={css.blockerText}>{topBlocker.label}</span>
          </button>
        ) : (
          <p className={css.empty}>No blockers detected</p>
        )}
      </Section>

      <Section title="Next 3 Actions">
        {nextActions.length > 0 ? (
          <ol className={css.actionList}>
            {nextActions.map((it, i) => (
              <li key={`act-${i}`} className={css.actionItem}>
                <span className={css.actionIndex}>{i + 1}</span>
                <span className={css.actionLabel}>{it.label}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={css.empty}>Foundations clear — move to design.</p>
        )}
      </Section>

      <Section title="Readiness">
        <div className={css.chipGrid}>
          <Chip label="Land fit" value={landLabel[verdict.readiness.land]} tone={chipTone(verdict.readiness.land)} />
          <Chip
            label="Design"
            value={designLabel[verdict.readiness.designCompleteness]}
            tone={chipTone(verdict.readiness.designCompleteness)}
          />
          <Chip label="Ops burden" value={opsLabel[verdict.readiness.opsBurden]} tone={chipTone(verdict.readiness.opsBurden)} />
          <Chip
            label="Capital burden"
            value={capitalLabel[verdict.readiness.capitalBurden]}
            tone={chipTone(verdict.readiness.capitalBurden)}
          />
          <Chip
            label="Confidence"
            value={confLabel[verdict.readiness.confidence]}
            tone={chipTone(verdict.readiness.confidence)}
          />
        </div>
      </Section>

      <div className={css.ctaRow}>
        <button
          type="button"
          className={css.cta}
          onClick={onFixOnMap}
          disabled={!onFixOnMap}
        >
          Fix on Map
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
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={css.section}>
      <h4 className={css.sectionTitle}>{title}</h4>
      {children}
    </section>
  );
}

function Chip({ label, value, tone }: { label: string; value: string; tone: 'good' | 'mid' | 'bad' }) {
  void capitalize;
  return (
    <div className={`${css.chip} ${css[`chip_${tone}`]}`}>
      <span className={css.chipLabel}>{label}</span>
      <span className={css.chipValue}>{value}</span>
    </div>
  );
}
