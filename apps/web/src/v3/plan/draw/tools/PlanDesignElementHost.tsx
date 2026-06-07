/**
 * PlanDesignElementHost — Current-view bridge from PlanTools toolIds to
 * the unified `designElementsStore` draw lifecycle. Used for every
 * elementCatalog kind ported into PlanTools (grazing polygons, water
 * springs, access roads / bridges, machinery turnarounds, vegetation
 * trees / shrubs / hedgerows).
 *
 * Wraps `useDesignElementDrawTool` so a draw completed on the Current
 * canvas persists to the same store the Vision canvas writes into. One
 * source of truth for these kinds across all four Plan views.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import { useDesignElementDrawTool } from '../../canvas/draw/useDesignElementDrawTool.js';
import { usePlanSnapTargets } from './usePlanSnapTargets.js';
import { useMapToolStore } from '../../../observe/components/measure/useMapToolStore.js';
import DrawAreaReadout from '../../../observe/components/draw/DrawAreaReadout.js';
import DrawLengthReadout from '../../../observe/components/draw/DrawLengthReadout.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  kind: string;
  parcelBoundary?: GeoJSON.Polygon;
}

export default function PlanDesignElementHost({
  map,
  projectId,
  kind,
  parcelBoundary,
}: Props) {
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const getSnapTargets = usePlanSnapTargets(projectId, parcelBoundary);
  const { liveArea, liveLength } = useDesignElementDrawTool({
    map,
    projectId,
    kind,
    onComplete: () => setActiveTool(null),
    parcelBoundary,
    snap: true,
    getSnapTargets,
  });
  if (liveArea === null && liveLength === null) return null;
  return (
    <div className={css.popover} role="status" aria-label={`${kind} readout`}>
      <span className={css.title}>{kind}</span>
      <div className={css.readout}>
        {liveArea !== null && (
          <DrawAreaReadout
            m2={liveArea}
            labelClassName={css.readoutLabel}
            valueClassName={css.readoutValue}
          />
        )}
        {liveLength !== null && (
          <DrawLengthReadout
            meters={liveLength}
            labelClassName={css.readoutLabel}
            valueClassName={css.readoutValue}
          />
        )}
      </div>
    </div>
  );
}
