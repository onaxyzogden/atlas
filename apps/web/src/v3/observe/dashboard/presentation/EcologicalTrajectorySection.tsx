/**
 * EcologicalTrajectorySection — Section 3 of Presentation Mode (OLOS
 * Observe Dashboard Spec §6.1). Read-only temporal charts across the
 * primary ecological domains (Plants / Hydrology / Soil / Ecology).
 *
 * Reuses `TemporalChart` directly so the share viewer renders identical
 * trend visuals to the live dashboard. A domain with <2 observations
 * renders the same "Temporal trends appear after 2 observations" empty
 * state the live `TemporalLayerSurface` shows — visual parity is part
 * of the spec's "frozen snapshot" promise.
 *
 * Cycle annotations carry through from `observeCycleStore` so a Plan
 * revision drawn into the chart stays in the share, anchoring the
 * trajectory narrative for the audience.
 */

import type { UniversalDomain } from '@ogden/shared';
import { UNIVERSAL_DOMAIN_LABELS } from '@ogden/shared';
import { useDomainPoints } from '../domain/useDomainPoints.js';
import { useObserveCycleStore } from '../../../../store/observeCycleStore.js';
import TemporalChart from '../temporal/TemporalChart.js';
import css from './SectionCommon.module.css';

interface Props {
  projectId: string;
}

const PRIMARY_DOMAINS: readonly UniversalDomain[] = [
  'plants-food',
  'hydrology',
  'soil',
  'ecology',
];

function DomainTrajectory({
  projectId,
  domainId,
}: {
  projectId: string;
  domainId: UniversalDomain;
}) {
  const { active } = useDomainPoints(projectId, domainId);
  const cycles = useObserveCycleStore(
    (s) => s.byProject[projectId]?.[domainId]?.history ?? [],
  );

  return (
    <article className={css.card} aria-labelledby={`pres-traj-${domainId}`}>
      <h3 id={`pres-traj-${domainId}`} className={css.cardTitle}>
        {UNIVERSAL_DOMAIN_LABELS[domainId]}
      </h3>
      {active.length < 2 ? (
        <p className={css.cardMeta}>
          Temporal trends appear after 2 observations at the same location.
        </p>
      ) : (
        <TemporalChart
          points={active}
          cycles={cycles}
          domainId={domainId}
          width={640}
          height={220}
        />
      )}
    </article>
  );
}

export default function EcologicalTrajectorySection({ projectId }: Props) {
  return (
    <section
      className={css.section}
      aria-labelledby="presentation-ecological-trajectory"
    >
      <h2
        id="presentation-ecological-trajectory"
        className={css.heading}
      >
        Ecological trajectory
      </h2>
      <p className={css.subheading}>
        Primary trends across plants, water, soil, and ecology. Cycle
        boundaries mark confirmed plan revisions.
      </p>
      <div className={css.trajectoryStack}>
        {PRIMARY_DOMAINS.map((domainId) => (
          <DomainTrajectory
            key={domainId}
            projectId={projectId}
            domainId={domainId}
          />
        ))}
      </div>
    </section>
  );
}
