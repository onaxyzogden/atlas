/**
 * convert-gaez-to-cog.ts — One-time ingest pass for FAO GAEZ v4 rasters.
 *
 * Scans `apps/api/data/gaez/raw/` for files named per the scheme in
 * `scripts/ingest-gaez.md` (§2), shells out to `gdal_translate -of COG ...`
 * for each, and writes a manifest to `apps/api/data/gaez/cog/gaez-manifest.json`.
 *
 * Idempotent: existing COGs are skipped unless the raw file is newer.
 *
 * Usage:
 *   pnpm tsx apps/api/scripts/convert-gaez-to-cog.ts
 */

import { spawnSync } from 'node:child_process';
import { readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Paths ───────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_ROOT = resolve(__dirname, '..');
const RAW_DIR = join(API_ROOT, 'data', 'gaez', 'raw');
const COG_DIR = join(API_ROOT, 'data', 'gaez', 'cog');
const MANIFEST_PATH = join(COG_DIR, 'gaez-manifest.json');

// ── Naming scheme validation ────────────────────────────────────────────────

const VALID_CROPS = [
  'wheat', 'maize', 'rice', 'soybean', 'potato', 'cassava',
  'sorghum', 'millet', 'barley', 'oat', 'rye', 'sweet_potato',
] as const;
const VALID_WATER_SUPPLY = ['rainfed', 'irrigated'] as const;
const VALID_INPUT_LEVEL = ['low', 'high'] as const;
const VALID_VARIABLE = ['suitability', 'yield'] as const;

type Crop = (typeof VALID_CROPS)[number];
type WaterSupply = (typeof VALID_WATER_SUPPLY)[number];
type InputLevel = (typeof VALID_INPUT_LEVEL)[number];
type Variable = (typeof VALID_VARIABLE)[number];

interface ParsedName {
  crop: Crop;
  waterSupply: WaterSupply;
  inputLevel: InputLevel;
  variable: Variable;
  key: string; // `{crop}_{waterSupply}_{inputLevel}`
}

function parseName(filename: string): ParsedName | null {
  const bare = basename(filename, '.tif').toLowerCase();
  // Handle sweet_potato (two-word crop): match greedy at the end first
  const variable = VALID_VARIABLE.find((v) => bare.endsWith(`_${v}`));
  if (!variable) return null;
  const head = bare.slice(0, -variable.length - 1);

  const inputLevel = VALID_INPUT_LEVEL.find((lvl) => head.endsWith(`_${lvl}`));
  if (!inputLevel) return null;
  const head2 = head.slice(0, -inputLevel.length - 1);

  const waterSupply = VALID_WATER_SUPPLY.find((ws) => head2.endsWith(`_${ws}`));
  if (!waterSupply) return null;
  const cropStr = head2.slice(0, -waterSupply.length - 1);

  if (!(VALID_CROPS as readonly string[]).includes(cropStr)) return null;

  return {
    crop: cropStr as Crop,
    waterSupply,
    inputLevel,
    variable,
    key: `${cropStr}_${waterSupply}_${inputLevel}`,
  };
}

// ── Manifest shape ──────────────────────────────────────────────────────────

interface ManifestEntry {
  filename: string;       // filename inside cog/
  crop: Crop;
  waterSupply: WaterSupply;
  inputLevel: InputLevel;
  suitabilityFile: string | null;
  yieldFile: string | null;
  units: { suitability: string; yield: string };
}

interface Manifest {
  generated_at: string;
  source: 'FAO GAEZ v4';
  license: 'CC BY-NC-SA 3.0 IGO';
  attribution: 'FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO';
  climate_scenario: 'baseline_1981_2010';
  entries: Record<string, ManifestEntry>;
}

// ── COG conversion ──────────────────────────────────────────────────────────

function needsConversion(rawPath: string, cogPath: string): boolean {
  if (!existsSync(cogPath)) return true;
  return statSync(rawPath).mtimeMs > statSync(cogPath).mtimeMs;
}

function convertToCog(rawPath: string, cogPath: string): void {
  const args = [
    '-of', 'COG',
    '-co', 'COMPRESS=DEFLATE',
    '-co', 'PREDICTOR=2',
    '-co', 'BLOCKSIZE=256',
    '-co', 'OVERVIEWS=AUTO',
    '-co', 'OVERVIEW_RESAMPLING=NEAREST',
    rawPath,
    cogPath,
  ];
  const result = spawnSync('gdal_translate', args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`gdal_translate failed for ${basename(rawPath)} (exit ${result.status}). Is GDAL installed and on PATH?`);
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  if (!existsSync(RAW_DIR)) {
    console.error(`Raw directory not found: ${RAW_DIR}`);
    console.error('Create it and drop GAEZ GeoTIFFs there per the naming scheme in ingest-gaez.md §2.');
    process.exit(1);
  }

  mkdirSync(COG_DIR, { recursive: true });

  const rawFiles = readdirSync(RAW_DIR)
    .filter((f) => f.toLowerCase().endsWith('.tif'))
    .sort();

  if (rawFiles.length === 0) {
    console.error(`No .tif files in ${RAW_DIR}.`);
    process.exit(1);
  }

  console.log(`Found ${rawFiles.length} raw raster(s) in ${RAW_DIR}`);
  const entries: Record<string, ManifestEntry> = {};
  const skipped: string[] = [];
  let converted = 0;
  let reused = 0;

  for (const filename of rawFiles) {
    const parsed = parseName(filename);
    if (!parsed) {
      skipped.push(filename);
      continue;
    }
    const rawPath = join(RAW_DIR, filename);
    const cogPath = join(COG_DIR, filename);

    if (needsConversion(rawPath, cogPath)) {
      console.log(`Converting ${filename} → COG...`);
      convertToCog(rawPath, cogPath);
      converted++;
    } else {
      reused++;
    }

    const key = parsed.key;
    if (!entries[key]) {
      entries[key] = {
        filename: '', // informational top-level, filled after both variables known
        crop: parsed.crop,
        waterSupply: parsed.waterSupply,
        inputLevel: parsed.inputLevel,
        suitabilityFile: null,
        yieldFile: null,
        units: { suitability: 'class (1=S1 … 5=NS, 9=water)', yield: 'kg/ha/yr' },
      };
    }
    if (parsed.variable === 'suitability') entries[key]!.suitabilityFile = filename;
    if (parsed.variable === 'yield') entries[key]!.yieldFile = filename;
    entries[key]!.filename = entries[key]!.suitabilityFile ?? entries[key]!.yieldFile ?? filename;
  }

  const manifest: Manifest = {
    generated_at: new Date().toISOString(),
    source: 'FAO GAEZ v4',
    license: 'CC BY-NC-SA 3.0 IGO',
    attribution: 'FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO',
    climate_scenario: 'baseline_1981_2010',
    entries,
  };

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log('');
  console.log('── Ingest summary ──');
  console.log(`  Converted:  ${converted}`);
  console.log(`  Reused:     ${reused}`);
  console.log(`  Skipped:    ${skipped.length}  ${skipped.length > 0 ? '(names did not match scheme — see ingest-gaez.md §2)' : ''}`);
  if (skipped.length > 0) {
    for (const s of skipped) console.log(`    - ${s}`);
  }
  console.log(`  Manifest:   ${MANIFEST_PATH}`);
  console.log(`  Crop keys:  ${Object.keys(entries).length}`);
  console.log('');
}

main();
