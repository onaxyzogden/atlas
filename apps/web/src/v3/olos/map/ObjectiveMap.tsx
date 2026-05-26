/**
 * ObjectiveMap — stage-aware map composition for the ObjectiveWorkspace.
 *
 * Wraps the existing v3 base maps so the OLOS workspace gets a real
 * MapLibre canvas the steward can pan / zoom on:
 *   - Observe → DiagnoseMap (site analysis, sectors / zones / topography
 *     ready-to-mount).
 *   - Plan    → DesignMap (design canvas, base for placement overlays).
 *   - Act     → OperateMap (read-mostly field surface).
 *
 * Falls back to MapPlaceholder when the project lacks both a parcel
 * boundary and a fallback center — that's the dev-fixture case (e.g.
 * `mtc` minus location data) where we still want the chrome to render.
 *
 * Live overlay layer wiring (zones / contours / water / etc.) is sized
 * but not yet sourced here: `overlayRegistry` records which existing
 * v3 components service each Stage × Overlay slot, and the follow-up
 * to Phase 1.4 lifts those components into a shared layer slot so they
 * mount inside this map's render-prop without duplicating MapLibre
 * source / layer ids with the legacy stage pages.
 */

import type { Stage } from '@ogden/shared';
import type { Project } from '../../types.js';
import DiagnoseMap from '../../components/DiagnoseMap.js';
import DesignMap from '../../components/DesignMap.js';
import OperateMap from '../../components/OperateMap.js';
import MapPlaceholder from './MapPlaceholder.js';
import css from './ObjectiveMap.module.css';

export interface ObjectiveMapProps {
  stage: Stage;
  project: Project | null;
  activeOverlayIds: readonly string[];
  /** Echoed in MapPlaceholder when the live map can't mount. */
  domain: import('@ogden/shared').UniversalDomain;
}

const FALLBACK_CENTROID: [number, number] = [-83.0007, 39.9612];

export default function ObjectiveMap({
  stage,
  project,
  activeOverlayIds,
  domain,
}: ObjectiveMapProps) {
  const boundary = project?.location.boundary;
  const center = project?.location.center;

  if (!project || (!boundary && !center)) {
    return (
      <MapPlaceholder
        stage={stage}
        domain={domain}
        activeOverlayIds={activeOverlayIds}
      />
    );
  }

  const centroid: [number, number] = center ?? FALLBACK_CENTROID;
  const noticeText =
    activeOverlayIds.length === 0
      ? 'No overlays active — toggle one above to bring it onto the map.'
      : `${activeOverlayIds.length} overlay${activeOverlayIds.length === 1 ? '' : 's'} active. Live layer wiring lands in the Phase 1.4 follow-up.`;

  if (stage === 'observe') {
    return (
      <div className={css.host}>
        <DiagnoseMap centroid={centroid} boundary={boundary}>
          {() => null}
        </DiagnoseMap>
        <div className={css.notice}>{noticeText}</div>
      </div>
    );
  }

  if (stage === 'plan') {
    return (
      <div className={css.host}>
        <DesignMap
          centroid={centroid}
          boundary={boundary}
          projectId={project.id}
          notice={noticeText}
        >
          {() => null}
        </DesignMap>
      </div>
    );
  }

  return (
    <div className={css.host}>
      <OperateMap
        centroid={centroid}
        boundary={boundary}
        legendNote={noticeText}
      >
        {() => null}
      </OperateMap>
    </div>
  );
}
