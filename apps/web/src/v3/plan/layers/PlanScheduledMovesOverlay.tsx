/**
 * PlanScheduledMovesOverlay — cross-stage surfacing of ACT-stage plans on the
 * Plan-stage map.
 *
 * The steward designs paddocks and structures in Plan, and schedules livestock
 * moves against them in Act (`RotationScheduleCard`, Structure-moves tail).
 * Until this overlay shipped, those plans were invisible from the Plan-stage
 * map — the operator had to switch stages to remember "this paddock has a
 * planned move next week."
 *
 * Surface: one badge per destination (paddock or structure) that has at least
 * one *unfulfilled* `ScheduledLivestockMove`. Badge text:
 *   "📅 N · <soonest YYYY-MM-DD>"
 * positioned at the destination's centroid. Read-only — editing still happens
 * on the Act-stage card.
 *
 * Visibility gated on `useMatrixTogglesStore.scheduledMoves`. Default off so
 * existing stewards don't inherit an unfamiliar layer.
 */

import { useEffect, useMemo } from 'react';
import * as turf from '@turf/turf';
import { maplibregl } from '../../../lib/maplibre.js';
import { useMatrixTogglesStore } from '../../../store/matrixTogglesStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useStructureStore } from '../../../store/structureStore.js';
import { useScheduledLivestockMoveStore } from '../../../store/scheduledLivestockMoveStore.js';

const SOURCE_ID = 'plan-scheduled-moves-source';
const BG_LAYER = 'plan-scheduled-moves-bg';
const TEXT_LAYER = 'plan-scheduled-moves-text';

interface Props {
  map: maplibregl.Map;
  projectId: string;
}

export default function PlanScheduledMovesOverlay({ map, projectId }: Props) {
  const visible = useMatrixTogglesStore((s) => s.scheduledMoves);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const structures = useStructureStore((s) => s.structures);
  const plans = useScheduledLivestockMoveStore((s) => s.plans);

  const fc = useMemo<GeoJSON.FeatureCollection>(() => {
    // Group unfulfilled plans by destination key (paddock:id | structure:id).
    type Bucket = {
      destKind: 'paddock' | 'structure';
      destId: string;
      count: number;
      soonest: string;
    };
    const buckets = new Map<string, Bucket>();
    for (const p of plans) {
      if (p.projectId !== projectId) continue;
      if (p.fulfilledByEventId) continue;
      const destKind: 'paddock' | 'structure' = p.toPaddockId ? 'paddock' : 'structure';
      const destId = p.toPaddockId ?? p.toStructureId ?? '';
      if (!destId) continue;
      const key = `${destKind}:${destId}`;
      const cur = buckets.get(key);
      if (!cur) {
        buckets.set(key, {
          destKind,
          destId,
          count: 1,
          soonest: p.plannedDate,
        });
      } else {
        cur.count += 1;
        if (p.plannedDate < cur.soonest) cur.soonest = p.plannedDate;
      }
    }

    const features: GeoJSON.Feature[] = [];
    for (const b of buckets.values()) {
      let anchor: [number, number] | null = null;
      if (b.destKind === 'paddock') {
        const pd = paddocks.find((x) => x.id === b.destId && x.projectId === projectId);
        if (!pd) continue;
        try {
          const c = turf.centroid(pd.geometry).geometry.coordinates as [number, number];
          anchor = c;
        } catch {
          /* skip malformed geom */
        }
      } else {
        const st = structures.find((x) => x.id === b.destId && x.projectId === projectId);
        if (!st) continue;
        anchor = st.center;
      }
      if (!anchor) continue;
      const label = `\u{1F4C5} ${b.count} · ${b.soonest}`;
      features.push({
        type: 'Feature',
        id: `${b.destKind}-${b.destId}`,
        geometry: { type: 'Point', coordinates: anchor },
        properties: {
          destKind: b.destKind,
          destId: b.destId,
          count: b.count,
          soonest: b.soonest,
          label,
        },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [plans, paddocks, structures, projectId]);

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!src) {
        map.addSource(SOURCE_ID, { type: 'geojson', data: fc });
      } else {
        src.setData(fc);
      }
      // Pill background — drawn behind the text via layer ordering.
      if (!map.getLayer(BG_LAYER)) {
        map.addLayer({
          id: BG_LAYER,
          type: 'symbol',
          source: SOURCE_ID,
          layout: {
            // Empty text on the bg layer; the visual pill is the text-halo
            //  on the text layer. We keep this layer present so it can act
            //  as a hit target if a click handler is added later.
            'text-field': '',
            'text-allow-overlap': true,
            'icon-allow-overlap': true,
          },
        });
      }
      if (!map.getLayer(TEXT_LAYER)) {
        map.addLayer({
          id: TEXT_LAYER,
          type: 'symbol',
          source: SOURCE_ID,
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 11,
            'text-anchor': 'center',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-padding': 2,
          },
          paint: {
            'text-color': '#2d2a23',
            'text-halo-color': '#f7efd8',
            'text-halo-width': 3,
            'text-halo-blur': 0.5,
          },
        });
      }
      [BG_LAYER, TEXT_LAYER].forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
        }
      });
    };

    const ready = () => (map.getStyle()?.layers?.length ?? 0) > 0;
    if (ready()) ensure();
    const onStyle = () => {
      if (!ready()) return;
      ensure();
    };
    map.on('styledata', onStyle);
    return () => {
      map.off('styledata', onStyle);
    };
  }, [map, fc, visible]);

  return null;
}
