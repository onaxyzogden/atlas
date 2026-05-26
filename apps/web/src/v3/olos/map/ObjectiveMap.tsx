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
 * When the project lacks both a parcel boundary and a center, the map
 * still mounts at FALLBACK_CENTROID and a SetBoundaryCTA card overlays
 * the bottom-right of the map host so the steward can route to project
 * setup. This replaces the prior MapPlaceholder fallback — a live but
 * empty MapLibre canvas is a better empty state than a phase notice.
 *
 * Live overlay layer wiring is performed by `OverlayLayerSlot`, which is
 * mounted as the render-prop child of each base map and reads the active
 * overlay set against `overlayRegistry`.
 */

import type { OverlayId, Stage } from '@ogden/shared';
import type { Project } from '../../types.js';
import DiagnoseMap from '../../components/DiagnoseMap.js';
import DesignMap from '../../components/DesignMap.js';
import OperateMap from '../../components/OperateMap.js';
import OverlayLayerSlot from './OverlayLayerSlot.js';
import SetBoundaryCTA from './SetBoundaryCTA.js';
import css from './ObjectiveMap.module.css';

export interface ObjectiveMapProps {
  stage: Stage;
  project: Project | null;
  activeOverlayIds: readonly string[];
  domain: import('@ogden/shared').UniversalDomain;
}

const FALLBACK_CENTROID: [number, number] = [-83.0007, 39.9612];
const FALLBACK_PROJECT_ID = '__olos_unset_project__';

export default function ObjectiveMap({
  stage,
  project,
  activeOverlayIds,
}: ObjectiveMapProps) {
  const boundary = project?.location.boundary;
  const center = project?.location.center;
  const centroid: [number, number] = center ?? FALLBACK_CENTROID;
  const projectId = project?.id ?? FALLBACK_PROJECT_ID;
  const overlayIds = activeOverlayIds as readonly OverlayId[];
  const showBoundaryCTA = !boundary && !center && project !== null;

  if (stage === 'observe') {
    return (
      <div className={css.host}>
        <DiagnoseMap centroid={centroid} boundary={boundary}>
          {({ map }) => (
            <OverlayLayerSlot
              map={map}
              stage={stage}
              projectId={projectId}
              activeOverlayIds={overlayIds}
            />
          )}
        </DiagnoseMap>
        {showBoundaryCTA ? <SetBoundaryCTA projectId={projectId} /> : null}
      </div>
    );
  }

  if (stage === 'plan') {
    return (
      <div className={css.host}>
        <DesignMap
          centroid={centroid}
          boundary={boundary}
          projectId={projectId}
        >
          {({ map }) => (
            <OverlayLayerSlot
              map={map}
              stage={stage}
              projectId={projectId}
              activeOverlayIds={overlayIds}
            />
          )}
        </DesignMap>
        {showBoundaryCTA ? <SetBoundaryCTA projectId={projectId} /> : null}
      </div>
    );
  }

  return (
    <div className={css.host}>
      <OperateMap centroid={centroid} boundary={boundary}>
        {({ map }) => (
          <OverlayLayerSlot
            map={map}
            stage={stage}
            projectId={projectId}
            activeOverlayIds={overlayIds}
          />
        )}
      </OperateMap>
      {showBoundaryCTA ? <SetBoundaryCTA projectId={projectId} /> : null}
    </div>
  );
}
