/**
 * Windbreak opportunity lines — derives candidate windbreak LineStrings on
 * the windward face of a parcel given a prevailing-wind direction and the
 * parcel's bbox. Used by the §6 Climate dashboard to suggest tree-row
 * placement perpendicular to the dominant wind.
 *
 * This is a geometric heuristic, not a species-specific or shelter-coefficient
 * recommendation. Refine with obstacle modelling (§9 Structures) when
 * available.
 */

export interface WindbreakLine {
  /** GeoJSON LineString ring as [[lng, lat], [lng, lat]]. */
  coords: [number, number][];
  /** Midpoint for labelling. */
  midpoint: [number, number];
  /** Length in metres (planning-grade, using 111320 m/deg lat). */
  lengthM: number;
}

export interface WindbreakCandidates {
  lines: WindbreakLine[];
  /** Azimuth the lines face (perpendicular to prevailing wind, 0-359). */
  faceAzimuth: number;
  /** Resolved prevailing wind azimuth (0=N, 90=E, 180=S, 270=W). */
  windAzimuth: number;
  /** Short description of which edge was chosen ('SW edge' etc.). */
  windwardEdge: string;
}

const COMPASS_16: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
  E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

/** Parse 'SW', '225', '225 deg', etc. to azimuth 0-359 or null. */
export function parseWindDirection(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return ((value % 360) + 360) % 360;
  }
  const trimmed = value.trim().toUpperCase();
  if (trimmed in COMPASS_16) return COMPASS_16[trimmed]!;
  const num = parseFloat(trimmed);
  if (Number.isFinite(num)) return ((num % 360) + 360) % 360;
  // Try to extract a trailing compass token (e.g. 'from SW')
  const match = trimmed.match(/\b(NNE|NE|ENE|ESE|SE|SSE|SSW|SW|WSW|WNW|NW|NNW|N|E|S|W)\b/);
  if (match && match[1] && match[1] in COMPASS_16) return COMPASS_16[match[1]]!;
  return null;
}

/**
 * Build candidate windbreak lines given prevailing-wind azimuth and a parcel bbox.
 *
 * Algorithm:
 *  - Lines face perpendicular to wind (i.e. wind hits them at 90 deg).
 *  - Placed on the windward edge of the bbox, spaced evenly.
 *  - Default 3 segments, each ~70% of the parcel's perpendicular extent.
 */
export function buildWindbreakLines(
  bbox: [number, number, number, number],
  prevailingWind: string | number | null | undefined,
  count = 3,
): WindbreakCandidates | null {
  const windAz = parseWindDirection(prevailingWind);
  if (windAz === null) return null;

  const [minLon, minLat, maxLon, maxLat] = bbox;
  const midLat = (minLat + maxLat) / 2;
  const lonRange = maxLon - minLon;
  const latRange = maxLat - minLat;
  if (lonRange <= 0 || latRange <= 0) return null;

  // Wind vector components (unit direction of travel, from upwind to downwind).
  // Azimuth is the direction the wind is coming FROM in compass convention,
  // so the wind travels toward (windAz + 180) degrees.
  const toAzRad = ((windAz + 180) % 360) * (Math.PI / 180);
  const windDx = Math.sin(toAzRad);
  const windDy = -Math.cos(toAzRad);

  // Perpendicular-to-wind direction (windbreak line orientation).
  // Rotate wind vector 90 deg left.
  const lineDx = -windDy;
  const lineDy = windDx;

  // Determine which edge of bbox is windward (upwind side).
  // The windward edge is the one the wind comes FROM.
  const fromAzRad = (windAz * Math.PI) / 180;
  const fromDx = Math.sin(fromAzRad);
  const fromDy = -Math.cos(fromAzRad);

  // Choose anchor point on the windward side.
  const anchorLon = fromDx > 0 ? maxLon : minLon;
  const anchorLat = fromDy > 0 ? maxLat : minLat;

  // Step along the windward edge perpendicular to wind.
  // Length of a windbreak line = 70% of perpendicular bbox extent.
  const degLonPerM = 1 / (111320 * Math.cos((midLat * Math.PI) / 180));
  const degLatPerM = 1 / 111320;

  const bboxDiagM = Math.hypot(
    lonRange / degLonPerM,
    latRange / degLatPerM,
  );
  const lineLengthM = bboxDiagM * 0.5;
  const halfLenLon = (lineLengthM * 0.5) * degLonPerM * Math.abs(lineDx);
  const halfLenLat = (lineLengthM * 0.5) * degLatPerM * Math.abs(lineDy);

  // Spacing along the windward edge.
  const spacingM = bboxDiagM / (count + 1);

  const lines: WindbreakLine[] = [];
  for (let i = 1; i <= count; i++) {
    const offsetM = spacingM * i - bboxDiagM / 2;
    // Offset perpendicular to wind along the line direction.
    const offsetLon = offsetM * degLonPerM * lineDx;
    const offsetLat = offsetM * degLatPerM * lineDy;

    const midLon = anchorLon + offsetLon;
    const midLatPos = anchorLat + offsetLat;

    const start: [number, number] = [
      midLon - halfLenLon * Math.sign(lineDx || 1),
      midLatPos - halfLenLat * Math.sign(lineDy || 1),
    ];
    const end: [number, number] = [
      midLon + halfLenLon * Math.sign(lineDx || 1),
      midLatPos + halfLenLat * Math.sign(lineDy || 1),
    ];

    lines.push({
      coords: [start, end],
      midpoint: [midLon, midLatPos],
      lengthM: lineLengthM,
    });
  }

  const faceAzimuth = (windAz + 90) % 360;
  const edge = describeWindwardEdge(windAz);

  return { lines, faceAzimuth, windAzimuth: windAz, windwardEdge: edge };
}

function describeWindwardEdge(windAz: number): string {
  // Describe which edge of the parcel is windward.
  const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(windAz / 45) % 8;
  return `${compass[idx]} edge`;
}
