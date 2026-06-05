/**
 * Derive a cost-multiplier region from a project's declared location.
 *
 * This is a COARSE approximation — a sensible default the steward can always
 * override. It maps a country + province/state into one of the seven
 * `CostRegion` buckets that carry a multiplier in `costDatabase`. It never
 * invents data: when the location is unknown or international it falls back to
 * the neutral US-Midwest base (×1.00).
 */

import type { CostRegion } from './types.js';

// US state/territory → cost region (US Census divisions, coarsened to 4 buckets).
const US_STATE_REGION: Record<string, CostRegion> = {
  // Northeast
  ME: 'us-northeast', NH: 'us-northeast', VT: 'us-northeast', MA: 'us-northeast',
  RI: 'us-northeast', CT: 'us-northeast', NY: 'us-northeast', NJ: 'us-northeast',
  PA: 'us-northeast',
  // Midwest
  OH: 'us-midwest', IN: 'us-midwest', IL: 'us-midwest', MI: 'us-midwest',
  WI: 'us-midwest', MN: 'us-midwest', IA: 'us-midwest', MO: 'us-midwest',
  ND: 'us-midwest', SD: 'us-midwest', NE: 'us-midwest', KS: 'us-midwest',
  // Southeast (Census "South")
  DE: 'us-southeast', MD: 'us-southeast', DC: 'us-southeast', VA: 'us-southeast',
  WV: 'us-southeast', NC: 'us-southeast', SC: 'us-southeast', GA: 'us-southeast',
  FL: 'us-southeast', KY: 'us-southeast', TN: 'us-southeast', AL: 'us-southeast',
  MS: 'us-southeast', AR: 'us-southeast', LA: 'us-southeast', OK: 'us-southeast',
  TX: 'us-southeast',
  // West
  MT: 'us-west', ID: 'us-west', WY: 'us-west', CO: 'us-west', NM: 'us-west',
  AZ: 'us-west', UT: 'us-west', NV: 'us-west', WA: 'us-west', OR: 'us-west',
  CA: 'us-west', AK: 'us-west', HI: 'us-west',
};

// Canadian province/territory → cost region (only ON/BC/Prairies carry distinct
// multipliers; the rest fall back to the Ontario base).
const CA_PROVINCE_REGION: Record<string, CostRegion> = {
  ON: 'ca-ontario',
  BC: 'ca-bc',
  AB: 'ca-prairies', SK: 'ca-prairies', MB: 'ca-prairies',
};

export function deriveCostRegion(
  country: string | null | undefined,
  provinceState: string | null | undefined,
): CostRegion {
  const code = (provinceState ?? '').trim().toUpperCase();
  const ctry = (country ?? '').trim().toUpperCase();

  if (ctry === 'CA') {
    return CA_PROVINCE_REGION[code] ?? 'ca-ontario';
  }
  if (ctry === 'US') {
    return US_STATE_REGION[code] ?? 'us-midwest';
  }
  // INTL / unknown → neutral US-Midwest base (×1.00).
  return 'us-midwest';
}
