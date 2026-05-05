/**
 * NasaPowerIntlRouting.test.ts
 *
 * Verifies the ADAPTER_REGISTRY surface for the new `INTL` country bucket:
 *   - `climate` → `NasaPowerAdapter` (grid-interpolated, globally valid)
 *   - other Tier-1 layers have no `INTL` slot (documented gap; orchestrator
 *     falls back to ManualFlagAdapter at runtime)
 *
 * This is a static-surface test — it guards the registry shape + NasaPower
 * INTL routing without booting Fastify or touching Postgres. Runtime wiring
 * lives in `DataPipelineOrchestrator.resolveAdapter`, which is a private
 * function; it's exercised end-to-end via the integration tests that already
 * cover the orchestrator path.
 */

import { describe, it, expect } from 'vitest';
import { ADAPTER_REGISTRY } from '@ogden/shared';

describe('INTL country routing — ADAPTER_REGISTRY', () => {
  it('routes climate.INTL to NasaPowerAdapter', () => {
    const entry = ADAPTER_REGISTRY.climate.INTL;
    expect(entry).toBeDefined();
    expect(entry?.adapter).toBe('NasaPowerAdapter');
    expect(entry?.source).toBe('nasa_power');
  });

  it('preserves climate.US → NoaaClimateAdapter and climate.CA → EcccClimateAdapter', () => {
    expect(ADAPTER_REGISTRY.climate.US?.adapter).toBe('NoaaClimateAdapter');
    expect(ADAPTER_REGISTRY.climate.CA?.adapter).toBe('EcccClimateAdapter');
  });

  it('leaves non-climate Tier-1 layers without an INTL entry (ManualFlagAdapter fallback is expected)', () => {
    // Note: 'groundwater' was removed 2026-05-05 — its INTL slot was filled
    // by IgracGroundwaterAdapter on 2026-05-04 per
    // wiki/decisions/2026-05-04-igrac-global-groundwater-fallback.md.
    const layersWithoutIntl: Array<keyof typeof ADAPTER_REGISTRY> = [
      'elevation',
      'soils',
      'watershed',
      'wetlands_flood',
      'land_cover',
      'zoning',
    ];
    for (const layer of layersWithoutIntl) {
      expect(ADAPTER_REGISTRY[layer].INTL).toBeUndefined();
    }
  });

  it('every registered INTL adapter string matches a real adapter class name pattern', () => {
    for (const layer of Object.keys(ADAPTER_REGISTRY) as Array<keyof typeof ADAPTER_REGISTRY>) {
      const entry = ADAPTER_REGISTRY[layer].INTL;
      if (!entry) continue;
      // Class-name convention: PascalCase ending in "Adapter"
      expect(entry.adapter).toMatch(/^[A-Z][A-Za-z0-9]+Adapter$/);
      expect(entry.source).toMatch(/^[a-z][a-z0-9_]+$/);
    }
  });
});
