/**
 * emitEvidenceAudit — F.4 fire-and-forget audit-log writer.
 *
 * Called from Evidence-emitting panels (initial adopter: `LandVerdictCard`)
 * to persist a row in `evidence_audit_log` after `selectEvidenceFor(...)`
 * returns. Pure side-effect: never thrown, never awaited by callers,
 * never blocks render.
 *
 * Reproducibility invariant: identical `bundle` inputs → identical
 * `inputHash` → on replay, the same Evidence must be emitted. See
 * migration 033 + [[fiqh-csra-erased-2026-05-04]].
 */

import { api } from '../apiClient.js';
import { hashInputs } from '@ogden/shared/evidence';

export interface EmitEvidenceAuditArgs {
  projectId: string;
  panelKey: string;
  selectorName: string;
  inputs: unknown;
  output: unknown;
}

/**
 * Computes a SHA-256 of `inputs` (stable-stringified) and POSTs the row
 * to `/api/v1/projects/:projectId/evidence-audit/log`. Errors are
 * swallowed — this is a passive ledger, not a critical path.
 *
 * Returns nothing; the caller MUST NOT await this. Use:
 *   void emitEvidenceAudit({ ... });
 */
export function emitEvidenceAudit(args: EmitEvidenceAuditArgs): void {
  void Promise.resolve()
    .then(async () => {
      const inputHash = await hashInputs(args.inputs);
      await api.evidenceAudit.log(args.projectId, {
        panelKey: args.panelKey,
        inputHash,
        inputPayload: args.inputs,
        selectorName: args.selectorName,
        evidenceOutput: args.output,
      });
    })
    .catch(() => {
      // Passive ledger — never disturb render on failure.
    });
}
