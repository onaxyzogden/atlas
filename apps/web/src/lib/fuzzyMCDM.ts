/**
 * Thin re-export shim — the real fuzzy MCDM module lives in
 * `packages/shared/src/scoring/fuzzyMCDM.ts` so both the web app and the
 * Fastify API emit identical membership vectors + AHP weights.
 *
 * Keep this file tiny; it exists only to preserve the existing import paths.
 *
 * Lifted 2026-04-22. See atlas/wiki/log.md.
 */

export * from '@ogden/shared/scoring';
