/**
 * `@ogden/shared/scoring` — unified scoring module consumed by both the web
 * app (`apps/web/src/lib/computeScores.ts` shim) and the Fastify API
 * (`apps/api/src/services/assessments/SiteAssessmentWriter.ts`).
 *
 * DO NOT re-export this barrel from `packages/shared/src/index.ts`:
 * the rule engine pulls `AssessmentFlag` from `schemas/assessment.schema.ts`,
 * and a re-export from the main barrel would create a cycle.
 * Consumers import directly from the subpath `@ogden/shared/scoring`.
 */

export * from './computeScores.js';
export * from './hydrologyMetrics.js';
export * from './petModel.js';
export * from './types.js';
export * from './layerSummary.js';
export * from './rules/index.js';
