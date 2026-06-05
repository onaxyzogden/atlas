/**
 * CurrentConditionsSection — Section 2 of Presentation Mode (OLOS Observe
 * Dashboard Spec §6.1). Read-only domain status grid mirroring the
 * Unified Land State surface, but without the freshness filter chip
 * group (the share viewer is a static snapshot — no controls). Reuses
 * `useDomainSnapshots` so any computed projection (freshness rules,
 * supersession handling) stays consistent with the live dashboard.
 */

import { useDomainSnapshots } from '../useDomainSnapshot.js';
import css from './SectionCommon.module.css';

interface Props {
  projectId: string;
}

const FRESHNESS_LABEL: Record<string, string> = {
  current: 'Current',
  ageing: 'Ageing',
  stale: 'Stale',
  missing: 'Missing',
};

const STATUS_LABEL: Record<string, string> = {
  clear: 'Clear',
  unknown: 'Unknown',
  needs_investigation: 'Needs investigation',
  major_constraint: 'Major constraint',
  potential_disqualifier: 'Potential disqualifier',
};

function formatDate(iso: string | null): string {
  if (!iso) return 'Not yet captured';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CurrentConditionsSection({ projectId }: Props) {
  const snapshots = useDomainSnapshots(projectId);
  return (
    <section
      className={css.section}
      aria-labelledby="presentation-current-conditions"
    >
      <h2 id="presentation-current-conditions" className={css.heading}>
        Current conditions
      </h2>
      <p className={css.subheading}>
        Sixteen universal domains, ranked by freshness of latest evidence.
      </p>
      <div className={css.cardGrid} role="list">
        {snapshots.map((s) => (
          <article key={s.domainId} className={css.card} role="listitem">
            <h3 className={css.cardTitle}>{s.label}</h3>
            <span className={css.statusPill}>{FRESHNESS_LABEL[s.freshness] ?? s.freshness}</span>
            <p className={css.cardMeta}>
              {s.observationCount} {s.observationCount === 1 ? 'observation' : 'observations'}
              {s.latestStatus
                ? ` - ${STATUS_LABEL[s.latestStatus] ?? s.latestStatus}`
                : ''}
            </p>
            <p className={css.cardMeta}>Last captured: {formatDate(s.lastObservedAt)}</p>
          </article>
        ))}
        {snapshots.length === 0 && (
          <div className={css.empty}>No observations recorded yet.</div>
        )}
      </div>
    </section>
  );
}
