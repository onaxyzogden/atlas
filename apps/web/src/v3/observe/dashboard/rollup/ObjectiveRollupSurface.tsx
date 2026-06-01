/**
 * ObjectiveRollupSurface — Surface 4 of the Observe Dashboard: an
 * objective-centric Land State rollup. Where Surfaces 1-3 key everything by
 * universal DOMAIN, this surface keys by Plan OBJECTIVE, listing one card per
 * objective with its primary-domain freshness and the observations recorded
 * against it. It surfaces the per-objective activity feed (previously visible
 * only in the single Act exec panel) as browse-worthy standing content across
 * the whole project.
 *
 * Read-only. Reached from the "By objective" button on the Unified surface
 * header. A "recorded only" toggle hides un-observed objectives so the surface
 * doubles as an observation-coverage overview.
 */

import { useMemo, useState } from 'react';
import {
  getPrimaryDomainForObjective,
  type ObserveDataPoint,
  type UniversalDomain,
} from '@ogden/shared';
import { useObserveDataPointStore } from '../../../../store/observeDataPointStore.js';
import { useProjectObjectives } from '../../../plan/strata/useProjectObjectives.js';
import { useDomainSnapshots, type DomainSnapshot } from '../useDomainSnapshot.js';
import ObjectiveRollupCard from './ObjectiveRollupCard.js';
import css from './ObjectiveRollupSurface.module.css';

interface Props {
  projectId: string;
}

export default function ObjectiveRollupSurface({ projectId }: Props) {
  const { objectives } = useProjectObjectives(projectId);
  const snapshots = useDomainSnapshots(projectId);
  const [recordedOnly, setRecordedOnly] = useState(false);

  // Group active points by objective. Subscribe to the raw byProject map and
  // useMemo-filter (mirrors useDomainPoints / the Act panel feed) so the
  // selector never returns a fresh array reference per render. Newest first.
  const pointsByProject = useObserveDataPointStore((s) => s.byProject);
  const byObjective = useMemo(() => {
    const m = new Map<string, ObserveDataPoint[]>();
    for (const p of pointsByProject[projectId] ?? []) {
      if (!p.sourceObjectiveId) continue;
      const list = m.get(p.sourceObjectiveId);
      if (list) list.push(p);
      else m.set(p.sourceObjectiveId, [p]);
    }
    for (const list of m.values()) {
      list.sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt));
    }
    return m;
  }, [pointsByProject, projectId]);

  // Domain -> snapshot lookup so each card resolves its primary-domain freshness.
  const snapshotByDomain = useMemo(() => {
    const m = new Map<UniversalDomain, DomainSnapshot>();
    for (const s of snapshots) m.set(s.domainId, s);
    return m;
  }, [snapshots]);

  const rows = useMemo(
    () =>
      objectives
        .map((objective) => {
          const domain = getPrimaryDomainForObjective(objective);
          return {
            objective,
            observations: byObjective.get(objective.id) ?? [],
            snapshot: domain ? snapshotByDomain.get(domain) : undefined,
          };
        })
        .filter((r) => !recordedOnly || r.observations.length > 0),
    [objectives, byObjective, snapshotByDomain, recordedOnly],
  );

  const recordedCount = useMemo(
    () =>
      objectives.reduce(
        (n, o) => n + ((byObjective.get(o.id)?.length ?? 0) > 0 ? 1 : 0),
        0,
      ),
    [objectives, byObjective],
  );

  return (
    <div className={css.surface}>
      <div className={css.header}>
        <div className={css.heading}>
          <h2 className={css.title}>Land state by objective</h2>
          <p className={css.subtitle}>
            {recordedCount} of {objectives.length} objectives observed
          </p>
        </div>
        <label className={css.toggle}>
          <input
            type="checkbox"
            checked={recordedOnly}
            onChange={(e) => setRecordedOnly(e.target.checked)}
          />
          Recorded only
        </label>
      </div>

      <div className={css.grid} role="list" aria-label="Plan objectives">
        {rows.map((row) => (
          <ObjectiveRollupCard
            key={row.objective.id}
            objective={row.objective}
            observations={row.observations}
            snapshot={row.snapshot}
          />
        ))}
        {rows.length === 0 && (
          <div className={css.empty}>
            {recordedOnly
              ? 'No objectives have recorded observations yet.'
              : 'This project has no objectives.'}
          </div>
        )}
      </div>
    </div>
  );
}
