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
import ZoneSeedAnchorTool from './tools/ZoneSeedAnchorTool.js';
import PathLineTool from './tools/PathLineTool.js';
import CropAreaTool from './tools/CropAreaTool.js';
import FertilityInfraTool from './tools/FertilityInfraTool.js';
import FlowConnectorTool from './tools/FlowConnectorTool.js';
import PaddockTool from './tools/PaddockTool.js';
import FenceLineTool from './tools/FenceLineTool.js';
import GuildTool from './tools/GuildTool.js';
import PlanDesignElementHost from './tools/PlanDesignElementHost.js';
import StructureTool from './tools/StructureTool.js';
import UtilityRunTool from './tools/UtilityRunTool.js';
import UtilityPointTool from './tools/UtilityPointTool.js';
import BufferRingTool from './tools/BufferRingTool.js';
import EcologicalNoteTool from './tools/EcologicalNoteTool.js';
import MonitoringTransectTool from './tools/MonitoringTransectTool.js';
import SlaughterPointTool from './tools/SlaughterPointTool.js';
import ColdChainUnitTool from './tools/ColdChainUnitTool.js';
import MarketNodeTool from './tools/MarketNodeTool.js';
import PlanScheduleMoveTool from './tools/PlanScheduleMoveTool.js';
import BeV2ExistingTool from '../../observe/components/draw/BeV2ExistingTool.js';
import { usePlanSnapTargets } from './tools/usePlanSnapTargets.js';
import css from '../../observe/components/draw/ObserveDrawHost.module.css';

/** Prefix used by registry-driven Plan BE tools (mirrors Observe rail). */
const PLAN_BE_PREFIX = 'plan.structures-subsystems.be.';

/**
 * Tool ids that route through the unified `designElementsStore` draw
 * lifecycle (PlanDesignElementHost). These are elementCatalog kinds
 * ported into PlanTools 2026-05-11 — Yeomans grazing polygons, water /
 * access / machinery / vegetation kinds.
 *
 * Each id's last `.` segment matches the elementCatalog `kind` string.
 */
const DESIGN_ELEMENT_TOOL_IDS = new Set<string>([
  'plan.plant-systems.orchard',
  'plan.plant-systems.silvopasture',
  'plan.plant-systems.pasture-mix',
  'plan.plant-systems.oak-tree',
  'plan.plant-systems.pine-tree',
  'plan.plant-systems.apple-tree',
  'plan.plant-systems.shrub',
  'plan.plant-systems.hedgerow',
  'plan.water-management.spring',
  'plan.zone-circulation.road',
  'plan.zone-circulation.bridge',
  'plan.machinery.turnaround',
]);

interface Props {
  map: MaplibreMap;
  projectId: string | null;
  parcelBoundary?: GeoJSON.Polygon;
  /**
   * `'current'` (default) — full switchboard for the 2D Current canvas.
   * `'vision'` — Vision / 3D Terrain canvas: skip the elementCatalog-kind
   * and Plan-BE branches because `VisionLayoutCanvas` already mounts those
   * lifecycles (`DesignElementDrawHost` / `BeV2ExistingTool`). Only the
   * dedicated-store `switch` runs, so there is no double-mount.
   */
  variant?: 'current' | 'vision';
  /**
   * Plan objective active in the Act tier shell when a feature is drawn
   * (Phase-5 provenance stamp). Threaded into every derive-covered tool so
   * the create payload carries `sourceObjectiveId`. The standalone Plan rail
   * omits it (undefined), and the derive path lists those features regardless.
   */
  sourceObjectiveId?: string | null;
}

export default function PlanDrawHost({
  map,
  projectId,
  parcelBoundary,
  variant = 'current',
  sourceObjectiveId,
}: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);
  // Shared snap-target builder (existing fences / paddocks / structures /
  // boundary). Called unconditionally before any early return to respect the
  // rules of hooks; `projectId ?? ''` yields empty targets when unused.
  const getSnapTargets = usePlanSnapTargets(projectId ?? '', parcelBoundary);

  if (!activeTool || !activeTool.startsWith('plan.') || !projectId) {
    return null;
  }

  // elementCatalog-kind dispatch: tool ids ported from the Vision-canvas
  // palette route through PlanDesignElementHost so they persist to
  // `designElementsStore` (same store the Vision canvas writes into).
  // One source of truth across all four Plan views.
  if (variant === 'current' && DESIGN_ELEMENT_TOOL_IDS.has(activeTool)) {
    const kind = activeTool.split('.').pop()!;
    return (
      <div className={css.dock}>
        <PlanDesignElementHost
          map={map}
          projectId={projectId}
          kind={kind}
          parcelBoundary={parcelBoundary}
          sourceObjectiveId={sourceObjectiveId}
        />
      </div>
    );
  }

  // Registry-driven Plan BE dispatch: tool ids of shape
  // `plan.structures-subsystems.be.<kind>` mount BeV2ExistingTool with
  // `state: 'proposed'`. Mirrors the Observe rail's registry-driven path.
  if (variant === 'current' && activeTool.startsWith(PLAN_BE_PREFIX)) {
    const kind = activeTool.slice(PLAN_BE_PREFIX.length);
    return (
      <div className={css.dock}>
        <BeV2ExistingTool
          map={map}
          projectId={projectId}
          kind={kind}
          state="proposed"
          snap
          getSnapTargets={getSnapTargets}
          sourceObjectiveId={sourceObjectiveId}
        />
      </div>
    );
  }

  let tool: React.ReactNode = null;
  switch (activeTool) {
    case 'plan.water-management.catchment':
      tool = (
        <WaterCatchmentTool
          map={map}
          projectId={projectId}
          getSnapTargets={getSnapTargets}
          sourceObjectiveId={sourceObjectiveId}
          parcelBoundary={parcelBoundary}
        />
      );
      break;
    case 'plan.water-management.storage':
      tool = (
        <WaterStorageTool
          map={map}
          projectId={projectId}
          sourceObjectiveId={sourceObjectiveId}
          parcelBoundary={parcelBoundary}
        />
      );
      break;
    case 'plan.water-management.swale':
      tool = (
        <WaterSwaleTool
          map={map}
          projectId={projectId}
          getSnapTargets={getSnapTargets}
          sourceObjectiveId={sourceObjectiveId}
          parcelBoundary={parcelBoundary}
        />
      );
      break;
    case 'plan.water-management.sink':
      tool = (
        <WaterSinkTool
          map={map}
          projectId={projectId}
          sourceObjectiveId={sourceObjectiveId}
          parcelBoundary={parcelBoundary}
        />
      );
      break;
    case 'plan.zone-circulation.zone':
      tool = (
        <ZonePolygonTool
          map={map}
          projectId={projectId}
          getSnapTargets={getSnapTargets}
          sourceObjectiveId={sourceObjectiveId}
          parcelBoundary={parcelBoundary}
        />
      );
      break;
    case 'plan.zone-circulation.zone-seed-anchor':
      tool = (
        <ZoneSeedAnchorTool
          map={map}
          projectId={projectId}
          sourceObjectiveId={sourceObjectiveId}
        />
      );
      break;
    case 'plan.zone-circulation.path':
      tool = (
        <PathLineTool
          map={map}
          projectId={projectId}
          getSnapTargets={getSnapTargets}
          sourceObjectiveId={sourceObjectiveId}
          parcelBoundary={parcelBoundary}
        />
      );
      break;
    case 'plan.zone-circulation.buffer-ring':
      tool = <BufferRingTool map={map} projectId={projectId} />;
      break;
    case 'plan.plant-systems.crop-area':
      tool = (
        <CropAreaTool
          map={map}
          projectId={projectId}
          getSnapTargets={getSnapTargets}
          sourceObjectiveId={sourceObjectiveId}
          parcelBoundary={parcelBoundary}
        />
      );
      break;
    case 'plan.plant-systems.guild':
      tool = <GuildTool map={map} projectId={projectId} parcelBoundary={parcelBoundary} />;
      break;
    case 'plan.soil-fertility.fertility-unit':
      tool = <FertilityInfraTool map={map} projectId={projectId} parcelBoundary={parcelBoundary} />;
      break;
    case 'plan.soil-fertility.flow-connector':
      tool = (
        <FlowConnectorTool
          map={map}
          projectId={projectId}
          getSnapTargets={getSnapTargets}
        />
      );
      break;
    case 'plan.livestock.paddock':
      tool = (
        <PaddockTool
          map={map}
          projectId={projectId}
          getSnapTargets={getSnapTargets}
          sourceObjectiveId={sourceObjectiveId}
          parcelBoundary={parcelBoundary}
        />
      );
      break;
    case 'plan.livestock.fence-line':
      tool = (
        <FenceLineTool
          map={map}
          projectId={projectId}
          getSnapTargets={getSnapTargets}
          sourceObjectiveId={sourceObjectiveId}
          parcelBoundary={parcelBoundary}
        />
      );
      break;
    case 'plan.structures-subsystems.structure':
      tool = <StructureTool map={map} projectId={projectId} parcelBoundary={parcelBoundary} />;
      break;
    case 'plan.structures-subsystems.utility-run':
      tool = (
        <UtilityRunTool
          map={map}
          projectId={projectId}
          getSnapTargets={getSnapTargets}
          parcelBoundary={parcelBoundary}
        />
      );
      break;
    case 'plan.structures-subsystems.utility-point':
      tool = <UtilityPointTool map={map} projectId={projectId} parcelBoundary={parcelBoundary} />;
      break;
    case 'plan.principle-verification.note':
      tool = <EcologicalNoteTool map={map} projectId={projectId} />;
      break;
    case 'plan.principle-verification.transect':
      tool = (
        <MonitoringTransectTool
          map={map}
          projectId={projectId}
          getSnapTargets={getSnapTargets}
        />
      );
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
    case 'plan.livestock.schedule-move':
      tool = <PlanScheduleMoveTool map={map} projectId={projectId} />;
      break;
    default:
      tool = null;
  }

  if (!tool) return null;
  return <div className={css.dock}>{tool}</div>;
}
