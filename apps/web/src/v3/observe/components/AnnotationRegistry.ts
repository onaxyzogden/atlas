/**
 * AnnotationRegistry — non-React adapter that turns each namespace store's
 * shape into a uniform `AnnotationRow` for unified dashboard lists.
 *
 * For every `AnnotationKind` registered in `FIELD_SCHEMAS`, the registry
 * exposes:
 *   - `selectRows(state, kind, projectId)`  — read-side row list
 *   - `getRow(kind, id)`                    — single-record lookup
 *   - `remove(kind, id)`                    — destructive call into the
 *                                             owning store
 *
 * Dashboards subscribe via `useAnnotationsForKinds(kinds, projectId)` which
 * subscribes to each owning store, then derives + sorts in a `useMemo` —
 * matching ADR 2026-04-26's selector discipline (subscribe-then-derive).
 */

import { useMemo } from 'react';
import { useHumanContextStore } from '../../../store/humanContextStore.js';
import { useTopographyStore } from '../../../store/topographyStore.js';
import { useExternalForcesStore } from '../../../store/externalForcesStore.js';
import { useWaterSystemsStore } from '../../../store/waterSystemsStore.js';
import { useEcologyStore } from '../../../store/ecologyStore.js';
import { useSwotStore } from '../../../store/swotStore.js';
import { useSoilSampleStore } from '../../../store/soilSampleStore.js';
import { useBuiltEnvironmentStore } from '../../../store/builtEnvironmentStore.js';
import type { AnnotationKind } from './draw/annotationFieldSchemas.js';

/**
 * Stable display row for any kind. Each dashboard list and the
 * `AnnotationDetailPanel` consume this shape regardless of underlying store.
 */
export interface AnnotationRow {
  kind: AnnotationKind;
  id: string;
  /** Single-line title — "Frost pocket", "Soil sample: North paddock". */
  title: string;
  /** Sub-line meta — kind label + key fields. */
  subtitle?: string;
  /** ISO timestamp used for sorting. Falls back to record `createdAt`. */
  createdAt: string;
}

/** Display name for each kind. */
export const KIND_LABELS: Record<AnnotationKind, string> = {
  neighbourPin: 'Neighbour',
  household: 'Steward',
  accessRoad: 'Access road',
  frostPocket: 'Frost pocket',
  hazardZone: 'Hazard zone',
  contourLine: 'Contour',
  highPoint: 'Elevation point',
  drainageLine: 'Drainage line',
  watercourse: 'Watercourse',
  ecologyZone: 'Ecology zone',
  soilSample: 'Soil sample',
  swotTag: 'SWOT tag',
  sector: 'Sector',
  building: 'Building',
  well: 'Well',
  septic: 'Septic / leach field',
  powerLine: 'Power line',
  buriedUtility: 'Buried utility',
  fence: 'Fence',
  gate: 'Gate',
  existingDriveway: 'Driveway',
};

export const SECTOR_TYPE_LABELS: Record<string, string> = {
  sun_summer: 'Summer sun',
  sun_winter: 'Winter sun',
  wind_prevailing: 'Prevailing wind',
  wind_storm: 'Storm wind',
  fire: 'Fire',
  noise: 'Noise',
  wildlife: 'Wildlife',
  view: 'View',
};

// ─── Row builders ──────────────────────────────────────────────────────

function rowsForKind(kind: AnnotationKind, projectId: string): AnnotationRow[] {
  switch (kind) {
    case 'neighbourPin': {
      return useHumanContextStore
        .getState()
        .neighbours.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.label || 'Neighbour',
          subtitle: r.notes || undefined,
          createdAt: r.createdAt,
        }));
    }
    case 'household': {
      return useHumanContextStore
        .getState()
        .households.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.label || 'Household',
          subtitle:
            r.householdSize !== undefined
              ? `Household size: ${r.householdSize}`
              : r.notes || undefined,
          createdAt: r.createdAt,
        }));
    }
    case 'accessRoad': {
      return useHumanContextStore
        .getState()
        .accessRoads.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: `${r.kind.charAt(0).toUpperCase()}${r.kind.slice(1)} road`,
          subtitle: r.notes || undefined,
          createdAt: r.createdAt,
        }));
    }
    case 'frostPocket':
    case 'hazardZone': {
      const wantsFrost = kind === 'frostPocket';
      return useExternalForcesStore
        .getState()
        .hazards.filter(
          (r) =>
            r.projectId === projectId &&
            (wantsFrost ? r.type === 'frost' : r.type !== 'frost'),
        )
        .map((r) => ({
          kind,
          id: r.id,
          title: wantsFrost ? 'Frost pocket' : `${r.type} zone`,
          subtitle: `${r.severity ?? 'med'} · ${r.date}${r.description ? ` · ${r.description}` : ''}`,
          createdAt: r.createdAt,
        }));
    }
    case 'contourLine': {
      return useTopographyStore
        .getState()
        .contours.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.elevationM !== undefined ? `${r.elevationM} m contour` : 'Contour',
          subtitle: r.notes || undefined,
          createdAt: r.createdAt,
        }));
    }
    case 'highPoint': {
      return useTopographyStore
        .getState()
        .highPoints.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.label || (r.kind === 'high' ? 'High point' : 'Low point'),
          subtitle: r.kind === 'high' ? 'Highest elevation' : 'Lowest elevation',
          createdAt: r.createdAt,
        }));
    }
    case 'drainageLine': {
      return useTopographyStore
        .getState()
        .drainageLines.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: 'Drainage line',
          subtitle: r.notes || undefined,
          createdAt: r.createdAt,
        }));
    }
    case 'watercourse': {
      return useWaterSystemsStore
        .getState()
        .watercourses.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: `${r.kind.charAt(0).toUpperCase()}${r.kind.slice(1)}`,
          subtitle: `${r.perennial ? 'Perennial' : 'Seasonal'}${r.notes ? ` · ${r.notes}` : ''}`,
          createdAt: r.createdAt,
        }));
    }
    case 'ecologyZone': {
      return useEcologyStore
        .getState()
        .ecologyZones.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.label || 'Ecology zone',
          subtitle: `Stage: ${r.dominantStage}${r.notes ? ` · ${r.notes}` : ''}`,
          createdAt: r.createdAt,
        }));
    }
    case 'soilSample': {
      return useSoilSampleStore
        .getState()
        .samples.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.label || 'Soil sample',
          subtitle: `${r.sampleDate} · ${r.depth}${r.ph !== null ? ` · pH ${r.ph}` : ''}`,
          createdAt: r.createdAt,
        }));
    }
    case 'swotTag': {
      return useSwotStore
        .getState()
        .swot.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.title || 'SWOT tag',
          subtitle: `${r.bucket}${r.body ? ` · ${r.body}` : ''}`,
          createdAt: r.createdAt,
        }));
    }
    case 'sector': {
      return useExternalForcesStore
        .getState()
        .sectors.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: SECTOR_TYPE_LABELS[r.type] ?? 'Sector',
          subtitle: `${Math.round(r.bearingDeg)}° · arc ${Math.round(r.arcDeg)}°${r.intensity ? ` · ${r.intensity}` : ''}`,
          // SectorArrow has no createdAt — use id as a stable sort key.
          createdAt: r.id,
        }));
    }
    case 'building': {
      return useBuiltEnvironmentStore
        .getState()
        .buildings.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.label || 'Building',
          subtitle: `${r.subtype}${r.notes ? ` · ${r.notes}` : ''}`,
          createdAt: r.createdAt,
        }));
    }
    case 'well': {
      return useBuiltEnvironmentStore
        .getState()
        .wells.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.label || 'Well',
          subtitle: `${r.kind}${r.depthM !== undefined ? ` · ${r.depthM} m` : ''}${r.flowLpm !== undefined ? ` · ${r.flowLpm} L/min` : ''}`,
          createdAt: r.createdAt,
        }));
    }
    case 'septic': {
      return useBuiltEnvironmentStore
        .getState()
        .septics.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.label || 'Septic',
          subtitle: r.kind,
          createdAt: r.createdAt,
        }));
    }
    case 'powerLine': {
      return useBuiltEnvironmentStore
        .getState()
        .powerLines.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.label || 'Power line',
          subtitle: `${r.placement} · ${Math.round(r.lengthM)} m`,
          createdAt: r.createdAt,
        }));
    }
    case 'buriedUtility': {
      return useBuiltEnvironmentStore
        .getState()
        .buriedUtilities.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.label || 'Buried utility',
          subtitle: `${r.kind} · ${Math.round(r.lengthM)} m`,
          createdAt: r.createdAt,
        }));
    }
    case 'fence': {
      return useBuiltEnvironmentStore
        .getState()
        .fences.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.label || 'Fence',
          subtitle: `${r.kind} · ${Math.round(r.lengthM)} m`,
          createdAt: r.createdAt,
        }));
    }
    case 'gate': {
      return useBuiltEnvironmentStore
        .getState()
        .gates.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.label || 'Gate',
          subtitle: r.notes || undefined,
          createdAt: r.createdAt,
        }));
    }
    case 'existingDriveway': {
      return useBuiltEnvironmentStore
        .getState()
        .existingDriveways.filter((r) => r.projectId === projectId)
        .map((r) => ({
          kind,
          id: r.id,
          title: r.label || 'Driveway',
          subtitle: `${r.surface} · ${Math.round(r.lengthM)} m`,
          createdAt: r.createdAt,
        }));
    }
  }
}

/**
 * `useAnnotationsForKinds` — subscribes to all referenced stores so the
 * derived list re-renders on add/update/remove. `useMemo` keys on the
 * subscription tuple, so identity is stable when nothing changed.
 */
export function useAnnotationsForKinds(
  kinds: AnnotationKind[],
  projectId: string | null,
): AnnotationRow[] {
  // Subscribe broadly to guarantee re-render on any owning-store change.
  const neighbours = useHumanContextStore((s) => s.neighbours);
  const households = useHumanContextStore((s) => s.households);
  const accessRoads = useHumanContextStore((s) => s.accessRoads);
  const hazards = useExternalForcesStore((s) => s.hazards);
  const sectors = useExternalForcesStore((s) => s.sectors);
  const contours = useTopographyStore((s) => s.contours);
  const highPoints = useTopographyStore((s) => s.highPoints);
  const drainageLines = useTopographyStore((s) => s.drainageLines);
  const watercourses = useWaterSystemsStore((s) => s.watercourses);
  const ecologyZones = useEcologyStore((s) => s.ecologyZones);
  const samples = useSoilSampleStore((s) => s.samples);
  const swot = useSwotStore((s) => s.swot);
  const buildings = useBuiltEnvironmentStore((s) => s.buildings);
  const wells = useBuiltEnvironmentStore((s) => s.wells);
  const septics = useBuiltEnvironmentStore((s) => s.septics);
  const powerLines = useBuiltEnvironmentStore((s) => s.powerLines);
  const buriedUtilities = useBuiltEnvironmentStore((s) => s.buriedUtilities);
  const fences = useBuiltEnvironmentStore((s) => s.fences);
  const gates = useBuiltEnvironmentStore((s) => s.gates);
  const existingDriveways = useBuiltEnvironmentStore((s) => s.existingDriveways);

  return useMemo(() => {
    if (!projectId) return [];
    const all: AnnotationRow[] = [];
    for (const kind of kinds) {
      all.push(...rowsForKind(kind, projectId));
    }
    return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    kinds.join(','),
    projectId,
    neighbours,
    households,
    accessRoads,
    hazards,
    sectors,
    contours,
    highPoints,
    drainageLines,
    watercourses,
    ecologyZones,
    samples,
    swot,
    buildings,
    wells,
    septics,
    powerLines,
    buriedUtilities,
    fences,
    gates,
    existingDriveways,
  ]);
}

/** Single-record fetch — used by the detail panel and edit affordance. */
export function getAnnotationRow(
  kind: AnnotationKind,
  id: string,
): AnnotationRow | null {
  switch (kind) {
    case 'neighbourPin': {
      const r = useHumanContextStore.getState().neighbours.find((x) => x.id === id);
      if (!r) return null;
      return {
        kind,
        id,
        title: r.label || 'Neighbour',
        subtitle: r.notes,
        createdAt: r.createdAt,
      };
    }
    case 'household': {
      const r = useHumanContextStore.getState().households.find((x) => x.id === id);
      if (!r) return null;
      return {
        kind,
        id,
        title: r.label || 'Household',
        subtitle: r.notes,
        createdAt: r.createdAt,
      };
    }
    case 'accessRoad': {
      const r = useHumanContextStore.getState().accessRoads.find((x) => x.id === id);
      if (!r) return null;
      return {
        kind,
        id,
        title: `${r.kind} road`,
        subtitle: r.notes,
        createdAt: r.createdAt,
      };
    }
    case 'frostPocket':
    case 'hazardZone': {
      const r = useExternalForcesStore.getState().hazards.find((x) => x.id === id);
      if (!r) return null;
      return {
        kind,
        id,
        title: r.type === 'frost' ? 'Frost pocket' : `${r.type} zone`,
        subtitle: r.description,
        createdAt: r.createdAt,
      };
    }
    case 'contourLine': {
      const r = useTopographyStore.getState().contours.find((x) => x.id === id);
      if (!r) return null;
      return {
        kind,
        id,
        title: r.elevationM !== undefined ? `${r.elevationM} m contour` : 'Contour',
        subtitle: r.notes,
        createdAt: r.createdAt,
      };
    }
    case 'highPoint': {
      const r = useTopographyStore.getState().highPoints.find((x) => x.id === id);
      if (!r) return null;
      return {
        kind,
        id,
        title: r.label || (r.kind === 'high' ? 'High point' : 'Low point'),
        subtitle: r.notes,
        createdAt: r.createdAt,
      };
    }
    case 'drainageLine': {
      const r = useTopographyStore.getState().drainageLines.find((x) => x.id === id);
      if (!r) return null;
      return {
        kind,
        id,
        title: 'Drainage line',
        subtitle: r.notes,
        createdAt: r.createdAt,
      };
    }
    case 'watercourse': {
      const r = useWaterSystemsStore.getState().watercourses.find((x) => x.id === id);
      if (!r) return null;
      return {
        kind,
        id,
        title: r.kind,
        subtitle: r.notes,
        createdAt: r.createdAt,
      };
    }
    case 'ecologyZone': {
      const r = useEcologyStore.getState().ecologyZones.find((x) => x.id === id);
      if (!r) return null;
      return {
        kind,
        id,
        title: r.label || 'Ecology zone',
        subtitle: r.notes,
        createdAt: r.createdAt,
      };
    }
    case 'soilSample': {
      const r = useSoilSampleStore.getState().samples.find((x) => x.id === id);
      if (!r) return null;
      return {
        kind,
        id,
        title: r.label,
        subtitle: r.notes,
        createdAt: r.createdAt,
      };
    }
    case 'swotTag': {
      const r = useSwotStore.getState().swot.find((x) => x.id === id);
      if (!r) return null;
      return {
        kind,
        id,
        title: r.title,
        subtitle: r.body,
        createdAt: r.createdAt,
      };
    }
    case 'sector': {
      const r = useExternalForcesStore.getState().sectors.find((x) => x.id === id);
      if (!r) return null;
      return {
        kind,
        id,
        title: SECTOR_TYPE_LABELS[r.type] ?? 'Sector',
        subtitle: `${Math.round(r.bearingDeg)}° · arc ${Math.round(r.arcDeg)}°${r.intensity ? ` · ${r.intensity}` : ''}`,
        createdAt: r.id,
      };
    }
    case 'building': {
      const r = useBuiltEnvironmentStore.getState().buildings.find((x) => x.id === id);
      if (!r) return null;
      return { kind, id, title: r.label || 'Building', subtitle: r.subtype, createdAt: r.createdAt };
    }
    case 'well': {
      const r = useBuiltEnvironmentStore.getState().wells.find((x) => x.id === id);
      if (!r) return null;
      return { kind, id, title: r.label || 'Well', subtitle: r.kind, createdAt: r.createdAt };
    }
    case 'septic': {
      const r = useBuiltEnvironmentStore.getState().septics.find((x) => x.id === id);
      if (!r) return null;
      return { kind, id, title: r.label || 'Septic', subtitle: r.kind, createdAt: r.createdAt };
    }
    case 'powerLine': {
      const r = useBuiltEnvironmentStore.getState().powerLines.find((x) => x.id === id);
      if (!r) return null;
      return { kind, id, title: r.label || 'Power line', subtitle: r.placement, createdAt: r.createdAt };
    }
    case 'buriedUtility': {
      const r = useBuiltEnvironmentStore.getState().buriedUtilities.find((x) => x.id === id);
      if (!r) return null;
      return { kind, id, title: r.label || 'Buried utility', subtitle: r.kind, createdAt: r.createdAt };
    }
    case 'fence': {
      const r = useBuiltEnvironmentStore.getState().fences.find((x) => x.id === id);
      if (!r) return null;
      return { kind, id, title: r.label || 'Fence', subtitle: r.kind, createdAt: r.createdAt };
    }
    case 'gate': {
      const r = useBuiltEnvironmentStore.getState().gates.find((x) => x.id === id);
      if (!r) return null;
      return { kind, id, title: r.label || 'Gate', subtitle: r.notes, createdAt: r.createdAt };
    }
    case 'existingDriveway': {
      const r = useBuiltEnvironmentStore.getState().existingDriveways.find((x) => x.id === id);
      if (!r) return null;
      return { kind, id, title: r.label || 'Driveway', subtitle: r.surface, createdAt: r.createdAt };
    }
  }
}

/** Remove dispatcher — routes to the owning store's delete action. */
export function removeAnnotation(kind: AnnotationKind, id: string): void {
  switch (kind) {
    case 'neighbourPin':
      useHumanContextStore.getState().removeNeighbour(id);
      return;
    case 'household':
      useHumanContextStore.getState().removeHousehold(id);
      return;
    case 'accessRoad':
      useHumanContextStore.getState().removeAccessRoad(id);
      return;
    case 'frostPocket':
    case 'hazardZone':
      useExternalForcesStore.getState().removeHazard(id);
      return;
    case 'contourLine':
      useTopographyStore.getState().removeContour(id);
      return;
    case 'highPoint':
      useTopographyStore.getState().removeHighPoint(id);
      return;
    case 'drainageLine':
      useTopographyStore.getState().removeDrainageLine(id);
      return;
    case 'watercourse':
      useWaterSystemsStore.getState().removeWatercourse(id);
      return;
    case 'ecologyZone':
      useEcologyStore.getState().removeEcologyZone(id);
      return;
    case 'soilSample':
      useSoilSampleStore.getState().deleteSample(id);
      return;
    case 'swotTag':
      useSwotStore.getState().removeSwot(id);
      return;
    case 'sector':
      useExternalForcesStore.getState().removeSector(id);
      return;
    case 'building':
      useBuiltEnvironmentStore.getState().removeBuilding(id);
      return;
    case 'well':
      useBuiltEnvironmentStore.getState().removeWell(id);
      return;
    case 'septic':
      useBuiltEnvironmentStore.getState().removeSeptic(id);
      return;
    case 'powerLine':
      useBuiltEnvironmentStore.getState().removePowerLine(id);
      return;
    case 'buriedUtility':
      useBuiltEnvironmentStore.getState().removeBuriedUtility(id);
      return;
    case 'fence':
      useBuiltEnvironmentStore.getState().removeFence(id);
      return;
    case 'gate':
      useBuiltEnvironmentStore.getState().removeGate(id);
      return;
    case 'existingDriveway':
      useBuiltEnvironmentStore.getState().removeExistingDriveway(id);
      return;
  }
}
