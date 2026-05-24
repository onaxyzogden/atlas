/**
 * useEvidenceCounts — per-domain field-record tallies for the Command Centre.
 *
 * The seven Observe annotation stores are flat (active-project) zustand stores
 * whose records each carry a `projectId`; the module dashboards filter on it and
 * so do we. This hook sums those records per domain so both the Evidence Library
 * panel (counts) and the Gaps panel (zero-coverage heuristic) read from one
 * place. Counts only — the records themselves live on each module's surface.
 */

import { useMemo } from 'react';
import { useExternalForcesStore } from '../../store/externalForcesStore.js';
import { useTopographyStore } from '../../store/topographyStore.js';
import { useEcologyStore } from '../../store/ecologyStore.js';
import { useWaterSystemsStore } from '../../store/waterSystemsStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { useClosedLoopStore } from '../../store/closedLoopStore.js';
import { useSwotStore } from '../../store/swotStore.js';

export interface EvidenceRow {
  label: string;
  n: number;
}

interface WithProject {
  projectId: string;
}

export function useEvidenceCounts(projectId: string): EvidenceRow[] {
  // Select the record arrays directly (not derived counts) so each selector is
  // referentially stable across unrelated store writes.
  const hazards = useExternalForcesStore((s) => s.hazards);
  const sectors = useExternalForcesStore((s) => s.sectors);
  const transects = useTopographyStore((s) => s.transects);
  const contours = useTopographyStore((s) => s.contours);
  const highPoints = useTopographyStore((s) => s.highPoints);
  const drainageLines = useTopographyStore((s) => s.drainageLines);
  const ecology = useEcologyStore((s) => s.ecology);
  const earthworks = useWaterSystemsStore((s) => s.earthworks);
  const storageInfra = useWaterSystemsStore((s) => s.storageInfra);
  const watercourses = useWaterSystemsStore((s) => s.watercourses);
  const waterbodies = useWaterSystemsStore((s) => s.waterbodies);
  const waterNodes = useWaterSystemsStore((s) => s.waterNodes);
  const guilds = usePolycultureStore((s) => s.guilds);
  const species = usePolycultureStore((s) => s.species);
  const materialFlows = useClosedLoopStore((s) => s.materialFlows);
  const wasteVectorRuns = useClosedLoopStore((s) => s.wasteVectorRuns);
  const fertilityInfra = useClosedLoopStore((s) => s.fertilityInfra);
  const swot = useSwotStore((s) => s.swot);

  return useMemo(() => {
    const count = (...arrays: WithProject[][]) =>
      arrays.reduce(
        (sum, arr) => sum + arr.filter((x) => x.projectId === projectId).length,
        0,
      );
    return [
      { label: 'Hazards & external forces', n: count(hazards, sectors) },
      {
        label: 'Topography (transects, contours, points)',
        n: count(transects, contours, highPoints, drainageLines),
      },
      { label: 'Ecology observations', n: count(ecology) },
      {
        label: 'Water systems',
        n: count(earthworks, storageInfra, watercourses, waterbodies, waterNodes),
      },
      { label: 'Polyculture guilds & species', n: count(guilds, species) },
      {
        label: 'Material flows & fertility',
        n: count(materialFlows, wasteVectorRuns, fertilityInfra),
      },
      { label: 'SWOT entries', n: count(swot) },
    ];
  }, [
    projectId,
    hazards,
    sectors,
    transects,
    contours,
    highPoints,
    drainageLines,
    ecology,
    earthworks,
    storageInfra,
    watercourses,
    waterbodies,
    waterNodes,
    guilds,
    species,
    materialFlows,
    wasteVectorRuns,
    fertilityInfra,
    swot,
  ]);
}
