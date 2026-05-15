/**
 * GroundCoverPaintTool — paints a `groundCover` state onto EXISTING
 * `LandZone` polygons. It draws no geometry: pick a cover swatch, then
 * click any zone on the map to tag it. Feeds the Observe→SiteProfile
 * `currentLandCover` facet and the Auto-Design zone-affinity matcher
 * (ADR `wiki/decisions/2026-05-14-auto-design-pipeline.md`).
 */

import { useEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useZoneStore,
  GROUND_COVER_LABELS,
  GROUND_COVER_COLORS,
  type GroundCoverState,
} from '../../../../store/zoneStore.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const COVERS = Object.keys(GROUND_COVER_LABELS) as GroundCoverState[];

export default function GroundCoverPaintTool({ map, projectId }: Props) {
  const updateZone = useZoneStore((s) => s.updateZone);
  const [cover, setCover] = useState<GroundCoverState | null>(
    'thriving-grasses',
  );
  const [painted, setPainted] = useState(0);
  const coverRef = useRef(cover);
  coverRef.current = cover;

  useEffect(() => {
    const canvas = map.getCanvas();
    const prevCursor = canvas.style.cursor;
    canvas.style.cursor = 'crosshair';

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      // Hit-test against the project's zone polygons directly (turf),
      // so this stays independent of which layer renders them. Smallest
      // containing zone wins when polygons nest.
      const zones = useZoneStore
        .getState()
        .zones.filter((z) => z.projectId === projectId);
      let hit: { id: string; areaM2: number } | null = null;
      for (const z of zones) {
        const g = z.geometry;
        if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') continue;
        if (turf.booleanPointInPolygon(pt, g)) {
          const a = z.areaM2 ?? turf.area(turf.feature(g));
          if (!hit || a < hit.areaM2) hit = { id: z.id, areaM2: a };
        }
      }
      if (!hit) return;
      updateZone(hit.id, { groundCover: coverRef.current });
      setPainted((n) => n + 1);
    };

    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
      canvas.style.cursor = prevCursor;
    };
  }, [map, projectId, updateZone]);

  return (
    <div className={css.popover} role="dialog" aria-label="Ground cover tool">
      <span className={css.title}>Ground cover</span>
      <span className={css.hint}>
        Pick a cover, then click a zone to tag its current state. Paints
        existing zones only — no new shapes.
      </span>
      <div className={css.radiiGrid}>
        {COVERS.map((c) => (
          <button
            key={c}
            type="button"
            className={cover === c ? css.primaryBtn : css.secondaryBtn}
            aria-pressed={cover === c}
            onClick={() => setCover(c)}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 2,
                marginRight: 6,
                verticalAlign: 'middle',
                background: GROUND_COVER_COLORS[c],
              }}
            />
            {GROUND_COVER_LABELS[c]}
          </button>
        ))}
        <button
          type="button"
          className={cover === null ? css.primaryBtn : css.secondaryBtn}
          aria-pressed={cover === null}
          onClick={() => setCover(null)}
        >
          Clear cover
        </button>
      </div>
      {painted > 0 && (
        <div className={css.readout}>
          <span className={css.readoutLabel}>Zones tagged</span>
          <span className={css.readoutValue}>{painted}</span>
        </div>
      )}
    </div>
  );
}
