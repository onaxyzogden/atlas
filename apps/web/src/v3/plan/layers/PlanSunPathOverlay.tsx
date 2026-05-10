/**
 * PlanSunPathOverlay — Tier C / C1 read-only map layer.
 *
 * Plots the apparent sun path across three reference dates (summer
 * solstice, equinox, winter solstice) as horizon-projected arcs around a
 * parcel anchor. Stewards placing cabins, glasshouses, or solar
 * collectors use the arcs to verify view-shed and sun-access
 * (Retreat #2, Homestead #1).
 *
 * Mechanics:
 *   - Anchor: first Z0 zone centroid in the project; fall back to the
 *     parcel boundary centroid; fall back to the map-supplied centroid.
 *   - For each key date, sample sun position every 20 minutes from
 *     sunrise to sunset (suncalc azimuth in radians-from-south, altitude
 *     gates out below-horizon samples).
 *   - Convert each azimuth to a compass bearing and project a point from
 *     the anchor at 200 m via turf.destination — the resulting LineString
 *     is the sun's horizon trace as seen from the anchor.
 *   - Solar noon for each date renders as a labelled symbol so the
 *     steward can read culmination height by eye against the trace.
 *
 * Year is the current year — the geometric path varies negligibly
 * year-to-year and "this year's solstice" is the steward's mental
 * reference. Visibility is gated on the global `sunPath` toggle.
 *
 * 200 m is a viewing radius, not a projected ground distance — the arc
 * is meaningful only relative to the anchor. Stewards who need
 * micro-precise shadow casts should drop into the cross-section editor.
 */

import { useEffect, useMemo } from 'react';
import * as turf from '@turf/turf';
import SunCalc from 'suncalc';
import { maplibregl } from '../../../lib/maplibre.js';
import { useMatrixTogglesStore } from '../../../store/matrixTogglesStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';

const SOURCE_ID = 'plan-sunpath-source';
const ARC_LAYER = 'plan-sunpath-arc';
const NOON_LAYER = 'plan-sunpath-noon';

const ARC_RADIUS_M = 200;
const SAMPLE_MINUTES = 20;

interface SunDate {
  key: 'summer' | 'equinox' | 'winter';
  label: string;
  color: string;
  build: (year: number) => Date;
}

const SUN_DATES: SunDate[] = [
  {
    key: 'summer',
    label: 'Summer solstice',
    color: '#d68a4a',
    build: (year) => new Date(year, 5, 21, 12, 0, 0),
  },
  {
    key: 'equinox',
    label: 'Equinox',
    color: '#a08a5a',
    build: (year) => new Date(year, 2, 20, 12, 0, 0),
  },
  {
    key: 'winter',
    label: 'Winter solstice',
    color: '#5a7aa8',
    build: (year) => new Date(year, 11, 21, 12, 0, 0),
  },
];

function azimuthRadToBearingDeg(az: number): number {
  // suncalc: azimuth in radians, measured from south, west-positive.
  // compass bearing: degrees from north, clockwise.
  return (((az * 180) / Math.PI + 180) % 360 + 360) % 360;
}

function buildArc(
  anchor: [number, number],
  date: Date,
): [number, number][] {
  const [lng, lat] = anchor;
  const times = SunCalc.getTimes(date, lat, lng);
  const sunrise = times.sunrise;
  const sunset = times.sunset;
  if (
    !(sunrise instanceof Date) ||
    !(sunset instanceof Date) ||
    isNaN(sunrise.getTime()) ||
    isNaN(sunset.getTime())
  ) {
    return [];
  }
  const stepMs = SAMPLE_MINUTES * 60 * 1000;
  const points: [number, number][] = [];
  for (let t = sunrise.getTime(); t <= sunset.getTime(); t += stepMs) {
    const sample = new Date(t);
    const pos = SunCalc.getPosition(sample, lat, lng);
    if (pos.altitude <= 0) continue;
    const bearing = azimuthRadToBearingDeg(pos.azimuth);
    const dest = turf.destination(
      turf.point([lng, lat]),
      ARC_RADIUS_M,
      bearing,
      { units: 'meters' },
    );
    const c = dest.geometry.coordinates as [number, number];
    points.push(c);
  }
  return points;
}

function noonPoint(
  anchor: [number, number],
  date: Date,
): [number, number] | null {
  const [lng, lat] = anchor;
  const times = SunCalc.getTimes(date, lat, lng);
  const noon = times.solarNoon;
  if (!(noon instanceof Date) || isNaN(noon.getTime())) return null;
  const pos = SunCalc.getPosition(noon, lat, lng);
  if (pos.altitude <= 0) return null;
  const bearing = azimuthRadToBearingDeg(pos.azimuth);
  const dest = turf.destination(
    turf.point([lng, lat]),
    ARC_RADIUS_M,
    bearing,
    { units: 'meters' },
  );
  return dest.geometry.coordinates as [number, number];
}

interface Props {
  map: maplibregl.Map;
  projectId: string;
  fallbackCentroid: [number, number];
  boundary?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export default function PlanSunPathOverlay({
  map,
  projectId,
  fallbackCentroid,
  boundary,
}: Props) {
  const visible = useMatrixTogglesStore((s) => s.sunPath);
  const zones = useZoneStore((s) => s.zones);

  const anchor = useMemo<[number, number]>(() => {
    const z0 = zones.find(
      (z) => z.projectId === projectId && z.permacultureZone === 0,
    );
    if (z0) {
      return turf.centroid(z0.geometry).geometry.coordinates as [number, number];
    }
    if (boundary) {
      return turf.centroid(boundary).geometry.coordinates as [number, number];
    }
    return fallbackCentroid;
  }, [zones, projectId, boundary, fallbackCentroid]);

  const fc = useMemo<GeoJSON.FeatureCollection>(() => {
    const year = new Date().getFullYear();
    const features: GeoJSON.Feature[] = [];
    for (const sd of SUN_DATES) {
      const date = sd.build(year);
      const coords = buildArc(anchor, date);
      if (coords.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: {
            featureKind: 'arc',
            label: sd.label,
            color: sd.color,
            sunKey: sd.key,
          },
        });
      }
      const noon = noonPoint(anchor, date);
      if (noon) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: noon },
          properties: {
            featureKind: 'noon',
            label: sd.label,
            color: sd.color,
            sunKey: sd.key,
          },
        });
      }
    }
    return { type: 'FeatureCollection', features };
  }, [anchor]);

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!src) {
        map.addSource(SOURCE_ID, { type: 'geojson', data: fc });
      } else {
        src.setData(fc);
      }
      if (!map.getLayer(ARC_LAYER)) {
        map.addLayer({
          id: ARC_LAYER,
          type: 'line',
          source: SOURCE_ID,
          filter: ['==', ['get', 'featureKind'], 'arc'],
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-opacity': 0.85,
          },
        });
      }
      if (!map.getLayer(NOON_LAYER)) {
        map.addLayer({
          id: NOON_LAYER,
          type: 'symbol',
          source: SOURCE_ID,
          filter: ['==', ['get', 'featureKind'], 'noon'],
          layout: {
            'text-field': ['concat', ['get', 'label'], ' · noon'],
            'text-size': 11,
            'text-offset': [0, 0.6],
            'text-anchor': 'top',
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': ['get', 'color'],
            'text-halo-color': '#f2ede3',
            'text-halo-width': 1.2,
          },
        });
      }
      [ARC_LAYER, NOON_LAYER].forEach((id) => {
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
