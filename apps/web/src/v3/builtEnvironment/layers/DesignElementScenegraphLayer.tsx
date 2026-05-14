/**
 * DesignElementScenegraphLayer — deck.gl ScenegraphLayer driven by
 * `useBuiltEnvironmentStoreV2`. Replaces the retired three.js custom-layer
 * `DesignElementGlbLayer` per ADR 2026-05-11-atlas-deckgl-scenegraph-migration.
 *
 * Must be mounted as a descendant of `<DeckOverlay>` so it can register its
 * `Layer` instance with the singleton `MapboxOverlay` for the active map.
 *
 * Filter logic mirrors the retired implementation:
 *   - project-scoped via `projectId`
 *   - state-scoped via `stateFilter` ('existing' | 'proposed' | 'all')
 *   - phase-capped on `proposed` entries when `view` is a phase view
 *   - only kinds with `mode: 'glb'` participate; everything else stays on
 *     the extrusion fallback
 *
 * Coordinate convention (matches the briefing's reference implementation):
 *   - `getPosition`: [lng, lat, baseM]
 *   - `getOrientation`: [pitch, yaw, roll] in degrees. Pitch/roll stay at 0
 *     for upright models; yaw is the per-kind `glbRotationDeg`.
 *   - `getScale`: [widthM, heightM, depthM]. The unit-cube fallback GLB
 *     scales to a width × height × depth box. Per-kind authored GLBs are
 *     expected to be authored at 1 unit = 1 metre and anchored at
 *     base-centre; `glbAnchorOffsetM` is applied via `getTranslation` if
 *     present.
 */

import { useEffect, useMemo } from 'react';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import type { BuiltEnvironmentEntity } from '@ogden/shared';
import {
  useBuiltEnvironmentStoreV2,
  type BuiltEnvironmentV2State,
} from '../../../store/builtEnvironmentStoreV2.js';
import {
  phaseIndex,
  yeomansCapForYear,
  type PhaseKey,
  type PlanView,
} from '../../plan/types.js';
import {
  getElementHeightSpec,
  EXTRUDED_KINDS,
  type ElementHeightSpec,
} from '../../plan/canvas/elementHeights.js';
import {
  polygonCentroid,
  polygonExtentsM,
} from '../../_shared/deck/geometryHelpers.js';
import { useDeckOverlay } from '../../_shared/deck/DeckOverlay.js';
import { openBeInlineEditById } from '../inline/openBeInlineEdit.js';
import { useCustomModelStore } from '../../../store/customModelStore.js';
import type { StateFilter } from './DesignElementExtrusionLayer.js';
import { useTemporalScrubStore } from '../../plan/canvas/temporalScrubStore.js';
import { canopyAtAge, matureCanopyM } from '@ogden/shared';

interface Props {
  projectId: string;
  /** Default 'all' — render both states. */
  stateFilter?: StateFilter;
  /** Plan-stage phase cap. Applied only to proposed-state entries. */
  view?: PlanView;
}

const LAYER_ID = 'design-el-scenegraph';

interface PlacedSpec {
  id: string;
  kind: string;
  glbUrl: string;
  position: [number, number, number];
  scale: [number, number, number];
  orientationDeg: [number, number, number];
  anchorOffsetM: [number, number, number];
}

function entityToPlaced(
  e: BuiltEnvironmentEntity,
  spec: ElementHeightSpec,
  customModelUrls: Record<string, string>,
  currentYear: number,
): PlacedSpec | null {
  if (!spec.glbUrl) return null;
  const baseM = spec.baseM ?? 0;
  const heightM = Math.max(spec.heightM, 0.05);
  // Per-instance yaw overrides the kind-level default (Phase 5 of ADR
  // 2026-05-11). `scaleMul` multiplies all three axes of the auto-computed
  // scale so users can size a placed model up or down without touching
  // footprint/height defaults. Vegetation kinds ignore `scaleMul` and
  // instead derive their scale from the canopy growth curve at the
  // current scrub year (per the 2026-04-28 temporal-slider ADR).
  const yawDeg = e.proposed?.rotationDeg ?? spec.glbRotationDeg ?? 0;
  let mul = e.proposed?.scaleMul ?? 1;
  if (spec.category === 'vegetation') {
    const mature = matureCanopyM(e.kind);
    if (mature > 0) {
      const now = canopyAtAge(e.kind, currentYear).canopyM;
      mul = Math.max(0.05, now / mature);
    }
  }
  const anchor = spec.glbAnchorOffsetM ?? [0, 0, 0];
  // Phase 6: per-instance custom GLB URL overrides the kind's spec.glbUrl
  // when the entity carries a resolvable `customModelId`. Unresolved ids
  // fall back to the generic-box placeholder via `spec.glbUrl`.
  const customId = e.proposed?.customModelId;
  const glbUrl =
    e.kind === 'custom-glb' && customId && customModelUrls[customId]
      ? customModelUrls[customId]
      : spec.glbUrl;

  if (e.geometry.type === 'Point') {
    const [lng, lat] = e.geometry.coordinates;
    if (lng == null || lat == null) return null;
    const side = Math.max(spec.footprintM, 0.5);
    return {
      id: e.id,
      kind: e.kind,
      glbUrl,
      position: [lng, lat, baseM],
      scale: [side * mul, heightM * mul, side * mul],
      orientationDeg: [0, yawDeg, 0],
      anchorOffsetM: anchor,
    };
  }

  if (e.geometry.type === 'Polygon') {
    const [lng, lat] = polygonCentroid(e.geometry);
    const { widthM, depthM } = polygonExtentsM(e.geometry);
    return {
      id: e.id,
      kind: e.kind,
      glbUrl,
      position: [lng, lat, baseM],
      scale: [widthM * mul, heightM * mul, depthM * mul],
      orientationDeg: [0, yawDeg, 0],
      anchorOffsetM: anchor,
    };
  }

  // Lines intentionally skipped — never 3D.
  return null;
}

const selectEntities = (s: BuiltEnvironmentV2State) => s.entities;

export default function DesignElementScenegraphLayer({
  projectId,
  stateFilter = 'all',
  view,
}: Props) {
  const { setLayer } = useDeckOverlay();
  const entities = useBuiltEnvironmentStoreV2(selectEntities);
  // Phase 6: per-instance custom-GLB lookup. Subscribing here means the
  // layer rebuilds when a model is added/removed or the store hydrates.
  const customEntries = useCustomModelStore((s) => s.entries);
  // Temporal slider — scrub year drives the per-instance vegetation
  // scale through entityToPlaced. Subscribing here means the specs
  // memo re-runs (and the layer rebuilds) on every slider tick.
  const currentYear = useTemporalScrubStore((s) => s.currentYear);

  const specs = useMemo<PlacedSpec[]>(() => {
    // Yeomans cap is now derived from the year scrubber's currentYear
    // (replaces the retired `phase-1` / `phase-2` view tabs, 2026-05-14).
    const capKey = yeomansCapForYear(currentYear);
    const cap = capKey ? phaseIndex(capKey) : Infinity;

    const customUrls: Record<string, string> = {};
    for (const [id, entry] of Object.entries(customEntries)) {
      customUrls[id] = entry.modelUrl;
    }

    const out: PlacedSpec[] = [];
    for (const e of entities) {
      if (e.projectId !== projectId) continue;
      if (stateFilter !== 'all' && e.state !== stateFilter) continue;
      if (!EXTRUDED_KINDS.has(e.kind)) continue;
      const heightSpec = getElementHeightSpec(e.kind);
      if (!heightSpec || heightSpec.mode !== 'glb') continue;

      if (e.state === 'proposed' && cap !== Infinity) {
        const phase = (e.proposed?.phase ?? 'buildings') as PhaseKey;
        if (phaseIndex(phase) > cap) continue;
      }

      const placed = entityToPlaced(e, heightSpec, customUrls, currentYear);
      if (placed) out.push(placed);
    }
    return out;
  }, [entities, projectId, stateFilter, view, customEntries, currentYear]);

  useEffect(() => {
    const layer = new ScenegraphLayer<PlacedSpec>({
      id: LAYER_ID,
      data: specs,
      scenegraph: (d: PlacedSpec) => d.glbUrl,
      getPosition: (d: PlacedSpec) => d.position,
      getOrientation: (d: PlacedSpec) => d.orientationDeg,
      getScale: (d: PlacedSpec) => d.scale,
      getTranslation: (d: PlacedSpec) => d.anchorOffsetM,
      sizeScale: 1,
      _lighting: 'pbr',
      pickable: true,
      onClick: (info) => {
        // Phase 5 of ADR 2026-05-11 — pick → inline edit popover.
        const placed = info.object as PlacedSpec | undefined;
        if (!placed) return false;
        const anchor: [number, number] = [
          placed.position[0],
          placed.position[1],
        ];
        return openBeInlineEditById(placed.id, anchor);
      },
      // Each instance can have a different scenegraph URL, so the layer
      // must rebuild its data-binding when specs change. We achieve that
      // by recreating the layer every effect run (deck.gl reconciles by id).
      updateTriggers: {
        scenegraph: specs.map((s) => s.glbUrl).join('|'),
      },
    });

    setLayer(LAYER_ID, layer);
    return () => setLayer(LAYER_ID, null);
  }, [specs, setLayer]);

  return null;
}
