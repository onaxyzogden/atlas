/**
 * TemporalLayerSurface — Surface 3 of the Observe Dashboard (OLOS Spec
 * §5). Domain picker + location-cluster filter + inline-SVG chart with
 * cycle annotations.
 *
 * Empty-state predicate per spec §5.4: the chart only paints when the
 * active location cluster carries ≥2 observations. Domains with
 * single-point coverage show the spec's "Temporal trends appear after
 * 2 observations at the same location" message.
 *
 * Plan Revision Banner mounts at the top so cycle context stays one
 * click away even while the steward is inspecting trends — same
 * placement precedent as Surfaces 1 and 2.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  UNIVERSAL_DOMAINS,
  UNIVERSAL_DOMAIN_LABELS,
  UNIVERSAL_DOMAIN_PURPOSE,
  type ObserveCycleEntry,
  type UniversalDomain,
} from '@ogden/shared';
import { useDomainPoints } from '../domain/useDomainPoints.js';
import { useObserveCycleStore } from '../../../../store/observeCycleStore.js';
import PlanRevisionBanner from '../revision/PlanRevisionBanner.js';
import TemporalChart from './TemporalChart.js';
import LocationFilter from './LocationFilter.js';
import {
  clusterByLocation,
  pickDefaultCluster,
} from './locationClusters.js';
import css from './TemporalLayerSurface.module.css';

interface Props {
  projectId: string;
  domainId: UniversalDomain;
}

// Stable empty reference so the inline Zustand selector below returns the
// same array identity on every snapshot — otherwise React's
// useSyncExternalStore re-renders forever when no cycle history exists.
const EMPTY_CYCLES: readonly ObserveCycleEntry[] = Object.freeze([]);

export default function TemporalLayerSurface({ projectId, domainId }: Props) {
  const navigate = useNavigate();
  const { active } = useDomainPoints(projectId, domainId);
  const cycles = useObserveCycleStore(
    (s) => s.byProject[projectId]?.[domainId]?.history ?? EMPTY_CYCLES,
  );

  const clusters = useMemo(
    () => clusterByLocation(active),
    [active],
  );

  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const defaultCluster = pickDefaultCluster(clusters);
  const effectiveClusterId =
    activeClusterId &&
    clusters.some((cluster) => cluster.id === activeClusterId)
      ? activeClusterId
      : defaultCluster?.id ?? null;

  const activeCluster = clusters.find((c) => c.id === effectiveClusterId) ?? null;
  const chartPoints = activeCluster?.points ?? [];

  const handleDomainChange = (next: UniversalDomain) => {
    setActiveClusterId(null);
    navigate({
      to: '/v3/project/$projectId/observe/dashboard/temporal/$domainId',
      params: { projectId, domainId: next },
    });
  };

  return (
    <div className={css.surface}>
      <div className={css.header}>
        <PlanRevisionBanner projectId={projectId} />
        <div className={css.controls}>
          <div className={css.controlGroup}>
            <span className={css.label} id="temporal-domain-label">
              Domain
            </span>
            <select
              className={css.select}
              aria-labelledby="temporal-domain-label"
              value={domainId}
              onChange={(event) =>
                handleDomainChange(event.target.value as UniversalDomain)
              }
            >
              {UNIVERSAL_DOMAINS.map((id) => (
                <option key={id} value={id}>
                  {UNIVERSAL_DOMAIN_LABELS[id]}
                </option>
              ))}
            </select>
            <p className={css.subtitle}>{UNIVERSAL_DOMAIN_PURPOSE[domainId]}</p>
          </div>
          {clusters.length > 1 && (
            <div className={css.controlGroup}>
              <span className={css.label}>Location cluster</span>
              <LocationFilter
                clusters={clusters}
                activeClusterId={effectiveClusterId}
                onChange={setActiveClusterId}
              />
            </div>
          )}
        </div>
      </div>

      {chartPoints.length < 2 ? (
        <div className={css.empty} role="status">
          Temporal trends appear after 2 observations at the same location.
          {' '}Capture another {UNIVERSAL_DOMAIN_LABELS[domainId]} observation
          {' '}at this site to start the trend.
        </div>
      ) : (
        <div className={css.chartWrap}>
          <TemporalChart
            points={chartPoints}
            cycles={cycles}
            domainId={domainId}
          />
          <div className={css.legend}>
            <span className={css.legendItem}>
              <span
                className={css.legendSwatch}
                style={{ background: '#c4a265' }}
              />
              Observation
            </span>
            {cycles.length > 0 && (
              <span className={css.legendItem}>
                <span
                  className={css.legendSwatch}
                  style={{
                    background:
                      'repeating-linear-gradient(to bottom, rgba(196,162,101,0.65) 0 3px, transparent 3px 6px)',
                  }}
                />
                Cycle boundary
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
