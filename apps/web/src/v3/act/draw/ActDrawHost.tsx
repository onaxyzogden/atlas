/**
 * ActDrawHost — switchboard that mounts the right ACT-stage tool based on
 * `useMapToolStore.activeTool`. Mirrors PlanDrawHost.
 *
 * Act tools log execution events against existing features (Plan crop
 * areas, paddocks, hazards) — they do not author new geometry. The host
 * no-ops unless the active tool is an `act.*` id and a project is loaded.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import HarvestLogTool from './tools/HarvestLogTool.js';
import MaintenanceLogTool from './tools/MaintenanceLogTool.js';
import LivestockMoveTool from './tools/LivestockMoveTool.js';
import css from '../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string | null;
}

export default function ActDrawHost({ map, projectId }: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);

  if (!activeTool || !activeTool.startsWith('act.') || !projectId) {
    return null;
  }

  let tool: React.ReactNode = null;
  switch (activeTool) {
    case 'act.harvest.log-entry':
      tool = <HarvestLogTool map={map} projectId={projectId} />;
      break;
    case 'act.maintain.log-event':
      tool = <MaintenanceLogTool map={map} projectId={projectId} />;
      break;
    case 'act.livestock.log-move':
      tool = <LivestockMoveTool map={map} projectId={projectId} />;
      break;
    default:
      tool = null;
  }

  if (!tool) return null;
  return <div className={css.dock}>{tool}</div>;
}
