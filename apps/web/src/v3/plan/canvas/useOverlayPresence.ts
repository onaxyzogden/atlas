/**
 * useOverlayPresence — per-overlay "does this project have anything to show?"
 *
 * Drives the presence-gating of the BaseMapCard "Overlays" legend: a data-backed
 * overlay row is only offered when the current project actually has ≥1 feature
 * for it. This declutters the legend and makes the Plan and Act legends identical
 * automatically (same project data → same visible rows).
 *
 * Three overlays are COMPUTED, not data-backed — they always render content
 * regardless of steward-placed features, so they are always present:
 *   - `topography` — contour vector tiles + hillshade
 *   - `sunPath`    — solar-trajectory math from site location
 *   - `sectors`    — the SectorCompass HUD renders computed solar/wind arcs
 *                    from the project location even with zero manual sector
 *                    arrows (SectorCompassOverlay returns null only when there
 *                    is neither a centroid nor any manual arrow), and the
 *                    `sectors` toggle is what hides that compass — so the row
 *                    must always be offered or the user couldn't switch it off.
 *
 * Every other key is gated on a cheap emptiness check against the same stores
 * the matching overlay layer reads. All store hooks are called unconditionally
 * (rules of hooks); when `projectId` is falsy we return all-false except the two
 * always-on computed keys.
 *
 * The result is reactive: drawing or removing a feature re-renders the legend so
 * its row appears / disappears live.
 */

import { useMemo } from 'react';
import type { MatrixToggleKey } from '../../../store/matrixTogglesStore.js';
import { useExternalForcesStore } from '../../../store/externalForcesStore.js';
import { useHumanContextStore } from '../../../store/humanContextStore.js';
import { useWaterSystemsStore } from '../../../store/waterSystemsStore.js';
import {
  useBuildingsForProject,
  useWellsForProject,
  useSepticsForProject,
  usePowerLinesForProject,
  useBuriedUtilitiesForProject,
  useFencesForProject,
  useGatesForProject,
  useExistingDrivewaysForProject,
} from '../../../store/builtEnvironmentSelectors.js';
import { useVegetationStore } from '../../../store/vegetationStore.js';
import { usePastureStore } from '../../../store/pastureStore.js';
import { useConventionalCropStore } from '../../../store/conventionalCropStore.js';
import { useSwotStore } from '../../../store/swotStore.js';
import { useSoilSampleStore } from '../../../store/soilSampleStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { useScheduledLivestockMoveStore } from '../../../store/scheduledLivestockMoveStore.js';
import { useLandDesignStore } from '../../../store/landDesignStore.js';
import { useSlopeSurveyStore } from '../../../store/slopeSurveyStore.js';
import { useVegetationSurveyStore } from '../../../store/vegetationSurveyStore.js';
import {
  hydrologySurvey,
  soilSurvey,
  nutrientSurvey,
  pestSurvey,
  stockWaterSurvey,
} from '../../../store/receptionSurveys.js';
import { useFieldVerification } from '../../../lib/fieldVerification/useFieldVerification.js';

export type OverlayPresence = Record<MatrixToggleKey, boolean>;

const ALL_FALSE_EXCEPT_COMPUTED: OverlayPresence = {
  topography: true,
  sunPath: true,
  sectors: true,
  zones: false,
  water: false,
  builtEnvironment: false,
  observeAnnotations: false,
  zoneRings: false,
  seededZones: false,
  placedZones: false,
  scheduledMoves: false,
  waterRouter: false,
  slopeSurvey: false,
  vegetationSurvey: false,
  receptionSurvey: false,
};

const inProject = <T extends { projectId: string }>(arr: T[], projectId: string): T[] =>
  arr.filter((x) => x.projectId === projectId);

export function useOverlayPresence(projectId?: string): OverlayPresence {
  // Subscribe by full namespace; filter in the memo below (rules of hooks: all
  // hooks called unconditionally, even when projectId is falsy). `sectors` is
  // computed (always present) so its store is not read here — only `hazards`
  // (a no-toggleKey spec under the observeAnnotations master) is needed.
  const hazards = useExternalForcesStore((s) => s.hazards);

  const neighbours = useHumanContextStore((s) => s.neighbours);
  const households = useHumanContextStore((s) => s.households);
  const accessRoads = useHumanContextStore((s) => s.accessRoads);
  const permacultureZones = useHumanContextStore((s) => s.permacultureZones);

  const watercourses = useWaterSystemsStore((s) => s.watercourses);
  const waterbodies = useWaterSystemsStore((s) => s.waterbodies);

  const beId = projectId ?? '';
  const buildings = useBuildingsForProject(beId);
  const wells = useWellsForProject(beId);
  const septics = useSepticsForProject(beId);
  const powerLines = usePowerLinesForProject(beId);
  const buriedUtilities = useBuriedUtilitiesForProject(beId);
  const fences = useFencesForProject(beId);
  const gates = useGatesForProject(beId);
  const existingDriveways = useExistingDrivewaysForProject(beId);

  const vegetationPatches = useVegetationStore((s) => s.patches);
  const pastures = usePastureStore((s) => s.pastures);
  const conventionalCrops = useConventionalCropStore((s) => s.conventionalCrops);
  const swot = useSwotStore((s) => s.swot);
  const soilSamples = useSoilSampleStore((s) => s.samples);
  const { zones: verificationZones } = useFieldVerification(projectId ?? undefined);

  const zones = useZoneStore((s) => s.zones);
  const moves = useScheduledLivestockMoveStore((s) => s.plans);
  const landDesignByProject = useLandDesignStore((s) => s.byProject);
  const slopeByProject = useSlopeSurveyStore((s) => s.byProject);
  const vegSurveyByProject = useVegetationSurveyStore((s) => s.byProject);
  // Reception (Tier-2 Systems Reading): five stores, one shared overlay row.
  // Present iff ANY of the five has >=1 drawn feature for this project.
  const hydrologyByProject = hydrologySurvey.useStore((s) => s.byProject);
  const soilByProject = soilSurvey.useStore((s) => s.byProject);
  const nutrientByProject = nutrientSurvey.useStore((s) => s.byProject);
  const pestByProject = pestSurvey.useStore((s) => s.byProject);
  const stockWaterByProject = stockWaterSurvey.useStore((s) => s.byProject);

  return useMemo<OverlayPresence>(() => {
    if (!projectId) return ALL_FALSE_EXCEPT_COMPUTED;

    const projectZones = inProject(zones, projectId);

    // `observeAnnotations` is the master toggle for the steward-annotation specs
    // that carry NO independent sub-toggle in ObserveAnnotationLayers:
    // field-verification, human-points (neighbours + households), human-roads,
    // hazards, soil-points, ecology, pasture (+ pasture-fence), conventional-crop,
    // swot. Keep this union in lockstep with the no-`toggleKey` specs there.
    const observeAnnotations =
      verificationZones.features.length > 0 ||
      inProject(neighbours, projectId).length > 0 ||
      inProject(households, projectId).length > 0 ||
      inProject(accessRoads, projectId).length > 0 ||
      inProject(hazards, projectId).length > 0 ||
      inProject(soilSamples, projectId).length > 0 ||
      inProject(vegetationPatches, projectId).length > 0 ||
      inProject(pastures, projectId).length > 0 ||
      inProject(conventionalCrops, projectId).length > 0 ||
      inProject(swot, projectId).length > 0;

    return {
      // Computed — always render content.
      topography: true,
      sunPath: true,
      sectors: true,

      // Data-backed — present iff ≥1 feature for this project.
      zones: inProject(permacultureZones, projectId).length > 0,
      water:
        inProject(watercourses, projectId).length > 0 ||
        inProject(waterbodies, projectId).length > 0,
      builtEnvironment:
        buildings.length > 0 ||
        wells.length > 0 ||
        septics.length > 0 ||
        powerLines.length > 0 ||
        buriedUtilities.length > 0 ||
        fences.length > 0 ||
        gates.length > 0 ||
        existingDriveways.length > 0,
      observeAnnotations,
      zoneRings: projectZones.some((z) => z.permacultureZone === 0),
      seededZones: projectZones.some((z) => z.seedProvenance === 'ring-seed'),
      placedZones: projectZones.some(
        (z) => !z.seedProvenance || z.seedProvenance === 'manual',
      ),
      scheduledMoves: moves.some(
        (m) =>
          m.projectId === projectId &&
          !m.fulfilledByEventId &&
          (m.toPaddockId != null || m.toStructureId != null),
      ),
      waterRouter: (landDesignByProject[projectId]?.length ?? 0) > 0,
      slopeSurvey: Object.keys(slopeByProject[projectId] ?? {}).length > 0,
      vegetationSurvey: Object.keys(vegSurveyByProject[projectId] ?? {}).length > 0,
      receptionSurvey:
        Object.keys(hydrologyByProject[projectId] ?? {}).length > 0 ||
        Object.keys(soilByProject[projectId] ?? {}).length > 0 ||
        Object.keys(nutrientByProject[projectId] ?? {}).length > 0 ||
        Object.keys(pestByProject[projectId] ?? {}).length > 0 ||
        Object.keys(stockWaterByProject[projectId] ?? {}).length > 0,
    };
  }, [
    projectId,
    hazards,
    neighbours,
    households,
    accessRoads,
    permacultureZones,
    watercourses,
    waterbodies,
    buildings,
    wells,
    septics,
    powerLines,
    buriedUtilities,
    fences,
    gates,
    existingDriveways,
    vegetationPatches,
    pastures,
    conventionalCrops,
    swot,
    soilSamples,
    verificationZones,
    zones,
    moves,
    landDesignByProject,
    slopeByProject,
    vegSurveyByProject,
    hydrologyByProject,
    soilByProject,
    nutrientByProject,
    pestByProject,
    stockWaterByProject,
  ]);
}
