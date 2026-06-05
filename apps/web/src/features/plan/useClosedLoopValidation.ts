/**
 * useClosedLoopValidation — the single source of truth for closed-loop
 * validation across Module 5.
 *
 * Extracted from `ClosedLoopGraphCard` (2026-05-22) so the card and the
 * `WasteVectorDashboardView` risks/interventions panels can never disagree on
 * orphan / dangling / isolated counts. The card keeps its own SVG layout,
 * legend and remedy copy; only the node-assembly + adjacency + validation
 * computation lives here.
 *
 * Selector-stability discipline (2026-04-26): every store is read as a raw
 * slice; project-filtering + aggregation happens in `useMemo` keyed on the raw
 * slices + `project.id`.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useClosedLoopStore } from '../../store/closedLoopStore.js';
import type { MaterialFlow } from '../../store/closedLoopStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useAllStructures } from '../../store/builtEnvironmentSelectors.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useWaterSystemsStore } from '../../store/waterSystemsStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { usePhaseStoreCappedEntities } from '../../v3/plan/usePhaseStoreCappedEntities.js';

export type ClosedLoopNodeKind =
  | 'zone'
  | 'structure'
  | 'crop'
  | 'fertility'
  | 'paddock'
  | 'water'
  | 'guild';

export interface ClosedLoopNode {
  id: string;
  label: string;
  kind: ClosedLoopNodeKind;
  /** [lng, lat] centroid when known, else null. */
  lngLat: [number, number] | null;
}

export interface ClosedLoopValidation {
  nodes: ClosedLoopNode[];
  vectors: MaterialFlow[];
  inDeg: Map<string, number>;
  outDeg: Map<string, number>;
  /** Fertility units with no flows in or out. */
  orphanFertility: ClosedLoopNode[];
  /** Fertility units with an outgoing flow but no incoming feedstock. */
  fertilityWithoutFeedstock: ClosedLoopNode[];
  /** Non-fertility features touched by no flow at all. */
  isolatedFeatures: ClosedLoopNode[];
}

/** Avg of all vertices across all rings — cheap centroid, fine for layout. */
function polygonCentroid(geom: GeoJSON.Polygon): [number, number] | null {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const ring of geom.coordinates) {
    for (const pt of ring) {
      sx += pt[0]!;
      sy += pt[1]!;
      n++;
    }
  }
  return n === 0 ? null : [sx / n, sy / n];
}

export function useClosedLoopValidation(project: LocalProject): ClosedLoopValidation {
  const allVectors = useClosedLoopStore((s) => s.materialFlows);
  const allFertility = useClosedLoopStore((s) => s.fertilityInfra);
  const allZones = useZoneStore((s) => s.zones);
  const allStructures = useAllStructures();
  const allCrops = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allEarthworks = useWaterSystemsStore((s) => s.earthworks);
  const allStorage = useWaterSystemsStore((s) => s.storageInfra);
  const allGuilds = usePolycultureStore((s) => s.guilds);

  // Fertility infra is the only phase-tagged entity here. Capped by the year
  // scrubber via the phaseStore→Yeomans adapter (matches ClosedLoopGraphCard).
  const fertilityRaw = useMemo(
    () => allFertility.filter((f) => f.projectId === project.id),
    [allFertility, project.id],
  );
  const fertility = usePhaseStoreCappedEntities(fertilityRaw);

  const { nodes, vectors } = useMemo(() => {
    const pId = project.id;
    const ns: ClosedLoopNode[] = [];
    for (const z of allZones) {
      if (z.projectId !== pId) continue;
      ns.push({ id: z.id, label: z.name || z.category, kind: 'zone', lngLat: polygonCentroid(z.geometry as GeoJSON.Polygon) });
    }
    for (const s of allStructures) {
      if (s.projectId !== pId) continue;
      ns.push({ id: s.id, label: s.name || s.type, kind: 'structure', lngLat: s.center ?? polygonCentroid(s.geometry) });
    }
    for (const c of allCrops) {
      if (c.projectId !== pId) continue;
      ns.push({ id: c.id, label: (c as { name?: string }).name ?? 'crop area', kind: 'crop', lngLat: polygonCentroid(c.geometry) });
    }
    for (const f of fertility) {
      ns.push({ id: f.id, label: `${f.type.replace(/_/g, ' ')}${f.scaleNote ? ` (${f.scaleNote})` : ''}`, kind: 'fertility', lngLat: f.center ?? null });
    }
    for (const p of allPaddocks) {
      if (p.projectId !== pId) continue;
      ns.push({ id: p.id, label: p.name || 'paddock', kind: 'paddock', lngLat: polygonCentroid(p.geometry) });
    }
    for (const e of allEarthworks) {
      if (e.projectId !== pId) continue;
      ns.push({ id: e.id, label: e.type.replace(/_/g, ' '), kind: 'water', lngLat: null });
    }
    for (const st of allStorage) {
      if (st.projectId !== pId) continue;
      ns.push({ id: st.id, label: st.type.replace(/_/g, ' '), kind: 'water', lngLat: st.center });
    }
    for (const g of allGuilds) {
      if (g.projectId !== pId) continue;
      ns.push({ id: g.id, label: g.name || 'guild', kind: 'guild', lngLat: null });
    }
    const vs = allVectors.filter((v) => v.projectId === pId);
    return { nodes: ns, vectors: vs };
  }, [project.id, allZones, allStructures, allCrops, fertility, allPaddocks, allEarthworks, allStorage, allGuilds, allVectors]);

  const inDeg = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of vectors) if (v.sinkId) m.set(v.sinkId, (m.get(v.sinkId) ?? 0) + 1);
    return m;
  }, [vectors]);
  const outDeg = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of vectors) if (v.sourceId) m.set(v.sourceId, (m.get(v.sourceId) ?? 0) + 1);
    return m;
  }, [vectors]);

  const orphanFertility = useMemo(
    () =>
      nodes.filter(
        (n) => n.kind === 'fertility' && (inDeg.get(n.id) ?? 0) === 0 && (outDeg.get(n.id) ?? 0) === 0,
      ),
    [nodes, inDeg, outDeg],
  );
  const isolatedFeatures = useMemo(
    () =>
      nodes.filter(
        (n) => n.kind !== 'fertility' && (inDeg.get(n.id) ?? 0) === 0 && (outDeg.get(n.id) ?? 0) === 0,
      ),
    [nodes, inDeg, outDeg],
  );
  const fertilityWithoutFeedstock = useMemo(
    () =>
      nodes.filter(
        (n) => n.kind === 'fertility' && (outDeg.get(n.id) ?? 0) > 0 && (inDeg.get(n.id) ?? 0) === 0,
      ),
    [nodes, inDeg, outDeg],
  );

  return { nodes, vectors, inDeg, outDeg, orphanFertility, fertilityWithoutFeedstock, isolatedFeatures };
}
