/**
 * Regional cost database — "cite or declare placeholder" audit contract.
 *
 * Every benchmark row must carry a `source` block. Either:
 *   - citation is a non-empty string + confidence is 'high' or 'medium', OR
 *   - citation is null + confidence is 'low' + note is non-empty.
 *
 * Also spot-checks derived-region inheritance and the high-confidence rows
 * we have real citations for (NRCS CP327 pollinator, CP380 windbreak, NREL
 * solar, OMAFRA orchard/row-crop, OSCIA pollinator).
 */

import { describe, it, expect } from 'vitest';
import {
  getCostBenchmarks,
  US_MIDWEST,
  CA_ONTARIO,
} from '../../features/financial/engine/costDatabase.js';
import type {
  RegionalCostBenchmarks,
  CostSource,
  CostRegion,
} from '../../features/financial/engine/types.js';

function assertSourceShape(src: CostSource | undefined, rowPath: string) {
  expect(src, `${rowPath}: source missing`).toBeDefined();
  const s = src!;
  if (s.citation !== null) {
    expect(s.citation.length, `${rowPath}: citation must be non-empty string`).toBeGreaterThan(0);
    expect(['high', 'medium', 'low']).toContain(s.confidence);
  } else {
    expect(s.confidence, `${rowPath}: null-cite rows must be low confidence`).toBe('low');
    expect(s.note, `${rowPath}: null-cite rows must have a note`).toBeTruthy();
    expect(s.note!.length).toBeGreaterThan(0);
  }
}

function auditAllRows(bench: RegionalCostBenchmarks, region: string) {
  for (const [k, v] of Object.entries(bench.zones)) assertSourceShape(v!.source, `${region}.zones.${k}`);
  for (const [k, v] of Object.entries(bench.fencing)) assertSourceShape(v.source, `${region}.fencing.${k}`);
  for (const [k, v] of Object.entries(bench.paths)) assertSourceShape(v.source, `${region}.paths.${k}`);
  for (const [k, v] of Object.entries(bench.utilities)) assertSourceShape(v.source, `${region}.utilities.${k}`);
  for (const [k, v] of Object.entries(bench.crops)) assertSourceShape(v.source, `${region}.crops.${k}`);
}

describe('regional cost database — audit §6.10 "cite or leave null" contract', () => {
  it('US Midwest: every row has a valid source block', () => {
    auditAllRows(US_MIDWEST, 'US_MIDWEST');
  });

  it('CA Ontario: every row has a valid source block', () => {
    auditAllRows(CA_ONTARIO, 'CA_ONTARIO');
  });

  it('derived region (us-northeast) inherits source + decorates with multiplier note', () => {
    const ne = getCostBenchmarks('us-northeast');
    auditAllRows(ne, 'us-northeast');
    // High-confidence US source → medium after multiplier
    const pollinator = ne.crops.pollinator_strip;
    expect(pollinator.source!.confidence).toBe('medium');
    expect(pollinator.source!.note).toMatch(/derived ×1\.15/);
  });

  it('derived region (ca-bc) inherits from US Midwest × 1.30', () => {
    const bc = getCostBenchmarks('ca-bc');
    expect(bc.structureMultiplier).toBe(1.30);
    expect(bc.crops.orchard.source!.note).toMatch(/1\.30/);
  });

  it('high-confidence citations are present for key NRCS/NREL rows', () => {
    expect(US_MIDWEST.crops.pollinator_strip.source!.confidence).toBe('high');
    expect(US_MIDWEST.crops.pollinator_strip.source!.citation).toMatch(/CP327/);
    expect(US_MIDWEST.crops.windbreak.source!.citation).toMatch(/CP380/);
    expect(US_MIDWEST.fencing.post_wire.source!.citation).toMatch(/CP382/);
    expect(US_MIDWEST.utilities.solar_panel.source!.citation).toMatch(/NREL/);
    expect(US_MIDWEST.crops.orchard.source!.confidence).toBe('high');
  });

  it('Ontario-primary rows cite OMAFRA / OSCIA / NRCan where claimed', () => {
    expect(CA_ONTARIO.crops.orchard.source!.citation).toMatch(/Ontario Apple Growers/);
    expect(CA_ONTARIO.crops.row_crop.source!.citation).toMatch(/OMAFRA/);
    expect(CA_ONTARIO.crops.pollinator_strip.source!.citation).toMatch(/OSCIA/);
    expect(CA_ONTARIO.utilities.solar_panel.source!.citation).toMatch(/RETScreen/);
  });

  it('cost ranges are positive and ordered low ≤ mid ≤ high', () => {
    const allRegions: CostRegion[] = ['us-midwest', 'us-northeast', 'us-southeast', 'us-west', 'ca-ontario', 'ca-bc', 'ca-prairies'];
    for (const region of allRegions) {
      const b = getCostBenchmarks(region);
      for (const v of Object.values(b.crops)) {
        const r = v.establishmentPerAcre;
        expect(r.low, `${region}: low negative`).toBeGreaterThanOrEqual(0);
        expect(r.mid).toBeGreaterThanOrEqual(r.low);
        expect(r.high).toBeGreaterThanOrEqual(r.mid);
      }
    }
  });
});
