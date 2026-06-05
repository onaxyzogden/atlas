// domains.ts
//
// OLOS Observe Dashboard — per-domain catalog (Dashboard Spec §2 +
// Developer Spec §4). The 16 universal domains exist already in
// `packages/shared/src/constants/universalDomain.ts`; this file
// ADDS the dashboard-specific facets:
//
//   - `defaultOverlayBundle`            — overlays the Domain Detail
//                                         view activates on the map.
//   - `freshnessThresholds`             — cadence the dashboard reads
//                                         to classify Current / Ageing
//                                         / Stale per Spec §2.3.
//   - `allowedStatusOutputs`            — every domain accepts the
//                                         full 5-output set today;
//                                         spec leaves room for
//                                         per-domain restriction.
//   - `legacyModuleMapping`             — id of the Phase 3 Observe
//                                         module dashboard that
//                                         Domain Detail embeds when
//                                         the spec maps cleanly to
//                                         existing UI. `null` means
//                                         Phase 4 ships a thin shell
//                                         (rich content arrives as
//                                         data accumulates).
//   - `supersessionProximityMeters`     — per-domain override of
//                                         `DEFAULT_SUPERSESSION_
//                                         PROXIMITY_METERS` (10m).
//                                         Optional; absent = default.

import type { OverlayId } from '../../schemas/olos/overlay.schema.js';
import type { UniversalDomain } from '../../schemas/universalDomain.schema.js';
import type { ObserveStatusOutput } from '../../schemas/observe/dataPoint.schema.js';
import type { FreshnessThresholds } from '../../relationships/observeFreshness.js';

/** Ids of the 7 Phase 3 Observe module dashboards Domain Detail can
 *  embed inline via React.lazy (Slice 4.3). */
export type ObserveLegacyModuleId =
  | 'topography'
  | 'earth-water-ecology'
  | 'macroclimate-hazards'
  | 'sectors-zones'
  | 'human-context'
  | 'built-environment'
  | 'swot-synthesis';

export interface ObserveDomainCatalogEntry {
  defaultOverlayBundle: readonly OverlayId[];
  freshnessThresholds: FreshnessThresholds;
  allowedStatusOutputs: readonly ObserveStatusOutput[];
  legacyModuleMapping: ObserveLegacyModuleId | null;
  supersessionProximityMeters?: number;
}

/** Default — every domain accepts the full 5-output set today. */
const ALL_STATUS_OUTPUTS: readonly ObserveStatusOutput[] = [
  'clear',
  'unknown',
  'needs_investigation',
  'major_constraint',
  'potential_disqualifier',
];

export const OBSERVE_DOMAIN_CATALOG: Record<
  UniversalDomain,
  ObserveDomainCatalogEntry
> = {
  'vision-intent': {
    defaultOverlayBundle: ['zones', 'roles-responsibility'],
    freshnessThresholds: { currentMaxDays: 730, ageingMaxDays: 1460 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: 'swot-synthesis',
  },
  'land-base': {
    defaultOverlayBundle: ['contours-landform', 'risk-compliance'],
    freshnessThresholds: { currentMaxDays: 1825, ageingMaxDays: 3650 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: 'swot-synthesis',
  },
  'climate': {
    defaultOverlayBundle: ['sectors', 'risk-compliance'],
    freshnessThresholds: { currentMaxDays: 90, ageingMaxDays: 180 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: 'macroclimate-hazards',
  },
  'topography': {
    defaultOverlayBundle: ['contours-landform'],
    freshnessThresholds: { currentMaxDays: 1825, ageingMaxDays: 3650 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: 'topography',
  },
  'hydrology': {
    defaultOverlayBundle: ['water-flow', 'contours-landform'],
    freshnessThresholds: { currentMaxDays: 180, ageingMaxDays: 365 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: 'earth-water-ecology',
  },
  'soil': {
    defaultOverlayBundle: ['soil-conditions'],
    freshnessThresholds: { currentMaxDays: 365, ageingMaxDays: 730 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: 'earth-water-ecology',
  },
  'ecology': {
    defaultOverlayBundle: ['ecology-habitat'],
    freshnessThresholds: { currentMaxDays: 180, ageingMaxDays: 365 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: 'earth-water-ecology',
  },
  'plants-food': {
    defaultOverlayBundle: ['ecology-habitat', 'suitability'],
    freshnessThresholds: { currentMaxDays: 90, ageingMaxDays: 180 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: null,
  },
  'animals-livestock': {
    defaultOverlayBundle: ['ecology-habitat', 'zones'],
    freshnessThresholds: { currentMaxDays: 90, ageingMaxDays: 180 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: null,
  },
  'built-infrastructure': {
    defaultOverlayBundle: ['infrastructure-utilities'],
    freshnessThresholds: { currentMaxDays: 365, ageingMaxDays: 1095 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: 'built-environment',
  },
  'access-circulation': {
    defaultOverlayBundle: ['access-movement', 'infrastructure-utilities'],
    freshnessThresholds: { currentMaxDays: 730, ageingMaxDays: 1825 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: 'sectors-zones',
  },
  'energy-resources': {
    defaultOverlayBundle: ['resource-flows', 'infrastructure-utilities'],
    freshnessThresholds: { currentMaxDays: 365, ageingMaxDays: 730 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: 'built-environment',
  },
  'people-governance': {
    defaultOverlayBundle: ['roles-responsibility'],
    freshnessThresholds: { currentMaxDays: 365, ageingMaxDays: 730 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: 'human-context',
  },
  'economics-capacity': {
    defaultOverlayBundle: ['resource-flows', 'stewardship-intensity'],
    freshnessThresholds: { currentMaxDays: 365, ageingMaxDays: 730 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: null,
  },
  'risk-compliance': {
    defaultOverlayBundle: ['risk-compliance'],
    freshnessThresholds: { currentMaxDays: 180, ageingMaxDays: 365 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: 'macroclimate-hazards',
  },
  'monitoring-records': {
    defaultOverlayBundle: ['monitoring-records'],
    freshnessThresholds: { currentMaxDays: 90, ageingMaxDays: 180 },
    allowedStatusOutputs: ALL_STATUS_OUTPUTS,
    legacyModuleMapping: 'swot-synthesis',
  },
};

/** Convenience accessor — falls back to `DEFAULT_SUPERSESSION_
 *  PROXIMITY_METERS` (10) when no per-domain override exists. */
export function getDomainSupersessionRadius(
  domainId: UniversalDomain,
  defaultRadiusMeters: number,
): number {
  return (
    OBSERVE_DOMAIN_CATALOG[domainId].supersessionProximityMeters ??
    defaultRadiusMeters
  );
}
