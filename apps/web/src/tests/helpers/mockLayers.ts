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
    const ov = overrides[layer.layer_type];
    if (!ov) return layer;
    return {
      ...layer,
      ...ov,
      summary: { ...layer.summary, ...(ov.summary ?? {}) },
    };
  });
}

/** Layers where some have failed status — tests graceful degradation */
export function mockLayersIncomplete(): MockLayerResult[] {
  return mockLayersWithOverrides('US', {
    soils: { fetch_status: 'failed', confidence: 'low', summary: {} },
    watershed: { fetch_status: 'failed', confidence: 'low', summary: {} },
    climate: { fetch_status: 'pending', confidence: 'low', summary: {} },
  });
}

/** All layers pending — tests insufficient data handling */
export function mockLayersEmpty(): MockLayerResult[] {
  const layers = generateMockLayers('US');
  return layers.map((l) => ({
    ...l,
    fetch_status: 'pending' as const,
    confidence: 'low' as const,
    summary: {},
  }));
}
