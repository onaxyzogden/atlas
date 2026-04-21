/**
 * download-gaez.ts — Automated Theme 4 raster acquisition from FAO's ArcGIS
 * Image Service.
 *
 * Queries https://gaez-services.fao.org/server/rest/services/res05/ImageServer,
 * resolves each of the 96 (12 crops × 4 management × 2 variables) target
 * rasters to a direct S3 download URL via the service's `download_url` field,
 * and streams each `.tif` into `apps/api/data/gaez/raw/` using the naming
 * scheme expected by `convert-gaez-to-cog.ts`.
 *
 * Obviates 96 portal clicks in FAO's Data Viewer Attribute Table. Falls back
 * to the manual Data Viewer flow if ImageServer is unreachable or schema
 * drifts (see ingest-gaez.md §2c).
 *
 * Idempotent: skips files already present and non-empty.
 *
 * Usage:
 *   pnpm tsx apps/api/scripts/download-gaez.ts                    # all 96
 *   pnpm tsx apps/api/scripts/download-gaez.ts --filter maize     # just maize variants
 *   pnpm tsx apps/api/scripts/download-gaez.ts --filter maize_rainfed_high  # smoke test
 *   pnpm tsx apps/api/scripts/download-gaez.ts --dry-run          # list planned downloads
 *   pnpm tsx apps/api/scripts/download-gaez.ts --concurrency 8    # parallel downloads
 */

import { existsSync, statSync, createWriteStream, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { get as httpsGet } from 'node:https';
import { URL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Paths ───────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_ROOT = resolve(__dirname, '..');
const RAW_DIR = join(API_ROOT, 'data', 'gaez', 'raw');

// ── Naming scheme (mirrors convert-gaez-to-cog.ts) ──────────────────────────

export const VALID_CROPS = [
  'wheat', 'maize', 'rice', 'soybean', 'potato', 'cassava',
  'sorghum', 'millet', 'barley', 'oat', 'rye', 'sweet_potato',
] as const;
export const VALID_WATER_SUPPLY = ['rainfed', 'irrigated'] as const;
export const VALID_INPUT_LEVEL = ['low', 'high'] as const;
export const VALID_VARIABLE = ['suitability', 'yield'] as const;

export type Crop = (typeof VALID_CROPS)[number];
export type WaterSupply = (typeof VALID_WATER_SUPPLY)[number];
export type InputLevel = (typeof VALID_INPUT_LEVEL)[number];
export type Variable = (typeof VALID_VARIABLE)[number];

// ── ImageServer schema mapping ──────────────────────────────────────────────

const IMAGE_SERVER = 'https://gaez-services.fao.org/server/rest/services/res05/ImageServer';

/** FAO `crop` attribute value for each of our priority crops. */
const CROP_MAP: Record<Crop, string> = {
  wheat: 'Wheat',
  maize: 'Maize',
  rice: 'Wetland rice',
  soybean: 'Soybean',
  potato: 'White potato',
  cassava: 'Cassava',
  sorghum: 'Sorghum',
  millet: 'Pearl millet',
  barley: 'Barley',
  oat: 'Oat',
  rye: 'Rye',
  sweet_potato: 'Sweet potato',
};

/** FAO `water_supply` preference order per bucket. First match wins. */
const WATER_SUPPLY_MAP: Record<WaterSupply, string[]> = {
  rainfed: ['Rainfed'],
  // Most crops use "Gravity Irrigation" (both Low+High); a few (e.g. Cassava)
  // expose only "Irrigation" for their one irrigated variant. Try each in
  // order; `shouldInclude` picks whichever combination exists.
  irrigated: ['Gravity Irrigation', 'Irrigation', 'Sprinkler Irrigation', 'Drip Irrigation'],
};

const INPUT_LEVEL_MAP: Record<InputLevel, string> = { low: 'Low', high: 'High' };

/**
 * FAO `sub_theme_name` + `variable` tuple per output variable. Both filters
 * are required; `sub_theme_name` alone admits too many flavors (e.g. "all
 * land" vs "current cropland" variants). We want the "current cropland"
 * series so GaezRasterService's class→label mapping is valid.
 *
 * Note: FAO stores `Agro-ecological Attainable Yield` WITH a trailing space
 * in the database. We match both forms to survive a future cleanup.
 */
const VARIABLE_MAP: Record<Variable, { subThemes: string[]; variable: string }> = {
  suitability: {
    subThemes: ['Suitability Class'],
    variable: 'Crop suitability index in classes; current cropland in grid cell',
  },
  yield: {
    subThemes: ['Agro-ecological Attainable Yield', 'Agro-ecological Attainable Yield '],
    variable: 'Average attainable yield of current cropland',
  },
};

const BASELINE_YEAR = '1981-2010';
const BASELINE_MODEL = 'CRUTS32';

// ── Types ───────────────────────────────────────────────────────────────────

interface FeatureAttributes {
  objectid?: number;
  name?: string;
  crop?: string;
  water_supply?: string;
  input_level?: string;
  sub_theme_name?: string;
  variable?: string;
  model?: string;
  year?: string;
  download_url?: string;
}

interface QueryResponse {
  features?: Array<{ attributes: FeatureAttributes }>;
  error?: { code: number; message: string };
}

interface Target {
  crop: Crop;
  waterSupply: WaterSupply;
  inputLevel: InputLevel;
  variable: Variable;
  /** Filename per scheme in convert-gaez-to-cog.ts */
  filename: string;
  /** FAO direct S3 URL from download_url field */
  url: string;
}

// ── Pure helpers (unit-testable) ────────────────────────────────────────────

/** Build an ImageServer /query URL with SQL `where` + outFields. */
export function buildQueryUrl(where: string): string {
  const params = new URLSearchParams({
    where,
    outFields: 'objectid,name,crop,water_supply,input_level,sub_theme_name,variable,model,year,download_url',
    returnGeometry: 'false',
    resultRecordCount: '2000',
    f: 'json',
  });
  return `${IMAGE_SERVER}/query?${params.toString()}`;
}

/** SQL-escape a single-quoted literal by doubling embedded quotes. */
export function sqlQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Build the `where` clause for one (crop, variable) combination. We filter
 * broadly (crop + baseline + sub_theme_name + variable) and let the caller
 * post-filter the returned rows by water_supply + input_level.
 */
export function buildWhereClause(crop: Crop, variable: Variable): string {
  const v = VARIABLE_MAP[variable];
  const subThemeClause = v.subThemes.map((s) => `sub_theme_name=${sqlQuote(s)}`).join(' OR ');
  return [
    `year=${sqlQuote(BASELINE_YEAR)}`,
    `model=${sqlQuote(BASELINE_MODEL)}`,
    `crop=${sqlQuote(CROP_MAP[crop])}`,
    `(${subThemeClause})`,
    `variable=${sqlQuote(v.variable)}`,
  ].join(' AND ');
}

/**
 * Given FAO attribute row + which (waterSupply, inputLevel, variable) bucket
 * we're looking for, return our scheme-compliant filename or null if the row
 * doesn't match the bucket.
 */
export function mapToFilename(
  attrs: FeatureAttributes,
  crop: Crop,
  waterSupply: WaterSupply,
  inputLevel: InputLevel,
  variable: Variable,
): string | null {
  if (!attrs.water_supply || !attrs.input_level) return null;
  const wsCandidates = WATER_SUPPLY_MAP[waterSupply];
  if (!wsCandidates.includes(attrs.water_supply)) return null;
  if (attrs.input_level !== INPUT_LEVEL_MAP[inputLevel]) return null;
  return `${crop}_${waterSupply}_${inputLevel}_${variable}.tif`;
}

/** Enumerate all 96 (crop, waterSupply, inputLevel, variable) combos. */
export function enumerateTargets(): Array<{
  crop: Crop;
  waterSupply: WaterSupply;
  inputLevel: InputLevel;
  variable: Variable;
  filename: string;
}> {
  const out: Array<{
    crop: Crop;
    waterSupply: WaterSupply;
    inputLevel: InputLevel;
    variable: Variable;
    filename: string;
  }> = [];
  for (const crop of VALID_CROPS) {
    for (const ws of VALID_WATER_SUPPLY) {
      for (const il of VALID_INPUT_LEVEL) {
        for (const v of VALID_VARIABLE) {
          out.push({
            crop,
            waterSupply: ws,
            inputLevel: il,
            variable: v,
            filename: `${crop}_${ws}_${il}_${v}.tif`,
          });
        }
      }
    }
  }
  return out;
}

/** True if filename contains the substring filter (or no filter given). */
export function shouldInclude(filename: string, filterSubstring?: string): boolean {
  if (!filterSubstring) return true;
  return filename.toLowerCase().includes(filterSubstring.toLowerCase());
}

// ── HTTP helpers ────────────────────────────────────────────────────────────

/** Promise-based HTTPS GET returning a JSON response body. */
async function fetchJson<T>(url: string, maxRedirects = 5): Promise<T> {
  return new Promise((resolvePromise, rejectPromise) => {
    const tryOnce = (u: string, redirects: number) => {
      const req = httpsGet(u, { headers: { 'User-Agent': 'atlas-gaez-ingest/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirects <= 0) return rejectPromise(new Error(`Too many redirects fetching ${url}`));
          return tryOnce(new URL(res.headers.location, u).toString(), redirects - 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return rejectPromise(new Error(`HTTP ${res.statusCode} fetching ${u}`));
        }
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          try {
            resolvePromise(JSON.parse(Buffer.concat(chunks).toString('utf-8')) as T);
          } catch (e) {
            rejectPromise(new Error(`Invalid JSON from ${u}: ${(e as Error).message}`));
          }
        });
      });
      req.on('error', rejectPromise);
      req.setTimeout(30_000, () => {
        req.destroy(new Error(`Timeout fetching ${u}`));
      });
    };
    tryOnce(url, maxRedirects);
  });
}

/** Stream a URL to disk, following redirects. Writes to `${dest}.tmp` then renames. */
async function downloadFile(url: string, dest: string, maxRedirects = 5): Promise<number> {
  const tmp = `${dest}.tmp`;
  return new Promise((resolvePromise, rejectPromise) => {
    const tryOnce = (u: string, redirects: number) => {
      const req = httpsGet(u, { headers: { 'User-Agent': 'atlas-gaez-ingest/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirects <= 0) return rejectPromise(new Error(`Too many redirects for ${url}`));
          res.resume();
          return tryOnce(new URL(res.headers.location, u).toString(), redirects - 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return rejectPromise(new Error(`HTTP ${res.statusCode} downloading ${u}`));
        }
        const out = createWriteStream(tmp);
        let bytes = 0;
        res.on('data', (c: Buffer) => { bytes += c.length; });
        res.pipe(out);
        out.on('finish', () => {
          out.close(() => {
            try { renameSync(tmp, dest); resolvePromise(bytes); }
            catch (e) { rejectPromise(e as Error); }
          });
        });
        out.on('error', (e) => {
          try { unlinkSync(tmp); } catch { /* ignore */ }
          rejectPromise(e);
        });
      });
      req.on('error', rejectPromise);
      req.setTimeout(120_000, () => {
        req.destroy(new Error(`Timeout downloading ${u}`));
      });
    };
    tryOnce(url, maxRedirects);
  });
}

async function downloadWithRetry(url: string, dest: string, maxAttempts = 3): Promise<number> {
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await downloadFile(url, dest);
    } catch (e) {
      lastErr = e as Error;
      if (attempt < maxAttempts) {
        const delay = Math.pow(4, attempt - 1) * 1000; // 1s, 4s, 16s
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr ?? new Error('Unknown download error');
}

// ── ImageServer resolution ──────────────────────────────────────────────────

/**
 * Resolve every (crop, variable) pair's query to concrete Target rows. Makes
 * 24 queries (12 crops × 2 variables) and merges results.
 */
export async function resolveTargets(
  want: Array<{ crop: Crop; waterSupply: WaterSupply; inputLevel: InputLevel; variable: Variable; filename: string }>,
  fetcher: (url: string) => Promise<QueryResponse> = fetchJson,
): Promise<{ resolved: Target[]; unresolved: typeof want }> {
  const byCropVariable = new Map<string, typeof want>();
  for (const w of want) {
    const k = `${w.crop}::${w.variable}`;
    if (!byCropVariable.has(k)) byCropVariable.set(k, []);
    byCropVariable.get(k)!.push(w);
  }

  const resolved: Target[] = [];
  const unresolved: typeof want = [];

  for (const [key, bucket] of byCropVariable) {
    const [crop, variable] = key.split('::') as [Crop, Variable];
    const where = buildWhereClause(crop, variable);
    const url = buildQueryUrl(where);
    const resp = await fetcher(url);
    if (resp.error) throw new Error(`ImageServer error for ${key}: ${resp.error.message}`);
    const features = resp.features ?? [];

    for (const w of bucket) {
      // For each sought bucket, find the first ImageServer row whose water_supply
      // matches one of WATER_SUPPLY_MAP[w.waterSupply] in priority order, AND
      // whose input_level matches, AND whose name prefix is sc/ay (current
      // cropland series).
      let match: FeatureAttributes | null = null;
      for (const preferredWs of WATER_SUPPLY_MAP[w.waterSupply]) {
        const hit = features.find((f) =>
          f.attributes.water_supply === preferredWs &&
          f.attributes.input_level === INPUT_LEVEL_MAP[w.inputLevel] &&
          typeof f.attributes.download_url === 'string' &&
          f.attributes.download_url.endsWith('.tif'),
        );
        if (hit) { match = hit.attributes; break; }
      }

      if (match && match.download_url) {
        resolved.push({
          crop: w.crop,
          waterSupply: w.waterSupply,
          inputLevel: w.inputLevel,
          variable: w.variable,
          filename: w.filename,
          url: match.download_url,
        });
      } else {
        unresolved.push(w);
      }
    }
  }

  return { resolved, unresolved };
}

// ── Concurrency limiter ─────────────────────────────────────────────────────

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIdx = 0;
  async function worker(): Promise<void> {
    while (true) {
      const i = nextIdx++;
      if (i >= tasks.length) return;
      results[i] = await tasks[i]!();
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return results;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

interface CliOptions {
  filter?: string;
  dryRun: boolean;
  concurrency: number;
}

export function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { dryRun: false, concurrency: 4 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--filter' && i + 1 < argv.length) { opts.filter = argv[++i]; continue; }
    if (a === '--dry-run') { opts.dryRun = true; continue; }
    if (a === '--concurrency' && i + 1 < argv.length) { opts.concurrency = parseInt(argv[++i]!, 10); continue; }
    if (a === '--help' || a === '-h') {
      process.stdout.write(
        'Usage: download-gaez.ts [--filter <substring>] [--dry-run] [--concurrency N]\n',
      );
      process.exit(0);
    }
  }
  return opts;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const allTargets = enumerateTargets().filter((t) => shouldInclude(t.filename, opts.filter));

  if (allTargets.length === 0) {
    console.log(`No targets match filter "${opts.filter}". Valid filters match substrings of e.g. "maize_rainfed_high_yield.tif".`);
    return;
  }

  console.log(`Planned: ${allTargets.length} raster(s)${opts.filter ? ` (filter: ${opts.filter})` : ''}`);
  mkdirSync(RAW_DIR, { recursive: true });

  console.log(`Querying ImageServer for ${new Set(allTargets.map((t) => `${t.crop}::${t.variable}`)).size} (crop, variable) pair(s)...`);
  const { resolved, unresolved } = await resolveTargets(allTargets);

  if (unresolved.length > 0) {
    console.warn(`WARNING: ${unresolved.length} combination(s) not available on ImageServer:`);
    for (const u of unresolved) console.warn(`  - ${u.filename}`);
  }
  console.log(`Resolved: ${resolved.length}/${allTargets.length} files`);

  if (opts.dryRun) {
    console.log('\n-- Dry run --');
    for (const t of resolved) console.log(`  ${t.filename}  <-  ${t.url}`);
    return;
  }

  const tasks = resolved.map((t, i) => async () => {
    const dest = join(RAW_DIR, t.filename);
    if (existsSync(dest) && statSync(dest).size > 0) {
      console.log(`[${i + 1}/${resolved.length}] ${t.filename} (already present, skipped)`);
      return { skipped: true, bytes: 0, filename: t.filename };
    }
    const t0 = Date.now();
    try {
      const bytes = await downloadWithRetry(t.url, dest);
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      const mb = (bytes / 1024 / 1024).toFixed(1);
      console.log(`[${i + 1}/${resolved.length}] ${t.filename} OK (${mb} MB in ${secs}s)`);
      return { skipped: false, bytes, filename: t.filename };
    } catch (e) {
      console.error(`[${i + 1}/${resolved.length}] ${t.filename} FAILED: ${(e as Error).message}`);
      return { skipped: false, bytes: 0, filename: t.filename, error: (e as Error).message };
    }
  });

  const results = await runWithConcurrency(tasks, opts.concurrency);
  const ok = results.filter((r) => !('error' in r && r.error) && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => 'error' in r && r.error).length;
  console.log('\n-- Download summary --');
  console.log(`  Downloaded: ${ok}`);
  console.log(`  Skipped:    ${skipped}`);
  console.log(`  Failed:     ${failed}`);
  console.log(`  Unresolved: ${unresolved.length}`);
  console.log(`  Dest:       ${RAW_DIR}`);
  if (failed > 0 || unresolved.length > 0) process.exit(1);
}

// Only auto-run when invoked as a script (not when imported by tests).
const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
const thisPath = resolve(fileURLToPath(import.meta.url));
if (entryPath === thisPath) {
  main().catch((e) => {
    console.error('Fatal:', e);
    process.exit(1);
  });
}
