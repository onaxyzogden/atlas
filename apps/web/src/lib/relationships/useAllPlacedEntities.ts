/**
 * Aggregate the four canonical entity stores (structures, utilities, crop
 * areas, paddocks) for the active project into a flat list keyed for the
 * Phase 1 relationships catalog.
 *
 * Each result item carries:
 * - `id` — the source entity's `id` (paddock multi-species expands to one
 *   item per species, with id `${paddock.id}::${species}`).
 * - `type` — a value from one of the four EntityType union members.
 * - `lat` / `lng` — centroid (polygon mean for Structure / Paddock /
 *   CropArea, `center` field for Utility).
 * - `name` — display label.
 *
 * The `type` field is `string`-typed (rather than `EntityType`) so this
 * file does not need to import `@ogden/shared/relationships`. Consumers
 * that need exhaustive narrowing should cast at their boundary.
 */

import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useProjectStore } from '../../store/projectStore.js';

export interface PlacedEntityView {
  id: string;
  type: string;
  name: string;
  lat: number;
  lng: number;
  source: 'structure' | 'utility' | 'crop' | 'paddock';
}

function polygonCentroid(geom: GeoJSON.Polygon): { lat: number; lng: number } | null {
  const ring = geom.coordinates[0];
  if (!ring || ring.length === 0) return null;
  let sumLng = 0;
  let sumLat = 0;
  let n = 0;
  for (const pt of ring) {
    if (!pt || pt.length < 2) continue;
    const [lng, lat] = pt as [number, number];
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      sumLng += lng;
      sumLat += lat;
      n += 1;
    }
  }
  if (n === 0) return null;
  return { lat: sumLat / n, lng: sumLng / n };
}

export function useAllPlacedEntities(): PlacedEntityView[] {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const structures = useStructureStore((s) => s.structures);
  const utilities = useUtilityStore((s) => s.utilities);
  const cropAreas = useCropStore((s) => s.cropAreas);
  const paddocks = useLivestockStore((s) => s.paddocks);

  if (!activeProjectId) return [];

  const out: PlacedEntityView[] = [];

  for (const s of structures) {
    if (s.projectId !== activeProjectId) continue;
    const c = polygonCentroid(s.geometry);
    if (!c) continue;
    out.push({
      id: s.id,
      type: s.type,
      name: s.name ?? s.type,
      lat: c.lat,
      lng: c.lng,
      source: 'structure',
    });
  }

  for (const u of utilities) {
    if (u.projectId !== activeProjectId) continue;
    const [lng, lat] = u.center;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    out.push({
      id: u.id,
      type: u.type,
      name: u.name ?? u.type,
      lat,
      lng,
      source: 'utility',
    });
  }

  for (const c of cropAreas) {
    if (c.projectId !== activeProjectId) continue;
    const ctr = polygonCentroid(c.geometry);
    if (!ctr) continue;
    out.push({
      id: c.id,
      type: c.type,
      name: c.name ?? c.type,
      lat: ctr.lat,
      lng: ctr.lng,
      source: 'crop',
    });
  }

  for (const p of paddocks) {
    if (p.projectId !== activeProjectId) continue;
    const ctr = polygonCentroid(p.geometry);
    if (!ctr) continue;
    if (p.species.length === 0) continue;
    for (const sp of p.species) {
      out.push({
        id: `${p.id}::${sp}`,
        type: sp,
        name: `${p.name ?? 'Paddock'} (${sp})`,
        lat: ctr.lat,
        lng: ctr.lng,
        source: 'paddock',
      });
    }
  }

  return out;
}
