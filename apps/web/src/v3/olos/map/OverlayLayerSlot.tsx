/**
 * OverlayLayerSlot — mounts the per-Stage live overlay components for an
 * OLOS ObjectiveWorkspace. Reads `overlayRegistry` for which existing v3
 * overlay component services each Stage × Overlay slot, then passes a
 * visibility flag derived from the workspace's active overlay set.
 *
 * Two contracts coexist in the legacy overlay components:
 *   - Diagnose-era overlays (TopographyOverlay, WaterOverlay) take
 *     `forceVisible?: boolean` and OR it with the global
 *     `useMatrixTogglesStore` flag.
 *   - Design-era overlays (DesignContoursOverlay etc.) take a clean
 *     `visible: boolean` prop that is the sole authority.
 *
 * This slot normalises both by always mounting the relevant component for
 * the stage and passing the active flag through. A small set of overlays
 * (Zones, FieldFlag) require additional project state (zones / flags
 * arrays) and aren't wired here yet — they log once and stay invisible.
 *
 * Placeholder overlays (per `overlayRegistry.ts`) are caught by the warn
 * pass at the bottom of the component.
 */

import { useEffect } from 'react';
import type { Stage, OverlayId } from '@ogden/shared';
import type { maplibregl } from '../../../lib/maplibre.js';
import { OVERLAY_REGISTRY } from './overlayRegistry.js';

import TopographyOverlay from '../../components/overlays/TopographyOverlay.js';
import WaterOverlay from '../../components/overlays/WaterOverlay.js';
import RegenerationPlanOverlay from '../../components/overlays/RegenerationPlanOverlay.js';
import DesignContoursOverlay from '../../components/overlays/design/DesignContoursOverlay.js';
import DesignHydrologyOverlay from '../../components/overlays/design/DesignHydrologyOverlay.js';
import DesignSoilsOverlay from '../../components/overlays/design/DesignSoilsOverlay.js';
import DesignWetlandsOverlay from '../../components/overlays/design/DesignWetlandsOverlay.js';
import DesignPlacementsOverlay from '../../components/overlays/design/DesignPlacementsOverlay.js';

export interface OverlayLayerSlotProps {
  map: maplibregl.Map;
  stage: Stage;
  projectId: string;
  activeOverlayIds: readonly OverlayId[];
}

const WARNED = new Set<string>();
function warnOnce(key: string, message: string) {
  if (WARNED.has(key)) return;
  WARNED.add(key);
  // eslint-disable-next-line no-console
  console.warn(message);
}

export default function OverlayLayerSlot({
  map,
  stage,
  projectId,
  activeOverlayIds,
}: OverlayLayerSlotProps) {
  const isActive = (id: OverlayId) => activeOverlayIds.includes(id);

  // Console-warn once for each active overlay that isn't yet wired or
  // requires project-data not threaded here. Keeps the map clean while the
  // user can still see in DevTools which authoring tasks are outstanding.
  useEffect(() => {
    for (const id of activeOverlayIds) {
      const entry = OVERLAY_REGISTRY[id]?.perStage[stage];
      if (!entry) continue;
      if (entry.status === 'placeholder') {
        warnOnce(
          `olos-overlay-${stage}-${id}-placeholder`,
          `[OLOS] overlay '${id}' for stage '${stage}' is a placeholder — content authoring deferred.`,
        );
        continue;
      }
      if (
        entry.reuseFrom === 'ZonesOverlay' ||
        entry.reuseFrom === 'FieldFlagOverlay'
      ) {
        warnOnce(
          `olos-overlay-${stage}-${id}-data`,
          `[OLOS] overlay '${id}' for stage '${stage}' (${entry.reuseFrom}) needs project-data wiring — not yet mounted by OLOS.`,
        );
      }
    }
  }, [activeOverlayIds, stage]);

  return (
    <>
      {/* contours-landform */}
      {(stage === 'observe' || stage === 'act') && (
        <TopographyOverlay
          map={map}
          forceVisible={isActive('contours-landform')}
        />
      )}
      {stage === 'plan' && (
        <DesignContoursOverlay
          map={map}
          visible={isActive('contours-landform')}
        />
      )}

      {/* water-flow */}
      {(stage === 'observe' || stage === 'act') && (
        <WaterOverlay map={map} forceVisible={isActive('water-flow')} />
      )}
      {stage === 'plan' && (
        <DesignHydrologyOverlay map={map} visible={isActive('water-flow')} />
      )}

      {/* soil-conditions (plan only) */}
      {stage === 'plan' && (
        <DesignSoilsOverlay
          visible={isActive('soil-conditions')}
          projectId={projectId}
        />
      )}

      {/* ecology-habitat (plan only) */}
      {stage === 'plan' && (
        <DesignWetlandsOverlay
          visible={isActive('ecology-habitat')}
          projectId={projectId}
        />
      )}

      {/* infrastructure-utilities (plan only, conditional mount) */}
      {stage === 'plan' && isActive('infrastructure-utilities') && (
        <DesignPlacementsOverlay map={map} projectId={projectId} />
      )}

      {/* monitoring-records (act only, conditional mount) */}
      {stage === 'act' && isActive('monitoring-records') && (
        <RegenerationPlanOverlay map={map} projectId={projectId} />
      )}
    </>
  );
}
