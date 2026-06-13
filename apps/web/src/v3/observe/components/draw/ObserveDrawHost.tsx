/**
 * ObserveDrawHost — switchboard that mounts the right OBSERVE draw tool based
 * on the current `useMapToolStore.activeTool`. Mounted from `ObserveLayout`
 * via `DiagnoseMap`'s render-prop alongside `MapToolbar`.
 *
 * The host itself is a positioned dock above the bottom MapToolbar; each tool
 * renders its own popover inside via the shared `ObserveDrawHost.module.css`.
 *
 * No-op (returns null) when:
 *   - activeTool is not an `observe.*` id
 *   - projectId is missing (tools require a project context to persist)
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useMapToolStore } from '../measure/useMapToolStore.js';
import { useMatrixTogglesStore } from '../../../../store/matrixTogglesStore.js';
import NeighbourPinTool from './NeighbourPinTool.js';
import HouseholdPinTool from './HouseholdPinTool.js';
import AccessRoadTool from './AccessRoadTool.js';
import FrostPocketTool from './FrostPocketTool.js';
import HazardZoneTool from './HazardZoneTool.js';
import ContourLineTool from './ContourLineTool.js';
import HighPointTool from './HighPointTool.js';
import DrainageLineTool from './DrainageLineTool.js';
import ErosionFlagTool from './ErosionFlagTool.js';
import RunoffPathTool from './RunoffPathTool.js';
import WatercourseTool from './WatercourseTool.js';
import AdoptBasemapWaterTool from './AdoptBasemapWaterTool.js';
import SoilSampleTool from './SoilSampleTool.js';
import VegetationTool from './VegetationTool.js';
import PastureTool from './PastureTool.js';
import ConventionalCropTool from './ConventionalCropTool.js';
import SunWindWedgeTool from './SunWindWedgeTool.js';
import PermacultureZoneTool from './PermacultureZoneTool.js';
import SwotTagTool from './SwotTagTool.js';
import AdoptBasemapBuildingTool from './AdoptBasemapBuildingTool.js';
import BuildingTool from './BuildingTool.js';
import WellTool from './WellTool.js';
import SepticTool from './SepticTool.js';
import PowerLineTool from './PowerLineTool.js';
import BuriedUtilityTool from './BuriedUtilityTool.js';
import FenceTool from './FenceTool.js';
import GateTool from './GateTool.js';
import ExistingDrivewayTool from './ExistingDrivewayTool.js';
import BeV2ExistingTool from './BeV2ExistingTool.js';
import SnapToggle from './SnapToggle.js';
import { useObserveSnapTargets } from './useObserveSnapTargets.js';
import {
  BUILT_ENVIRONMENT_KINDS,
  LEGACY_OBSERVE_BE_KINDS,
} from '@ogden/shared';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string | null;
}

export default function ObserveDrawHost({ map, projectId }: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);
  // Shared snap-target builder (existing Observe annotations + BE v1/v2
  // features + parcel boundary). Called unconditionally before any early
  // return to respect the rules of hooks; `projectId ?? ''` yields empty
  // targets when unused.
  const getSnapTargets = useObserveSnapTargets(projectId ?? '');

  // When a draw tool is active, force the master annotations overlay on so the
  // record the user is about to create is actually visible after save. Without
  // this, the persist-first refactor (records auto-saved on draw-complete)
  // creates the confusing UX of "I drew it, it saved, but I see nothing"
  // whenever the user has previously toggled the overlay off.
  const isObserveDraw =
    !!activeTool && activeTool.startsWith('observe.') && !!projectId;
  useEffect(() => {
    if (!isObserveDraw) return;
    const s = useMatrixTogglesStore.getState();
    if (!s.observeAnnotations) s.toggle('observeAnnotations');
  }, [isObserveDraw]);

  if (!isObserveDraw) {
    return null;
  }

  let tool: React.ReactNode = null;
  switch (activeTool) {
    case 'observe.human-context.neighbour-pin':
      tool = <NeighbourPinTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.human-context.steward':
      tool = <HouseholdPinTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.human-context.access-road':
      tool = <AccessRoadTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.macroclimate-hazards.frost-pocket':
      tool = <FrostPocketTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.macroclimate-hazards.hazard-zone':
      tool = <HazardZoneTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.topography.contour-line':
      tool = <ContourLineTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.topography.high-point':
      tool = <HighPointTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.topography.drainage-line':
      tool = <DrainageLineTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.topography.erosion-flag':
      tool = <ErosionFlagTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.topography.runoff-path':
      tool = <RunoffPathTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.earth-water-ecology.watercourse':
      tool = <WatercourseTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.earth-water-ecology.adopt-water':
      tool = <AdoptBasemapWaterTool map={map} projectId={projectId} />;
      break;
    case 'observe.earth-water-ecology.soil-sample':
      tool = <SoilSampleTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.earth-water-ecology.vegetation':
      tool = <VegetationTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.earth-water-ecology.pasture':
      tool = <PastureTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.earth-water-ecology.conventional-crop':
      tool = <ConventionalCropTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.sectors-zones.sun-summer':
      tool = (
        <SunWindWedgeTool
          map={map}
          projectId={projectId}
          sectorType="sun_summer"
        />
      );
      break;
    case 'observe.sectors-zones.sun-winter':
      tool = (
        <SunWindWedgeTool
          map={map}
          projectId={projectId}
          sectorType="sun_winter"
        />
      );
      break;
    case 'observe.sectors-zones.wind-prevailing':
      tool = (
        <SunWindWedgeTool
          map={map}
          projectId={projectId}
          sectorType="wind_prevailing"
        />
      );
      break;
    case 'observe.sectors-zones.wind-storm':
      tool = (
        <SunWindWedgeTool
          map={map}
          projectId={projectId}
          sectorType="wind_storm"
        />
      );
      break;
    case 'observe.sectors-zones.fire':
      tool = (
        <SunWindWedgeTool map={map} projectId={projectId} sectorType="fire" />
      );
      break;
    case 'observe.sectors-zones.noise':
      tool = (
        <SunWindWedgeTool map={map} projectId={projectId} sectorType="noise" />
      );
      break;
    case 'observe.sectors-zones.wildlife':
      tool = (
        <SunWindWedgeTool
          map={map}
          projectId={projectId}
          sectorType="wildlife"
        />
      );
      break;
    case 'observe.sectors-zones.view':
      tool = (
        <SunWindWedgeTool map={map} projectId={projectId} sectorType="view" />
      );
      break;
    case 'observe.sectors-zones.permaculture':
      tool = <PermacultureZoneTool map={map} projectId={projectId} />;
      break;
    case 'observe.swot-synthesis.strength':
      tool = <SwotTagTool map={map} projectId={projectId} bucket="S" getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.swot-synthesis.weakness':
      tool = <SwotTagTool map={map} projectId={projectId} bucket="W" getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.swot-synthesis.opportunity':
      tool = <SwotTagTool map={map} projectId={projectId} bucket="O" getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.swot-synthesis.threat':
      tool = <SwotTagTool map={map} projectId={projectId} bucket="T" getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.built-environment.adopt-basemap':
      tool = <AdoptBasemapBuildingTool map={map} projectId={projectId} />;
      break;
    case 'observe.built-environment.building':
      tool = <BuildingTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.built-environment.well':
      tool = <WellTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.built-environment.septic':
      tool = <SepticTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.built-environment.power-line':
      tool = <PowerLineTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.built-environment.buried-utility':
      tool = <BuriedUtilityTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.built-environment.fence':
      tool = <FenceTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.built-environment.gate':
      tool = <GateTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    case 'observe.built-environment.driveway':
      tool = <ExistingDrivewayTool map={map} projectId={projectId} getSnapTargets={getSnapTargets} />;
      break;
    default: {
      // Phase 5.2.A: dispatch the 23 non-bespoke BE kinds through the
      // generic V2 placement tool. Tool ids follow
      // `observe.built-environment.<kind>` matching the registry kind id
      // exactly.
      const BE_PREFIX = 'observe.built-environment.';
      if (activeTool.startsWith(BE_PREFIX)) {
        const kind = activeTool.slice(BE_PREFIX.length);
        if (
          !LEGACY_OBSERVE_BE_KINDS.has(kind) &&
          BUILT_ENVIRONMENT_KINDS[kind]
        ) {
          tool = (
            <BeV2ExistingTool
              map={map}
              projectId={projectId}
              kind={kind}
              snap
              getSnapTargets={getSnapTargets}
            />
          );
          break;
        }
      }
      tool = null;
    }
  }

  if (!tool) return null;

  return (
    <div className={css.dock}>
      {tool}
      <SnapToggle />
    </div>
  );
}
