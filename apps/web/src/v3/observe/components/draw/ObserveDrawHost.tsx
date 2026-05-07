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

import type { Map as MaplibreMap } from 'maplibre-gl';
import { useMapToolStore } from '../measure/useMapToolStore.js';
import NeighbourPinTool from './NeighbourPinTool.js';
import HouseholdPinTool from './HouseholdPinTool.js';
import AccessRoadTool from './AccessRoadTool.js';
import FrostPocketTool from './FrostPocketTool.js';
import HazardZoneTool from './HazardZoneTool.js';
import ContourLineTool from './ContourLineTool.js';
import HighPointTool from './HighPointTool.js';
import DrainageLineTool from './DrainageLineTool.js';
import WatercourseTool from './WatercourseTool.js';
import SoilSampleTool from './SoilSampleTool.js';
import EcologyZoneTool from './EcologyZoneTool.js';
import SunWindWedgeTool from './SunWindWedgeTool.js';
import PermacultureZoneTool from './PermacultureZoneTool.js';
import SwotTagTool from './SwotTagTool.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string | null;
}

export default function ObserveDrawHost({ map, projectId }: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);
  if (!activeTool || !activeTool.startsWith('observe.') || !projectId) {
    return null;
  }

  let tool: React.ReactNode = null;
  switch (activeTool) {
    case 'observe.human-context.neighbour-pin':
      tool = <NeighbourPinTool map={map} projectId={projectId} />;
      break;
    case 'observe.human-context.steward':
      tool = <HouseholdPinTool map={map} projectId={projectId} />;
      break;
    case 'observe.human-context.access-road':
      tool = <AccessRoadTool map={map} projectId={projectId} />;
      break;
    case 'observe.macroclimate-hazards.frost-pocket':
      tool = <FrostPocketTool map={map} projectId={projectId} />;
      break;
    case 'observe.macroclimate-hazards.hazard-zone':
      tool = <HazardZoneTool map={map} projectId={projectId} />;
      break;
    case 'observe.topography.contour-line':
      tool = <ContourLineTool map={map} projectId={projectId} />;
      break;
    case 'observe.topography.high-point':
      tool = <HighPointTool map={map} projectId={projectId} />;
      break;
    case 'observe.topography.drainage-line':
      tool = <DrainageLineTool map={map} projectId={projectId} />;
      break;
    case 'observe.earth-water-ecology.watercourse':
      tool = <WatercourseTool map={map} projectId={projectId} />;
      break;
    case 'observe.earth-water-ecology.soil-sample':
      tool = <SoilSampleTool map={map} projectId={projectId} />;
      break;
    case 'observe.earth-water-ecology.ecology-zone':
      tool = <EcologyZoneTool map={map} projectId={projectId} />;
      break;
    case 'observe.sectors-zones.sun-wind-wedge':
      tool = <SunWindWedgeTool map={map} projectId={projectId} />;
      break;
    case 'observe.sectors-zones.permaculture':
      tool = <PermacultureZoneTool map={map} projectId={projectId} />;
      break;
    case 'observe.swot-synthesis.strength':
      tool = <SwotTagTool map={map} projectId={projectId} bucket="S" />;
      break;
    case 'observe.swot-synthesis.weakness':
      tool = <SwotTagTool map={map} projectId={projectId} bucket="W" />;
      break;
    case 'observe.swot-synthesis.opportunity':
      tool = <SwotTagTool map={map} projectId={projectId} bucket="O" />;
      break;
    case 'observe.swot-synthesis.threat':
      tool = <SwotTagTool map={map} projectId={projectId} bucket="T" />;
      break;
    default:
      tool = null;
  }

  if (!tool) return null;

  return <div className={css.dock}>{tool}</div>;
}
