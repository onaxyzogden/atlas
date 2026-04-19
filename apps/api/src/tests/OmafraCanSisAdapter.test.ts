import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OmafraCanSisAdapter } from '../services/pipeline/adapters/OmafraCanSisAdapter.js';

// ─── Mock global fetch ────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ON_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [[
    [-79.400, 43.650],
    [-79.396, 43.650],
    [-79.396, 43.654],
    [-79.400, 43.654],
    [-79.400, 43.650],
  ]],
};

const mockContext = {
  projectId: 'test-ca',
  country: 'CA' as const,
  provinceState: 'ON',
  conservationAuthId: null,
  boundaryGeojson: ON_POLYGON,
  centroidLat: 43.652,
  centroidLng: -79.398,
};

// Realistic LIO ArcGIS response
const LIO_RESPONSE = {
  features: [{
    attributes: {
      SOIL_SERIES: 'Haldimand',
      TEXTURE: 'Clay loam',
      DRAINAGE: 'Imperfectly drained',
      ORG_MATTER: '3.5',
      PH: '6.8',
      FARMLAND_CL: '2',
      DEPTH_BEDROCK: '150',
      TAXON_ORDER: 'Gleysolic',
    },
  }],
};

const EMPTY_RESPONSE = { features: [] };

function mockLioSuccess(response = LIO_RESPONSE) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => response,
  });
}

function mockLioError(status = 503) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    text: async () => 'Service unavailable',
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('OmafraCanSisAdapter', () => {
  const adapter = new OmafraCanSisAdapter('omafra_cansis', 'soils');

  describe('successful LIO query', () => {
    it('returns high-confidence result with parsed soil data', async () => {
      mockLioSuccess();

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.layerType).toBe('soils');
      expect(result.confidence).toBe('high');
      expect(result.sourceApi).toContain('Ontario Soil Survey');

      const summary = result.summaryData as Record<string, unknown>;
      expect(summary.soil_name).toBe('Haldimand');
      expect(summary.predominant_texture).toBe('Clay loam');
      expect(summary.drainage_class).toBe('Imperfectly drained');
      expect(summary.organic_matter_pct).toBe(3.5);
      expect(summary.ph).toBe(6.8);
      expect(summary.farmland_class).toBe('Class 2 (CSCS)');
      expect(summary.taxonomic_order).toBe('Gleysolic');
    });

    it('derives hydrologic group from texture + drainage', async () => {
      mockLioSuccess();

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const summary = result.summaryData as Record<string, unknown>;

      // Clay loam → D
      expect(summary.hydrologic_group).toBe('D');
    });

    it('provides Tier 3 compatibility aliases', async () => {
      mockLioSuccess();

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const summary = result.summaryData as Record<string, unknown>;

      expect(summary.drainageClass).toBe('moderate');
      expect(summary.organicMatterPct).toBe(3.5);
      expect(summary.textureClass).toBe('clay_loam');
    });

    it('computes pH range', async () => {
      mockLioSuccess();

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const summary = result.summaryData as Record<string, unknown>;

      expect(summary.ph_range).toBe('6.5 - 7.1');
    });

    it('parses depth to bedrock as number', async () => {
      mockLioSuccess();

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const summary = result.summaryData as Record<string, unknown>;

      expect(summary.depth_to_bedrock_m).toBe(150);
    });
  });

  describe('texture normalization', () => {
    it('normalizes various LIO texture strings', async () => {
      const variants = [
        { input: 'SANDY LOAM', expected: 'Sandy loam' },
        { input: 'sl', expected: 'Sandy loam' },
        { input: 'SILTY CLAY', expected: 'Silty clay' },
        { input: 'SIL', expected: 'Silt loam' },
      ];

      for (const { input, expected } of variants) {
        mockFetch.mockReset();
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({
            features: [{
              attributes: { TEXTURE: input, SOIL_SERIES: 'Test' },
            }],
          }),
        });

        const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
        const summary = result.summaryData as Record<string, unknown>;
        expect(summary.predominant_texture).toBe(expected);
      }
    });
  });

  describe('fallback behavior', () => {
    it('falls back to estimation when no features found', async () => {
      mockLioSuccess(EMPTY_RESPONSE);

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      const summary = result.summaryData as Record<string, unknown>;
      expect(summary.soil_name).toBe('Estimated');
      expect(summary.source_api).toContain('Estimated');
    });

    it('falls back to estimation on network error', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
      const summary = result.summaryData as Record<string, unknown>;
      expect(summary.soil_name).toBe('Estimated');
    });

    it('falls back on LIO error response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ error: { message: 'Service error' } }),
      });

      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      expect(result.confidence).toBe('low');
    });

    it('estimation uses latitude for soil properties', async () => {
      mockLioSuccess(EMPTY_RESPONSE);

      // Southern Ontario (lat ~43.65) → Clay loam, pH 6.5
      const result = await adapter.fetchForBoundary(ON_POLYGON, mockContext);
      const summary = result.summaryData as Record<string, unknown>;
      expect(summary.predominant_texture).toBe('Clay loam');
      expect(summary.ph).toBe(6.5);
    });

    it('northern latitude estimation gives Sandy loam', async () => {
      mockLioSuccess(EMPTY_RESPONSE);

      const northContext = { ...mockContext, centroidLat: 48.5 };
      const result = await adapter.fetchForBoundary(ON_POLYGON, northContext);
      const summary = result.summaryData as Record<string, unknown>;
      expect(summary.predominant_texture).toBe('Sandy loam');
      expect(summary.ph).toBe(5.5);
    });
  });

  describe('error handling', () => {
    it('propagates timeout errors (does not fall back)', async () => {
      const abortErr = new DOMException('The operation was aborted', 'AbortError');
      mockFetch.mockRejectedValue(abortErr);

      await expect(adapter.fetchForBoundary(ON_POLYGON, mockContext))
        .rejects.toThrow('timed out');
    });
  });

  describe('metadata', () => {
    it('getAttributionText references OMAFRA + LIO', () => {
      const text = adapter.getAttributionText();
      expect(text).toContain('OMAFRA');
      expect(text).toContain('LIO');
    });

    it('getConfidence returns result confidence', () => {
      expect(adapter.getConfidence({
        layerType: 'soils',
        sourceApi: 'LIO',
        attributionText: '',
        confidence: 'high',
        dataDate: null,
      })).toBe('high');
    });
  });

  describe('centroid extraction', () => {
    it('uses context centroid when available', async () => {
      mockLioSuccess();

      await adapter.fetchForBoundary(ON_POLYGON, mockContext);

      // Check the fetch URL contains centroid-based buffer
      const fetchUrl = mockFetch.mock.calls[0]![0] as string;
      expect(fetchUrl).toContain('lioservices');
    });

    it('falls back to bbox centroid when context centroid is null', async () => {
      mockLioSuccess();

      const noCtx = { ...mockContext, centroidLat: null, centroidLng: null };
      const result = await adapter.fetchForBoundary(ON_POLYGON, noCtx);

      expect(result.layerType).toBe('soils');
    });
  });
});
