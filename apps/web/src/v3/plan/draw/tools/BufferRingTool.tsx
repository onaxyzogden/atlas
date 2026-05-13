/**
 * BufferRingTool — click an existing feature → SetbackRing (Plan Tier B / B2).
 *
 * Hit-tests against polygon kinds (zone, crop, paddock, structure) and
 * line kinds (path, utility) in priority order. The buffer is materialised
 * via `turf.buffer` at the steward's chosen distance and persisted as a
 * standalone polygon — moving the source later does NOT update the ring.
 *
 * Lives under `zone-circulation` in the PLAN toolbar.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useSetbackStore,
  SETBACK_PURPOSE_CONFIG,
  type SetbackPurpose,
  type SetbackSourceKind,
} from '../../../../store/setbackStore.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { useCropStore } from '../../../../store/cropStore.js';
import { useLivestockStore } from '../../../../store/livestockStore.js';
import { getAllStructures } from '../../../../store/builtEnvironmentSelectors.js';
import { usePathStore } from '../../../../store/pathStore.js';
import { useUtilityRunStore } from '../../../../store/utilityRunStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useEnterpriseFieldSpec } from '../useEnterpriseFieldSpec.js';
import { bufferGeometry } from './bufferGeometry.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const PURPOSE_OPTIONS: { value: SetbackPurpose; label: string }[] = (
  Object.keys(SETBACK_PURPOSE_CONFIG) as SetbackPurpose[]
).map((k) => ({ value: k, label: SETBACK_PURPOSE_CONFIG[k].label }));

const DEFAULT_DISTANCE_M = 10;

interface SourceHit {
  kind: SetbackSourceKind;
  id: string;
  name: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | GeoJSON.LineString;
}

function hitTestPolygons(
  click: GeoJSON.Feature<GeoJSON.Point>,
  projectId: string,
): SourceHit | null {
  // Priority order — most-specific first. A click inside a crop area
  // sitting on top of a zone resolves as the crop area, since that's the
  // tighter context the steward is pointing at.
  const structures = getAllStructures();
  for (const s of structures) {
    if (s.projectId !== projectId) continue;
    if (turf.booleanPointInPolygon(click, s.geometry)) {
      return { kind: 'structure', id: s.id, name: s.name, geometry: s.geometry };
    }
  }
  const paddocks = useLivestockStore.getState().paddocks;
  for (const p of paddocks) {
    if (p.projectId !== projectId) continue;
    if (turf.booleanPointInPolygon(click, p.geometry)) {
      return { kind: 'paddock', id: p.id, name: p.name, geometry: p.geometry };
    }
  }
  const cropAreas = useCropStore.getState().cropAreas;
  for (const c of cropAreas) {
    if (c.projectId !== projectId) continue;
    if (turf.booleanPointInPolygon(click, c.geometry)) {
      return { kind: 'crop', id: c.id, name: c.name, geometry: c.geometry };
    }
  }
  const zones = useZoneStore.getState().zones;
  for (const z of zones) {
    if (z.projectId !== projectId) continue;
    if (turf.booleanPointInPolygon(click, z.geometry)) {
      return { kind: 'zone', id: z.id, name: z.name, geometry: z.geometry };
    }
  }
  return null;
}

function hitTestLines(
  clickLngLat: [number, number],
  projectId: string,
): SourceHit | null {
  // Use a small buffer in degrees (≈3 m at most latitudes) for the
  // line proximity test. `turf.pointToLineDistance` would be more
  // accurate but here we just need "did the user roughly click on this
  // line" — the popover lets them adjust distance after.
  const click = turf.point(clickLngLat);
  const HIT_RADIUS_M = 8;
  const utilityRuns = useUtilityRunStore.getState().runs;
  for (const u of utilityRuns) {
    if (u.projectId !== projectId) continue;
    const dist = turf.pointToLineDistance(click, turf.feature(u.geometry), {
      units: 'meters',
    });
    if (dist <= HIT_RADIUS_M) {
      return { kind: 'utility', id: u.id, name: u.name, geometry: u.geometry };
    }
  }
  const paths = usePathStore.getState().paths;
  for (const p of paths) {
    if (p.projectId !== projectId) continue;
    const dist = turf.pointToLineDistance(click, turf.feature(p.geometry), {
      units: 'meters',
    });
    if (dist <= HIT_RADIUS_M) {
      return { kind: 'path', id: p.id, name: p.name, geometry: p.geometry };
    }
  }
  return null;
}

export default function BufferRingTool({ map, projectId }: Props) {
  const addRing = useSetbackStore((s) => s.addRing);
  const updateRing = useSetbackStore((s) => s.updateRing);
  const deleteRing = useSetbackStore((s) => s.deleteRing);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } = useEnterpriseFieldSpec(projectId);

  useEffect(() => {
    const prevCursor = map.getCanvas().style.cursor;
    map.getCanvas().style.cursor = 'crosshair';

    const handler = (e: MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      const click = turf.point([lng, lat]);
      const hit =
        hitTestPolygons(click, projectId) ?? hitTestLines([lng, lat], projectId);
      if (!hit) return;

      const purpose: SetbackPurpose = 'general';
      const ringGeom = bufferGeometry(hit.geometry, DEFAULT_DISTANCE_M);
      if (!ringGeom) return;

      const id = newAnnotationId('setback');
      const now = new Date().toISOString();
      addRing({
        id,
        projectId,
        name: `${SETBACK_PURPOSE_CONFIG[purpose].label} setback`,
        sourceKind: hit.kind,
        sourceId: hit.id,
        distanceM: DEFAULT_DISTANCE_M,
        purpose,
        geometry: ringGeom,
        color: SETBACK_PURPOSE_CONFIG[purpose].color,
        notes: '',
        phase: phaseDefault || undefined,
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: `Setback — around ${hit.name}`,
        anchor: [lng, lat],
        fields: [
          {
            key: 'name',
            label: 'Name',
            kind: 'text',
            required: true,
          },
          {
            key: 'purpose',
            label: 'Purpose',
            kind: 'select',
            required: true,
            options: PURPOSE_OPTIONS,
          },
          {
            key: 'distanceM',
            label: 'Distance',
            kind: 'number',
            required: true,
            placeholder: '10',
            suffix: 'm',
          },
          phaseField,
          enterpriseField,
        ],
        initial: {
          name: `${SETBACK_PURPOSE_CONFIG[purpose].label} setback`,
          purpose,
          distanceM: DEFAULT_DISTANCE_M,
          phase: phaseDefault,
          enterprise: enterpriseDefault,
        },
        onSave: (values) => {
          const nextPurpose = values.purpose as SetbackPurpose;
          const rawDist = Number(values.distanceM);
          const distanceM = Number.isFinite(rawDist) && rawDist > 0
            ? rawDist
            : DEFAULT_DISTANCE_M;
          const nextGeom = bufferGeometry(hit.geometry, distanceM);
          updateRing(id, {
            name: String(values.name ?? '').trim() ||
              `${SETBACK_PURPOSE_CONFIG[nextPurpose].label} setback`,
            purpose: nextPurpose,
            distanceM,
            geometry: nextGeom ?? ringGeom,
            color: SETBACK_PURPOSE_CONFIG[nextPurpose].color,
            phase: String(values.phase ?? '') || undefined,
            enterprise: String(values.enterprise ?? '') || undefined,
          });
        },
        onCancel: () => deleteRing(id),
      });
    };

    map.on('click', handler);
    return () => {
      map.off('click', handler);
      map.getCanvas().style.cursor = prevCursor;
    };
  }, [
    map,
    projectId,
    addRing,
    updateRing,
    deleteRing,
    openForm,
    phaseDefault,
    enterpriseDefault,
    phaseField,
    enterpriseField,
  ]);

  return (
    <div className={css.popover} role="dialog" aria-label="Buffer ring tool">
      <span className={css.title}>Buffer ring</span>
      <span className={css.hint}>
        Click an existing feature (zone, crop, paddock, structure, path,
        utility run) to drop a setback ring around it. Pick distance and
        purpose in the popover.
      </span>
    </div>
  );
}
