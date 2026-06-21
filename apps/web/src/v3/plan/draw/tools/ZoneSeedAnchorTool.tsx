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
import * as turf from '@turf/turf';
import { useProjectStore } from '../../../../store/projectStore.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { useMatrixTogglesStore } from '../../../../store/matrixTogglesStore.js';
import { runZoneGenerator } from '../../engine/zoneGenerators/index.js';
import { useMapToolStore } from '../../../observe/components/measure/useMapToolStore.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import type { SnapTargets } from '../../../lib/snapPoint.js';
import { toast } from '../../../../components/Toast.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  /** Snap-target source builder; consulted only when snapping is armed. */
  getSnapTargets?: () => SnapTargets;
  /** Plan objective active in the Act tier when this tool is armed (Phase-5 provenance stamp). */
  sourceObjectiveId?: string | null;
}

export default function ZoneSeedAnchorTool({ map, projectId, sourceObjectiveId, getSnapTargets }: Props) {
  const projects = useProjectStore((s) => s.projects);
  const zones = useZoneStore((s) => s.zones);
  const addZone = useZoneStore((s) => s.addZone);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    snap: true,
    getSnapTargets,
    onComplete: (geom) => {
      const anchorPoint = geom.coordinates as [number, number];
      const project = projects.find((p) => p.id === projectId);
      const seeded = runZoneGenerator('ring-seed', {
        projectId,
        parcelBoundary: project?.parcelBoundaryGeojson ?? null,
        existingZones: zones,
        anchorPoint,
      });
      seeded.forEach((z) =>
        addZone({ ...z, sourceObjectiveId: sourceObjectiveId ?? undefined }),
      );
      if (seeded.length === 0) {
        toast.info(
          'No zones seeded — these Z-levels are already ring-seeded here.',
        );
      } else {
        // The Mollison rings use fixed real-world radii (Z0 ~15 m disc out to
        // Z5 ~1200 m). Without re-framing, on a fresh project at a wide default
        // zoom the seeded rings land off-screen / sub-pixel and read as
        // "nothing happened" even though the zones are in the store. Make sure
        // the seeded-zone layer is visible, then ease the camera to the seeded
        // extent so the rings are always on screen.
        if (!useMatrixTogglesStore.getState().seededZones) {
          useMatrixTogglesStore.setState({ seededZones: true });
        }
        try {
          const [minX, minY, maxX, maxY] = turf.bbox(
            turf.featureCollection(seeded.map((z) => turf.feature(z.geometry))),
          );
          map.fitBounds(
            [
              [minX, minY],
              [maxX, maxY],
            ],
            { padding: 64, duration: 600 },
          );
        } catch {
          /* bbox/fitBounds is best-effort — never block seeding on a camera move */
        }
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
      aria-label="Seed zones from home"
    >
      <span className={css.title}>Seed zones from home</span>
      <span className={css.hint}>
        Click where the home centre sits — full Z0–Z5 rings grow from
        there. Trim or clear them afterwards.
      </span>
    </div>
  );
}
