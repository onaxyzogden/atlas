/**
 * ZoneSeedAnchorTool — point → ring-seed anchor (Plan Module 3: Zone &
 * Circulation).
 *
 * Seeding used to run synchronously off a guessed centroid. Stewards
 * asked to choose where the rings grow from, so this tool arms a single
 * map click: the clicked point becomes the Z0 home centre and full
 * Mollison Z0–Z5 rings are seeded around it (un-clipped — trimming to the
 * parcel is a separate, explicit action).
 *
 * One-shot: capture the point → run the `ring-seed` generator → addZone
 * each draft → disarm. No inline form; refinement happens per-zone via
 * the normal selection floater afterwards.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import { useProjectStore } from '../../../../store/projectStore.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { runZoneGenerator } from '../../engine/zoneGenerators/index.js';
import { useMapToolStore } from '../../../observe/components/measure/useMapToolStore.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { toast } from '../../../../components/Toast.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function ZoneSeedAnchorTool({ map, projectId }: Props) {
  const projects = useProjectStore((s) => s.projects);
  const zones = useZoneStore((s) => s.zones);
  const addZone = useZoneStore((s) => s.addZone);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    onComplete: (geom) => {
      const anchorPoint = geom.coordinates as [number, number];
      const project = projects.find((p) => p.id === projectId);
      const seeded = runZoneGenerator('ring-seed', {
        projectId,
        parcelBoundary: project?.parcelBoundaryGeojson ?? null,
        existingZones: zones,
        anchorPoint,
      });
      seeded.forEach(addZone);
      if (seeded.length === 0) {
        toast.info(
          'No zones seeded — these Z-levels are already ring-seeded here.',
        );
      } else {
        toast.success(
          `Seeded ${seeded.length} draft zone(s) from the Mollison rings. ` +
            'Adjust, trim to the parcel, or clear them anytime.',
        );
      }
      setActiveTool(null);
    },
  });

  return (
    <div
      className={css.popover}
      role="dialog"
      aria-label="Seed zones from rings"
    >
      <span className={css.title}>Seed zones from rings</span>
      <span className={css.hint}>
        Click where the home centre sits — full Z0–Z5 rings grow from
        there. Trim or clear them afterwards.
      </span>
    </div>
  );
}
