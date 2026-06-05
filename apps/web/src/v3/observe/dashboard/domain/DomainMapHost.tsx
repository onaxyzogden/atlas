/**
 * DomainMapHost — embeds a DiagnoseMap inside the Domain Detail surface
 * (OLOS Observe Dashboard Spec §4). Fitted to the parcel boundary when
 * available; falls back to the project's intake centroid otherwise.
 * Active overlays are owned by DomainDetailLayout and would be activated
 * here in a future slice — Slice 4.3 wires only the visual chip strip,
 * so the map renders the boundary + data point markers without overlay
 * layer mounts yet.
 *
 * Data point markers render as small circles colored by status:
 *   - active + clear           → green
 *   - active + investigation   → amber
 *   - active + major/disqual   → red
 *   - superseded               → muted grey
 * Markers without `locationGeometry` are skipped — captures that lack a
 * pin only appear in the chronological list, never on the map.
 */

import { useEffect, useMemo, useRef } from 'react';
import { maplibregl } from '../../../../lib/maplibre.js';
import DiagnoseMap from '../../../components/DiagnoseMap.js';
import type {
  ObserveDataPoint,
  ObserveStatusOutput,
} from '@ogden/shared';

interface Props {
  centroid: [number, number];
  boundary?: GeoJSON.Polygon;
  points: readonly ObserveDataPoint[];
}

function colorFor(status: ObserveStatusOutput, superseded: boolean): string {
  if (superseded) return '#7e7766';
  switch (status) {
    case 'major_constraint':
    case 'potential_disqualifier':
      return '#c43a3a';
    case 'needs_investigation':
      return '#d8861f';
    case 'unknown':
      return '#9c9684';
    case 'clear':
    default:
      return '#3a8a4f';
  }
}

function coordinatesOf(
  point: ObserveDataPoint,
): [number, number] | null {
  const geom = point.locationGeometry;
  if (!geom || geom.type !== 'Point') return null;
  const coords = geom.coordinates as unknown;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

function MapMarkers({
  map,
  points,
}: {
  map: maplibregl.Map;
  points: readonly ObserveDataPoint[];
}) {
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    const markers: maplibregl.Marker[] = [];
    for (const point of points) {
      const lngLat = coordinatesOf(point);
      if (!lngLat) continue;
      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.background = colorFor(point.statusOutput, point.isSuperseded);
      el.style.border = '2px solid rgba(20, 16, 12, 0.85)';
      el.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.4)';
      el.title = `${point.statusOutput.replace(/_/g, ' ')}${
        point.isSuperseded ? ' (superseded)' : ''
      }`;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(lngLat as [number, number])
        .addTo(map);
      markers.push(marker);
    }
    markersRef.current = markers;
    return () => {
      for (const m of markers) m.remove();
      markersRef.current = [];
    };
  }, [map, points]);

  return null;
}

export default function DomainMapHost({ centroid, boundary, points }: Props) {
  const memoBoundary = useMemo(() => boundary, [boundary]);

  return (
    <DiagnoseMap centroid={centroid} boundary={memoBoundary}>
      {({ map }) => <MapMarkers map={map} points={points} />}
    </DiagnoseMap>
  );
}
