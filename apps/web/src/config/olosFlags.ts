/**
 * olosFlags - feature flags for the OLOS formal proof/verification path.
 *
 * `OLOS_FORMAL_PROOF_ENABLED` gates the formal olos_* proof/verification UI
 * (TaskProofPanel + its mount in ActFeedbackLoop). Off by default so nothing
 * changes for existing users until enabled, while the lightweight
 * ObserveDataPoint completion path remains live through the migration
 * (see wiki/decisions/2026-06-04-olos-proof-verification-fork.md).
 *
 * Resolution order:
 *  1. localStorage override (dev/QA toggle, no rebuild): OLOS_FORMAL_PROOF_LS_KEY
 *     set to 'true' / 'false'.
 *  2. VITE_OLOS_FORMAL_PROOF_ENABLED env ('true' enables).
 *  3. default false.
 *
 * Mirrors the VITE_ env-flag convention already used for telemetry
 * (VITE_ATLAS_TELEMETRY_ENABLED).
 */

export const OLOS_FORMAL_PROOF_LS_KEY = 'ogden-flag-olos-formal-proof';

export function isOlosFormalProofEnabled(): boolean {
  // localStorage override wins so dev/QA can flip the flag without a rebuild.
  try {
    const override = globalThis.localStorage?.getItem(OLOS_FORMAL_PROOF_LS_KEY);
    if (override === 'true') return true;
    if (override === 'false') return false;
  } catch {
    // localStorage may be unavailable (SSR / privacy mode); fall through to env.
  }
  return import.meta.env.VITE_OLOS_FORMAL_PROOF_ENABLED === 'true';
}
