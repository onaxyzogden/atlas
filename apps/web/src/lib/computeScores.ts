/**
 * Thin re-export shim — the real scoring module lives in
 * `packages/shared/src/scoring/computeScores.ts` so both the web app and the
 * Fastify API (site_assessments writer) emit identical ScoreCards.
 *
 * Keep this file tiny; it exists only to preserve the existing import paths
 * (`./computeScores.js`) used by SiteIntelligencePanel.tsx, ScenarioPanel.tsx,
 * DecisionSupportPanel.tsx, fuzzyMCDM.ts, and the web unit test.
 *
 * Lifted 2026-04-21. See atlas/wiki/log.md.
 */

export * from '@ogden/shared/scoring';
