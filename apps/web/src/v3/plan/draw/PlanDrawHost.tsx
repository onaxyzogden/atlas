/**
 * PlanDrawHost — switchboard that mounts the right PLAN draw tool based on
 * the current `useMapToolStore.activeTool`. Mirrors ObserveDrawHost.
 *
 * No-op when activeTool is not a `plan.*` id, or when projectId is null.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import WaterCatchmentTool from './tools/WaterCatchmentTool.js';
import WaterStorageTool from './tools/WaterStorageTool.js';
import WaterSwaleTool from './tools/WaterSwaleTool.js';
import WaterSinkTool from './tools/WaterSinkTool.js';
import ZonePolygonTool from './tools/ZonePolygonTool.js';
import PathLineTool from './tools/PathLineTool.js';
import CropAreaTool from './tools/CropAreaTool.js';
import FertilityInfraTool from './tools/FertilityInfraTool.js';
import FlowConnectorTool from './tools/FlowConnectorTool.js';
import PaddockTool from './tools/PaddockTool.js';
import FenceLineTool from './tools/FenceLineTool.js';
import GuildTool from './tools/GuildTool.js';
import StructureTool from './tools/StructureTool.js';
import UtilityRunTool from './tools/UtilityRunTool.js';
import BufferRingTool from './tools/BufferRingTool.js';
import EcologicalNoteTool from './tools/EcologicalNoteTool.js';
import MonitoringTransectTool from './tools/MonitoringTransectTool.js';
import SlaughterPointTool from './tools/SlaughterPointTool.js';
import ColdChainUnitTool from './tools/ColdChainUnitTool.js';
import MarketNodeTool from './tools/MarketNodeTool.js';
import css from '../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string | null;
}

export default function PlanDrawHost({ map, projectId }: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);

  if (!activeTool || !activeTool.startsWith('plan.') || !projectId) {
    return null;
  }

  let tool: React.ReactNode = null;
  switch (activeTool) {
    case 'plan.water-management.catchment':
      tool = <WaterCatchmentTool map={map} projectId={projectId} />;
      break;
    case 'plan.water-management.storage':
      tool = <WaterStorageTool map={map} projectId={projectId} />;
      break;
    case 'plan.water-management.swale':
      tool = <WaterSwaleTool map={map} projectId={projectId} />;
      break;
    case 'plan.water-management.sink':
      tool = <WaterSinkTool map={map} projectId={projectId} />;
      break;
    case 'plan.zone-circulation.zone':
      tool = <ZonePolygonTool map={map} projectId={projectId} />;
      break;
    case 'plan.zone-circulation.path':
      tool = <PathLineTool map={map} projectId={projectId} />;
      break;
    case 'plan.zone-circulation.buffer-ring':
      tool = <BufferRingTool map={map} projectId={projectId} />;
      break;
    case 'plan.plant-systems.crop-area':
      tool = <CropAreaTool map={map} projectId={projectId} />;
      break;
    case 'plan.plant-systems.guild':
      tool = <GuildTool map={map} projectId={projectId} />;
      break;
    case 'plan.soil-fertility.fertility-unit':
      tool = <FertilityInfraTool map={map} projectId={projectId} />;
      break;
    case 'plan.soil-fertility.flow-connector':
      tool = <FlowConnectorTool map={map} projectId={projectId} />;
      break;
    case 'plan.livestock.paddock':
      tool = <PaddockTool map={map} projectId={projectId} />;
      break;
    case 'plan.livestock.fence-line':
      tool = <FenceLineTool map={map} projectId={projectId} />;
      break;
    case 'plan.structures-subsystems.structure':
      tool = <StructureTool map={map} projectId={projectId} />;
      break;
    case 'plan.structures-subsystems.utility-run':
      tool = <UtilityRunTool map={map} projectId={projectId} />;
      break;
    case 'plan.principle-verification.note':
      tool = <EcologicalNoteTool map={map} projectId={projectId} />;
      break;
    case 'plan.principle-verification.transect':
      tool = <MonitoringTransectTool map={map} projectId={projectId} />;
      break;
    case 'plan.livestock.slaughter-point':
      tool = <SlaughterPointTool map={map} projectId={projectId} />;
      break;
    case 'plan.livestock.cold-chain-unit':
      tool = <ColdChainUnitTool map={map} projectId={projectId} />;
      break;
    case 'plan.livestock.market-node':
      tool = <MarketNodeTool map={map} projectId={projectId} />;
      break;
    default:
      tool = null;
  }

  if (!tool) return null;
  return <div className={css.dock}>{tool}</div>;
}
