/**
 * Site Profile prefill from Observe-stage stores.
 *
 * The Goal Compass Site Profile facets are populated manually today.
 * Observe already captures most of the same facts (parcel acres, slope
 * along a transect, climate zone in the fetched climate layer, water
 * infrastructure, hazards, household). This helper reads those stores
 * imperatively and produces a per-facet candidate map that the UI can
 * apply via `setFacet(..., 'observe', observeFieldRef)`.
 *
 * Three facets stay manual because Observe has no source for them:
 *   - currentLandCover
 *   - primaryLandform
 *   - soilCompaction
 */

import { useMemo } from 'react';
import { useProjectStore } from '../../../../store/projectStore.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useExternalForcesStore } from '../../../../store/externalForcesStore.js';
import { useHumanContextStore } from '../../../../store/humanContextStore.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useSiteProfileStore } from '../../../../store/siteProfileStore.js';
import { transectStats } from '../../../observe/modules/topography/derivations.js';
import { getClimateLayer } from '../../../observe/modules/macroclimate-hazards/derivations.js';
import type {
  Household,
  WaterPosture,
} from '../../data/goalCompassTypes.js';

export type PrefillFacetKey =
  | 'acres'
  | 'climateZone'
  | 'avgSlopePct'
  | 'waterPosture'
  | 'hazards'
  | 'household'
  | 'lastFrostDate'
  | 'firstFrostDate';

type CandidateValueMap = {
  acres: number;
  climateZone: string;
  avgSlopePct: number;
  waterPosture: WaterPosture;
  hazards: string[];
  household: Household;
  lastFrostDate: string;
  firstFrostDate: string;
};

export type ObserveCandidate<K extends PrefillFacetKey> = {
  value: CandidateValueMap[K];
  observeFieldRef: string;
};

export type ObservePrefillResult = {
  [K in PrefillFacetKey]?: ObserveCandidate<K>;
};

export function deriveSiteProfileFromObserve(projectId: string): ObservePrefillResult {
  const out: ObservePrefillResult = {};

  // acres ← projectStore.activeProject.acreage (only when this project is active)
  const projectState = useProjectStore.getState();
  const project = projectState.projects.find((p) => p.id === projectId);
  if (project && typeof project.acreage === 'number' && project.acreage > 0) {
    out.acres = {
      value: project.acreage,
      observeFieldRef: `projectStore.projects[${projectId}].acreage`,
    };
  }

  // avgSlopePct ← longest transect with profile for this project
  const transects = useTopographyStore
    .getState()
    .transects.filter((t) => t.projectId === projectId && t.elevationProfileM?.length);
  if (transects.length) {
    const longest = transects.reduce((best, t) => {
      const tDist = t.totalDistanceM ?? t.elevationProfileM?.length ?? 0;
      const bDist = best!.totalDistanceM ?? best!.elevationProfileM?.length ?? 0;
      return tDist > bDist ? t : best!;
    }, transects[0]!);
    const stats = transectStats(longest);
    if (stats && stats.totalDistanceM && stats.totalDistanceM > 0) {
      out.avgSlopePct = {
        value: Math.round(stats.meanSlopePct * 10) / 10,
        observeFieldRef: `topographyStore.transects[${longest!.id}].meanSlopePct`,
      };
    }
  }

  // climateZone ← siteDataStore.layers.climate.summary.hardiness_zone
  const siteData = useSiteDataStore.getState().dataByProject[projectId];
  const climateSummary = getClimateLayer(siteData?.layers)?.summary;
  const hardiness = climateSummary?.hardiness_zone;
  if (hardiness) {
    out.climateZone = {
      value: hardiness,
      observeFieldRef: `siteDataStore.dataByProject[${projectId}].layers.climate.hardiness_zone`,
    };
  }
  if (climateSummary?.last_frost_date) {
    out.lastFrostDate = {
      value: climateSummary.last_frost_date,
      observeFieldRef: `siteDataStore.dataByProject[${projectId}].layers.climate.last_frost_date`,
    };
  }
  if (climateSummary?.first_frost_date) {
    out.firstFrostDate = {
      value: climateSummary.first_frost_date,
      observeFieldRef: `siteDataStore.dataByProject[${projectId}].layers.climate.first_frost_date`,
    };
  }

  // waterPosture ← storage type + watercourse presence
  const water = useWaterSystemsStore.getState();
  const storage = water.storageInfra.filter((s) => s.projectId === projectId);
  const watercourses = water.watercourses.filter((w) => w.projectId === projectId);
  const hasPond = storage.some((s) => s.type === 'pond');
  const hasCistern = storage.some((s) => s.type === 'cistern');
  const hasStorage = storage.length > 0;
  const hasWatercourse = watercourses.length > 0;
  let posture: WaterPosture | null = null;
  if (hasStorage && hasWatercourse) posture = 'mixed';
  else if (hasPond) posture = 'pond-fed';
  else if (hasCistern) posture = 'irrigated';
  else if (!hasStorage && !hasWatercourse) {
    // No infrastructure recorded — keep facet Unset so the steward fills it
    // rather than seeding an unverified "rainfed" claim.
    posture = null;
  } else if (hasWatercourse) {
    posture = 'mixed';
  }
  if (posture !== null) {
    out.waterPosture = {
      value: posture,
      observeFieldRef: `waterSystemsStore.{storageInfra,watercourses}[projectId=${projectId}]`,
    };
  }

  // hazards ← externalForcesStore.hazards filtered by project
  const hazards = useExternalForcesStore
    .getState()
    .hazards.filter((h) => h.projectId === projectId);
  if (hazards.length) {
    const labels = hazards.map((h) => {
      const desc = h.description?.trim();
      return desc && desc.length > 0 ? desc : h.type;
    });
    out.hazards = {
      value: labels,
      observeFieldRef: `externalForcesStore.hazards[projectId=${projectId}]`,
    };
  }

  // household ← humanContextStore.households (primary)
  const households = useHumanContextStore
    .getState()
    .households.filter((h) => h.projectId === projectId);
  const primary =
    households.find((h) => (h.label ?? '').toLowerCase() === 'primary') ?? households[0];
  if (primary && typeof primary.householdSize === 'number' && primary.householdSize > 0) {
    out.household = {
      value: { adults: primary.householdSize, children: 0 },
      observeFieldRef: `humanContextStore.households[${primary.id}].householdSize`,
    };
  }

  return out;
}

export interface UseObservePrefill {
  candidates: ObservePrefillResult;
  applyAll: () => number;
  applyOne: <K extends PrefillFacetKey>(key: K) => void;
}

export function useObservePrefill(projectId: string): UseObservePrefill {
  // Compute candidates imperatively, keyed on projectId only. Observe data
  // changes mid-tab are rare and the user explicitly clicks to apply — we
  // intentionally avoid reactive store subscriptions here because the prior
  // multi-slice subscription pattern produced unstable selector snapshots
  // (infinite-loop warning under React 18 useSyncExternalStore).
  const candidates = useMemo(
    () => deriveSiteProfileFromObserve(projectId),
    [projectId],
  );

  const applyAll = (): number => {
    const profile = useSiteProfileStore.getState().getSiteProfile(projectId);
    const setFacet = useSiteProfileStore.getState().setFacet;
    let applied = 0;
    for (const [key, candidate] of Object.entries(candidates) as [
      PrefillFacetKey,
      ObserveCandidate<PrefillFacetKey>,
    ][]) {
      if (!candidate) continue;
      const current = profile[key];
      if (current.provenance !== null) continue;
      setFacet(
        projectId,
        key,
        candidate.value as never,
        'observe',
        candidate.observeFieldRef,
      );
      applied += 1;
    }
    return applied;
  };

  const applyOne = <K extends PrefillFacetKey>(key: K): void => {
    const candidate = candidates[key];
    if (!candidate) return;
    useSiteProfileStore
      .getState()
      .setFacet(projectId, key, candidate.value as never, 'observe', candidate.observeFieldRef);
  };

  return { candidates, applyAll, applyOne };
}
