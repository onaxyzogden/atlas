/**
 * geometryDiff - the Act popover's "shape differs" capture -> AsBuiltGeometryDiff
 * builder (Slice 5).
 *
 * Pins the branch the Plan reconciliation card consumes:
 *  - blank note AND no as-built area  -> null (nothing to record)
 *  - note only                        -> asBuilt.note, planned area carried
 *  - note + as-built area             -> both areas (rounded) + note
 *  - as-built area only (blank note)  -> area-only diff (still a divergence)
 *  - areas rounded to whole m2; null / NaN planned area omitted
 *
 * Slice 6 (capture-and-apply) additions:
 *  - captured polygon stamped into asBuilt.capturedGeometry
 *  - captured polygon alone derives the as-built area (geodesic parcelAreaM2)
 *  - typed as-built area wins over the derived area when both are available
 *  - captured polygon alone (blank note, no typed area) is still a divergence
 */

import { describe, it, expect } from 'vitest';
import { buildGeometryDiff } from '../geometryDiff.js';
import { parcelAreaM2 } from '../../../../lib/geo.js';

// A small closed square near the equator; turf.area gives a stable positive m2.
const SQUARE: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [0, 0.001],
      [0.001, 0.001],
      [0.001, 0],
      [0, 0],
    ],
  ],
};

describe('buildGeometryDiff', () => {
  it('returns null for a blank note and no as-built area', () => {
    expect(buildGeometryDiff(800, '')).toBeNull();
    expect(buildGeometryDiff(800, '   ')).toBeNull();
    expect(buildGeometryDiff(800, '', null)).toBeNull();
  });

  it('builds a note-only diff carrying the planned area', () => {
    expect(buildGeometryDiff(800, 'north edge ~3 m short of plan')).toEqual({
      kind: 'geometry',
      field: 'geometry',
      asPlanned: { areaM2: 800 },
      asBuilt: { note: 'north edge ~3 m short of plan' },
    });
  });

  it('builds a note + as-built area diff', () => {
    expect(buildGeometryDiff(800, 'planted smaller bed', 650)).toEqual({
      kind: 'geometry',
      field: 'geometry',
      asPlanned: { areaM2: 800 },
      asBuilt: { note: 'planted smaller bed', areaM2: 650 },
    });
  });

  it('builds an area-only diff when the note is blank but an area is given', () => {
    expect(buildGeometryDiff(800, '', 650)).toEqual({
      kind: 'geometry',
      field: 'geometry',
      asPlanned: { areaM2: 800 },
      asBuilt: { areaM2: 650 },
    });
  });

  it('rounds both areas to whole m2 and trims the note', () => {
    expect(buildGeometryDiff(799.6, '  edge short  ', 650.4)).toEqual({
      kind: 'geometry',
      field: 'geometry',
      asPlanned: { areaM2: 800 },
      asBuilt: { note: 'edge short', areaM2: 650 },
    });
  });

  it('omits the planned area when it is null or non-finite', () => {
    expect(buildGeometryDiff(null, 'no planned area known')).toEqual({
      kind: 'geometry',
      field: 'geometry',
      asPlanned: {},
      asBuilt: { note: 'no planned area known' },
    });
    expect(buildGeometryDiff(NaN, 'still recorded')).toEqual({
      kind: 'geometry',
      field: 'geometry',
      asPlanned: {},
      asBuilt: { note: 'still recorded' },
    });
  });

  // ---- Slice 6: captured polygon ----------------------------------------

  it('stamps the captured polygon and derives the as-built area from it', () => {
    const expectedArea = Math.round(parcelAreaM2(SQUARE) as number);
    expect(buildGeometryDiff(800, 'redrawn on the ground', null, SQUARE)).toEqual(
      {
        kind: 'geometry',
        field: 'geometry',
        asPlanned: { areaM2: 800 },
        asBuilt: {
          note: 'redrawn on the ground',
          areaM2: expectedArea,
          capturedGeometry: SQUARE,
        },
      },
    );
  });

  it('records a captured polygon alone (blank note, no typed area) as a divergence', () => {
    const expectedArea = Math.round(parcelAreaM2(SQUARE) as number);
    expect(buildGeometryDiff(800, '', undefined, SQUARE)).toEqual({
      kind: 'geometry',
      field: 'geometry',
      asPlanned: { areaM2: 800 },
      asBuilt: { areaM2: expectedArea, capturedGeometry: SQUARE },
    });
  });

  it('prefers a typed as-built area over the polygon-derived area', () => {
    expect(buildGeometryDiff(800, 'note', 650, SQUARE)).toEqual({
      kind: 'geometry',
      field: 'geometry',
      asPlanned: { areaM2: 800 },
      asBuilt: { note: 'note', areaM2: 650, capturedGeometry: SQUARE },
    });
  });
});
