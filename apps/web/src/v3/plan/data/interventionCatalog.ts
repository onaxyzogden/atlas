/**
 * Goal Compass intervention catalog — barrel re-export.
 *
 * The catalog was split into `interventionCatalog/` (one module per
 * project archetype + a shared universal slice). This file is kept so
 * every existing importer of `'.../data/interventionCatalog.js'`
 * resolves unchanged — it re-exports the identical public API.
 *
 * See `interventionCatalog/index.ts` for the assembly and
 * `wiki/decisions/2026-05-16-atlas-catalog-archetype-parity.md`.
 */

export { INTERVENTION_CATALOG, getIntervention } from './interventionCatalog/index.js';
