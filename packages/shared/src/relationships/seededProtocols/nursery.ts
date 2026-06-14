import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for the 8 nursery objectives — the FIRST secondary-keyed map.
 *
 * Nursery is a SECONDARY-only type: it has no primary objective catalogue, so
 * all of its objectives are `nur-sec-*` and surface only when nursery is layered
 * onto a compatible host (e.g. the ecovillage combo). This map is therefore
 * registered in SECONDARY_MAPS (keyed by the secondary type id), not PRIMARY_MAPS,
 * and resolveSeededProtocols merges it via the project's secondaryTypeIds.
 *
 * Seedable pool constraint: a nursery-as-secondary project resolves only
 * NURSERY_SECONDARY_PROTOCOLS (= [nur2-own-planting-supply]) plus the universal
 * pool. The 4 rich NURSERY_PRIMARY_PROTOCOLS (propagation-health, stock-readiness,
 * environmental-control, stock-presale) load ONLY when nursery is the PRIMARY type
 * — they are not in this project's resolved set, so they are not (and must not be)
 * seeded here. Every value below is therefore `nur2-own-planting-supply` or a
 * universal `u-` id.
 *
 * Amanah: covenant-aligned. The nursery secondary catalogue's only commerce
 * surface is ordinary sale/dispatch of already-possessed stock ("No advance sale,
 * no financial product, no riba- or gharar-adjacent content"). There is no
 * advance-sale objective in the secondary set, so the bayʿ mā laysa ʿindak guard
 * (nur-stock-presale) is correctly absent — its absence opens no gap. Every seeded
 * protocol is a monitoring / review / judgment / threshold trigger; none implies a
 * sale, advance-purchase, financing, or yield instrument.
 *
 * Objectives absent from this map have no seeded protocols — no error, no pill.
 */
export const NURSERY_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // S1 — Foundation (survey)
  'nur-sec-s1-propagation-infra-survey': [
    'u-s5-infrastructure-failure',
    'u-s2-baseline-staleness-resurvey',
  ],
  'nur-sec-s1-water-survey': [
    'u-s2-contamination-signal',
    'u-s5-water-store-low',
    'u-s3-flow-anomaly-reassess',
  ],

  // S2 — Land Reading
  'nur-sec-s2-biosecurity-survey': [
    'u-s6-ecology-indicator-decline',
    'u-s2-contamination-signal',
  ],

  // S3 — Systems Reading
  'nur-sec-s3-propagation-strategy': [
    'nur2-own-planting-supply',
    'u-s6-yield-shortfall',
  ],
  'nur-sec-s3-growing-media': [
    'u-s7-material-availability',
    'u-s2-baseline-staleness-resurvey',
  ],

  // S4 — Foundation Decisions
  'nur-sec-s4-propagation-infra-design': [
    'u-s5-infrastructure-failure',
  ],
  'nur-sec-s4-irrigation-design': [
    'u-s5-water-store-low',
    'u-s5-infrastructure-failure',
  ],
  'nur-sec-s4-sales-dispatch': [
    'nur2-own-planting-supply',
    'u-s6-ecology-indicator-decline',
  ],
};
