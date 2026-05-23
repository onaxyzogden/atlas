import { describe, it, expect } from 'vitest';
import type { SectorArrow } from '../../../../../store/externalForcesStore.js';
import type { LandZone } from '../../../../../store/zoneStore.js';
import type { MockLayerResult } from '../../../../../lib/mockLayerData.js';
import {
  sectorCounts,
  zoneCounts,
  dominantWindDir,
  sectorsKpis,
  compassKpis,
  computedSectorRows,
} from '../derivations.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeSector(type: SectorArrow['type'], bearingDeg = 0, intensity: SectorArrow['intensity'] = 'med'): SectorArrow {
  return { id: `s-${Math.random()}`, projectId: 'p1', type, bearingDeg, arcDeg: 45, intensity };
}

function makeZone(category: LandZone['category']): LandZone {
  return {
    id: `z-${Math.random()}`,
    projectId: 'p1',
    name: category,
    category,
    color: '#aaa',
    primaryUse: '',
    secondaryUse: '',
    notes: '',
    geometry: { type: 'Polygon', coordinates: [] },
    areaM2: 1000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const CLIMATE_LAYER: MockLayerResult = {
  layerType: 'climate',
  fetchStatus: 'complete',
  confidence: 'high',
  dataDate: '2024-01-01',
  sourceApi: 'Mock',
  summary: { prevailing_wind: 'W-SW' } as Record<string, unknown>,
} as unknown as MockLayerResult;

// ── sectorCounts ──────────────────────────────────────────────────────────────

describe('sectorCounts', () => {
  it('returns all zeros for empty array', () => {
    const c = sectorCounts([]);
    expect(c.total).toBe(0);
    expect(c.wind).toBe(0);
    expect(c.sun).toBe(0);
    expect(c.fire).toBe(0);
  });

  it('correctly counts mixed sector types', () => {
    const sectors: SectorArrow[] = [
      makeSector('wind_prevailing'),
      makeSector('wind_storm'),
      makeSector('fire'),
      makeSector('view'),
      makeSector('sun_summer'),
    ];
    const c = sectorCounts(sectors);
    expect(c.total).toBe(5);
    expect(c.wind).toBe(2);
    expect(c.fire).toBe(1);
    expect(c.view).toBe(1);
    expect(c.sun).toBe(1);
  });

  it('counts noise and wildlife separately', () => {
    const c = sectorCounts([makeSector('noise'), makeSector('wildlife')]);
    expect(c.noise).toBe(1);
    expect(c.wildlife).toBe(1);
    expect(c.total).toBe(2);
  });
});

// ── zoneCounts ────────────────────────────────────────────────────────────────

describe('zoneCounts', () => {
  it('returns total 0 for empty array', () => {
    const c = zoneCounts([]);
    expect(c.total).toBe(0);
    expect(Object.keys(c.byCategory).length).toBe(0);
  });

  it('aggregates by category correctly', () => {
    const zones = [makeZone('habitation'), makeZone('food_production'), makeZone('habitation')];
    const c = zoneCounts(zones);
    expect(c.total).toBe(3);
    expect(c.byCategory['habitation']).toBe(2);
    expect(c.byCategory['food_production']).toBe(1);
    expect(c.byCategory['buffer']).toBeUndefined();
  });
});

// ── dominantWindDir ───────────────────────────────────────────────────────────

describe('dominantWindDir', () => {
  it('returns dash for undefined layers', () => {
    expect(dominantWindDir(undefined)).toBe('—');
  });

  it('returns dash for empty layers array', () => {
    expect(dominantWindDir([])).toBe('—');
  });

  it('extracts prevailing_wind from climate layer', () => {
    expect(dominantWindDir([CLIMATE_LAYER])).toBe('W-SW');
  });

  it('returns dash when climate layer has no prevailing_wind', () => {
    const layer = { ...CLIMATE_LAYER, summary: {} } as unknown as MockLayerResult;
    expect(dominantWindDir([layer])).toBe('—');
  });
});

// ── sectorsKpis ───────────────────────────────────────────────────────────────

describe('sectorsKpis', () => {
  it('returns all dash values for empty stores', () => {
    const kpis = sectorsKpis([], [], undefined);
    for (const kpi of kpis) {
      expect(kpi.value).toBe('—');
    }
  });

  it('shows correct arrow count when sectors present', () => {
    const sectors = [makeSector('wind_prevailing'), makeSector('fire')];
    const kpis = sectorsKpis(sectors, [], undefined);
    const arrowKpi = kpis.find((k) => k.label === 'Sector arrows');
    expect(arrowKpi?.value).toBe('2');
  });

  it('shows zone count from zones array', () => {
    const zones = [makeZone('habitation'), makeZone('commons')];
    const kpis = sectorsKpis([], zones, undefined);
    const zoneKpi = kpis.find((k) => k.label === 'Zones outlined');
    expect(zoneKpi?.value).toBe('2');
  });

  it('shows prevailing wind from climate layer', () => {
    const kpis = sectorsKpis([], [], [CLIMATE_LAYER]);
    const windKpi = kpis.find((k) => k.label === 'Prevailing wind');
    expect(windKpi?.value).toBe('W-SW');
  });
});

// ── compassKpis ───────────────────────────────────────────────────────────────

describe('compassKpis', () => {
  it('returns all dash values for empty sectors', () => {
    const kpis = compassKpis([], undefined);
    const sunKpi = kpis.find((k) => k.label === 'Sun sector');
    const fireKpi = kpis.find((k) => k.label === 'High-risk sector');
    expect(sunKpi?.value).toBe('—');
    expect(fireKpi?.value).toBe('—');
  });

  it('arrow count reflects sector array length', () => {
    const kpis = compassKpis([makeSector('view', 45), makeSector('fire', 225)], undefined);
    const arrowKpi = kpis.find((k) => k.label === 'Sector arrows');
    expect(arrowKpi?.value).toBe('2');
  });
});

// ── computedSectorRows ────────────────────────────────────────────────────────

describe('computedSectorRows', () => {
  // Ottawa-ish, mid-northern latitude — all 3 solar arcs resolve.
  const CENTROID: [number, number] = [-75.7, 45.4];

  it('returns empty array for null centroid', () => {
    expect(computedSectorRows(null)).toEqual([]);
  });

  it('produces 8 wind rows and 3 solar rows for a mid-latitude centroid', () => {
    const rows = computedSectorRows(CENTROID);
    expect(rows.filter((r) => r.group === 'wind')).toHaveLength(8);
    expect(rows.filter((r) => r.group === 'solar')).toHaveLength(3);
  });

  it('sorts wind rows by frequency descending (W dominant)', () => {
    const wind = computedSectorRows(CENTROID).filter((r) => r.group === 'wind');
    expect(wind[0]?.label).toBe('Prevailing wind — W');
    expect(wind[0]?.strength).toBe('27%');
  });

  it('formats wind bearing as a single degree and solar as a sweep range', () => {
    const rows = computedSectorRows(CENTROID);
    const wind = rows.find((r) => r.group === 'wind');
    const solar = rows.find((r) => r.group === 'solar');
    expect(wind?.bearing).toMatch(/^\d+°$/);
    expect(solar?.bearing).toMatch(/^\d+°–\d+°$/);
    expect(solar?.strength).toBe('—');
  });

  it('omits solar rows when latitude is out of range', () => {
    const rows = computedSectorRows([0, 120]);
    expect(rows.filter((r) => r.group === 'solar')).toHaveLength(0);
    expect(rows.filter((r) => r.group === 'wind')).toHaveLength(8);
  });

  it('carries the canonical solar arc labels', () => {
    const solarLabels = computedSectorRows(CENTROID)
      .filter((r) => r.group === 'solar')
      .map((r) => r.label);
    expect(solarLabels).toContain('Summer solstice sun arc');
    expect(solarLabels).toContain('Winter solstice sun arc');
    expect(solarLabels).toContain('Equinox sun arc');
  });
});
