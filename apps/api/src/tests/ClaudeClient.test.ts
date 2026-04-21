import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeClient, AnalysisGuardrails } from '../services/ai/ClaudeClient.js';
import { AppError } from '../lib/errors.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
beforeEach(() => mockFetch.mockReset());

// ─── Anthropic response helper ───────────────────────────────────────────────

function anthropicResponse(text: string, model = 'claude-sonnet-4-20250514') {
  return {
    ok: true,
    json: async () => ({
      content: [{ type: 'text', text }],
      model,
      usage: { input_tokens: 100, output_tokens: 200 },
    }),
  };
}

const STRUCTURED_NARRATIVE = `CONFIDENCE: high
DATA_SOURCES: soils, climate, elevation
NEEDS_SITE_VISIT: false
CAVEAT: none
---
This ~12 ac upland property sits on Group B silt loam with moderate slopes...
Paragraph two describes natural tendencies...
Paragraph three the constraints.`;

const STRUCTURED_ENRICHMENT = `CONFIDENCE: medium
DATA_SOURCES: soils, wetlands
NEEDS_SITE_VISIT: true
CAVEAT: none
---
FLAG: opp-soil-loam
The loamy soil here supports a broad range of perennial crops.

FLAG: risk-wetland-buffer
The wetland fringe requires a 30 m setback under Ontario regulation.

SYNTHESIS:
The site's strengths cluster in its soil; constraints cluster at the wetland edge.`;

// ─── Config / guardrails ─────────────────────────────────────────────────────

describe('ClaudeClient.isConfigured', () => {
  it('returns false when api key is missing', () => {
    const client = new ClaudeClient(undefined);
    expect(client.isConfigured()).toBe(false);
  });

  it('returns true when api key is present', () => {
    const client = new ClaudeClient('sk-ant-test');
    expect(client.isConfigured()).toBe(true);
  });

  it('throws AI_NOT_CONFIGURED when unconfigured client is invoked', async () => {
    const client = new ClaudeClient(undefined);
    await expect(
      client.generateSiteNarrative({ projectId: 'p1', contextText: 'ctx' }),
    ).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED' });
  });
});

describe('AnalysisGuardrails.validate', () => {
  const baseOutput = {
    outputId: '00000000-0000-0000-0000-000000000001',
    projectId: '00000000-0000-0000-0000-000000000002',
    outputType: 'site_narrative' as const,
    content: 'x',
    confidence: 'high' as const,
    dataSources: [],
    computedAt: '2026-04-20T00:00:00.000Z',
    needsSiteVisit: false,
    generatedAt: '2026-04-20T00:00:00.000Z',
    modelId: 'test',
  };

  it('passes high-confidence output through unchanged', () => {
    const v = AnalysisGuardrails.validate(baseOutput);
    expect(v.needsSiteVisit).toBe(false);
    expect(v.caveat).toBeUndefined();
  });

  it('adds caveat and needsSiteVisit for low confidence', () => {
    const v = AnalysisGuardrails.validate({ ...baseOutput, confidence: 'low' });
    expect(v.caveat).toBeDefined();
    expect(v.needsSiteVisit).toBe(true);
  });

  it('forces needsSiteVisit for medium confidence', () => {
    const v = AnalysisGuardrails.validate({ ...baseOutput, confidence: 'medium' });
    expect(v.needsSiteVisit).toBe(true);
  });
});

// ─── Generation methods ──────────────────────────────────────────────────────

describe('ClaudeClient.generateSiteNarrative', () => {
  const client = new ClaudeClient('sk-ant-test');

  it('returns AIOutput with parsed confidence + dataSources + content', async () => {
    mockFetch.mockResolvedValueOnce(anthropicResponse(STRUCTURED_NARRATIVE));
    const result = await client.generateSiteNarrative({
      projectId: '00000000-0000-0000-0000-000000000010',
      contextText: 'Project X, 12 acres, Ontario...',
    });
    expect(result.confidence).toBe('high');
    expect(result.dataSources).toEqual(['soils', 'climate', 'elevation']);
    expect(result.needsSiteVisit).toBe(false); // high confidence
    expect(result.outputType).toBe('site_narrative');
    expect(result.content).toContain('upland property');
  });

  it('sends prompt caching block and model pin in request body', async () => {
    mockFetch.mockResolvedValueOnce(anthropicResponse(STRUCTURED_NARRATIVE));
    await client.generateSiteNarrative({ projectId: 'p', contextText: 'ctx' });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('claude-sonnet-4-20250514');
    expect(Array.isArray(body.system)).toBe(true);
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('wraps Anthropic HTTP errors as AppError with AI_API_ERROR code', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'rate_limit_error' } }),
    });
    await expect(
      client.generateSiteNarrative({ projectId: 'p', contextText: 'ctx' }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('ClaudeClient.generateDesignRecommendation', () => {
  const client = new ClaudeClient('sk-ant-test');

  it('returns design_recommendation output type', async () => {
    mockFetch.mockResolvedValueOnce(anthropicResponse(STRUCTURED_NARRATIVE));
    const result = await client.generateDesignRecommendation({
      projectId: 'p',
      contextText: 'ctx',
    });
    expect(result.outputType).toBe('design_recommendation');
  });
});

describe('ClaudeClient.enrichAssessmentFlags', () => {
  const client = new ClaudeClient('sk-ant-test');

  const request = {
    projectId: '00000000-0000-0000-0000-000000000020',
    flags: [
      {
        id: 'opp-soil-loam',
        type: 'opportunity' as const,
        severity: 'info' as const,
        category: 'agriculture' as const,
        message: 'Loam soil',
        priority: 50,
        country: 'all' as const,
        needsSiteVisit: false,
      },
      {
        id: 'risk-wetland-buffer',
        type: 'risk' as const,
        severity: 'critical' as const,
        category: 'regulatory' as const,
        message: 'Wetland setback',
        priority: 50,
        country: 'all' as const,
        needsSiteVisit: false,
      },
    ],
    layerSummaries: {
      soils: { dominant_texture: 'Loam', hydrologic_group: 'B' },
      wetlands_flood: { has_wetlands: true },
    },
    country: 'CA' as const,
  };

  it('returns empty envelope (no API call) when flags list is empty', async () => {
    const result = await client.enrichAssessmentFlags({ ...request, flags: [] });
    expect(result.enrichedFlags).toEqual([]);
    expect(result.siteSynthesis).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('parses per-flag narratives and synthesis block', async () => {
    mockFetch.mockResolvedValueOnce(anthropicResponse(STRUCTURED_ENRICHMENT));
    const result = await client.enrichAssessmentFlags(request);

    expect(result.enrichedFlags).toHaveLength(2);
    const loamFlag = result.enrichedFlags.find((f) => f.id === 'opp-soil-loam');
    expect(loamFlag?.aiNarrative).toContain('loamy soil');
    expect(loamFlag?.aiConfidence).toBe('medium');

    const wetlandFlag = result.enrichedFlags.find((f) => f.id === 'risk-wetland-buffer');
    expect(wetlandFlag?.aiNarrative).toContain('30 m setback');

    expect(result.siteSynthesis).toContain("site's strengths");
  });

  it('preserves original flag fields alongside enrichment', async () => {
    mockFetch.mockResolvedValueOnce(anthropicResponse(STRUCTURED_ENRICHMENT));
    const result = await client.enrichAssessmentFlags(request);
    const loamFlag = result.enrichedFlags.find((f) => f.id === 'opp-soil-loam');
    expect(loamFlag?.type).toBe('opportunity');
    expect(loamFlag?.severity).toBe('info');
    expect(loamFlag?.message).toBe('Loam soil');
  });
});
