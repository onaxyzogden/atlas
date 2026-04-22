/**
 * Test helpers — mock layer data factories.
 * Wraps generateMockLayers from mockLayerData.ts with test overrides.
 */

import { generateMockLayers, type MockLayerResult } from '../../lib/mockLayerData.js';

/** Generate a full set of US mock layers */
export function mockLayersUS(): MockLayerResult[] {
  return generateMockLayers('US');
}

/** Generate a full set of CA mock layers */
export function mockLayersCA(): MockLayerResult[] {
  return generateMockLayers('CA');
}

/** Override specific layer properties for edge case testing */
export function mockLayersWithOverrides(
  country: 'US' | 'CA',
  overrides: Partial<Record<string, Partial<MockLayerResult>>>,
): MockLayerResult[] {
  const layers = generateMockLayers(country);
  return layers.map((layer) => {
    const ov = overrides[layer.layerType];
    if (!ov) return layer;
    // Spreads collapse the discriminated union; cast back.
    return {
      ...layer,
      ...ov,
      summary: { ...layer.summary, ...(ov.summary ?? {}) },
    } as MockLayerResult;
  });
}

/** Layers where some have failed status — tests graceful degradation */
export function mockLayersIncomplete(): MockLayerResult[] {
  return mockLayersWithOverrides('US', {
    soils: { fetchStatus: 'failed', confidence: 'low', summary: {} },
    watershed: { fetchStatus: 'failed', confidence: 'low', summary: {} },
    climate: { fetchStatus: 'pending', confidence: 'low', summary: {} },
  });
}

/** All layers pending — tests insufficient data handling */
export function mockLayersEmpty(): MockLayerResult[] {
  const layers = generateMockLayers('US');
  return layers.map((l) => ({
    ...l,
    fetchStatus: 'pending' as const,
    confidence: 'low' as const,
    summary: {},
  } as unknown as MockLayerResult));
}
