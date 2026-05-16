/**
 * PlantSystemsDesignElementHost — Current-view bridge for the three
 * Yeomans grazing kinds (orchard / silvopasture / pasture-mix) that
 * PlanTools surfaces in its Plant Systems group as of 2026-05-11.
 *
 * Wraps `useDesignElementDrawTool` so a draw completed on the Current
 * canvas persists to `designElementsStore` (the same store the Vision
 * canvas writes into). One source of truth for grazing polygons across
 * all four Plan views; on-canvas acreage labels render via the shared
 * `DesignElementLayers` mount.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import { useDesignElementDrawTool } from '../../canvas/draw/useDesignElementDrawTool.js';
import { useMapToolStore } from '../../../observe/components/measure/useMapToolStore.js';
import DrawAreaReadout from '../../../observe/components/draw/DrawAreaReadout.js';
import DrawLengthReadout from '../../../observe/components/draw/DrawLengthReadout.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  kind: string;
}

export default function PlantSystemsDesignElementHost({
  map,
  projectId,
  kind,
}: Props) {
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const { liveArea, liveLength } = useDesignElementDrawTool({
    map,
    projectId,
    kind,
    onComplete: () => setActiveTool(null),
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
