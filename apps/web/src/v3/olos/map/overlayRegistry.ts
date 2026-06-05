/**
 * overlayRegistry — the OLOS-canonical mapping from the 15 Universal
 * Overlays to per-Stage layer wiring.
 *
 * Each entry catalogues:
 *   - `wiringStatus` per Stage: "live" (a legacy v3 overlay component
 *     services this Stage × Overlay combination today), or "placeholder"
 *     (content authoring deferred — the map will mount but the layer is
 *     blank).
 *   - `reuseFrom` per Stage: when live, the name of the existing overlay
 *     component the map view should mount. The Phase 1.4 shell does not
 *     yet add MapLibre sources/layers from this registry — that lives in
 *     a follow-up that coordinates source/layer naming with the legacy
 *     DiagnoseMap / DesignMap / OperateMap surfaces (their matrix-toggle
 *     and matrix-* source ids must remain coherent across both shells).
 *   - `legendNote` rendered next to placeholder overlays in the toggle
 *     strip so the steward sees *why* nothing is on the map yet.
 *
 * The registry is read by OverlayBundleStrip (for legend hints) and by
 * the future OverlayBundleLoader (which will mount layers per active
 * overlay × stage). Today the loader is the MapPlaceholder; Phase 1.5
 * upgrades it to a live MapLibre composition.
 */

import type { Stage, OverlayId } from '@ogden/shared';

export type OverlayWiringStatus = 'live' | 'placeholder';

export interface OverlayStageWiring {
  status: OverlayWiringStatus;
  /**
   * Existing v3 overlay component that will service this slot in the
   * follow-up that mounts live layers. Recorded by name (not imported)
   * because the legacy components are bound to their own basemap shells
   * and source naming; the follow-up will lift / re-wire them carefully.
   */
  reuseFrom?: string;
  /** Optional one-line note shown in the strip legend. */
  legendNote?: string;
}

export interface OverlayRegistryEntry {
  id: OverlayId;
  /** Per-stage wiring — `null` means the overlay is not authored for that stage. */
  perStage: Partial<Record<Stage, OverlayStageWiring>>;
}

export const OVERLAY_REGISTRY: Record<OverlayId, OverlayRegistryEntry> = {
  'zones': {
    id: 'zones',
    perStage: {
      observe: { status: 'live', reuseFrom: 'ZonesOverlay' },
      plan: { status: 'live', reuseFrom: 'ZonesOverlay' },
      act: { status: 'live', reuseFrom: 'ZonesOverlay' },
    },
  },
  'sectors': {
    id: 'sectors',
    perStage: {
      observe: { status: 'placeholder', legendNote: 'Sectors layer — content authoring deferred' },
      plan: { status: 'placeholder', legendNote: 'Sectors layer — content authoring deferred' },
      act: { status: 'placeholder', legendNote: 'Sectors layer — content authoring deferred' },
    },
  },
  'contours-landform': {
    id: 'contours-landform',
    perStage: {
      observe: { status: 'live', reuseFrom: 'TopographyOverlay' },
      plan: { status: 'live', reuseFrom: 'DesignContoursOverlay' },
      act: { status: 'live', reuseFrom: 'TopographyOverlay' },
    },
  },
  'water-flow': {
    id: 'water-flow',
    perStage: {
      observe: { status: 'live', reuseFrom: 'WaterOverlay' },
      plan: { status: 'live', reuseFrom: 'DesignHydrologyOverlay' },
      act: { status: 'live', reuseFrom: 'WaterOverlay' },
    },
  },
  'soil-conditions': {
    id: 'soil-conditions',
    perStage: {
      observe: { status: 'placeholder', legendNote: 'Soil layer — pending Observe wiring' },
      plan: { status: 'live', reuseFrom: 'DesignSoilsOverlay' },
      act: { status: 'placeholder', legendNote: 'Soil layer — pending Act wiring' },
    },
  },
  'ecology-habitat': {
    id: 'ecology-habitat',
    perStage: {
      observe: { status: 'placeholder', legendNote: 'Ecology / wetlands layer — pending Observe wiring' },
      plan: { status: 'live', reuseFrom: 'DesignWetlandsOverlay' },
      act: { status: 'placeholder', legendNote: 'Ecology / wetlands layer — pending Act wiring' },
    },
  },
  'access-movement': {
    id: 'access-movement',
    perStage: {
      observe: { status: 'placeholder', legendNote: 'Access & movement — content authoring deferred' },
      plan: { status: 'placeholder', legendNote: 'Access & movement — content authoring deferred' },
      act: { status: 'placeholder', legendNote: 'Access & movement — content authoring deferred' },
    },
  },
  'infrastructure-utilities': {
    id: 'infrastructure-utilities',
    perStage: {
      observe: { status: 'placeholder', legendNote: 'Infrastructure & utilities — content authoring deferred' },
      plan: { status: 'live', reuseFrom: 'DesignPlacementsOverlay' },
      act: { status: 'placeholder', legendNote: 'Infrastructure & utilities — content authoring deferred' },
    },
  },
  'resource-flows': {
    id: 'resource-flows',
    perStage: {
      observe: { status: 'placeholder', legendNote: 'Resource flows — content authoring deferred' },
      plan: { status: 'placeholder', legendNote: 'Resource flows — content authoring deferred' },
      act: { status: 'placeholder', legendNote: 'Resource flows — content authoring deferred' },
    },
  },
  'roles-responsibility': {
    id: 'roles-responsibility',
    perStage: {
      observe: { status: 'placeholder', legendNote: 'Roles & responsibility — content authoring deferred' },
      plan: { status: 'placeholder', legendNote: 'Roles & responsibility — content authoring deferred' },
      act: { status: 'placeholder', legendNote: 'Roles & responsibility — content authoring deferred' },
    },
  },
  'risk-compliance': {
    id: 'risk-compliance',
    perStage: {
      observe: { status: 'placeholder', legendNote: 'Risk & compliance — content authoring deferred' },
      plan: { status: 'placeholder', legendNote: 'Risk & compliance — content authoring deferred' },
      act: { status: 'live', reuseFrom: 'FieldFlagOverlay' },
    },
  },
  'suitability': {
    id: 'suitability',
    perStage: {
      observe: { status: 'placeholder', legendNote: 'Suitability — content authoring deferred' },
      plan: { status: 'placeholder', legendNote: 'Suitability — content authoring deferred' },
      act: { status: 'placeholder', legendNote: 'Suitability — content authoring deferred' },
    },
  },
  'stewardship-intensity': {
    id: 'stewardship-intensity',
    perStage: {
      observe: { status: 'placeholder', legendNote: 'Stewardship intensity — content authoring deferred' },
      plan: { status: 'placeholder', legendNote: 'Stewardship intensity — content authoring deferred' },
      act: { status: 'placeholder', legendNote: 'Stewardship intensity — content authoring deferred' },
    },
  },
  'monitoring-records': {
    id: 'monitoring-records',
    perStage: {
      observe: { status: 'placeholder', legendNote: 'Monitoring & records — content authoring deferred' },
      plan: { status: 'placeholder', legendNote: 'Monitoring & records — content authoring deferred' },
      act: { status: 'live', reuseFrom: 'RegenerationPlanOverlay' },
    },
  },
  'timeline-phasing': {
    id: 'timeline-phasing',
    perStage: {
      observe: { status: 'placeholder', legendNote: 'Timeline & phasing — content authoring deferred' },
      plan: { status: 'placeholder', legendNote: 'Timeline & phasing — content authoring deferred' },
      act: { status: 'placeholder', legendNote: 'Timeline & phasing — content authoring deferred' },
    },
  },
};

export function getOverlayWiring(
  stage: Stage,
  overlayId: OverlayId,
): OverlayStageWiring | undefined {
  return OVERLAY_REGISTRY[overlayId]?.perStage[stage];
}

export function isOverlayLive(stage: Stage, overlayId: OverlayId): boolean {
  return getOverlayWiring(stage, overlayId)?.status === 'live';
}
