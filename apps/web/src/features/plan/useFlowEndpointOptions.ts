/**
 * useFlowEndpointOptions — the shared endpoint picker source for material
 * flows (#59). Both the list authoring tool (`WasteVectorTool`) and the
 * canvas tool (`FlowConnectorTool`) consume this so a flow can be pinned to
 * the same set of structured features regardless of how it was created.
 *
 * Extends the original `WasteVectorTool.featureOptions` set (zones /
 * structures / crops / fertility) with livestock paddocks, water-system
 * earthworks & storage, and plant guilds — the endpoints a regenerative
 * closed loop actually routes between.
 */

import { useMemo } from 'react';
import { useZoneStore } from '../../store/zoneStore.js';
import { useAllStructures } from '../../store/builtEnvironmentSelectors.js';
import { useCropStore } from '../../store/cropStore.js';
import { useClosedLoopStore } from '../../store/closedLoopStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useWaterSystemsStore } from '../../store/waterSystemsStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';

export type FlowEndpointKind =
  | 'zone'
  | 'structure'
  | 'crop'
  | 'fertility'
  | 'paddock'
  | 'water'
  | 'guild';

export interface FlowEndpointOption {
  id: string;
  label: string;
  kind: FlowEndpointKind;
}

export function useFlowEndpointOptions(projectId: string): FlowEndpointOption[] {
  const allZones = useZoneStore((s) => s.zones);
  const allStructures = useAllStructures();
  const allCrops = useCropStore((s) => s.cropAreas);
  const allFertility = useClosedLoopStore((s) => s.fertilityInfra);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allEarthworks = useWaterSystemsStore((s) => s.earthworks);
  const allStorage = useWaterSystemsStore((s) => s.storageInfra);
  const allGuilds = usePolycultureStore((s) => s.guilds);

  return useMemo(() => {
    const out: FlowEndpointOption[] = [];
    for (const z of allZones)
      if (z.projectId === projectId)
        out.push({ id: z.id, label: `Zone · ${z.name || z.category}`, kind: 'zone' });
    for (const s of allStructures)
      if (s.projectId === projectId)
        out.push({ id: s.id, label: `Structure · ${s.name || s.type}`, kind: 'structure' });
    for (const c of allCrops)
      if (c.projectId === projectId)
        out.push({
          id: c.id,
          label: `Crop · ${(c as { name?: string }).name ?? 'crop area'}`,
          kind: 'crop',
        });
    for (const f of allFertility)
      if (f.projectId === projectId)
        out.push({
          id: f.id,
          label: `Fertility · ${f.type}${f.scaleNote ? ` (${f.scaleNote})` : ''}`,
          kind: 'fertility',
        });
    for (const p of allPaddocks)
      if (p.projectId === projectId)
        out.push({ id: p.id, label: `Paddock · ${p.name || 'paddock'}`, kind: 'paddock' });
    for (const e of allEarthworks)
      if (e.projectId === projectId)
        out.push({ id: e.id, label: `Water · ${e.type}`, kind: 'water' });
    for (const st of allStorage)
      if (st.projectId === projectId)
        out.push({ id: st.id, label: `Water · ${st.type}`, kind: 'water' });
    for (const g of allGuilds)
      if (g.projectId === projectId)
        out.push({ id: g.id, label: `Guild · ${g.name || 'guild'}`, kind: 'guild' });
    return out;
  }, [
    projectId,
    allZones,
    allStructures,
    allCrops,
    allFertility,
    allPaddocks,
    allEarthworks,
    allStorage,
    allGuilds,
  ]);
}
