/**
 * DomainObservationNeeds — reads the existing `useObservationNeeds`
 * scaffolding (`apps/web/src/v3/observation-needs/`) and surfaces just
 * the open needs whose `module` matches this domain. Deep-links into the
 * existing Observation Capture Workspace via `?need=<id>` on the legacy
 * `/observe/$module` route — the workspace itself is unchanged and lives
 * outside the dashboard shell.
 *
 * `useObservationNeeds` joins the static seed catalog, steward-created
 * needs, and system-raised auto-needs (coverage gaps + stale signals)
 * with each one's run state. We surface only `open` and `in-progress`
 * here so a satisfied need stops showing as "open work".
 */

import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Telescope } from 'lucide-react';
import type { UniversalDomain } from '@ogden/shared';
import { useObservationNeeds } from '../../../observation-needs/useObservationNeeds.js';
import type { ObserveModule } from '../../types.js';
import css from './DomainObservationNeeds.module.css';

interface Props {
  projectId: string;
  domainId: UniversalDomain;
}

const PRIORITY_LABEL = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
} as const;

export default function DomainObservationNeeds({
  projectId,
  domainId,
}: Props) {
  const views = useObservationNeeds(projectId);

  const openForDomain = useMemo(() => {
    return views.filter((v) => {
      if ((v.objective.module as ObserveModule) !== (domainId as unknown as ObserveModule)) {
        return false;
      }
      return v.run.status === 'open' || v.run.status === 'in-progress';
    });
  }, [views, domainId]);

  if (openForDomain.length === 0) {
    return (
      <div className={css.empty}>
        <Telescope size={14} aria-hidden="true" />
        <span>No open observation needs for this domain.</span>
      </div>
    );
  }

  return (
    <ul
      className={css.list}
      aria-label={`Open observation needs for ${domainId}`}
    >
      {openForDomain.map((view) => {
        const priority = view.objective.priority ?? 'medium';
        const moduleSeg = view.objective.module as ObserveModule;
        return (
          <li key={view.objective.id} className={css.row}>
            <div className={css.rowMeta}>
              <span
                className={css.priority}
                data-priority={priority}
                title={`${PRIORITY_LABEL[priority]} priority`}
              >
                {PRIORITY_LABEL[priority]}
              </span>
              <span className={css.title}>{view.objective.title}</span>
            </div>
            <Link
              to="/v3/project/$projectId/observe/$module"
              params={{ projectId, module: moduleSeg }}
              search={{ need: view.objective.id } as { need: string }}
              className={css.captureLink}
            >
              Capture
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
