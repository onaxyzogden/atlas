/**
 * DesignDropController — listens for clicks on the design canvas while
 * a toolbox item is armed, runs the snap pass, and writes the resulting
 * record into the matching v2 store.
 *
 * Phase 5.1 PR3. Lives inside DesignMap's render-prop so it has the
 * live `map` instance. Also flips the canvas cursor to crosshair while
 * armed (visual cue that the next click drops a placement).
 *
 * Snap targets pulled from:
 *   - parcel boundary edges (always, when boundary present)
 *   - existing structure polygon corners (project-filtered)
 *   - existing paddock polygon corners (project-filtered)
 *
 * Tools without a v2 store mapping yet (paths, ponds, gardens, etc.)
 * fall through to `onUnhandled(label)` so the page can toast — no
 * silent failure, but no fake placement either.
 */

import { useEffect, useMemo } from "react";
import { maplibregl } from "../../lib/maplibre.js";
import { useStructureStore } from "../../store/structureStore.js";
import { useLivestockStore } from "../../store/livestockStore.js";
import { snapPoint, type SnapTargets } from "../lib/snapPoint.js";
import { buildDrop } from "../lib/dropDefaults.js";

type LngLat = [number, number];

interface ArmedTool { groupId: string; itemId: string; label: string }

export interface DesignDropControllerProps {
  map: maplibregl.Map;
  projectId: string;
  armed: ArmedTool | null;
  boundary?: GeoJSON.Polygon;
  onPlaced?: (label: string, snappedTo: "boundary" | "structure" | "paddock" | null) => void;
  onUnhandled?: (label: string) => void;
}

function ringCorners(geom: GeoJSON.Polygon): LngLat[] {
  const ring = geom.coordinates[0];
  if (!ring) return [];
  // Drop the closing duplicate — corners are the unique vertices.
  const last = ring[ring.length - 1];
  const first = ring[0];
  const closed = !!last && !!first && last[0] === first[0] && last[1] === first[1];
  const slice = closed ? ring.slice(0, -1) : ring;
  return slice
    .filter((p): p is [number, number] => Array.isArray(p) && p.length >= 2)
    .map((p) => [p[0]!, p[1]!] as LngLat);
}

export default function DesignDropController({
  map,
  projectId,
  armed,
  boundary,
  onPlaced,
  onUnhandled,
}: DesignDropControllerProps) {
  const addStructure = useStructureStore((s) => s.addStructure);
  const addPaddock = useLivestockStore((s) => s.addPaddock);
  const structures = useStructureStore((s) => s.structures);
  const paddocks = useLivestockStore((s) => s.paddocks);

  // Snap targets re-derive only when the project's placements change.
  const targets = useMemo<SnapTargets>(() => {
    const structureCorners: LngLat[] = [];
    for (const s of structures) {
      if (s.projectId !== projectId) continue;
      structureCorners.push(...ringCorners(s.geometry));
    }
    const paddockCorners: LngLat[] = [];
    for (const p of paddocks) {
      if (p.projectId !== projectId) continue;
      paddockCorners.push(...ringCorners(p.geometry));
    }
    return {
      ...(boundary ? { boundary } : {}),
      structureCorners,
      paddockCorners,
    };
  }, [structures, paddocks, projectId, boundary]);

  // Cursor cue while armed.
  useEffect(() => {
    if (!map) return;
    const canvas = map.getCanvas();
    if (armed) {
      canvas.style.cursor = "crosshair";
    } else {
      canvas.style.cursor = "";
    }
    return () => {
      canvas.style.cursor = "";
    };
  }, [map, armed]);

  // Click → snap → drop.
  useEffect(() => {
    if (!map || !armed) return;

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const raw: LngLat = [e.lngLat.lng, e.lngLat.lat];
      const snap = snapPoint(map, raw, targets);
      const result = buildDrop({
        projectId,
        toolItemId: armed.itemId,
        toolGroupId: armed.groupId,
        toolLabel: armed.label,
        position: snap.position,
      });
      if (!result) {
        onUnhandled?.(armed.label);
        return;
      }
      if (result.kind === "structure") addStructure(result.record);
      else if (result.kind === "paddock") addPaddock(result.record);
      onPlaced?.(armed.label, snap.snappedTo);
    };

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, armed, targets, projectId, addStructure, addPaddock, onPlaced, onUnhandled]);

  return null;
}
