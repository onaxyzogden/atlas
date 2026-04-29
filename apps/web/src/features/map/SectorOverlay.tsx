import { useEffect, useMemo } from 'react';
import type maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useMapStore } from '../../store/mapStore.js';
import { useSiteAnnotationsStore, type SectorArrow } from '../../store/siteAnnotationsStore.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

interface SectorOverlayProps {
  projectId: string;
  map: maplibregl.Map | null;
  /** Used to derive the centroid the wedges are projected from. If absent
   *  (e.g. parcel not drawn yet) the overlay quietly no-ops. */
  boundaryGeojson?: GeoJSON.FeatureCollection | null | undefined;
}

const SOURCE_ID = 'sector-arrows';
const FILL_LAYER_ID = 'sector-arrows-fill';
const LINE_LAYER_ID = 'sector-arrows-line';

/** Default radius of a wedge in metres when the parcel is small or absent.
 *  We still want the wedge visible at parcel-scale zooms. */
const DEFAULT_RADIUS_M = 500;
/** Number of vertices along the outer arc; 24 keeps the curve smooth without
 *  bloating the GeoJSON for ~8 sectors. */
const ARC_VERTICES = 24;

/** Compass bearing → cartesian heading. Compass: 0 = N, 90 = E (clockwise);
 *  turf bearing: 0 = N, 90 = E (clockwise) — same convention, so pass-through. */
function compassToBearing(deg: number): number {
  // Normalise to (-180, 180] for turf.destination.
  let b = deg % 360;
  if (b > 180) b -= 360;
  if (b <= -180) b += 360;
  return b;
}

/** Build a single wedge polygon as a turf Feature<Polygon>. */
function wedgeFeature(
  centroid: [number, number],
  bearingDeg: number,
  arcDeg: number,
  radiusM: number,
  sector: SectorArrow,
): GeoJSON.Feature<GeoJSON.Polygon, { id: string; type: string; intensity: string }> {
  const half = arcDeg / 2;
  const start = bearingDeg - half;
  const end = bearingDeg + half;
  const ring: Array<[number, number]> = [centroid];
  for (let i = 0; i <= ARC_VERTICES; i++) {
    const t = i / ARC_VERTICES;
    const b = compassToBearing(start + (end - start) * t);
    const pt = turf.destination(turf.point(centroid), radiusM / 1000, b, { units: 'kilometers' });
    ring.push(pt.geometry.coordinates as [number, number]);
  }
  ring.push(centroid);
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [ring] },
    properties: {
      id: sector.id,
      type: sector.type,
      intensity: sector.intensity ?? 'med',
    },
  };
}

export default function SectorOverlay({ projectId, map, boundaryGeojson }: SectorOverlayProps) {
  const visible = useMapStore((s) => s.sectorOverlayVisible);
  const overlayOpacity = useMapStore((s) => s.overlayOpacity);
  const allSectors = useSiteAnnotationsStore((s) => s.sectors);

  const sectors = useMemo(
    () => allSectors.filter((arrow) => arrow.projectId === projectId),
    [allSectors, projectId],
  );

  const geojson = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!boundaryGeojson || sectors.length === 0) return null;
    let centroid: [number, number];
    try {
      const c = turf.centroid(boundaryGeojson);
      centroid = c.geometry.coordinates as [number, number];
    } catch {
      return null;
    }
    let radiusM = DEFAULT_RADIUS_M;
    try {
      const bbox = turf.bbox(boundaryGeojson);
      const diag = turf.distance(turf.point([bbox[0], bbox[1]]), turf.point([bbox[2], bbox[3]]), {
        units: 'kilometers',
      });
      // Wedge extends ~0.75× the parcel diagonal so off-site influences read
      // visually as "approaching from outside" the parcel boundary.
      radiusM = Math.max(DEFAULT_RADIUS_M, diag * 1000 * 0.75);
    } catch {
      // keep default
    }
    return {
      type: 'FeatureCollection',
      features: sectors.map((s) =>
        wedgeFeature(centroid, s.bearingDeg, s.arcDeg, radiusM, s),
      ),
    };
  }, [boundaryGeojson, sectors]);

  useEffect(() => {
    if (!map) return;

    const sync = () => {
      if (!map.isStyleLoaded()) return;

      if (visible && geojson) {
        const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        if (src) {
          src.setData(geojson);
          if (map.getLayer(FILL_LAYER_ID)) {
            map.setPaintProperty(FILL_LAYER_ID, 'fill-opacity', overlayOpacity * 0.40);
          }
          if (map.getLayer(LINE_LAYER_ID)) {
            map.setPaintProperty(LINE_LAYER_ID, 'line-opacity', overlayOpacity * 0.7);
          }
        } else {
          map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });
          // Same palette as SectorCompassCard so the overlay reads consistently
          // with the standalone compass.
          const fillColor: maplibregl.ExpressionSpecification = [
            'match',
            ['get', 'type'],
            'sun_summer',      'rgba(240, 195, 80, 1)',
            'sun_winter',      'rgba(240, 230, 120, 1)',
            'wind_prevailing', 'rgba(120, 190, 220, 1)',
            'wind_storm',      'rgba(200, 80, 100, 1)',
            'fire',            'rgba(220, 100, 70, 1)',
            'noise',           'rgba(180, 120, 200, 1)',
            'wildlife',        'rgba(120, 200, 130, 1)',
            'view',            'rgba(180, 180, 180, 1)',
            'rgba(255,255,255,0.6)',
          ];
          map.addLayer({
            id: FILL_LAYER_ID,
            type: 'fill',
            source: SOURCE_ID,
            paint: {
              'fill-color': fillColor,
              'fill-opacity': overlayOpacity * 0.40,
            },
          });
          map.addLayer({
            id: LINE_LAYER_ID,
            type: 'line',
            source: SOURCE_ID,
            paint: {
              'line-color': fillColor,
              'line-width': 1.2,
              'line-opacity': overlayOpacity * 0.7,
            },
          });
        }
      } else {
        for (const id of [LINE_LAYER_ID, FILL_LAYER_ID]) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      }
    };

    sync();
    map.on('style.load', sync);
    return () => {
      map.off('style.load', sync);
    };
  }, [map, visible, geojson, overlayOpacity]);

  return null;
}

export function SectorOverlayToggle({ compact = false }: { compact?: boolean } = {}) {
  const visible = useMapStore((s) => s.sectorOverlayVisible);
  const setVisible = useMapStore((s) => s.setSectorOverlayVisible);
  if (compact) {
    return (
      <DelayedTooltip label="Sector compass overlay" position="right">
        <button
          onClick={() => setVisible(!visible)}
          aria-pressed={visible}
          className={`spine-btn${visible ? ' signifier-shimmer' : ''}`}
          data-active={visible}
          aria-label="Toggle sector compass overlay"
        >
          {/* Lucide Compass-style icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        </button>
      </DelayedTooltip>
    );
  }
  return (
    <DelayedTooltip label="Toggle sector compass overlay" position="bottom">
      <button
        onClick={() => setVisible(!visible)}
        aria-pressed={visible}
        className={visible ? 'signifier-shimmer' : undefined}
        style={{
          padding: '6px 10px',
          borderRadius: 6,
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
          background: visible ? 'rgba(196, 180, 154, 0.85)' : 'var(--color-chrome-bg-translucent)',
          color: visible ? '#1a1a1a' : '#c4b49a',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'auto',
        }}
      >
        Sectors
      </button>
    </DelayedTooltip>
  );
}
