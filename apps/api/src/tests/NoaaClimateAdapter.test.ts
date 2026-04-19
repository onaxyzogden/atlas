import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoaaClimateAdapter } from '../services/pipeline/adapters/NoaaClimateAdapter.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => mockFetch.mockReset());

// ─── Fixtures ────────────────────────────────────────────────────────────────

const DC_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [[
    [-77.036, 38.886], [-77.032, 38.886],
    [-77.032, 38.888], [-77.036, 38.888],
    [-77.036, 38.886],
  ]],
};

const mockContext = {
  projectId: 'test-noaa',
  country: 'US' as const,
  provinceState: 'DC',
  conservationAuthId: null,
  boundaryGeojson: DC_POLYGON,
  centroidLat: 38.887,
  centroidLng: -77.034,
};

// ACIS StnMeta response — one station 15 km from site
const ACIS_META_RESPONSE = {
  meta: [
    {
      name: 'WASHINGTON NATIONAL AIRPORT',
      ll: [-77.033, 38.852],        // ~3.9 km south → ~0.035°
      sids: ['DCA AP 1 ghcnd:USW00013743'],
      state: 'DC',
      valid_daterange: [['1984-01', '2023-12']],
    },
  ],
};

// ACIS StnData response — 36 months of synthetic data (3 per month = enough coverage)
// We'll generate 30 * 12 = 360 rows, but test with a condensed 24-row version as minimum
function buildStnDataRows(): [string, string, string, string][] {
  const rows: [string, string, string, string][] = [];
  // 30 years × 12 months
  for (let year = 1991; year <= 2020; year++) {
    for (let month = 1; month <= 12; month++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}`;
      // Seasonal temp pattern (°F): peak in July (~88°F max, 68°F min), cold in Jan (~42°F max, 24°F min)
      const seasonalOffset = Math.cos((month - 1) * Math.PI / 6);
      const maxt = +(65 - seasonalOffset * 23).toFixed(1);  // mean: 65°F, range ±23
      const mint  = +(45 - seasonalOffset * 21).toFixed(1); // mean: 45°F, range ±21
      // Precipitation: 3.5 inches/month average
      const pcpn = +(3.5 + Math.sin(month * Math.PI / 6) * 0.5).toFixed(2);
      rows.push([dateStr, String(maxt), String(mint), String(pcpn)]);
    }
  }
  return rows;
}

const ACIS_DATA_RESPONSE = {
  meta: { name: 'WASHINGTON NATIONAL AIRPORT', ll: [-77.033, 38.852], sids: ['DCA'] },
  data: buildStnDataRows(),
};

function mockAcisSuccess() {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ACIS_META_RESPONSE })
    .mockResolvedValueOnce({ ok: true, json: async () => ACIS_DATA_RESPONSE });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('NoaaClimateAdapter', () => {
  const adapter = new NoaaClimateAdapter('noaa_normals', 'climate');

  describe('successful ACIS query', () => {
    it('returns climate layer type and correct source API', async () => {
      mockAcisSuccess();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.layerType).toBe('climate');
      expect(result.sourceApi).toBe('NOAA ACIS (1991–2020 Normals)');
    });

    it('returns high confidence when station is within 30 km', async () => {
      mockAcisSuccess();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      // Station at [-77.033, 38.852] → ~3.9 km from centroid → high confidence
      expect(result.confidence).toBe('high');
    });

    it('returns annual precipitation in mm (reasonable range for DC: 900-1200 mm)', async () => {
      mockAcisSuccess();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(typeof s.annual_precip_mm).toBe('number');
      expect(s.annual_precip_mm as number).toBeGreaterThan(500);
      expect(s.annual_precip_mm as number).toBeLessThan(2000);
    });

    it('returns annual mean temperature in Celsius (reasonable range)', async () => {
      mockAcisSuccess();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(typeof s.annual_temp_mean_c).toBe('number');
      // With our synthetic data: mean of (65+45)/2 = 55°F = ~12.8°C
      expect(s.annual_temp_mean_c as number).toBeGreaterThan(5);
      expect(s.annual_temp_mean_c as number).toBeLessThan(25);
    });

    it('returns growing season days > 0', async () => {
      mockAcisSuccess();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(typeof s.growing_season_days).toBe('number');
      expect(s.growing_season_days as number).toBeGreaterThan(0);
    });

    it('returns frost dates as non-empty strings', async () => {
      mockAcisSuccess();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(typeof s.last_frost_date).toBe('string');
      expect(typeof s.first_frost_date).toBe('string');
      expect((s.last_frost_date as string).length).toBeGreaterThan(0);
      expect((s.first_frost_date as string).length).toBeGreaterThan(0);
    });

    it('returns a hardiness zone string (e.g. "7a", "6b")', async () => {
      mockAcisSuccess();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(typeof s.hardiness_zone).toBe('string');
      expect(s.hardiness_zone as string).toMatch(/^\d+[ab]$/);
    });

    it('returns growing degree days >= 0', async () => {
      mockAcisSuccess();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(typeof s.growing_degree_days_base10c).toBe('number');
      expect(s.growing_degree_days_base10c as number).toBeGreaterThanOrEqual(0);
    });

    it('returns Köppen classification for a temperate US site', async () => {
      mockAcisSuccess();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      // With our synthetic data (DC-like climate), should produce a C or D code
      expect(s.koppen_classification).not.toBeNull();
      expect(typeof s.koppen_classification).toBe('string');
    });

    it('returns station name and distance in summaryData', async () => {
      mockAcisSuccess();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.noaa_station).toBe('WASHINGTON NATIONAL AIRPORT');
      expect(typeof s.noaa_station_distance_km).toBe('number');
      expect(s.noaa_station_distance_km as number).toBeGreaterThanOrEqual(0);
    });

    it('returns monthly_normals array with 12 entries', async () => {
      mockAcisSuccess();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      const normals = s.monthly_normals as unknown[];
      expect(Array.isArray(normals)).toBe(true);
      expect(normals.length).toBe(12);
    });

    it('returns freeze_thaw_cycles_per_year >= 0 and snow_months >= 0', async () => {
      mockAcisSuccess();

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(typeof s.freeze_thaw_cycles_per_year).toBe('number');
      expect(typeof s.snow_months).toBe('number');
      expect(s.freeze_thaw_cycles_per_year as number).toBeGreaterThanOrEqual(0);
      expect(s.snow_months as number).toBeGreaterThanOrEqual(0);
    });
  });

  describe('station selection', () => {
    it('selects station with valid 1991-2020 coverage over closer station without it', async () => {
      // Two stations: near one has no daterange, far one has full coverage
      const metaWithTwoStations = {
        meta: [
          {
            name: 'NEARBY_NO_COVERAGE',
            ll: [-77.034, 38.887],  // exactly at centroid
            sids: ['NEAR1'],
            state: 'DC',
            valid_daterange: [['2005-01', '2010-12']],  // too short
          },
          {
            name: 'FAR_GOOD_COVERAGE',
            ll: [-77.100, 38.850],
            sids: ['FAR1'],
            state: 'DC',
            valid_daterange: [['1984-01', '2022-12']],  // covers 1991-2020
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => metaWithTwoStations })
        .mockResolvedValueOnce({ ok: true, json: async () => ACIS_DATA_RESPONSE });

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
      const s = result.summaryData as Record<string, unknown>;

      expect(s.noaa_station).toBe('FAR_GOOD_COVERAGE');
    });
  });

  describe('fallback behavior', () => {
    it('falls back to latitude estimate when StnMeta returns no stations', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ meta: [] }) });

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      const s = result.summaryData as Record<string, unknown>;
      expect(s.noaa_station).toBe('Estimated (no station found)');
    });

    it('falls back to latitude estimate when StnData has too few rows', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ACIS_META_RESPONSE })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            meta: { name: 'DCA', ll: [-77.033, 38.852], sids: ['DCA'] },
            data: [['1991-01', '42.0', '25.0', '3.5']],  // only 1 row — insufficient
          }),
        });

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
    });

    it('falls back gracefully on HTTP error (never throws)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503, text: async () => 'unavailable' });

      const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      expect(result.layerType).toBe('climate');
    });
  });

  it('getAttributionText references NOAA and ACIS', () => {
    const text = adapter.getAttributionText();
    expect(text).toContain('NOAA');
    expect(text).toContain('ACIS');
  });
});
