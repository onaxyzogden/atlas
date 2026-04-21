import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GaezRasterService } from './GaezRasterService.js';

let TMP: string;

function writeManifest(manifest: unknown) {
  writeFileSync(join(TMP, 'gaez-manifest.json'), JSON.stringify(manifest));
}

describe('GaezRasterService scenario dimension', () => {
  beforeEach(() => { TMP = mkdtempSync(join(tmpdir(), 'gaez-')); });
  afterEach(() => { try { rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ } });

  it('resolves baseline scenario when entries have no explicit scenario field', () => {
    writeManifest({
      climate_scenario: 'baseline_1981_2010',
      entries: {
        maize_rainfed_high: {
          filename: 'maize_rainfed_high',
          crop: 'maize',
          waterSupply: 'rainfed',
          inputLevel: 'high',
          suitabilityFile: 'a.tif',
          yieldFile: 'b.tif',
          units: { suitability: 'class', yield: 'kg/ha' },
        },
      },
    });
    const svc = new GaezRasterService(TMP, null);
    svc.loadManifest();
    expect(svc.resolveLocalFilePath('baseline_1981_2010', 'maize', 'rainfed', 'high', 'suitability'))
      .toBe(join(TMP, 'a.tif'));
  });

  it('returns null when scenario does not match any entry', () => {
    writeManifest({
      climate_scenario: 'baseline_1981_2010',
      entries: {
        maize_rainfed_high: {
          filename: 'maize_rainfed_high',
          crop: 'maize',
          waterSupply: 'rainfed',
          inputLevel: 'high',
          suitabilityFile: 'a.tif',
          yieldFile: null,
          units: { suitability: 'c', yield: 'k' },
        },
      },
    });
    const svc = new GaezRasterService(TMP, null);
    svc.loadManifest();
    expect(svc.resolveLocalFilePath('rcp85_2041_2070', 'maize', 'rainfed', 'high', 'suitability')).toBeNull();
  });

  it('resolves future scenario when entries carry explicit scenario field', () => {
    writeManifest({
      climate_scenario: 'baseline_1981_2010',
      entries: {
        'maize_rainfed_high:baseline_1981_2010': {
          filename: 'maize_rainfed_high_baseline',
          scenario: 'baseline_1981_2010',
          crop: 'maize',
          waterSupply: 'rainfed',
          inputLevel: 'high',
          suitabilityFile: 'base.tif',
          yieldFile: null,
          units: { suitability: 'c', yield: 'k' },
        },
        'maize_rainfed_high:rcp85_2041_2070': {
          filename: 'maize_rainfed_high_rcp85',
          scenario: 'rcp85_2041_2070',
          crop: 'maize',
          waterSupply: 'rainfed',
          inputLevel: 'high',
          suitabilityFile: 'rcp.tif',
          yieldFile: null,
          units: { suitability: 'c', yield: 'k' },
        },
      },
    });
    const svc = new GaezRasterService(TMP, null);
    svc.loadManifest();
    expect(svc.resolveLocalFilePath('baseline_1981_2010', 'maize', 'rainfed', 'high', 'suitability')).toBe(join(TMP, 'base.tif'));
    expect(svc.resolveLocalFilePath('rcp85_2041_2070', 'maize', 'rainfed', 'high', 'suitability')).toBe(join(TMP, 'rcp.tif'));
  });

  it('getManifestEntries tags every entry with a scenario', () => {
    writeManifest({
      climate_scenario: 'baseline_1981_2010',
      entries: {
        maize_rainfed_high: {
          filename: 'maize_rainfed_high',
          crop: 'maize',
          waterSupply: 'rainfed',
          inputLevel: 'high',
          suitabilityFile: 'a.tif',
          yieldFile: 'b.tif',
          units: { suitability: 'c', yield: 'k' },
        },
      },
    });
    const svc = new GaezRasterService(TMP, null);
    svc.loadManifest();
    const entries = svc.getManifestEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      scenario: 'baseline_1981_2010',
      crop: 'maize',
      waterSupply: 'rainfed',
      inputLevel: 'high',
      variables: ['suitability', 'yield'],
    });
  });

  it('getManifestEntries(scenario) filters to only that scenario', () => {
    writeManifest({
      climate_scenario: 'baseline_1981_2010',
      entries: {
        a: {
          filename: 'a',
          scenario: 'baseline_1981_2010',
          crop: 'maize',
          waterSupply: 'rainfed',
          inputLevel: 'high',
          suitabilityFile: 'a.tif',
          yieldFile: null,
          units: { suitability: 'c', yield: 'k' },
        },
        b: {
          filename: 'b',
          scenario: 'rcp85_2041_2070',
          crop: 'maize',
          waterSupply: 'rainfed',
          inputLevel: 'high',
          suitabilityFile: 'b.tif',
          yieldFile: null,
          units: { suitability: 'c', yield: 'k' },
        },
      },
    });
    const svc = new GaezRasterService(TMP, null);
    svc.loadManifest();
    expect(svc.getManifestEntries('baseline_1981_2010')).toHaveLength(1);
    expect(svc.getManifestEntries('rcp85_2041_2070')).toHaveLength(1);
    expect(svc.getManifestEntries('nonexistent')).toHaveLength(0);
    expect(svc.getManifestEntries()).toHaveLength(2);
  });
});
