/**
 * usePrincipleEvidenceVisibleIds — set of feature IDs that count as
 * "visible evidence" at the active Plan view, for the Principles
 * Module 8 readout cards (ThreeEthicsRollupCard,
 * PrincipleCoverageMatrixCard).
 *
 * Reads the nine spatial stores referenced by the principle-check
 * feature picker, scopes each to the active project, then runs each
 * project-scoped slice through the `usePhaseStoreCappedEntities`
 * adapter so phase-tagged entities (waterNodes, paddocks,
 * fertilityInfra, etc.) drop out on `phase-1` / `phase-2` views when
 * their BuildPhase's `yeomansCap` exceeds the view cap.
 *
 * Entities whose store has no `phase?: string` field (zones, paths,
 * structures, transects, guilds, crops, ecology — observation /
 * spatial-design entities) pass through the adapter unchanged. This
 * matches Phase B's principle: *caps are presentational, not
 * data-deletion; the cap applies where a phase field exists, and
 * nowhere else*.
 *
 * Asymmetry: this set is consumed only by **readout** cards (rollup,
 * matrix, radar). The **registration** card (HolmgrenChecklistCard's
 * feature picker) stays uncapped — a steward must be able to link a
 * Year-5 paddock as evidence for P11 "use edges" even while viewing
 * Year 1, the same way WaterStorageCard's overflow-target dropdown
 * stays uncapped. See
 * `wiki/decisions/2026-05-12-plan-phasestore-yeomans-adapter.md`.
 */

import { useMemo } from 'react';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { usePathStore } from '../../../../store/pathStore.js';
import { useAllStructures } from '../../../../store/builtEnvironmentSelectors.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { usePolycultureStore } from '../../../../store/polycultureStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useCropStore } from '../../../../store/cropStore.js';
import { useClosedLoopStore } from '../../../../store/closedLoopStore.js';
import { useEcologyStore } from '../../../../store/ecologyStore.js';
import { usePhaseStoreCappedEntities } from '../../usePhaseStoreCappedEntities.js';

interface ProjectScoped {
  id: string;
  projectId: string;
  phase?: string | null;
}

function useCappedProjectSlice<T extends ProjectScoped>(
  entities: ReadonlyArray<T>,
  projectId: string,
): T[] {
  const scoped = useMemo(
    () => entities.filter((e) => e.projectId === projectId),
    [entities, projectId],
  );
  return usePhaseStoreCappedEntities(scoped);
}

export interface PrincipleEvidenceVisibleIds {
  /** Set of feature ids visible at the active Plan view. */
  visibleIds: Set<string>;
  /**
   * id → feature kind, restricted to visible ids. Used by the coverage
   * matrix to classify linked features into the 9 columns.
   */
  idToKind: Map<string, FeatureKind>;
}

export type FeatureKind =
  | 'zone'
  | 'path'
  | 'structure'
  | 'transect'
  | 'guild'
  | 'earthwork'
  | 'crop'
  | 'fertility'
  | 'ecology';

export function usePrincipleEvidenceVisibleIds(
  projectId: string,
): PrincipleEvidenceVisibleIds {
  const allZones = useZoneStore((s) => s.zones);
  const allPaths = usePathStore((s) => s.paths);
  const allStructures = useAllStructures();
  const allTransects = useTopographyStore((s) => s.transects);
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const allEarthworks = useWaterSystemsStore((s) => s.earthworks);
  const allCrops = useCropStore((s) => s.cropAreas);
  const allFertility = useClosedLoopStore((s) => s.fertilityInfra);
  const allEcology = useEcologyStore((s) => s.ecology);

  const zones      = useCappedProjectSlice(allZones      as ReadonlyArray<ProjectScoped>, projectId);
  const paths      = useCappedProjectSlice(allPaths      as ReadonlyArray<ProjectScoped>, projectId);
  const structures = useCappedProjectSlice(allStructures as ReadonlyArray<ProjectScoped>, projectId);
  const transects  = useCappedProjectSlice(allTransects  as ReadonlyArray<ProjectScoped>, projectId);
  const guilds     = useCappedProjectSlice(allGuilds     as ReadonlyArray<ProjectScoped>, projectId);
  const earthworks = useCappedProjectSlice(allEarthworks as ReadonlyArray<ProjectScoped>, projectId);
  const crops      = useCappedProjectSlice(allCrops      as ReadonlyArray<ProjectScoped>, projectId);
  const fertility  = useCappedProjectSlice(allFertility  as ReadonlyArray<ProjectScoped>, projectId);
  const ecology    = useCappedProjectSlice(allEcology    as ReadonlyArray<ProjectScoped>, projectId);

  return useMemo(() => {
    const idToKind = new Map<string, FeatureKind>();
    for (const z of zones)      idToKind.set(z.id, 'zone');
    for (const p of paths)      idToKind.set(p.id, 'path');
    for (const s of structures) idToKind.set(s.id, 'structure');
    for (const t of transects)  idToKind.set(t.id, 'transect');
    for (const g of guilds)     idToKind.set(g.id, 'guild');
    for (const e of earthworks) idToKind.set(e.id, 'earthwork');
    for (const c of crops)      idToKind.set(c.id, 'crop');
    for (const f of fertility)  idToKind.set(f.id, 'fertility');
    for (const o of ecology)    idToKind.set(o.id, 'ecology');
    return { visibleIds: new Set(idToKind.keys()), idToKind };
  }, [zones, paths, structures, transects, guilds, earthworks, crops, fertility, ecology]);
}
