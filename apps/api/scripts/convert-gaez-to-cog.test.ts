/**
 * Tests for the convert-gaez-to-cog CLI argument parser.
 *
 * Sprint CD Phase D — validates the `--scenario <id>` flag that future RCP
 * raster ingest runs will use to emit scenario-tagged manifests.
 */
import { describe, it, expect } from 'vitest';
import { parseArgs } from './convert-gaez-to-cog.js';

describe('convert-gaez-to-cog --scenario flag', () => {
  it('defaults scenario to baseline_1981_2010 when --scenario is omitted', () => {
    const opts = parseArgs([]);
    expect(opts.scenario).toBe('baseline_1981_2010');
  });

  it('accepts a valid --scenario identifier', () => {
    const opts = parseArgs(['--scenario', 'rcp85_2041_2070']);
    expect(opts.scenario).toBe('rcp85_2041_2070');
  });

  it('accepts another well-formed scenario identifier', () => {
    const opts = parseArgs(['--scenario', 'rcp45_2011_2040']);
    expect(opts.scenario).toBe('rcp45_2011_2040');
  });

  it('rejects a scenario with uppercase characters', () => {
    expect(() => parseArgs(['--scenario', 'RCP85_2041_2070'])).toThrow();
  });

  it('rejects a scenario with spaces and punctuation', () => {
    expect(() => parseArgs(['--scenario', 'BAD SCENARIO!'])).toThrow();
  });

  it('rejects an empty scenario', () => {
    expect(() => parseArgs(['--scenario', ''])).toThrow();
  });

  it('rejects --scenario missing its value', () => {
    expect(() => parseArgs(['--scenario'])).toThrow();
  });

  it('rejects a scenario longer than 64 characters', () => {
    const tooLong = 'a'.repeat(65);
    expect(() => parseArgs(['--scenario', tooLong])).toThrow();
  });
});
