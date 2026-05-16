#!/usr/bin/env node
/**
 * Offline migrator for legacy `pl-XXX` species ids in exported JSON dumps.
 *
 * Background: stewards occasionally export `siteAnnotationsStore` /
 * `polycultureStore` / `cropStore` localStorage snapshots for hand-edit,
 * fixture extraction, or transfer between projects. After the 2026-05-14
 * plant-catalog consolidation, the runtime stores rewrite pl-XXX → snake_case
 * via persist `migrate` on rehydrate, but exported JSON dumps don't pass
 * through that path. This script applies the same alias map to any JSON
 * file.
 *
 * Usage:
 *   node scripts/migrate-plant-ids.mjs <input.json> [<output.json>]
 *
 * If no output path is given, writes alongside input as `<input>.migrated.json`.
 *
 * The walker rewrites any string leaf whose key path ends in `species`,
 * `speciesId`, or `anchorSpeciesId` — these are the three keys that carry
 * plant identifiers across the persisted store shapes.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename, extname, join } from 'node:path';
import { loadAliases, resolveSpeciesId } from './lib/load-aliases.mjs';

const PLANT_KEY_RE = /^(species|speciesId|anchorSpeciesId)$/;

function rewrite(value, aliases, stats, keyPath = []) {
  if (Array.isArray(value)) {
    // If parent key is `species`, treat array of strings as ids.
    const parentKey = keyPath[keyPath.length - 1];
    if (parentKey === 'species') {
      return value.map((item) => {
        if (typeof item !== 'string') return rewrite(item, aliases, stats, keyPath);
        const next = resolveSpeciesId(aliases, item);
        if (next !== item) {
          stats.rewritten += 1;
          stats.pathsTouched.add(keyPath.join('.'));
        } else if (item.startsWith('pl-')) {
          stats.unknownIds.add(item);
        }
        return next;
      });
    }
    return value.map((item, i) => rewrite(item, aliases, stats, [...keyPath, String(i)]));
  }
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'string' && PLANT_KEY_RE.test(k)) {
        const next = resolveSpeciesId(aliases, v);
        if (next !== v) {
          stats.rewritten += 1;
          stats.pathsTouched.add([...keyPath, k].join('.'));
        } else if (v.startsWith('pl-')) {
          stats.unknownIds.add(v);
        }
        out[k] = next;
      } else {
        out[k] = rewrite(v, aliases, stats, [...keyPath, k]);
      }
    }
    return out;
  }
  return value;
}

async function main() {
  const [inputArg, outputArg] = process.argv.slice(2);
  if (!inputArg) {
    console.error('Usage: node scripts/migrate-plant-ids.mjs <input.json> [<output.json>]');
    process.exit(2);
  }
  const inputPath = resolve(inputArg);
  const outputPath = outputArg
    ? resolve(outputArg)
    : join(
        dirname(inputPath),
        `${basename(inputPath, extname(inputPath))}.migrated${extname(inputPath) || '.json'}`,
      );

  const aliases = await loadAliases();
  const src = await readFile(inputPath, 'utf8');
  const data = JSON.parse(src);

  const stats = { rewritten: 0, unknownIds: new Set(), pathsTouched: new Set() };
  const migrated = rewrite(data, aliases, stats);

  await writeFile(outputPath, JSON.stringify(migrated, null, 2), 'utf8');

  console.log(
    JSON.stringify(
      {
        input: inputPath,
        output: outputPath,
        rewritten: stats.rewritten,
        unknownIds: [...stats.unknownIds],
        pathsTouched: [...stats.pathsTouched],
        aliasCount: Object.keys(aliases).length,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
