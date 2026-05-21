/**
 * `@ogden/shared/evidence` — Tier-2 Evidence layer (Phase E.2 home).
 *
 * Promoted from `apps/web/src/lib/evidence/` in Phase G so the server-side
 * replay tool (`apps/api/src/scripts/replayEvidenceAudit.ts`) can run the
 * same selectors that the web emit path uses. Selectors are pure functions
 * over scalar inputs — they do not reach into stores, React, or the DOM.
 *
 * The web-only audit-log writer (`emitEvidenceAudit`) remains at
 * `apps/web/src/lib/evidence/auditEmit.ts` because it depends on the web
 * `apiClient`.
 */
export * from './types.js';
export * from './hashInputs.js';
export * from './selectEvidence.js';
// Surface per-selector enum types that downstream UI consumers need.
export type { EthicKey, EthicStatus } from './selectors/threeEthics.js';
