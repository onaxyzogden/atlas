/**
 * Single source of truth for the `pl-XXX → snake_case` alias map: regex-extract
 * the Object.freeze({...}) literal from
 * apps/web/src/data/plantCatalogAliases.ts at run time, parse it via JSON, and
 * return a plain object. The runtime catalog and any offline tooling therefore
 * share one map without a hand-mirrored copy.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ALIASES_TS = resolve(
  HERE,
  '..',
  '..',
  'apps',
  'web',
  'src',
  'data',
  'plantCatalogAliases.ts',
);

export async function loadAliases() {
  const src = await readFile(ALIASES_TS, 'utf8');
  const match = src.match(/Object\.freeze\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!match) {
    throw new Error(`Could not locate PLANT_ID_ALIASES Object.freeze in ${ALIASES_TS}`);
  }
  // Body holds entries like:   'pl-001': 'black_walnut',  // possibly with line comments
  const body = match[1]
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .filter((line) => line.length > 0 && !line.startsWith('//'))
    .join('');
  // Wrap into a JSON-parseable string by quoting keys and trimming trailing commas.
  const jsonish = `{${body}}`
    .replace(/'([^']+)'/g, '"$1"')
    .replace(/,(\s*})/g, '$1');
  const aliases = JSON.parse(jsonish);
  return aliases;
}

export function resolveSpeciesId(aliases, id) {
  return Object.prototype.hasOwnProperty.call(aliases, id) ? aliases[id] : id;
}
