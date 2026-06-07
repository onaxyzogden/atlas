/**
 * resolveActStratumId — pure precedence for the Act tier shell's rendered
 * stratum, extracted so it can be unit-tested without rendering the whole
 * (map-/store-heavy) ActTierShell.
 *
 * The URL is the single source of truth (parity with Plan's PlanStratumShell).
 * Precedence:
 *   1. an explicit `$stratumId` route param — but only when it names a real
 *      stratum (a stale/garbage segment is ignored so it can't render an empty
 *      shell);
 *   2. the selected objective's owning stratum (objective deep-links carry no
 *      stratum segment, so the stratum is implied by the objective);
 *   3. the S1 fallback (cold entry to bare /act).
 */
export function resolveActStratumId(opts: {
  paramStratumId?: string | null;
  validStratumIds: readonly string[];
  objectiveStratumId?: string | null;
  fallbackStratumId: string;
}): string {
  const {
    paramStratumId,
    validStratumIds,
    objectiveStratumId,
    fallbackStratumId,
  } = opts;
  const fromParam =
    paramStratumId && validStratumIds.includes(paramStratumId)
      ? paramStratumId
      : null;
  return fromParam ?? objectiveStratumId ?? fallbackStratumId;
}
