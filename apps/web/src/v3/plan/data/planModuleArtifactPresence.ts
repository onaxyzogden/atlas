/**
 * planModuleArtifactPresence — per-module "has the steward drawn / placed
 * any artifacts on the map for this module?" hook, used by the
 * project-type cross-check chip on Plan module GuidanceCards.
 *
 * Two modules have no spatial artifacts and always return false:
 *   - dynamic-layering    (Yeomans ranking metadata, not drawables)
 *   - cross-section-solar (vertical transect editor, not on the map)
 *
 * `principle-verification` was previously in this list, but Tier B / B5
 * gives it a spatial complement: ecological notes (asset / hazard /
 * indicator-species / rest-point / disturbed-ground markers). Tier B /
 * B4 adds a second spatial credit-source — monitoring transects (the
 * walking lines for invasives / indicator species / soil / water /
 * wildlife observation, on weekly to yearly cadence). The Holmgren
 * checklist remains non-spatial; notes OR transects flip the module
 * green.
 *
 * Project-type items that target one of the always-false modules should
 * declare their dependency via how-check `indexes` only —
 * `requiresArtifacts: true` is meaningless there and would always trip
 * the chip.
 *
 * All store subscriptions are unconditional (Rules of Hooks); the switch
 * just picks which slice to return. Per-store selectors return booleans
 * so referential identity is stable across renders without shallow
 * equality.
 */

import { useWaterSystemsStore } from '../../../store/waterSystemsStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { usePathStore } from '../../../store/pathStore.js';
import { useAllStructures } from '../../../store/builtEnvironmentSelectors.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import { usePolycultureStore } from '../../../store/polycultureStore.js';
import { useClosedLoopStore } from '../../../store/closedLoopStore.js';
import { usePhaseStore } from '../../../store/phaseStore.js';
import { useEcologicalNoteStore } from '../../../store/ecologicalNoteStore.js';
import { useMonitoringTransectStore } from '../../../store/monitoringTransectStore.js';
import type { PlanModule } from '../types.js';

export function usePlanModuleArtifactPresence(
  module: PlanModule,
  projectId: string | null,
): boolean {
  const hasWaterArtifacts = useWaterSystemsStore((s) =>
    projectId
      ? s.earthworks.some((e) => e.projectId === projectId) ||
        s.storageInfra.some((x) => x.projectId === projectId) ||
        s.waterNodes.some((n) => n.projectId === projectId) ||
        s.watercourses.some((w) => w.projectId === projectId)
      : false,
  );

  const hasZones = useZoneStore((s) =>
    projectId ? s.zones.some((z) => z.projectId === projectId) : false,
  );

  const hasPaths = usePathStore((s) =>
    projectId ? s.paths.some((p) => p.projectId === projectId) : false,
  );

  const allStructures = useAllStructures();
  const hasStructures = projectId
    ? allStructures.some((st) => st.projectId === projectId)
    : false;

  const hasPaddocks = useLivestockStore((s) =>
    projectId ? s.paddocks.some((p) => p.projectId === projectId) : false,
  );

  const hasCropAreas = useCropStore((s) =>
    projectId ? s.cropAreas.some((c) => c.projectId === projectId) : false,
  );

  const hasGuilds = usePolycultureStore((s) =>
    projectId ? s.guilds.some((g) => g.projectId === projectId) : false,
  );

  const hasFertilityInfra = useClosedLoopStore((s) =>
    projectId
      ? s.fertilityInfra.some((f) => f.projectId === projectId)
      : false,
  );

  const hasPhases = usePhaseStore((s) =>
    projectId ? s.phases.some((p) => p.projectId === projectId) : false,
  );

  const hasNotes = useEcologicalNoteStore((s) =>
    projectId ? s.notes.some((n) => n.projectId === projectId) : false,
  );

  const hasTransects = useMonitoringTransectStore((s) =>
    projectId
      ? s.transects.some((t) => t.projectId === projectId)
      : false,
  );

  switch (module) {
    case 'water-management':
      return hasWaterArtifacts;
    case 'zone-circulation':
      return hasZones || hasPaths;
    case 'structures-subsystems':
      return hasStructures;
    case 'machinery':
      return hasStructures;
    case 'livestock':
      return hasPaddocks;
    case 'plant-systems':
      return hasCropAreas || hasGuilds;
    case 'soil-fertility':
      return hasFertilityInfra;
    case 'phasing-budgeting':
      return hasPhases;
    case 'principle-verification':
      return hasNotes || hasTransects;
    case 'dynamic-layering':
    case 'cross-section-solar':
      return false;
    default: {
      const _exhaustive: never = module;
      void _exhaustive;
      return false;
    }
  }
}
