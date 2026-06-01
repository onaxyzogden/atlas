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
 */

import { describe, it, expect } from 'vitest';
import { buildGeometryDiff } from '../geometryDiff.js';

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
});
