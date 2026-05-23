/**
 * useObserveProgress — the only React/store-coupled layer of the Observe
 * objectives engine. Subscribes to the per-project slice of each annotation
 * store, assembles a plain `ObserveProgressInput` bag, and runs the pure
 * `evaluateObserve` predicates from `objectives.ts`.
 *
 * Selector stability: each store hook subscribes to a *raw* state field
 * (array / record) — never a freshly-allocated derived value — and all
 * counting happens inside a single `useMemo`. This avoids the zustand
 * `Object.is` re-render loop documented in
 * `wiki/decisions/2026-04-26-zustand-selector-stability.md`.
 */

import { useMemo } from 'react';
import { useProjectStore } from '../../../store/projectStore.js';
import { useHomesteadStore } from '../../../store/homesteadStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import { useExternalForcesStore } from '../../../store/externalForcesStore.js';
import { useTopographyStore } from '../../../store/topographyStore.js';
import { useWaterSystemsStore } from '../../../store/waterSystemsStore.js';
import { useEcologyStore } from '../../../store/ecologyStore.js';
import { useSoilSampleStore } from '../../../store/soilSampleStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { useVegetationStore } from '../../../store/vegetationStore.js';
import { useSwotStore } from '../../../store/swotStore.js';
import {
  EMPTY_OBSERVE_INPUT,
  evaluateObserve,
  type ObserveProgress,
} from './objectives.js';

export function useObserveProgress(projectId: string | null): ObserveProgress {
  const projects = useProjectStore((s) => s.projects);
  const homesteadByProject = useHomesteadStore((s) => s.byProject);
  const beEntities = useBuiltEnvironmentStoreV2((s) => s.entities);
  const hazards = useExternalForcesStore((s) => s.hazards);
  const sectors = useExternalForcesStore((s) => s.sectors);
  const contours = useTopographyStore((s) => s.contours);
  const highPoints = useTopographyStore((s) => s.highPoints);
  const transects = useTopographyStore((s) => s.transects);
  const earthworks = useWaterSystemsStore((s) => s.earthworks);
  const watercourses = useWaterSystemsStore((s) => s.watercourses);
  const waterbodies = useWaterSystemsStore((s) => s.waterbodies);
  const soilSamples = useSoilSampleStore((s) => s.samples);
  const ecology = useEcologyStore((s) => s.ecology);
  const zones = useZoneStore((s) => s.zones);
  const patches = useVegetationStore((s) => s.patches);
  const swot = useSwotStore((s) => s.swot);

  return useMemo(() => {
    if (!projectId) return evaluateObserve(EMPTY_OBSERVE_INPUT);

    const byProject = <T extends { projectId: string }>(arr: T[]): number =>
      arr.reduce((n, item) => (item.projectId === projectId ? n + 1 : n), 0);

    const project = projects.find(
      (p) => p.id === projectId || p.serverId === projectId,
    );
    const hasBoundary = Boolean(
      project?.hasParcelBoundary ||
        project?.parcelBoundaryGeojson?.features?.length,
    );

    const swotBucketsCovered = new Set(
      swot.filter((e) => e.projectId === projectId).map((e) => e.bucket),
    ).size;

    return evaluateObserve({
      hasBoundary,
      homesteadPinned: projectId in homesteadByProject,
      builtFeatureCount: byProject(beEntities),
      hazardCount: byProject(hazards),
      sectorCount: byProject(sectors),
      contourCount: byProject(contours),
      highPointCount: byProject(highPoints),
      transectCount: byProject(transects),
      earthworkCount: byProject(earthworks),
      waterLineCount: byProject(watercourses) + byProject(waterbodies),
      soilSampleCount: byProject(soilSamples),
      ecologyObsCount: byProject(ecology),
      zoneCount: byProject(zones),
      patchCount: byProject(patches),
      swotCount: byProject(swot),
      swotBucketsCovered,
    });
  }, [
    projectId,
    projects,
    homesteadByProject,
    beEntities,
    hazards,
    sectors,
    contours,
    highPoints,
    transects,
    earthworks,
    watercourses,
    waterbodies,
    soilSamples,
    ecology,
    zones,
    patches,
    swot,
  ]);
}
