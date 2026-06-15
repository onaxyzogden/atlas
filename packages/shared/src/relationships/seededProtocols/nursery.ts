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
 * NURSERY_SECONDARY_PROTOCOLS plus the universal pool. As of 2026-06-14 that
 * secondary set carries, alongside nur2-own-planting-supply, three operational
 * overlays authored for the layered context — nur2-propagation-health,
 * nur2-stock-readiness, and nur2-environmental-control — the secondary analogues
 * of the rich nursery primary protocols. The PRIMARY `nur-*` ids themselves still
 * load ONLY when nursery is the PRIMARY type, so they are not (and must not be)
 * seeded here; a layered nursery reaches that operational knowledge through the
 * nur2-* analogues instead. Every value below is a `nur2-*` or universal `u-` id.
 *
 * Amanah: covenant-aligned. The nursery secondary catalogue's only commerce
 * surface is ordinary sale/dispatch of already-possessed stock ("No advance sale,
 * no financial product, no riba- or gharar-adjacent content"). There is no
 * advance-sale objective in the secondary set, so the bayʿ mā laysa ʿindak guard
 * (nur-stock-presale) is deliberately left PRIMARY-only: importing it would either
 * falsely flag the clean possessed-stock sale (nur-sec-s4-sales-dispatch) or sit
 * orphaned with nothing to attach to. nur2-stock-readiness checks possessed-state
 * readiness only (the stock exists and is ready to route or sell), never an advance
 * commitment. Every seeded protocol is a monitoring / review / judgment / threshold
 * / cyclical trigger; none implies a sale, advance-purchase, financing, or yield
 * instrument.
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
    'nur2-propagation-health',
    'u-s6-ecology-indicator-decline',
    'u-s2-contamination-signal',
  ],

  // S3 — Systems Reading
  'nur-sec-s3-propagation-strategy': [
    'nur2-own-planting-supply',
    'nur2-propagation-health',
    'nur2-stock-readiness',
    'u-s6-yield-shortfall',
  ],
  'nur-sec-s3-growing-media': [
    'u-s7-material-availability',
    'u-s2-baseline-staleness-resurvey',
  ],

  // S4 — Foundation Decisions
  'nur-sec-s4-propagation-infra-design': [
    'nur2-environmental-control',
    'u-s5-infrastructure-failure',
  ],
  'nur-sec-s4-irrigation-design': [
    'u-s5-water-store-low',
    'u-s5-infrastructure-failure',
  ],
  'nur-sec-s4-sales-dispatch': [
    'nur2-own-planting-supply',
    'nur2-stock-readiness',
    'u-s6-ecology-indicator-decline',
  ],
};
