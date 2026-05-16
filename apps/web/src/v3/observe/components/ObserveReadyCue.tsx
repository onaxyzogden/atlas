/**
 * ObserveReadyCue — soft, non-blocking completion cue (spec §3.4).
 *
 * Surfaces Observe "essentials captured" state — a drawn parcel
 * boundary plus at least one placed landscape annotation (zone or
 * vegetation patch) — and offers a one-click jump to Plan. It NEVER
 * gates navigation: the user may move between stages freely at any
 * time (the spec explicitly allows returning to Observe). This is a
 * progress hint only.
 */

import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useProjectStore } from '../../../store/projectStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { useVegetationStore } from '../../../store/vegetationStore.js';
import css from './ObserveReadyCue.module.css';

export default function ObserveReadyCue({
  projectId,
}: {
  projectId: string | null;
}) {
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const zones = useZoneStore((s) => s.zones);
  const patches = useVegetationStore((s) => s.patches);

  const { boundaryDone, landscapeDone } = useMemo(() => {
    if (!projectId) return { boundaryDone: false, landscapeDone: false };
    const project = projects.find(
      (p) => p.id === projectId || p.serverId === projectId,
    );
    const boundaryDone = Boolean(
      project?.hasParcelBoundary ||
        project?.parcelBoundaryGeojson?.features?.length,
    );
    const landscapeDone =
      zones.some((z) => z.projectId === projectId) ||
      patches.some((p) => p.projectId === projectId);
    return { boundaryDone, landscapeDone };
  }, [projectId, projects, zones, patches]);

  if (!projectId) return null;

  const ready = boundaryDone && landscapeDone;

  return (
    <div className={css.cue} aria-label="Observe readiness">
      <span className={css.title}>Observe essentials</span>
      <ul className={css.items}>
        <li className={`${css.item} ${boundaryDone ? css.itemDone : ''}`}>
          <span
            className={`${css.dot} ${boundaryDone ? css.dotDone : ''}`}
          />
          Property boundary drawn
        </li>
        <li className={`${css.item} ${landscapeDone ? css.itemDone : ''}`}>
          <span
            className={`${css.dot} ${landscapeDone ? css.dotDone : ''}`}
          />
          At least one landscape type placed
        </li>
      </ul>
      {ready ? (
        <button
          type="button"
          className={css.proceed}
          onClick={() =>
            navigate({
              to: '/v3/project/$projectId/plan',
              params: { projectId },
            })
          }
        >
          Ready to Plan →
        </button>
      ) : (
        <span className={css.hint}>
          Capture both to unlock a confident Plan — you can keep
          refining Observe anytime.
        </span>
      )}
    </div>
  );
}
