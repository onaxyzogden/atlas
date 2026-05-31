// ObserveStageGapBanner - the Observe-stage render of the Plan Nav v1.1
// section-9 observe-gap. Distinct from the Plan-side `ObserveGapBanner`
// (a transient, dismissible Plan-spine notice): this one is PERSISTENT and
// re-derived. It appears inside the Observe stage whenever the project has
// objectives that still need field data, names the Observe domains whose
// capture would satisfy them, deep-links to each domain card, and disappears
// on its own once those domains have data. No dismiss control -- a still-open
// gap should not be hideable.
//
// Teal/info accent + rounded recipe, matching the Plan-side banner and the
// Observe/Universal source-tag treatment.

import { Telescope } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { UNIVERSAL_DOMAIN_LABELS } from '@ogden/shared';
import { useObserveGapObjectives } from './dashboard/revision/useObserveGapObjectives.js';
import css from './ObserveStageGapBanner.module.css';

interface Props {
  projectId: string;
}

export default function ObserveStageGapBanner({ projectId }: Props) {
  const navigate = useNavigate();
  const { openObjectiveIds, domains } = useObserveGapObjectives(projectId);

  if (openObjectiveIds.length === 0) return null;
  const count = openObjectiveIds.length;
  const manyObjectives = count !== 1;
  const manyDomains = domains.length !== 1;

  return (
    <aside
      className={css.banner}
      role="status"
      aria-label="Observe-stage data gap"
      data-testid="observe-gap-banner"
    >
      <div className={css.iconWrap} aria-hidden>
        <Telescope size={16} />
      </div>
      <div className={css.body}>
        <p className={css.eyebrow}>New observations needed</p>
        <p className={css.copy}>
          {count} objective{manyObjectives ? 's' : ''} added by a secondary layer
          still need{manyObjectives ? '' : 's'} field data. Capture observations
          in the domain{manyDomains ? 's' : ''} below to satisfy
          {manyObjectives ? ' them' : ' it'}.
        </p>
        <div className={css.domains}>
          {domains.map((d) => (
            <button
              key={d.domainId}
              type="button"
              className={css.domainChip}
              data-testid={`observe-gap-domain-${d.domainId}`}
              onClick={() =>
                navigate({
                  to: '/v3/project/$projectId/observe/dashboard/domain/$domainId',
                  params: { projectId, domainId: d.domainId },
                })
              }
            >
              {UNIVERSAL_DOMAIN_LABELS[d.domainId]}
              {d.objectiveIds.length > 1 ? (
                <span className={css.domainCount}>{d.objectiveIds.length}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
