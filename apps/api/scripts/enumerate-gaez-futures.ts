/**
 * enumerate-gaez-futures.ts — Reconnaissance for FAO GAEZ v4 Theme 4 future
 * scenario rasters.
 *
 * One-shot query against FAO's ArcGIS ImageServer that enumerates every
 * (model, year) tuple beyond the 1981-2010 CRUTS32 baseline. Writes a
 * machine-readable `futures-inventory.json` + human-readable
 * `futures-inventory.md` into `apps/api/data/gaez/`. Sprint CD+1 picks a
 * subset from this inventory for actual ingest; this script pulls no bytes.
 *
 * Pure helpers (extractEmissions, computeScenarioId, computeCompleteness)
 * are unit-tested in enumerate-gaez-futures.test.ts. The `main()` entry is
 * side-effect-only and gated behind the CLI entry-path check so imports in
 * tests don't trigger network calls.
 *
 * Usage:
 *   pnpm tsx apps/api/scripts/enumerate-gaez-futures.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CROP_MAP,
  WATER_SUPPLY_MAP,
  INPUT_LEVEL_MAP,
  VALID_CROPS,
  VALID_WATER_SUPPLY,
  VALID_INPUT_LEVEL,
  VALID_VARIABLE,
  IMAGE_SERVER,
  fetchJson,
  sqlQuote,
  type QueryResponse,
  type Crop,
  type WaterSupply,
  type InputLevel,
  type Variable,
} from './download-gaez.js';

// ── Paths ───────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_ROOT = resolve(__dirname, '..');
const GAEZ_DATA_DIR = join(API_ROOT, 'data', 'gaez');

// ── Pure helpers (unit-testable) ────────────────────────────────────────────

/**
 * Parse a FAO emissions-scenario string into a canonical RCP bucket. Accepts
 * both the dedicated `rcp` field (values like "RCP8.5", "RCP4.5") and legacy
 * model strings that encode RCP inline (e.g. "ENSEMBLE_MEAN_RCP45"). Also
 * maps "CRUTS32" (or any `cruts*` string) to 'baseline'.
 */
export function extractEmissions(model: string): string {
  const m = model.toLowerCase();
  if (m.includes('rcp26') || m.includes('rcp2p6') || m.includes('rcp2.6')) return 'rcp26';
  if (m.includes('rcp45') || m.includes('rcp4p5') || m.includes('rcp4.5')) return 'rcp45';
  if (m.includes('rcp60') || m.includes('rcp6p0') || m.includes('rcp6.0')) return 'rcp60';
  if (m.includes('rcp85') || m.includes('rcp8p5') || m.includes('rcp8.5')) return 'rcp85';
  if (m === 'cruts32' || m.includes('cruts')) return 'baseline';
  return 'unknown';
}

/**
 * Compute a canonical, filename-safe scenario id from FAO's model + year
 * strings, e.g. ('ENSEMBLE_MEAN_RCP45', '2041-2070') → 'rcp45_2041_2070'.
 * Throws if the computed id doesn't satisfy ^[a-z0-9_]{1,64}$.
 *
 * In practice FAO's schema stores RCP in a dedicated field; callers that
 * have it should pass `rcp` as the `model` argument to get a canonical id.
 * Leaving the (model, year) signature for test-fixture compatibility.
 */
export function computeScenarioId(model: string, year: string): string {
  const emissions = extractEmissions(model);
  const years = year.replace(/-/g, '_');
  const id = `${emissions}_${years}`;
  if (!/^[a-z0-9_]{1,64}$/.test(id)) {
    throw new Error(`Computed scenario id "${id}" does not match [a-z0-9_]{1,64}`);
  }
  return id;
}

// ── Completeness assessment ─────────────────────────────────────────────────

export interface ScenarioCompleteness {
  crops_covered: number;
  fully_covered: boolean;
  gaps: Array<{ crop: string; missing: string[] }>;
}

/** Reverse-lookup: FAO crop name → our canonical key. */
function faoCropToCanonical(fao: string): Crop | null {
  for (const key of VALID_CROPS) {
    if (CROP_MAP[key] === fao) return key;
  }
  return null;
}

/** Reverse-lookup: FAO water_supply → our canonical key (first-match). */
function faoWaterToCanonical(fao: string): WaterSupply | null {
  for (const key of VALID_WATER_SUPPLY) {
    if (WATER_SUPPLY_MAP[key].includes(fao)) return key;
  }
  return null;
}

/** Reverse-lookup: FAO input_level → our canonical key. */
function faoInputToCanonical(fao: string): InputLevel | null {
  for (const key of VALID_INPUT_LEVEL) {
    if (INPUT_LEVEL_MAP[key] === fao) return key;
  }
  return null;
}

/** Map FAO sub_theme_name → our canonical variable. Tolerates trailing space. */
function subThemeToVariable(sub: string): Variable | null {
  if (sub.startsWith('Suitability')) return 'suitability';
  if (sub.startsWith('Agro-ecological')) return 'yield';
  return null;
}

/**
 * Compute coverage of the 96-cell (12 crops × 2 water × 2 input × 2 variable)
 * grid against a batch of FAO feature rows. Gaps are listed per-crop as
 * `${waterSupply}_${inputLevel}_${variable}` strings for each missing cell.
 */
export function computeCompleteness(
  rows: Array<{
    crop?: string;
    water_supply?: string;
    input_level?: string;
    variable?: string;
    sub_theme_name?: string;
  }>,
): ScenarioCompleteness {
  // Present set keyed by `${crop}|${waterSupply}|${inputLevel}|${variable}`.
  const present = new Set<string>();

  for (const row of rows) {
    if (!row.crop || !row.water_supply || !row.input_level || !row.sub_theme_name) continue;
    const crop = faoCropToCanonical(row.crop);
    if (!crop) continue;
    const ws = faoWaterToCanonical(row.water_supply);
    if (!ws) continue;
    const il = faoInputToCanonical(row.input_level);
    if (!il) continue;
    const variable = subThemeToVariable(row.sub_theme_name);
    if (!variable) continue;
    present.add(`${crop}|${ws}|${il}|${variable}`);
  }

  // Build per-crop gaps.
  const gaps: Array<{ crop: string; missing: string[] }> = [];
  const cropsCovered = new Set<Crop>();

  for (const crop of VALID_CROPS) {
    const missing: string[] = [];
    let cropHasAny = false;
    for (const ws of VALID_WATER_SUPPLY) {
      for (const il of VALID_INPUT_LEVEL) {
        for (const v of VALID_VARIABLE) {
          const key = `${crop}|${ws}|${il}|${v}`;
          if (present.has(key)) {
            cropHasAny = true;
          } else {
            missing.push(`${ws}_${il}_${v}`);
          }
        }
      }
    }
    if (cropHasAny) cropsCovered.add(crop);
    if (missing.length > 0) gaps.push({ crop, missing });
  }

  return {
    crops_covered: cropsCovered.size,
    fully_covered: gaps.length === 0,
    gaps,
  };
}

// ── Inventory shape ─────────────────────────────────────────────────────────

export interface ScenarioInventory {
  queried_at: string;
  image_server: string;
  baseline: { model: string; year: string };
  future_scenarios: Array<{
    scenario_id: string;
    model: string;
    year: string;
    rcp: string;
    raster_count: number;
    per_variable: Record<'suitability' | 'yield', number>;
    completeness: ScenarioCompleteness;
  }>;
  notes: string[];
}

// ── Live-query helpers ──────────────────────────────────────────────────────

/**
 * Sanitize an arbitrary FAO field value to a short filename-safe token. Used
 * to append GCM + rcp to the scenario id so distinct (gcm, rcp, period)
 * triples get unique ids when a single RCP bucket has multiple GCMs.
 */
function slugToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
}

/**
 * Query distinct (model, year, rcp) triples where year != baseline. Tries
 * `returnDistinctValues=true` first; on failure falls back to a broad
 * paginated query and computes distinct client-side.
 */
async function fetchDistinctScenarioTriples(): Promise<
  Array<{ model: string; year: string; rcp: string }>
> {
  const distinctWhere = `year NOT IN ('1981-2010')`;
  const distinctUrl = `${IMAGE_SERVER}/query?${new URLSearchParams({
    where: distinctWhere,
    outFields: 'model,year,rcp',
    returnDistinctValues: 'true',
    returnGeometry: 'false',
    f: 'json',
  })}`;

  try {
    const resp = await fetchJson<{
      error?: { code: number; message: string };
      features?: Array<{ attributes: { model?: string; year?: string; rcp?: string } }>;
    }>(distinctUrl);
    if (resp.error) throw new Error(`ImageServer error: ${resp.error.message}`);
    const seen = new Set<string>();
    const triples: Array<{ model: string; year: string; rcp: string }> = [];
    for (const f of resp.features ?? []) {
      const model = f.attributes.model ?? '';
      const year = f.attributes.year ?? '';
      const rcp = f.attributes.rcp ?? '';
      if (!model || !year) continue;
      const key = `${model}|${year}|${rcp}`;
      if (seen.has(key)) continue;
      seen.add(key);
      triples.push({ model, year, rcp });
    }
    return triples;
  } catch (err) {
    console.warn(
      `Distinct query failed (${(err as Error).message}); falling back to paginated broad query.`,
    );
    const seen = new Set<string>();
    const triples: Array<{ model: string; year: string; rcp: string }> = [];
    const pageSize = 2000;
    let offset = 0;
    // Cap at 50k rows to bound the fallback (Theme 4 has ~20k entries total).
    const maxRows = 50000;
    while (offset < maxRows) {
      const broadUrl = `${IMAGE_SERVER}/query?${new URLSearchParams({
        where: distinctWhere,
        outFields: 'model,year,rcp',
        returnGeometry: 'false',
        resultRecordCount: String(pageSize),
        resultOffset: String(offset),
        f: 'json',
      })}`;
      const resp = await fetchJson<{
        error?: { code: number; message: string };
        exceededTransferLimit?: boolean;
        features?: Array<{ attributes: { model?: string; year?: string; rcp?: string } }>;
      }>(broadUrl);
      if (resp.error) throw new Error(`ImageServer broad-query error: ${resp.error.message}`);
      const feats = resp.features ?? [];
      for (const f of feats) {
        const model = f.attributes.model ?? '';
        const year = f.attributes.year ?? '';
        const rcp = f.attributes.rcp ?? '';
        if (!model || !year) continue;
        const key = `${model}|${year}|${rcp}`;
        if (seen.has(key)) continue;
        seen.add(key);
        triples.push({ model, year, rcp });
      }
      if (feats.length < pageSize || !resp.exceededTransferLimit) break;
      offset += pageSize;
    }
    return triples;
  }
}

/**
 * Paginate through every row matching a (model, year, rcp) triple so we get
 * an accurate raster_count. FAO caps each page at 1000; we walk until
 * `exceededTransferLimit` is false or a hard cap of 25k rows is hit.
 */
async function fetchAllFeatures(
  model: string,
  year: string,
  rcp: string,
): Promise<FeatureAttributesLite[]> {
  const clauses = [`model=${sqlQuote(model)}`, `year=${sqlQuote(year)}`];
  if (rcp) clauses.push(`rcp=${sqlQuote(rcp)}`);
  else clauses.push(`(rcp IS NULL OR rcp = '')`);
  const where = clauses.join(' AND ');

  const all: FeatureAttributesLite[] = [];
  const pageSize = 1000;
  const maxRows = 25000;
  let offset = 0;
  while (offset < maxRows) {
    const url = `${IMAGE_SERVER}/query?${new URLSearchParams({
      where,
      outFields: 'crop,water_supply,input_level,sub_theme_name,variable,rcp,model,year',
      returnGeometry: 'false',
      resultRecordCount: String(pageSize),
      resultOffset: String(offset),
      f: 'json',
    })}`;
    const resp = await fetchJson<QueryResponse & { exceededTransferLimit?: boolean }>(url);
    if (resp.error) throw new Error(`ImageServer error for ${where}: ${resp.error.message}`);
    const feats = (resp.features ?? []).map((f) => f.attributes as FeatureAttributesLite);
    all.push(...feats);
    if (feats.length < pageSize || !resp.exceededTransferLimit) break;
    offset += pageSize;
  }
  return all;
}

type FeatureAttributesLite = {
  crop?: string;
  water_supply?: string;
  input_level?: string;
  sub_theme_name?: string;
  variable?: string;
  rcp?: string;
  model?: string;
  year?: string;
};

function renderMarkdown(inv: ScenarioInventory): string {
  const rows = inv.future_scenarios
    .map(
      (s) =>
        `| \`${s.scenario_id}\` | ${s.model} | ${s.year} | ${s.rcp || '—'} | ${s.raster_count} | ${s.per_variable.suitability}/${s.per_variable.yield} | ${s.completeness.fully_covered ? 'yes' : `no (${s.completeness.gaps.length} gaps)`} |`,
    )
    .join('\n');
  const notes = inv.notes.length > 0 ? `\n## Notes\n\n${inv.notes.map((n) => `- ${n}`).join('\n')}\n` : '';
  return `# FAO GAEZ v4 Theme 4 — Future-Scenario Inventory\n\nGenerated: ${inv.queried_at}\nSource: ${inv.image_server}\n\n| Scenario ID | FAO model | FAO year | FAO rcp | Rasters | Suit / Yield | Complete? |\n|---|---|---|---|--:|---|---|\n${rows}\n${notes}`;
}

async function main(): Promise<void> {
  console.log(`Querying ${IMAGE_SERVER} for non-baseline (model, year, rcp) triples...`);
  const distinct = await fetchDistinctScenarioTriples();
  console.log(`Found ${distinct.length} distinct (model, year, rcp) triple(s).`);

  const scenarios: ScenarioInventory['future_scenarios'] = [];
  const notes: string[] = [];

  for (const { model, year, rcp } of distinct) {
    // Scenario id = rcp_period_gcm. For CRUTS32 historical periods rcp is
    // "Historical" (which extractEmissions doesn't recognize) so fall back
    // to extracting from the model name to get the `baseline_*` prefix.
    const fromRcp = extractEmissions(rcp);
    const rcpBucket = fromRcp !== 'unknown' ? fromRcp : extractEmissions(model);
    const period = year.replace(/-/g, '_');
    const gcm = slugToken(model);
    let scenarioId = `${rcpBucket}_${period}_${gcm}`;
    if (!/^[a-z0-9_]{1,64}$/.test(scenarioId)) {
      scenarioId = `unknown_${period}_${gcm}`.slice(0, 64);
    }

    console.log(`  Querying ${scenarioId} (${model} / ${year} / rcp=${rcp || '—'})...`);
    const features = await fetchAllFeatures(model, year, rcp);

    const perVariable = { suitability: 0, yield: 0 } as Record<'suitability' | 'yield', number>;
    for (const f of features) {
      const v = f.sub_theme_name ? subThemeToVariable(f.sub_theme_name) : null;
      if (v) perVariable[v]++;
    }
    const completeness = computeCompleteness(features);

    console.log(
      `    ${features.length} rasters; ` +
        `${perVariable.suitability} suit / ${perVariable.yield} yield; ` +
        `${completeness.fully_covered ? 'fully covered' : `${completeness.gaps.length} crop gap(s)`}`,
    );

    scenarios.push({
      scenario_id: scenarioId,
      model,
      year,
      rcp: rcp || '',
      raster_count: features.length,
      per_variable: perVariable,
      completeness,
    });
  }

  notes.push(
    'FAO stores RCP in a dedicated `rcp` field (e.g. "RCP8.5"), NOT in `model`. The `model` field holds the GCM (HadGEM2-ES, GFDL-ESM2M, ENSEMBLE, etc.) or "CRUTS32" for historical baselines.',
    'Scenario ID format: `<rcpBucket>_<startYear>_<endYear>_<gcm>`. `rcpBucket` is one of baseline / rcp26 / rcp45 / rcp60 / rcp85 / unknown. GCM slug is lowercased, non-alphanumerics replaced with underscores, truncated to 24 chars.',
    "The 12-crop × 4-management × 2-variable coverage grid is computed against our Sprint CA priority crops only. FAO Theme 4 carries additional crops (alfalfa, cotton, groundnut, etc.) and sub-themes (crop water indicators, constraints) that inflate `raster_count` well beyond 96. `completeness.gaps` reflects missing cells *within our 96-cell target grid*, not FAO's full catalog.",
    'Page size for refinement queries is 1000 (FAO server cap); script paginates with `resultOffset` until `exceededTransferLimit=false`.',
  );

  const inventory: ScenarioInventory = {
    queried_at: new Date().toISOString(),
    image_server: IMAGE_SERVER,
    baseline: { model: 'CRUTS32', year: '1981-2010' },
    future_scenarios: scenarios.sort((a, b) => a.scenario_id.localeCompare(b.scenario_id)),
    notes,
  };

  mkdirSync(GAEZ_DATA_DIR, { recursive: true });
  const jsonPath = join(GAEZ_DATA_DIR, 'futures-inventory.json');
  const mdPath = join(GAEZ_DATA_DIR, 'futures-inventory.md');
  writeFileSync(jsonPath, JSON.stringify(inventory, null, 2));
  writeFileSync(mdPath, renderMarkdown(inventory));
  console.log(`\nWrote ${scenarios.length} scenario(s) to futures-inventory.{json,md}`);
  console.log(`  ${jsonPath}`);
  console.log(`  ${mdPath}`);
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
