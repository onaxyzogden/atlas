/**
 * derivations — pure helpers for the v3 Topography & Base Map module.
 * Map raw `siteDataStore` elevation layer + `topographyStore` annotations
 * into the KPI strips, charts, lists and counts the dashboard / detail
 * pages render.
 */

import type { LayerResultFor, MockLayerResult } from '@ogden/shared/scoring';
import type {
  Contour,
  DrainageLine,
  HighPoint,
  Transect,
} from '../../../../store/topographyStore.js';

export type ElevationLayer = LayerResultFor<'elevation'>;

export function getElevationLayer(
  layers: MockLayerResult[] | undefined,
): ElevationLayer | undefined {
  return layers?.find(
    (l): l is ElevationLayer => l.layerType === 'elevation',
  );
}

export interface KpiItem {
  iconKey: 'triangle' | 'mountain' | 'ruler' | 'compass' | 'layers' | 'map';
  label: string;
  value: string;
  pill?: string;
  note: string;
  tone: 'green' | 'gold' | 'blue' | 'red' | 'dim';
}

const DASH = '—';

export type SlopeBand = 'flat' | 'gentle' | 'moderate' | 'steep' | 'severe';

export function slopeBand(deg: number | null | undefined): {
  band: SlopeBand;
  label: string;
  tone: KpiItem['tone'];
} {
  if (deg == null) return { band: 'flat', label: 'Unknown', tone: 'dim' };
  if (deg < 3) return { band: 'flat', label: 'Flat', tone: 'green' };
  if (deg < 8) return { band: 'gentle', label: 'Gentle', tone: 'green' };
  if (deg < 15) return { band: 'moderate', label: 'Moderate', tone: 'gold' };
  if (deg < 25) return { band: 'steep', label: 'Steep', tone: 'gold' };
  return { band: 'severe', label: 'Severe', tone: 'red' };
}

const ASPECT_DEG: Record<string, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

export function aspectDegrees(
  aspect: string | null | undefined,
): number | null {
  if (!aspect) return null;
  const key = aspect.toUpperCase().trim();
  return ASPECT_DEG[key] ?? null;
}

function fmtDeg(value: number | null | undefined): string {
  return value == null ? DASH : `${value.toFixed(1)}°`;
}

function fmtRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  if (min == null || max == null) return DASH;
  return `${Math.round(min)}–${Math.round(max)} m`;
}

function fmtDelta(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  if (min == null || max == null) return '';
  return `${Math.round(max - min)} m total range`;
}

export function topographyKpis(
  layers: MockLayerResult[] | undefined,
  transects: Transect[],
): KpiItem[] {
  const e = getElevationLayer(layers)?.summary;
  const slope = slopeBand(e?.mean_slope_deg ?? null);
  const aspectDeg = aspectDegrees(e?.predominant_aspect ?? null);
  return [
    {
      iconKey: 'triangle',
      label: 'Mean slope',
      value: fmtDeg(e?.mean_slope_deg),
      pill: e?.mean_slope_deg != null ? slope.label : undefined,
      note:
        e?.max_slope_deg != null
          ? `Max ${e.max_slope_deg.toFixed(1)}° across site.`
          : 'Average slope across site.',
      tone: slope.tone,
    },
    {
      iconKey: 'mountain',
      label: 'Elevation range',
      value: fmtRange(e?.min_elevation_m, e?.max_elevation_m),
      pill: fmtDelta(e?.min_elevation_m, e?.max_elevation_m) || undefined,
      note: 'Lowest to highest point on site.',
      tone: 'blue',
    },
    {
      iconKey: 'ruler',
      label: 'A–B transects',
      value: String(transects.length),
      pill: transects.length > 0 ? 'Mapped' : 'None yet',
      note: 'Cross-sections mapped across site.',
      tone: transects.length > 0 ? 'green' : 'dim',
    },
    {
      iconKey: 'compass',
      label: 'Aspect tendency',
      value: e?.predominant_aspect ?? DASH,
      pill: aspectDeg != null ? `${aspectDeg}°` : undefined,
      note: e?.predominant_aspect
        ? `Slopes face mainly ${e.predominant_aspect}.`
        : 'Aspect data pending.',
      tone: 'green',
    },
    {
      iconKey: 'layers',
      label: 'Mean elevation',
      value: e?.mean_elevation_m != null ? `${Math.round(e.mean_elevation_m)} m` : DASH,
      note: e?.dem_resolution_m
        ? `DEM resolution ${e.dem_resolution_m} m.`
        : 'Average across site.',
      tone: 'dim',
    },
  ];
}

export interface TransectStats {
  totalDistanceM: number | null;
  deltaM: number;
  meanSlopePct: number;
  minM: number;
  maxM: number;
  samples: number;
}

export function transectStats(t: Transect | undefined): TransectStats | null {
  const profile = t?.elevationProfileM;
  if (!profile || profile.length < 2) return null;
  const minM = Math.min(...profile);
  const maxM = Math.max(...profile);
  const deltaM = maxM - minM;
  const totalDistanceM = t?.totalDistanceM ?? null;
  const meanSlopePct =
    totalDistanceM && totalDistanceM > 0
      ? (deltaM / totalDistanceM) * 100
      : 0;
  return {
    totalDistanceM,
    deltaM,
    meanSlopePct,
    minM,
    maxM,
    samples: profile.length,
  };
}

export interface FeatureCounts {
  contours: number;
  highPoints: number;
  drainageLines: number;
  transects: number;
  total: number;
}

export function featureCounts(args: {
  contours: Contour[];
  highPoints: HighPoint[];
  drainageLines: DrainageLine[];
  transects: Transect[];
}): FeatureCounts {
  const { contours, highPoints, drainageLines, transects } = args;
  return {
    contours: contours.length,
    highPoints: highPoints.length,
    drainageLines: drainageLines.length,
    transects: transects.length,
    total:
      contours.length +
      highPoints.length +
      drainageLines.length +
      transects.length,
  };
}

/** Approximate solar altitude (deg) at solar noon for a latitude + day-of-year.
 *  Mirrors the `noonAltitude` helper in macroclimate-hazards/derivations.ts so
 *  this module can stand alone without circular imports. */
export function noonAltitude(lat: number, dayOfYear: number): number {
  const decl = 23.45 * Math.sin(((2 * Math.PI) / 365) * (284 + dayOfYear));
  const alt = 90 - Math.abs(lat - decl);
  return Math.max(0, Math.min(90, alt));
}

export function solsticeAltitudes(lat: number): {
  summer: number;
  equinox: number;
  winter: number;
} {
  return {
    summer: noonAltitude(lat, 172),
    equinox: noonAltitude(lat, 80),
    winter: noonAltitude(lat, 355),
  };
}

/** Boundary centroid (lng,lat). Duplicated from macroclimate-hazards/derivations
 *  so this module is self-contained. */
export function polygonCentroid(
  polygon: GeoJSON.Polygon | undefined,
): { lat: number; lng: number } | null {
  const ring = polygon?.coordinates?.[0];
  if (!ring || ring.length < 3) return null;
  const pts = ring.slice(0, -1);
  const sum = pts.reduce(
    (acc, pt) => ({ lng: acc.lng + (pt[0] ?? 0), lat: acc.lat + (pt[1] ?? 0) }),
    { lng: 0, lat: 0 },
  );
  return { lng: sum.lng / pts.length, lat: sum.lat / pts.length };
}
