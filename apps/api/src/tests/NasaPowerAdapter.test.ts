import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NasaPowerAdapter } from '../services/pipeline/adapters/NasaPowerAdapter.js';
import { fetchNasaPowerSummary } from '../services/pipeline/adapters/nasaPowerFetch.js';

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
  projectId: 'test-nasa',
  country: 'US' as const,
  provinceState: 'DC',
  conservationAuthId: null,
  boundaryGeojson: DC_POLYGON,
  centroidLat: 38.887,
  centroidLng: -77.034,
};

// NASA POWER climatology response — MJ/m^2/day for solar, m/s for wind, % for RH
const NASA_POWER_RESPONSE = {
  properties: {
    parameter: {
      ALLSKY_SFC_SW_DWN: {
        JAN: 7.5, FEB: 10.2, MAR: 13.8, APR: 17.5, MAY: 20.1, JUN: 22.0,
        JUL: 21.5, AUG: 19.2, SEP: 15.5, OCT: 11.0, NOV: 7.8, DEC: 6.2,
        ANN: 14.4, // MJ/m^2/day → 14.4 / 3.6 = 4.0 kWh/m^2/day
      },
      WS10M: {
        JAN: 4.2, FEB: 4.1, MAR: 4.0, APR: 3.8, MAY: 3.5, JUN: 3.2,
        JUL: 3.0, AUG: 3.1, SEP: 3.4, OCT: 3.7, NOV: 3.9, DEC: 4.1,
        ANN: 3.67,
      },
      RH2M: {
        JAN: 65, FEB: 62, MAR: 60, APR: 58, MAY: 66, JUN: 70,
        JUL: 72, AUG: 73, SEP: 71, OCT: 67, NOV: 64, DEC: 66,
        ANN: 66.2,
      },
    },
  },
};

function mockNasaSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => NASA_POWER_RESPONSE,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('fetchNasaPowerSummary', () => {
  it('converts ALLSKY_SFC_SW_DWN from MJ/m^2/day to kWh/m^2/day', async () => {
    mockNasaSuccess();
    const result = await fetchNasaPowerSummary(38.887, -77.034);
    expect(result).not.toBeNull();
    // 14.4 MJ / 3.6 = 4.0 kWh
    expect(result!.solar_radiation_kwh_m2_day).toBeCloseTo(4.0, 2);
  });

  it('passes wind speed (m/s) through unchanged', async () => {
    mockNasaSuccess();
    const result = await fetchNasaPowerSummary(38.887, -77.034);
    expect(result!.wind_speed_ms).toBeCloseTo(3.67, 2);
  });

  it('passes relative humidity (%) through unchanged', async () => {
    mockNasaSuccess();
    const result = await fetchNasaPowerSummary(38.887, -77.034);
    expect(result!.relative_humidity_pct).toBeCloseTo(66.2, 1);
  });

  it('labels confidence as medium (grid-interpolated data)', async () => {
    mockNasaSuccess();
    const result = await fetchNasaPowerSummary(38.887, -77.034);
    expect(result!.confidence).toBe('medium');
  });

  it('returns null silently on network failure (no throw)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    const result = await fetchNasaPowerSummary(38.887, -77.034);
    expect(result).toBeNull();
  });

  it('retries once on 5xx then gives up silently', async () => {
    const err500 = Object.assign(new Error('HTTP 503'), { status: 503 });
    // Helper's fetchOnce checks response.ok — simulate two 503 responses
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 503 });
    const result = await fetchNasaPowerSummary(38.887, -77.034);
    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    // suppress unused var warning
    void err500;
  });

  it('returns null when NASA returns fill values (-999)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        properties: {
          parameter: {
            ALLSKY_SFC_SW_DWN: { ANN: -999 },
            WS10M: { ANN: -999 },
            RH2M: { ANN: -999 },
          },
        },
      }),
    });
    const result = await fetchNasaPowerSummary(38.887, -77.034);
    expect(result).toBeNull();
  });

  it('sends community=AG and expected parameters in query string', async () => {
    mockNasaSuccess();
    await fetchNasaPowerSummary(38.887, -77.034);
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain('community=AG');
    expect(url).toContain('parameters=ALLSKY_SFC_SW_DWN%2CWS10M%2CRH2M');
    expect(url).toContain('format=JSON');
    expect(url).toContain('latitude=38.8870');
    expect(url).toContain('longitude=-77.0340');
  });
});

describe('NasaPowerAdapter', () => {
  const adapter = new NasaPowerAdapter('nasa_power', 'climate');

  it('returns climate layer type and NASA POWER source api', async () => {
    mockNasaSuccess();
    const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
    expect(result.layerType).toBe('climate');
    expect(result.sourceApi).toBe('NASA POWER (Climatology)');
  });

  it('returns medium confidence (grid-interpolated)', async () => {
    mockNasaSuccess();
    const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
    expect(result.confidence).toBe('medium');
  });

  it('populates solar_radiation_kwh_m2_day, wind_speed_ms, relative_humidity_pct', async () => {
    mockNasaSuccess();
    const result = await adapter.fetchForBoundary(DC_POLYGON, mockContext);
    const s = result.summaryData as Record<string, unknown>;
    expect(typeof s.solar_radiation_kwh_m2_day).toBe('number');
    expect(typeof s.wind_speed_ms).toBe('number');
    expect(typeof s.relative_humidity_pct).toBe('number');
    expect(s.solar_radiation_kwh_m2_day).toBeCloseTo(4.0, 2);
  });

  it('throws ADAPTER_NO_DATA when NASA POWER returns null (fill values)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        properties: { parameter: { ALLSKY_SFC_SW_DWN: { ANN: -999 }, WS10M: { ANN: -999 }, RH2M: { ANN: -999 } } },
      }),
    });
    await expect(adapter.fetchForBoundary(DC_POLYGON, mockContext)).rejects.toThrow(/NASA POWER/);
  });

  it('attribution text mentions NASA POWER', () => {
    expect(adapter.getAttributionText()).toContain('NASA POWER');
  });
});
