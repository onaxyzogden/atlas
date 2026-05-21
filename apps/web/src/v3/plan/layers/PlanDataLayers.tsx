/**
 * PlanDataLayers — renders persisted Plan-stage features (water nodes, zones,
 * paths) as MapLibre layers on the Current Land map. Mirrors
 * `DesignElementLayers` but reads from the canonical Plan stores.
 *
 * Sources:
 *   - plan-poly       — polygons (catchments + zones)
 *   - plan-line       — lines (swales + paths)
 *   - plan-point      — points (storage + sink)
 *   - plan-label      — symbol labels (one per feature)
 */

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useWaterSystemsStore } from '../../../store/waterSystemsStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { usePathStore } from '../../../store/pathStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import { useClosedLoopStore } from '../../../store/closedLoopStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useAgribusinessStore } from '../../../store/agribusinessStore.js';
import { usePolycultureStore } from '../../../store/polycultureStore.js';
import {
  assignRingPositions,
  lonLatToMetresOffset,
  metresToLonLatOffset,
} from '../../../features/agroforestry/guildMemberPositions.js';
import { findSpecies } from '../../../data/plantCatalog.js';
import { LAYER_TINT } from '../cards/plant-systems/guildLayerOrder.js';
import {
  useAllStructures,
  getAllStructures,
  updateStructure,
  getDesignElementsForProject,
  useDesignElementsForProject,
} from '../../../store/builtEnvironmentSelectors.js';
import {
  resolveSilvopastureHosts,
  listHostsForSelection,
  resolveMembers,
} from '../../../features/agroforestry/silvopastureHosts.js';
import { hostCanopyUnion } from '../../../features/agroforestry/guildLivestockMath.js';
import {
  HostCanopyUnionTooltip,
  type HostBlockProps,
  type HostBlockEntry,
} from './HostCanopyUnionTooltip.js';

// A single host's block of tooltip data, plus the hostId used for
// click-toggle stack-equality unpin (not rendered). hostId is the
// stable identity used by the displayedUnion mirror to merge hover
// snapshots and decide which blocks are entering/exiting.
type HostBlock = HostBlockProps & { hostId: string };
import {
  useLayeringLensStore,
  RANK_COLOR,
} from '../../../store/layeringLensStore.js';
import { useEnterpriseStore } from '../../../store/enterpriseStore.js';
import { useMatrixTogglesStore } from '../../../store/matrixTogglesStore.js';
import { useEcologicalNoteStore } from '../../../store/ecologicalNoteStore.js';
import { useUtilityRunStore } from '../../../store/utilityRunStore.js';
import {
  useSetbackStore,
  type SetbackSourceKind,
} from '../../../store/setbackStore.js';
import { useMonitoringTransectStore } from '../../../store/monitoringTransectStore.js';
import { useFlowEndpointOptions } from '../../../features/plan/useFlowEndpointOptions.js';
import { bufferGeometry } from '../draw/tools/bufferGeometry.js';
import {
  usePlanSelectionStore,
  type PlanSelectionKind,
} from '../../../store/planSelectionStore.js';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import { useInlineFormStore } from '../draw/inlineFormStore.js';
import {
  STRUCTURE_TEMPLATES,
  createFootprintPolygon,
} from '../../../features/structures/footprints.js';
import type { StructureType } from '@ogden/shared';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import { translateByDelta } from './translateGeometry.js';
import { beginDragUndoWindow } from './dragUndo.js';
import { setCursorIntent } from '../canvas/mapCursorIntentStore.js';
import {
  buildZoneEditSchema,
  buildCropEditSchema,
  buildPaddockEditSchema,
  buildPathEditSchema,
  buildFertilityEditSchema,
  buildGuildEditSchema,
  buildWaterNodeEditSchema,
  buildUtilityRunEditSchema,
  buildSetbackRingEditSchema,
  buildFlowConnectorEditSchema,
  buildMonitoringTransectEditSchema,
} from './inlineEditSchemas.js';

/**
 * Resolve the silvopasture-host re-pin options for the inline edit
 * popover. Reads cropStore + design elements at call time so the option
 * list always reflects the current set of silvopasture polygons.
 */
function silvopastureHostOptions(projectId: string) {
  const cropAreas = useCropStore.getState().cropAreas;
  const designElements = getDesignElementsForProject(projectId);
  return listHostsForSelection(
    resolveSilvopastureHosts(projectId, cropAreas, designElements),
  );
}

interface Props {
  map: MaplibreMap;
  projectId: string;
  /**
   * When false, all drag-to-move handlers are no-ops — Plan geometry renders
   * read-only. Used by the Act stage, which mounts PlanDataLayers underneath
   * its own execution-event layers but must not allow Plan elements to be
   * relocated. Defaults to true (Plan stage behavior).
   */
  editable?: boolean;
}

const SOURCE_PREFIX = 'plan-data-';
const LAYER_PREFIX = 'plan-data-';

const WATER_COLOR: Record<string, string> = {
  catchment: '#5fc7d4',
  storage: '#3a8fb7',
  swale: '#7cb6c8',
  sink: '#205c7a',
};

// Fertility-infra palette: structural practices (composter / hugelkultur /
// biochar / worm_bin) sit on warm earth tones; biological practices
// (cover_crop / chop_and_drop / dynamic_accumulator / rotational_grazing)
// sit on greens. Yeomans rank 7 (Soil).
const FERTILITY_COLOR: Record<string, string> = {
  composter:           '#8a6a3a',
  hugelkultur:         '#6a4a28',
  biochar:             '#3a2a1a',
  worm_bin:            '#a07050',
  cover_crop:          '#7aae3c',
  chop_and_drop:       '#6b8b3d',
  dynamic_accumulator: '#9bc15a',
  rotational_grazing:  '#a8c97f',
};

const FERTILITY_LABEL: Record<string, string> = {
  composter:           'Composter',
  hugelkultur:         'Hugelkultur',
  biochar:             'Biochar',
  worm_bin:            'Worm bin',
  cover_crop:          'Cover crop',
  chop_and_drop:       'Chop & drop',
  dynamic_accumulator: 'Accumulator',
  rotational_grazing:  'Rot. grazing',
};

// Structure category palette. Dwellings on warm clay (rank-5 lens hue);
// utility/infra on cooler steel; agricultural on muted green-clay; civic
// gathering on amber. The Yeomans lens stamps rank 5 on every structure
// so the lens swap recolours all 20 types uniformly.
const STRUCTURE_COLOR: Record<string, string> = {
  cabin:            '#a06b48',
  yurt:             '#b07c4a',
  earthship:        '#8a6a3a',
  tent_glamping:    '#c08a5a',
  pavilion:         '#caa46c',
  classroom:        '#caa46c',
  prayer_space:     '#b58c5e',
  bathhouse:        '#9a8070',
  fire_circle:      '#a85a3a',
  lookout:          '#8a8270',
  greenhouse:       '#7aae3c',
  barn:             '#a07050',
  animal_shelter:   '#9b8a7a',
  workshop:         '#8a8270',
  storage:          '#7a7068',
  compost_station:  '#6a4a28',
  water_pump_house: '#3a8fb7',
  solar_array:      '#3a4a5c',
  well:             '#3a8fb7',
  water_tank:       '#5fc7d4',
};

/**
 * Build a MapLibre `match` expression that maps the per-feature
 * `yeomansRank` to a Yeomans-rank colour. Falls back to `color` if the
 * rank is missing (defensive — every plan-data feature now ships with a
 * rank).
 */
function rankColorExpr(): unknown {
  const branches: unknown[] = [];
  for (const [rank, color] of Object.entries(RANK_COLOR)) {
    branches.push(Number(rank), color);
  }
  return ['match', ['get', 'yeomansRank'], ...branches, ['get', 'color']];
}

/**
 * Build a MapLibre `match` expression that maps the per-feature
 * `enterprise` (id string) to that enterprise's colour. Untagged
 * features fall through to a neutral grey so they read as "no
 * enterprise yet" rather than vanishing or matching one by accident.
 */
const ENTERPRISE_UNTAGGED_COLOR = '#5a5550';
function enterpriseColorExpr(
  enterprises: ReadonlyArray<{ id: string; color: string }>,
): unknown {
  if (enterprises.length === 0) {
    // No enterprises defined yet — render everything neutral grey rather
    // than a confusing per-type palette. Signals "lens is on but you
    // haven't created enterprises yet".
    return ENTERPRISE_UNTAGGED_COLOR;
  }
  const branches: unknown[] = [];
  for (const e of enterprises) {
    branches.push(e.id, e.color);
  }
  // Use coalesce so missing `enterprise` resolves to '' (untagged) rather
  // than crashing the match.
  return [
    'match',
    ['coalesce', ['get', 'enterprise'], ''],
    ...branches,
    ENTERPRISE_UNTAGGED_COLOR,
  ];
}

export default function PlanDataLayers({ map, projectId, editable = true }: Props) {
  const waterNodes = useWaterSystemsStore((s) => s.waterNodes);
  const updateWaterNode = useWaterSystemsStore((s) => s.updateWaterNode);
  const zones = useZoneStore((s) => s.zones);
  const updateZone = useZoneStore((s) => s.updateZone);
  const paths = usePathStore((s) => s.paths);
  const updatePath = usePathStore((s) => s.updatePath);
  const cropAreas = useCropStore((s) => s.cropAreas);
  const updateCropArea = useCropStore((s) => s.updateCropArea);
  const fertilityInfra = useClosedLoopStore((s) => s.fertilityInfra);
  const updateFertilityInfra = useClosedLoopStore(
    (s) => s.updateFertilityInfra,
  );
  const paddocks = useLivestockStore((s) => s.paddocks);
  const updatePaddock = useLivestockStore((s) => s.updatePaddock);
  // Farm-Scholar (Newman) ADR 2026-05-10 — fence lines render on the shared
  // line source; mobility-keyed dasharray distinguishes permanent perimeters
  // from moveable temporary-strip wire.
  const fenceLines = useLivestockStore((s) => s.fenceLines);
  // Broiler Product Map (Module 7, ADR 2026-05-10) — post-farm-gate value
  // chain points. Three colour-coded kinds rendered on the shared
  // `plan-data-point` source: slaughter (red), cold-chain (blue),
  // market (green).
  const slaughterPoints = useAgribusinessStore((s) => s.slaughterPoints);
  const coldChainUnits = useAgribusinessStore((s) => s.coldChainUnits);
  const marketNodes = useAgribusinessStore((s) => s.marketNodes);
  const guilds = usePolycultureStore((s) => s.guilds);
  const updateGuild = usePolycultureStore((s) => s.updateGuild);
  const designElementsForProject = useDesignElementsForProject(projectId);
  // Hover state for the per-host canopy-union tooltip (minzoom 17). Set
  // from a mousemove on the `guild-host-canopy-union-fill` layer; cleared
  // on mouseleave. Rendered via a portal into `map.getCanvasContainer()`
  // so the cursor-anchored coordinates from `e.point` are in the same
  // pixel space the tooltip lives in. `entries` is the multi-feature
  // fan-out: every overlapping host at the cursor, deduped by hostId,
  // topmost first.
  const [hoveredUnion, setHoveredUnion] = useState<{
    point: { x: number; y: number };
    entries: HostBlock[];
  } | null>(null);
  // Pinned state for the same tooltip. Set by a click on the union
  // fill; cleared by a second click whose hostId set is identical to
  // the pinned stack's, or by ESC. While a union is pinned, transient
  // mousemove writes to `hoveredUnion` are suppressed so the pinned
  // read doesn't jitter. `hostIds` is the sorted set used for the
  // set-equality unpin check on click.
  const [pinnedUnion, setPinnedUnion] = useState<{
    point: { x: number; y: number };
    entries: HostBlock[];
    hostIds: string[];
  } | null>(null);
  // Display-lifetime mirror of `activeUnion = pinnedUnion ?? hoveredUnion`.
  // Holds the tooltip mounted through its exit-fade after activeUnion → null
  // so the CSS opacity transition has time to interpolate to 0.
  //
  // 2026-05-30 (Slice H) reshape: `entries` carry per-block phase so
  // when the active set changes mid-display (one host drops out while
  // others remain) only the dropped host fades. Container `phase`
  // remains for the full-dismiss case (activeUnion → null).
  //
  // The 2026-05-29 monotonic `key` is gone: CSS transitions interpolate
  // from the current computed value, so reverse-in-flight (re-enter
  // mid-exit) no longer needs a remount — flipping `exiting` from true
  // back to false naturally transitions opacity back to 1 from
  // wherever it is.
  const [displayedUnion, setDisplayedUnion] = useState<{
    point: { x: number; y: number };
    entries: HostBlockEntry[];
    phase: 'entering' | 'exiting';
  } | null>(null);
  const structures = useAllStructures();
  const ecologicalNotes = useEcologicalNoteStore((s) => s.notes);
  const utilityRuns = useUtilityRunStore((s) => s.runs);
  const updateUtilityRun = useUtilityRunStore((s) => s.updateRun);
  const setbackRings = useSetbackStore((s) => s.rings);
  const updateSetbackRing = useSetbackStore((s) => s.updateRing);
  const flowConnectors = useClosedLoopStore((s) => s.materialFlows);
  const updateFlowConnector = useClosedLoopStore((s) => s.updateMaterialFlow);
  const flowEndpointOptions = useFlowEndpointOptions(projectId);
  const monitoringTransects = useMonitoringTransectStore((s) => s.transects);
  const updateMonitoringTransect = useMonitoringTransectStore(
    (s) => s.updateTransect,
  );
  const activeTool = useMapToolStore((s) => s.activeTool);
  const openForm = useInlineFormStore((s) => s.open);
  const seededZonesVisible = useMatrixTogglesStore((s) => s.seededZones);
  const lensEnabled = useLayeringLensStore((s) => s.enabled);
  const lensMode = useLayeringLensStore((s) => s.mode);
  const allEnterprises = useEnterpriseStore((s) => s.enterprises);
  const enterprises = useMemo(
    () => allEnterprises.filter((e) => e.projectId === projectId),
    [allEnterprises, projectId],
  );
  const selectedItems = usePlanSelectionStore((s) => s.items);
  const setSelection = usePlanSelectionStore((s) => s.set);
  const selected = selectedItems[0] ?? null;
  const selectedGuildId =
    selected?.kind === 'guild' ? selected.id : null;
  const selectedMemberKey =
    selected?.kind === 'guild-member' && selected.memberIndex !== undefined
      ? `${selected.id}:${selected.memberIndex}`
      : null;

  const {
    polyFC,
    lineFC,
    pointFC,
    labelFC,
    setbackFC,
    flowFC,
    transectFC,
    conflictPointFC,
    conflictLineFC,
    memberPointFC,
    memberCanopyFC,
    hostCanopyUnionFC,
    hostCanopyUnionLabelFC,
  } = useMemo(() => {
    const polys: GeoJSON.Feature[] = [];
    const lines: GeoJSON.Feature[] = [];
    const points: GeoJSON.Feature[] = [];
    const labels: GeoJSON.Feature[] = [];
    const setbacks: GeoJSON.Feature[] = [];
    const flows: GeoJSON.Feature[] = [];
    const transects: GeoJSON.Feature[] = [];
    // Per-guild-member geometry — points (dots) + canopy disks (translucent).
    // Built downstream from the same `assignRingPositions` + `Guild.center`
    // pipeline the canopy-union math uses, so the on-parcel render and the
    // SilvopastureIntegrationCard read from one geometric source of truth.
    const memberPoints: GeoJSON.Feature[] = [];
    const memberCanopies: GeoJSON.Feature[] = [];
    // Per-host canopy-union polygons — one Polygon | MultiPolygon per
    // silvopasture host whose member guilds (resolved through pin or
    // spatial overlap) produce a non-null `hostCanopyUnion`. Renders as
    // a soft grey halo beneath the individual member disks so the steward
    // sees the aggregate footprint that `canopyDedupedM2` measures.
    const hostCanopyUnions: GeoJSON.Feature[] = [];
    // Parallel point-FC of per-host labels rendered above the union halo
    // at minzoom 17. `unionAreaLabel` is pre-formatted at the push site
    // (Math.round + " m²") so the symbol layer's `text-field` stays a
    // trivial `['get']` and rounding matches the tooltip + the
    // SilvopastureIntegrationCard verbatim.
    const hostCanopyUnionLabels: GeoJSON.Feature[] = [];
    // Utility-conflict hazard halos — earthwork WaterNodes that intersected
    // a buried utility at draw-time (see ADR 2026-05-10-plan-earthwork-
    // utility-veto). Rendered in `#c4422a` as a 4 px outline behind the
    // main water-node geometry so the conflict reads at a glance.
    const conflictPoints: GeoJSON.Feature[] = [];
    const conflictLines: GeoJSON.Feature[] = [];

    // Acreage helper (2026-05-11) — stamps `acresLabel` on polygon props
    // so the shared label symbol layer can suffix "— X.X ac" via a
    // `case`/`has` expression. Returns null when the geometry isn't a
    // polygon or turf can't compute area. 1 acre = 4046.8564224 m².
    const acresOf = (geom: GeoJSON.Geometry): string | null => {
      if (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon') return null;
      try {
        const m2 = turf.area(geom as GeoJSON.Polygon | GeoJSON.MultiPolygon);
        if (!Number.isFinite(m2) || m2 <= 0) return null;
        const ac = m2 / 4046.8564224;
        return ac >= 10 ? ac.toFixed(0) : ac.toFixed(1);
      } catch {
        return null;
      }
    };

    // Zones (polygon) — Yeomans rank 4 (Access; activity proximity).
    // Stack by permaculture Z-level: Z0 on top, Z5 at the bottom, regardless
    // of draw order. MapLibre renders later GeoJSON features on top, so we
    // sort descending. Undefined Z defaults to 2 (typical "main activity").
    const Z_DEFAULT = 2;
    const orderedZones = [...zones]
      .filter((z) => z.projectId === projectId)
      .filter((z) => !z.hidden)
      .sort(
        (a, b) =>
          (b.permacultureZone ?? Z_DEFAULT) - (a.permacultureZone ?? Z_DEFAULT),
      );
    for (const z of orderedZones) {
      const props: Record<string, unknown> = {
        id: z.id,
        kind: 'zone',
        color: z.color,
        label: z.name,
        yeomansRank: 4,
        enterprise: z.enterprise ?? '',
        // Stamp Z-level on the feature so the fill-opacity ramp and the
        // hit-test tie-break can read it without going back to the store.
        permacultureZone: z.permacultureZone ?? Z_DEFAULT,
        // Drives the dashed `poly-seed-line` layer so generator-seeded
        // zones read as provisional until adjusted/accepted.
        seedProvenance: z.seedProvenance ?? 'manual',
      };
      const ac = acresOf(z.geometry);
      if (ac) props.acresLabel = ac;
      polys.push({ type: 'Feature', id: z.id, properties: props, geometry: z.geometry });
      try {
        // Anchor zone labels near the top edge (not the centroid) so a
        // smaller-Z zone drawn first keeps its label visible even when a
        // larger-Z zone is drawn over it — the labels rarely collide because
        // they sit at different y-positions inside differently sized
        // polygons. Falls back to centroid if the top-edge point happens
        // to land outside a concave polygon.
        const c = turf.centroid(z.geometry).geometry;
        const [cx, cy] = c.coordinates as [number, number];
        const bb = turf.bbox(z.geometry) as [number, number, number, number];
        const labelY = cy + (bb[3] - cy) * 0.6;
        const candidate = turf.point([cx, labelY]);
        const inside = turf.booleanPointInPolygon(candidate, z.geometry);
        labels.push({
          type: 'Feature',
          id: z.id,
          properties: props,
          geometry: inside ? candidate.geometry : c,
        });
      } catch {
        /* skip */
      }
    }

    // Crop areas (polygon) — Module 5 Plant Systems. Yeomans rank 8.
    for (const c of cropAreas) {
      if (c.projectId !== projectId) continue;
      const props: Record<string, unknown> = {
        id: c.id,
        kind: 'crop',
        color: c.color,
        label: c.name,
        yeomansRank: 8,
        enterprise: c.enterprise ?? '',
      };
      const ac = acresOf(c.geometry);
      if (ac) props.acresLabel = ac;
      polys.push({ type: 'Feature', id: c.id, properties: props, geometry: c.geometry });
      try {
        const ctr = turf.centroid(c.geometry).geometry;
        labels.push({ type: 'Feature', id: c.id, properties: props, geometry: ctr });
      } catch {
        /* skip */
      }
    }

    // Paddocks (polygon) — Module 4 Livestock & Subdivision. Yeomans rank 9.
    for (const pd of paddocks) {
      if (pd.projectId !== projectId) continue;
      const props: Record<string, unknown> = {
        id: pd.id,
        kind: 'paddock',
        color: pd.color,
        label: pd.name,
        yeomansRank: 9,
        enterprise: pd.enterprise ?? '',
      };
      const ac = acresOf(pd.geometry);
      if (ac) props.acresLabel = ac;
      polys.push({ type: 'Feature', id: pd.id, properties: props, geometry: pd.geometry });
      try {
        const ctr = turf.centroid(pd.geometry).geometry;
        labels.push({ type: 'Feature', id: pd.id, properties: props, geometry: ctr });
      } catch {
        /* skip */
      }
    }

    // Paths (line) — Yeomans rank 4 (Access).
    for (const p of paths) {
      if (p.projectId !== projectId) continue;
      const props = {
        id: p.id,
        kind: 'path',
        color: p.color,
        label: p.name,
        yeomansRank: 4,
        enterprise: p.enterprise ?? '',
      };
      lines.push({ type: 'Feature', id: p.id, properties: props, geometry: p.geometry });
    }

    // Fence lines (line) — Module 4 Livestock & Subdivision, Yeomans rank 9.
    // Mobility property drives dasharray in the temporary-strip render layer.
    for (const f of fenceLines) {
      if (f.projectId !== projectId) continue;
      const color = f.mobility === 'temporary-strip' ? '#c87a3c' : '#6b5a45';
      const props = {
        id: f.id,
        kind: 'fence-line',
        color,
        label: f.name,
        yeomansRank: 9,
        enterprise: '',
        mobility: f.mobility,
      };
      lines.push({ type: 'Feature', id: f.id, properties: props, geometry: f.geometry });
    }

    // Utility runs (line) — Tier B / B1, under structures-subsystems.
    // Yeomans rank 6 (Subsystems — energy, water, comms infrastructure).
    // Rendered on the same line layer as paths and swales; the
    // per-feature `color` already reflects kind (water / septic / power /
    // data) when the lens is OFF.
    for (const u of utilityRuns) {
      if (u.projectId !== projectId) continue;
      const props = {
        id: u.id,
        kind: 'utility',
        color: u.color,
        label: u.name,
        yeomansRank: 6,
        enterprise: u.enterprise ?? '',
      };
      lines.push({ type: 'Feature', id: u.id, properties: props, geometry: u.geometry });
    }

    // Structures (polygon) — Yeomans rank 5 (Structures) + 6 (Subsystems).
    // The lens stamps rank 5 uniformly; the per-feature `color` already
    // reflects category (dwelling vs utility) when the lens is OFF.
    for (const st of structures) {
      if (st.projectId !== projectId) continue;
      const color = STRUCTURE_COLOR[st.type] ?? '#a06b48';
      const props = {
        id: st.id,
        kind: 'structure',
        color,
        label: st.name,
        yeomansRank: 5,
        enterprise: st.enterprise ?? '',
      };
      polys.push({ type: 'Feature', id: st.id, properties: props, geometry: st.geometry });
      try {
        const ctr = turf.centroid(st.geometry).geometry;
        labels.push({ type: 'Feature', id: st.id, properties: props, geometry: ctr });
      } catch {
        /* skip */
      }
    }

    // Guilds (point) — Module 5 Plant Systems. Yeomans rank 8 (Vegetation).
    // Render from the absolute `center` set by GuildTool on placement.
    // `centroidUv` is parcel-relative state for the GuildSpatialBuilderCard
    // 2D ring canvas — not used here. Guilds without `center` (legacy v1
    // rows pre-migration, or guilds created from the slide-up but never
    // dropped on the map) are skipped.
    for (const g of guilds) {
      if (g.projectId !== projectId) continue;
      if (!g.center) continue;
      const props = {
        id: g.id,
        kind: 'guild',
        color: '#3d8a3d',
        label: g.name,
        yeomansRank: 8,
        enterprise: g.enterprise ?? '',
      };
      points.push({
        type: 'Feature',
        id: g.id,
        properties: props,
        geometry: { type: 'Point', coordinates: g.center },
      });
      labels.push({
        type: 'Feature',
        id: g.id,
        properties: props,
        geometry: { type: 'Point', coordinates: g.center },
      });

      // Per-member geometry — one Point per member at the absolute lon/lat
      // resolved from Guild.center + assignRingPositions output, plus an
      // optional canopy disk for members whose species has canopySpreadM.
      // The render mirrors the in-card GuildRingsCanvas layout so the steward
      // sees the same spatial composition on the parcel as in the slide-up.
      const memberPositions = assignRingPositions(g.members);
      const [centerLng, centerLat] = g.center;
      for (let i = 0; i < g.members.length; i += 1) {
        const member = g.members[i]!;
        const pos = memberPositions[i]!;
        const [dLng, dLat] = metresToLonLatOffset(pos[0], pos[1], centerLat);
        const lng = centerLng + dLng;
        const lat = centerLat + dLat;
        const species = findSpecies(member.speciesId);
        const tint = LAYER_TINT[member.layer];
        const memberProps = {
          id: g.id,
          kind: 'guild-member',
          guildId: g.id,
          memberIndex: i,
          color: tint,
          layer: member.layer,
          speciesId: member.speciesId,
          label: species?.commonName ?? member.speciesId,
          yeomansRank: 8,
          enterprise: g.enterprise ?? '',
        };
        memberPoints.push({
          type: 'Feature',
          id: `${g.id}:${i}`,
          properties: memberProps,
          geometry: { type: 'Point', coordinates: [lng, lat] },
        });
        const spread = species?.canopySpreadM;
        if (spread && spread > 0) {
          try {
            const disk = turf.circle([lng, lat], spread / 2, {
              units: 'meters',
              steps: 32,
            });
            memberCanopies.push({
              type: 'Feature',
              id: `${g.id}:${i}:canopy`,
              properties: memberProps,
              geometry: disk.geometry,
            });
          } catch {
            /* skip — invalid geometry */
          }
        }
      }
    }

    // Per-host canopy-union polygons. Iterates silvopasture hosts via the
    // same selector the integration math uses (`resolveSilvopastureHosts` +
    // `resolveMembers`), then plumbs each host's member guilds through
    // `hostCanopyUnion` to recover the union geometry. Hosts with no
    // canopy-bearing members yield `null` and are skipped. Render-only —
    // selection, drag, and popover wiring all stay on the per-member layer.
    const projectScopedGuilds = guilds.filter((g) => g.projectId === projectId);
    const projectScopedPaddocks = paddocks.filter(
      (p) => p.projectId === projectId,
    );
    const hosts = resolveSilvopastureHosts(
      projectId,
      cropAreas,
      designElementsForProject,
    );
    for (const host of hosts) {
      const hostMembers = resolveMembers(
        host,
        {
          cropAreas,
          designElements: designElementsForProject,
          paddocks: projectScopedPaddocks,
          guilds: projectScopedGuilds,
        },
        hosts,
      );
      const hostGuilds = hostMembers.guilds.map((m) => m.entity);
      if (hostGuilds.length === 0) continue;
      const union = hostCanopyUnion(hostGuilds);
      if (!union) continue;
      // Match hostCanopyUnion's circle-push gate exactly: a member is
      // canopy-bearing iff its species has a positive finite
      // canopySpreadM. Counting here, at the call site, keeps the
      // hover-tooltip's "M canopy-bearing members" honest as
      // "M circles were folded into this union."
      let canopyBearingMembers = 0;
      for (const g of hostGuilds) {
        for (const m of g.members) {
          const spread = findSpecies(m.speciesId)?.canopySpreadM;
          if (typeof spread === 'number' && spread > 0) {
            canopyBearingMembers += 1;
          }
        }
      }
      hostCanopyUnions.push({
        type: 'Feature',
        id: `${host.id}:canopy-union`,
        properties: {
          kind: 'host-canopy-union',
          hostId: host.id,
          hostName: host.name,
          unionAreaM2: union.unionAreaM2,
          rawSumM2: union.rawSumM2,
          guildCount: hostGuilds.length,
          memberCount: canopyBearingMembers,
        },
        geometry: union.unionGeometry,
      });
      // Centroid label — one Point feature per host union with the
      // pre-formatted m² string. `turf.pointOnFeature` (not centroid) so
      // the anchor is guaranteed inside the polygon even when the union
      // is concave or a MultiPolygon — centroid can fall outside.
      const labelAnchor = turf.pointOnFeature({
        type: 'Feature',
        geometry: union.unionGeometry,
        properties: {},
      });
      hostCanopyUnionLabels.push({
        type: 'Feature',
        id: `${host.id}:canopy-union-label`,
        properties: {
          kind: 'host-canopy-union-label',
          hostId: host.id,
          unionAreaLabel: `${Math.round(union.unionAreaM2)} m²`,
        },
        geometry: labelAnchor.geometry,
      });
    }

    // Fertility infra (point) — Module 6 Soil & Closed-Loop. Yeomans rank 7.
    for (const f of fertilityInfra) {
      if (f.projectId !== projectId) continue;
      const color = FERTILITY_COLOR[f.type] ?? '#8a6a3a';
      const label = FERTILITY_LABEL[f.type] ?? f.type;
      const props = {
        id: f.id,
        kind: 'fertility',
        color,
        label,
        yeomansRank: 7,
        enterprise: f.enterprise ?? '',
      };
      points.push({
        type: 'Feature',
        id: f.id,
        properties: props,
        geometry: { type: 'Point', coordinates: f.center },
      });
      labels.push({
        type: 'Feature',
        id: f.id,
        properties: props,
        geometry: { type: 'Point', coordinates: f.center },
      });
    }

    // Ecological notes (point) — Tier B / B5 markers under
    // `principle-verification`. Yeomans rank 0 (Climate / observation
    // metadata). Rendered via the shared point layer; the per-feature
    // `color` reflects the kind palette when the lens is OFF.
    for (const n of ecologicalNotes) {
      if (n.projectId !== projectId) continue;
      const props = {
        id: n.id,
        kind: 'note',
        color: n.color,
        label: n.name,
        yeomansRank: 0,
        enterprise: n.enterprise ?? '',
      };
      points.push({
        type: 'Feature',
        id: n.id,
        properties: props,
        geometry: n.geometry,
      });
      labels.push({
        type: 'Feature',
        id: n.id,
        properties: props,
        geometry: n.geometry,
      });
    }

    // Water nodes — Plan Module 2. Yeomans rank 2 (Water).
    //   - catchment → polygon footprint (if `geometry` set) + label at
    //     `center`; emits a marker point so the catchment is selectable
    //     even when the polygon is small at zoom-out.
    //   - storage / sink → point at `center`.
    //   - swale → line at `swaleGeometry` + label at `center`.
    // Nodes without a geographic anchor (legacy v1 rows pre-tool-update)
    // are skipped — they remain visible in the slide-up readouts.
    for (const n of waterNodes) {
      if (n.projectId !== projectId) continue;
      const color = WATER_COLOR[n.kind] ?? '#5fc7d4';
      const planKind =
        n.kind === 'catchment' ? 'water_catchment'
        : n.kind === 'storage' ? 'water_storage'
        : n.kind === 'swale' ? 'water_swale'
        : 'water_sink';
      const props: Record<string, unknown> = {
        id: n.id,
        kind: planKind,
        color,
        label: n.name,
        yeomansRank: 2,
        enterprise: n.enterprise ?? '',
      };
      if (n.kind === 'catchment' && n.geometry) {
        const ac = acresOf(n.geometry);
        if (ac) props.acresLabel = ac;
      }
      // Utility-conflict halo geometry — mirror whatever geometry the
      // node already renders with (swaleGeometry for swales, center
      // point for storage / sink / catchment marker).
      const hasConflict =
        Array.isArray(n.utilityConflicts) && n.utilityConflicts.length > 0;
      if (hasConflict) {
        const haloProps = { id: n.id, kind: 'utility_conflict' };
        if (n.kind === 'swale' && n.swaleGeometry) {
          conflictLines.push({
            type: 'Feature',
            id: `${n.id}:halo`,
            properties: haloProps,
            geometry: n.swaleGeometry,
          });
        } else if (n.center) {
          conflictPoints.push({
            type: 'Feature',
            id: `${n.id}:halo`,
            properties: haloProps,
            geometry: { type: 'Point', coordinates: n.center },
          });
        }
      }
      if (n.kind === 'catchment') {
        if (n.geometry) {
          polys.push({
            type: 'Feature',
            id: n.id,
            properties: props,
            geometry: n.geometry,
          });
        }
        if (n.center) {
          points.push({
            type: 'Feature',
            id: n.id,
            properties: props,
            geometry: { type: 'Point', coordinates: n.center },
          });
          labels.push({
            type: 'Feature',
            id: n.id,
            properties: props,
            geometry: { type: 'Point', coordinates: n.center },
          });
        }
        continue;
      }
      if (n.kind === 'swale') {
        if (n.swaleGeometry) {
          lines.push({
            type: 'Feature',
            id: n.id,
            properties: props,
            geometry: n.swaleGeometry,
          });
        }
        if (n.center) {
          labels.push({
            type: 'Feature',
            id: n.id,
            properties: props,
            geometry: { type: 'Point', coordinates: n.center },
          });
        }
        continue;
      }
      // storage / sink — point + label
      if (!n.center) continue;
      points.push({
        type: 'Feature',
        id: n.id,
        properties: props,
        geometry: { type: 'Point', coordinates: n.center },
      });
      labels.push({
        type: 'Feature',
        id: n.id,
        properties: props,
        geometry: { type: 'Point', coordinates: n.center },
      });
    }

    // Setback rings (polygon) — Tier B / B2, under zone-circulation.
    // Yeomans rank 4 (Access / proximity logic — these polygons govern
    // adjacency). Rendered on a dedicated source so the dashed stroke
    // and reduced fill opacity don't bleed into solid zones, and so the
    // poly-fill click handlers (which translate by drag) don't try to
    // drag-translate a ring (rings are anchored to their source feature
    // via sourceKind+sourceId; translating them would detach the ring
    // and break the "this is X metres of clearance around <thing>"
    // semantics).
    for (const r of setbackRings) {
      if (r.projectId !== projectId) continue;
      const props: Record<string, unknown> = {
        id: r.id,
        kind: 'setback',
        color: r.color,
        label: r.name,
        yeomansRank: 4,
        enterprise: r.enterprise ?? '',
      };
      const ac = acresOf(r.geometry);
      if (ac) props.acresLabel = ac;
      setbacks.push({
        type: 'Feature',
        id: r.id,
        properties: props,
        geometry: r.geometry,
      });
      try {
        const c = turf.centroid(r.geometry).geometry;
        labels.push({ type: 'Feature', id: r.id, properties: props, geometry: c });
      } catch {
        /* skip */
      }
    }

    // Flow connectors (line) — Tier B / B3, under soil-fertility. Yeomans
    // rank 7 (Soil / closed-loop graph). Rendered on a dedicated source so
    // the directional arrow-symbol overlay (▶ along the line) doesn't have
    // to be filtered onto the shared line layer; also keeps the line click
    // handler scoped — flow connectors are click-to-edit but not
    // drag-translate (translating a connector breaks the "compost goes
    // from kitchen to garden" semantics, even though both endpoints are
    // free-text rather than feature ids in v1).
    for (const fc of flowConnectors) {
      if (fc.projectId !== projectId) continue;
      if (!fc.geometry) continue; // list-origin flows have no map geometry
      const props = {
        id: fc.id,
        kind: 'flow',
        color: fc.color ?? '#5db1a2',
        label: fc.label,
        yeomansRank: 7,
        enterprise: fc.enterprise ?? '',
      };
      flows.push({
        type: 'Feature',
        id: fc.id,
        properties: props,
        geometry: fc.geometry,
      });
      try {
        const c = turf.centroid(fc.geometry).geometry;
        labels.push({ type: 'Feature', id: fc.id, properties: props, geometry: c });
      } catch {
        /* skip */
      }
    }

    // Monitoring transects (line) — Tier B / B4, under
    // `principle-verification`. Yeomans rank 0 (Climate / observation
    // metadata, alongside ecological notes). Rendered on a dedicated
    // source so the dotted survey-line styling stays distinct from
    // paths / swales / utility runs / flow connectors, and so the
    // click handler is scoped to the transect layer (transects are
    // click-to-edit but not drag-translate — moving them detaches
    // them from "the line you walk on cadence").
    for (const t of monitoringTransects) {
      if (t.projectId !== projectId) continue;
      const props = {
        id: t.id,
        kind: 'transect',
        color: t.color,
        label: t.name,
        yeomansRank: 0,
        enterprise: t.enterprise ?? '',
      };
      transects.push({
        type: 'Feature',
        id: t.id,
        properties: props,
        geometry: t.geometry,
      });
      try {
        const c = turf.centroid(t.geometry).geometry;
        labels.push({ type: 'Feature', id: t.id, properties: props, geometry: c });
      } catch {
        /* skip */
      }
    }

    // Slaughter points (Module 7) — red.
    for (const p of slaughterPoints) {
      if (p.projectId !== projectId) continue;
      const props = {
        id: p.id,
        kind: 'slaughter_point',
        color: '#c4422a',
        label: p.name,
        yeomansRank: 10,
        enterprise: '',
      };
      points.push({ type: 'Feature', id: p.id, properties: props, geometry: p.geometry });
      labels.push({ type: 'Feature', id: p.id, properties: props, geometry: p.geometry });
    }

    // Cold-chain units (Module 7) — blue.
    for (const u of coldChainUnits) {
      if (u.projectId !== projectId) continue;
      const props = {
        id: u.id,
        kind: 'cold_chain_unit',
        color: '#3a78c4',
        label: u.name,
        yeomansRank: 10,
        enterprise: '',
      };
      points.push({ type: 'Feature', id: u.id, properties: props, geometry: u.geometry });
      labels.push({ type: 'Feature', id: u.id, properties: props, geometry: u.geometry });
    }

    // Market nodes (Module 7) — green.
    for (const n of marketNodes) {
      if (n.projectId !== projectId) continue;
      const props = {
        id: n.id,
        kind: 'market_node',
        color: '#3d8a3d',
        label: n.name,
        yeomansRank: 10,
        enterprise: '',
      };
      points.push({ type: 'Feature', id: n.id, properties: props, geometry: n.geometry });
      labels.push({ type: 'Feature', id: n.id, properties: props, geometry: n.geometry });
    }

    return {
      polyFC: { type: 'FeatureCollection' as const, features: polys },
      lineFC: { type: 'FeatureCollection' as const, features: lines },
      pointFC: { type: 'FeatureCollection' as const, features: points },
      labelFC: { type: 'FeatureCollection' as const, features: labels },
      setbackFC: { type: 'FeatureCollection' as const, features: setbacks },
      flowFC: { type: 'FeatureCollection' as const, features: flows },
      transectFC: { type: 'FeatureCollection' as const, features: transects },
      conflictPointFC: { type: 'FeatureCollection' as const, features: conflictPoints },
      conflictLineFC: { type: 'FeatureCollection' as const, features: conflictLines },
      memberPointFC: { type: 'FeatureCollection' as const, features: memberPoints },
      memberCanopyFC: { type: 'FeatureCollection' as const, features: memberCanopies },
      hostCanopyUnionFC: { type: 'FeatureCollection' as const, features: hostCanopyUnions },
      hostCanopyUnionLabelFC: { type: 'FeatureCollection' as const, features: hostCanopyUnionLabels },
    };
  }, [waterNodes, zones, paths, cropAreas, fertilityInfra, paddocks, fenceLines, guilds, structures, ecologicalNotes, utilityRuns, setbackRings, flowConnectors, monitoringTransects, slaughterPoints, coldChainUnits, marketNodes, projectId, designElementsForProject]);

  useEffect(() => {
    if (!map) return;

    const apply = () => {
      if (!map.isStyleLoaded()) return;

      const ensureSource = (id: string, data: GeoJSON.FeatureCollection) => {
        const sid = `${SOURCE_PREFIX}${id}`;
        const existing = map.getSource(sid) as
          | maplibregl.GeoJSONSource
          | undefined;
        if (existing) existing.setData(data);
        else map.addSource(sid, { type: 'geojson', data, promoteId: 'id' });
        return sid;
      };

      const polySid = ensureSource('poly', polyFC);
      const lineSid = ensureSource('line', lineFC);
      const pointSid = ensureSource('point', pointFC);
      const labelSid = ensureSource('label', labelFC);
      const setbackSid = ensureSource('setback', setbackFC);
      const flowSid = ensureSource('flow', flowFC);
      const transectSid = ensureSource('transect', transectFC);
      const conflictPointSid = ensureSource('utility-conflict-point', conflictPointFC);
      const conflictLineSid = ensureSource('utility-conflict-line', conflictLineFC);
      const memberPointSid = ensureSource('guild-member-point', memberPointFC);
      const memberCanopySid = ensureSource('guild-member-canopy', memberCanopyFC);
      const hostCanopyUnionSid = ensureSource(
        'guild-host-canopy-union',
        hostCanopyUnionFC,
      );
      const hostCanopyUnionLabelSid = ensureSource(
        'guild-host-canopy-union-label',
        hostCanopyUnionLabelFC,
      );

      const ensureLayer = (spec: maplibregl.LayerSpecification) => {
        if (!map.getLayer(spec.id)) map.addLayer(spec);
      };

      // Utility-conflict hazard halos — added before the main water-node
      // layers so the `#c4422a` ring sits behind the node's fill/line and
      // reads as an outline rather than an overlay. Per ADR 2026-05-10.
      ensureLayer({
        id: `${LAYER_PREFIX}utility-conflict-line`,
        type: 'line',
        source: conflictLineSid,
        paint: {
          'line-color': '#c4422a',
          'line-width': 4,
          'line-opacity': 0.95,
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}utility-conflict-point`,
        type: 'circle',
        source: conflictPointSid,
        paint: {
          'circle-radius': 11,
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-color': '#c4422a',
          'circle-stroke-width': 4,
          'circle-opacity': 1,
        },
      });

      // Colour expression toggles between per-feature `color` (default) and
      // a lens-mode-driven `match` (when the layering lens is enabled). The
      // two modes are: Yeomans rank (default) or enterprise-id (recolour by
      // multi-enterprise tag).
      const colorExpr = lensEnabled
        ? lensMode === 'enterprise'
          ? enterpriseColorExpr(enterprises)
          : rankColorExpr()
        : ['get', 'color'];

      // Seeded-zones visibility (matrixTogglesStore.seededZones). Seeded
      // ("ring-seed") zones share poly-fill/poly-line/label with all other
      // polygons, so we filter rather than flip layer visibility. Non-zone
      // features lack `seedProvenance`; coalescing to 'manual' keeps them
      // always visible — only ring-seed features are dropped when off.
      const hideSeedFilter = [
        '!=',
        ['coalesce', ['get', 'seedProvenance'], 'manual'],
        'ring-seed',
      ];
      const seedLineFilter = seededZonesVisible
        ? ['==', ['get', 'seedProvenance'], 'ring-seed']
        : ['==', ['literal', 0], 1];

      // Zones ramp opacity by Z-level (Z0 most opaque, Z5 most transparent)
      // to reinforce the Z-stack ordering with a perceptual cue. Non-zone
      // polygon kinds keep the shared 0.28 baseline.
      const fillOpacityExpr = [
        'case',
        ['==', ['get', 'kind'], 'zone'],
        [
          'match',
          ['to-number', ['coalesce', ['get', 'permacultureZone'], 2]],
          0, 0.40,
          1, 0.34,
          2, 0.28,
          3, 0.22,
          4, 0.18,
          5, 0.14,
          0.28,
        ],
        0.28,
      ];
      ensureLayer({
        id: `${LAYER_PREFIX}poly-fill`,
        type: 'fill',
        source: polySid,
        ...(seededZonesVisible ? {} : { filter: hideSeedFilter as never }),
        paint: { 'fill-color': colorExpr as never, 'fill-opacity': fillOpacityExpr as never },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}poly-line`,
        type: 'line',
        source: polySid,
        ...(seededZonesVisible ? {} : { filter: hideSeedFilter as never }),
        paint: {
          'line-color': colorExpr as never,
          'line-width': 1.5,
          'line-opacity': 0.9,
        },
      });
      // Dashed overlay stroke for generator-seeded ("ring-seed") zones so
      // they read as provisional vs. solid hand-drawn zones. Separate
      // filtered layer (not a `case` on poly-line): maplibre-gl 4.x
      // `line-dasharray` is not a data-driven property. Mirrors the
      // `setback-line` static-dash precedent below.
      ensureLayer({
        id: `${LAYER_PREFIX}poly-seed-line`,
        type: 'line',
        source: polySid,
        filter: seedLineFilter as never,
        paint: {
          'line-color': colorExpr as never,
          'line-width': 1.5,
          'line-opacity': 0.9,
          'line-dasharray': [2, 2],
        },
      });
      // Setback rings — lower fill alpha + dashed stroke so the
      // "advisory clearance" reading lands at a glance against solid
      // zones / crop areas underneath.
      ensureLayer({
        id: `${LAYER_PREFIX}setback-fill`,
        type: 'fill',
        source: setbackSid,
        paint: { 'fill-color': colorExpr as never, 'fill-opacity': 0.12 },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}setback-line`,
        type: 'line',
        source: setbackSid,
        paint: {
          'line-color': colorExpr as never,
          'line-width': 1.5,
          'line-opacity': 0.85,
          'line-dasharray': [2, 2],
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}line`,
        type: 'line',
        source: lineSid,
        // Hide temporary-strip fence lines from the solid-line layer; the
        // dashed `fence-temp-line` layer below renders them with a dasharray
        // pattern. Permanent fences and all other lines (paths, utility runs)
        // render here as solid.
        filter: [
          '!',
          ['all',
            ['==', ['get', 'kind'], 'fence-line'],
            ['==', ['get', 'mobility'], 'temporary-strip'],
          ],
        ] as never,
        paint: {
          'line-color': colorExpr as never,
          'line-width': 2,
          'line-opacity': 0.9,
        },
      });
      // Farm-Scholar (Newman) ADR 2026-05-10 — temporary-strip fence overlay.
      // Filtered to fence-line + mobility=temporary-strip so the dashed
      // pattern reads as "moveable wire that gets rolled up daily" against
      // the solid-line aesthetic of permanent fences and paths.
      ensureLayer({
        id: `${LAYER_PREFIX}fence-temp-line`,
        type: 'line',
        source: lineSid,
        filter: [
          'all',
          ['==', ['get', 'kind'], 'fence-line'],
          ['==', ['get', 'mobility'], 'temporary-strip'],
        ] as never,
        paint: {
          'line-color': colorExpr as never,
          'line-width': 2,
          'line-opacity': 0.9,
          'line-dasharray': [3, 2],
        },
      });
      // Flow connectors — solid line plus directional ▶ symbols spaced
      // along the geometry so the source→sink direction reads at a
      // glance.
      ensureLayer({
        id: `${LAYER_PREFIX}flow-line`,
        type: 'line',
        source: flowSid,
        paint: {
          'line-color': colorExpr as never,
          'line-width': 2.5,
          'line-opacity': 0.95,
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}flow-arrow`,
        type: 'symbol',
        source: flowSid,
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 80,
          'text-field': '▶',
          'text-size': 14,
          'text-keep-upright': false,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': colorExpr as never,
          'text-halo-color': 'rgba(31, 29, 26, 0.85)',
          'text-halo-width': 1.2,
        },
      });
      // Monitoring transects — fine dotted survey line. The dot pattern
      // (1, 2 multipliers on line-width) reads as "observation walk" vs
      // the solid path / swale / utility line styles.
      ensureLayer({
        id: `${LAYER_PREFIX}transect-line`,
        type: 'line',
        source: transectSid,
        paint: {
          'line-color': colorExpr as never,
          'line-width': 2,
          'line-opacity': 0.9,
          'line-dasharray': [1, 2],
        },
      });
      const strokeColorExpr = selectedGuildId
        ? ['case', ['==', ['get', 'id'], selectedGuildId], '#ffd166', '#1f1d1a']
        : '#1f1d1a';
      const strokeWidthExpr = selectedGuildId
        ? ['case', ['==', ['get', 'id'], selectedGuildId], 3, 1.5]
        : 1.5;
      const radiusExpr = selectedGuildId
        ? ['case', ['==', ['get', 'id'], selectedGuildId], 9, 6]
        : 6;

      ensureLayer({
        id: `${LAYER_PREFIX}point`,
        type: 'circle',
        source: pointSid,
        paint: {
          'circle-radius': radiusExpr as never,
          'circle-color': colorExpr as never,
          'circle-stroke-color': strokeColorExpr as never,
          'circle-stroke-width': strokeWidthExpr as never,
          'circle-opacity': 0.95,
        },
      });

      // Per-guild-member layers — only visible at zoom ≥ 17. Below that
      // the parcel is too small for the dots to read; the guild centroid
      // is the right abstraction.
      const memberStrokeColorExpr = selectedMemberKey
        ? [
            'case',
            ['==', ['id'], selectedMemberKey],
            '#ffd166',
            '#1f1d1a',
          ]
        : '#1f1d1a';
      const memberStrokeWidthExpr = selectedMemberKey
        ? ['case', ['==', ['id'], selectedMemberKey], 3, 1.5]
        : 1.5;
      // Per-host canopy-union — soft grey halo beneath the individual
      // member disks so the steward sees the unioned footprint that
      // `canopyDedupedM2` measures. Neutral colour (no LAYER_TINT) avoids
      // suggesting any one layer dominates the union. Added before the
      // member-canopy layers so members render on top.
      ensureLayer({
        id: `${LAYER_PREFIX}guild-host-canopy-union-fill`,
        type: 'fill',
        source: hostCanopyUnionSid,
        minzoom: 17,
        paint: {
          'fill-color': '#a8a8a8',
          'fill-opacity': 0.15,
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}guild-host-canopy-union-line`,
        type: 'line',
        source: hostCanopyUnionSid,
        minzoom: 17,
        paint: {
          'line-color': '#5a5a5a',
          'line-opacity': 0.40,
          'line-width': 1.25,
        },
      });
      // Per-host union-area label — single Math.round-formatted m²
      // string at the union's interior anchor (turf.pointOnFeature).
      // Paint mirrors the existing main label layer below so the m²
      // value reads as part of the same dark-glass design family.
      // Inserted before the member-canopy layers so member disks paint
      // on top of the label — the label is per-host context, the disks
      // are per-member identity.
      ensureLayer({
        id: `${LAYER_PREFIX}guild-host-canopy-union-label`,
        type: 'symbol',
        source: hostCanopyUnionLabelSid,
        minzoom: 17,
        layout: {
          'text-field': ['get', 'unionAreaLabel'],
          'text-size': 11,
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color': '#f2ede3',
          'text-halo-color': 'rgba(31, 29, 26, 0.85)',
          'text-halo-width': 1.2,
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}guild-member-canopy-fill`,
        type: 'fill',
        source: memberCanopySid,
        minzoom: 17,
        paint: {
          'fill-color': ['get', 'color'] as never,
          'fill-opacity': 0.10,
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}guild-member-canopy-line`,
        type: 'line',
        source: memberCanopySid,
        minzoom: 17,
        paint: {
          'line-color': ['get', 'color'] as never,
          'line-opacity': 0.30,
          'line-width': 1,
        },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}guild-member-point`,
        type: 'circle',
        source: memberPointSid,
        minzoom: 17,
        paint: {
          'circle-radius': 5,
          'circle-color': ['get', 'color'] as never,
          'circle-stroke-color': memberStrokeColorExpr as never,
          'circle-stroke-width': memberStrokeWidthExpr as never,
          'circle-opacity': 0.95,
        },
      });

      // Re-apply paint properties on existing layers so the toggle takes
      // effect for already-created layers (ensureLayer is a no-op when the
      // layer exists).
      try {
        map.setPaintProperty(`${LAYER_PREFIX}poly-fill`, 'fill-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}poly-line`, 'line-color', colorExpr as never);
        // Re-apply seeded-zones filters on existing layers so the toggle
        // takes effect (ensureLayer is a no-op once the layer exists).
        map.setFilter(
          `${LAYER_PREFIX}poly-fill`,
          (seededZonesVisible ? null : hideSeedFilter) as never,
        );
        map.setFilter(
          `${LAYER_PREFIX}poly-line`,
          (seededZonesVisible ? null : hideSeedFilter) as never,
        );
        if (map.getLayer(`${LAYER_PREFIX}label`)) {
          map.setFilter(
            `${LAYER_PREFIX}label`,
            (seededZonesVisible ? null : hideSeedFilter) as never,
          );
        }
        if (map.getLayer(`${LAYER_PREFIX}poly-seed-line`)) {
          map.setPaintProperty(`${LAYER_PREFIX}poly-seed-line`, 'line-color', colorExpr as never);
          map.setFilter(`${LAYER_PREFIX}poly-seed-line`, seedLineFilter as never);
        }
        map.setPaintProperty(`${LAYER_PREFIX}line`, 'line-color', colorExpr as never);
        if (map.getLayer(`${LAYER_PREFIX}fence-temp-line`)) {
          map.setPaintProperty(`${LAYER_PREFIX}fence-temp-line`, 'line-color', colorExpr as never);
        }
        map.setPaintProperty(`${LAYER_PREFIX}point`, 'circle-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}point`, 'circle-stroke-color', strokeColorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}point`, 'circle-stroke-width', strokeWidthExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}point`, 'circle-radius', radiusExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}setback-fill`, 'fill-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}setback-line`, 'line-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}flow-line`, 'line-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}flow-arrow`, 'text-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}transect-line`, 'line-color', colorExpr as never);
        if (map.getLayer(`${LAYER_PREFIX}guild-member-point`)) {
          map.setPaintProperty(
            `${LAYER_PREFIX}guild-member-point`,
            'circle-stroke-color',
            memberStrokeColorExpr as never,
          );
          map.setPaintProperty(
            `${LAYER_PREFIX}guild-member-point`,
            'circle-stroke-width',
            memberStrokeWidthExpr as never,
          );
        }
      } catch {
        /* layer may have been removed mid-toggle */
      }
      ensureLayer({
        id: `${LAYER_PREFIX}label`,
        type: 'symbol',
        source: labelSid,
        ...(seededZonesVisible ? {} : { filter: hideSeedFilter as never }),
        layout: {
          // 2026-05-11 — Polygon features (zones, paddocks, crop areas,
          // catchments, setback rings) stamp `acresLabel` on their props
          // so the symbol layer can suffix "— X.X ac" without a separate
          // labels source. Non-polygon labels (guild / fertility points,
          // structure / water / module-7 points) omit the field and
          // fall through to the bare name.
          'text-field': [
            'case',
            ['has', 'acresLabel'],
            ['concat', ['get', 'label'], ' — ', ['get', 'acresLabel'], ' ac'],
            ['get', 'label'],
          ],
          'text-size': 11,
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          // Among colliding labels, the lower sort-key is placed first and
          // wins. Zones use their `permacultureZone` so Z0 always survives
          // when a higher-Z zone is drawn over it. Non-zone labels get a
          // neutral 0 (ties with Z0; source order resolves the rare clash).
          'symbol-sort-key': [
            'case',
            ['==', ['get', 'kind'], 'zone'],
            ['to-number', ['coalesce', ['get', 'permacultureZone'], 2]],
            0,
          ] as never,
        },
        paint: {
          'text-color': '#f2ede3',
          'text-halo-color': 'rgba(31, 29, 26, 0.85)',
          'text-halo-width': 1.2,
        },
      });
    };

    apply();
    const onStyle = () => apply();
    map.on('style.load', onStyle);
    map.on('load', onStyle);
    // If style isn't loaded yet at mount, wait for next idle to retry once.
    let pendingIdle = false;
    if (!map.isStyleLoaded()) {
      pendingIdle = true;
      map.once('idle', onStyle);
    }

    return () => {
      try {
        map.off('style.load', onStyle);
        map.off('load', onStyle);
        if (pendingIdle) map.off('idle', onStyle);
      } catch {
        /* map already disposed */
      }
    };
  }, [
    map,
    polyFC,
    lineFC,
    pointFC,
    labelFC,
    setbackFC,
    flowFC,
    transectFC,
    conflictPointFC,
    conflictLineFC,
    memberPointFC,
    memberCanopyFC,
    hostCanopyUnionFC,
    hostCanopyUnionLabelFC,
    lensEnabled,
    lensMode,
    enterprises,
    selectedGuildId,
    selectedMemberKey,
    seededZonesVisible,
  ]);

  // Click-to-edit + drag-to-move for guild points. Uses the same
  // DRAG_THRESHOLD_PX pattern as the structure / poly / line / fertility
  // handlers below: a small mousedown→mousemove jitter is treated as a
  // click and dispatches the inline edit popover; only sustained motion
  // crosses into drag-translate mode.
  useEffect(() => {
    if (!map) return;
    if (!editable) return;
    if (activeTool !== null) return;
    const layerId = `${LAYER_PREFIX}point`;
    const DRAG_THRESHOLD_PX = 4;

    type DragState = {
      id: string;
      startX: number;
      startY: number;
      startLng: number;
      startLat: number;
      origCenter: [number, number];
      dragging: boolean;
    };
    let down: DragState | null = null;

    const onMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (f?.properties?.kind === 'guild') {
        setCursorIntent('move');
      }
    };
    const onMouseLeave = () => {
      if (!down?.dragging) setCursorIntent(null);
    };
    const onMouseDown = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.kind !== 'guild') return;
      e.preventDefault();
      const guildId = String(f.properties.id);
      const r = usePolycultureStore
        .getState()
        .guilds.find((x) => x.id === guildId);
      if (!r || !r.center) return;
      const selItem = { kind: 'guild' as const, id: guildId };
      if (e.originalEvent.shiftKey) {
        usePlanSelectionStore.getState().toggle(selItem);
      } else {
        setSelection([selItem]);
      }
      down = {
        id: guildId,
        startX: e.point.x,
        startY: e.point.y,
        startLng: e.lngLat.lng,
        startLat: e.lngLat.lat,
        origCenter: r.center,
        dragging: false,
      };
      let lastDLng = 0;
      let lastDLat = 0;
      const undoWindow = beginDragUndoWindow(usePolycultureStore);

      const onMove = (ev: maplibregl.MapMouseEvent) => {
        if (!down) return;
        const dx = ev.point.x - down.startX;
        const dy = ev.point.y - down.startY;
        if (!down.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          down.dragging = true;
          undoWindow.start();
          map.dragPan.disable();
          setCursorIntent('grabbing');
        }
        if (!down.dragging) return;
        const dLng = ev.lngLat.lng - down.startLng;
        const dLat = ev.lngLat.lat - down.startLat;
        lastDLng = dLng;
        lastDLat = dLat;
        updateGuild(down.id, {
          center: [
            down.origCenter[0] + dLng,
            down.origCenter[1] + dLat,
          ],
        });
      };
      const onUp = (ev: maplibregl.MapMouseEvent) => {
        map.off('mousemove', onMove);
        map.off('mouseup', onUp);
        if (!down) return;
        const wasDrag = down.dragging;
        const id2 = down.id;
        const origCenter = down.origCenter;
        const downXY = { x: down.startX, y: down.startY };
        down = null;
        map.dragPan.enable();
        setCursorIntent(null);
        if (wasDrag) {
          undoWindow.commit(
            () => updateGuild(id2, { center: origCenter }),
            () =>
              updateGuild(id2, {
                center: [
                  origCenter[0] + lastDLng,
                  origCenter[1] + lastDLat,
                ],
              }),
          );
          return;
        }
        const anchor: [number, number] = ev?.lngLat
          ? [ev.lngLat.lng, ev.lngLat.lat]
          : (() => {
              try {
                const { lng, lat } = map.unproject([downXY.x, downXY.y]);
                return [lng, lat] as [number, number];
              } catch {
                return [0, 0] as [number, number];
              }
            })();
        const r2 = usePolycultureStore
          .getState()
          .guilds.find((x) => x.id === id2);
        if (!r2) return;
        openForm({
          ...buildGuildEditSchema(
            r2,
            updateGuild,
            silvopastureHostOptions(projectId),
          ),
          anchor,
        });
      };
      map.on('mousemove', onMove);
      map.on('mouseup', onUp);
    };
    const onBgClick = (e: maplibregl.MapMouseEvent) => {
      // Clear selection only when the click hits the map background — i.e.
      // no selectable Plan feature is under the pointer. Previously this
      // only checked the guild point layer, which meant clicking a paddock
      // (or any other selectable kind) would fire `mousedown` → set
      // selection, then this `click` handler would clear it again on
      // release. A drag avoided the bug because maplibre suppresses
      // `click` when down/up points differ — hence the "only stays
      // visible if I click and drag" symptom.
      const SELECTABLE_LAYERS = [
        `${LAYER_PREFIX}poly-fill`,
        `${LAYER_PREFIX}line`,
        `${LAYER_PREFIX}point`,
        `${LAYER_PREFIX}guild-member-point`,
        `${LAYER_PREFIX}flow-line`,
        `${LAYER_PREFIX}flow-arrow`,
        `${LAYER_PREFIX}transect-line`,
        `${LAYER_PREFIX}setback-fill`,
        `${LAYER_PREFIX}setback-line`,
        // Design-element layers (rendered by DesignElementLayers, prefix
        // `design-el-`). Included here so background-click clearing
        // doesn't wipe a selection that was just set by mousedown on
        // one of these layers.
        'design-el-poly-fill',
        'design-el-line',
        'design-el-point',
      ].filter((id) => map.getLayer(id));
      if (SELECTABLE_LAYERS.length === 0) return;
      try {
        const features = map.queryRenderedFeatures(e.point, {
          layers: SELECTABLE_LAYERS,
        });
        if (features.length === 0) setSelection([]);
      } catch {
        /* layer may have been removed mid-event */
      }
    };

    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);
    map.on('mousedown', layerId, onMouseDown);
    map.on('click', onBgClick);

    return () => {
      try {
        map.off('mouseenter', layerId, onMouseEnter);
        map.off('mouseleave', layerId, onMouseLeave);
        map.off('mousedown', layerId, onMouseDown);
        map.off('click', onBgClick);
        map.dragPan.enable();
      } catch {
        /* map already disposed */
      }
    };
  }, [map, activeTool, setSelection, updateGuild, openForm, editable]);

  // Per-member drag-to-place + click-to-edit on guild member dots. Mirrors
  // the guild centroid block above; the write target is
  // `GuildMember.position` (guild-local [east, north] metres) computed via
  // `lonLatToMetresOffset` from the absolute lon/lat delta. First drag of
  // a ring-derived member writes the field; subsequent drags update.
  useEffect(() => {
    if (!map) return;
    if (!editable) return;
    if (activeTool !== null) return;
    const layerId = `${LAYER_PREFIX}guild-member-point`;
    const DRAG_THRESHOLD_PX = 4;

    type MemberDragState = {
      guildId: string;
      memberIndex: number;
      startX: number;
      startY: number;
      startLng: number;
      startLat: number;
      centerLat: number;
      origPosition: [number, number];
      dragging: boolean;
    };
    let down: MemberDragState | null = null;

    const onMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (f?.properties?.kind === 'guild-member') {
        setCursorIntent('move');
      }
    };
    const onMouseLeave = () => {
      if (!down?.dragging) setCursorIntent(null);
    };
    const onMouseDown = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.kind !== 'guild-member') return;
      e.preventDefault();
      const guildId = String(f.properties.guildId);
      const memberIndex = Number(f.properties.memberIndex);
      const g = usePolycultureStore
        .getState()
        .guilds.find((x) => x.id === guildId);
      if (!g || !g.center) return;
      const member = g.members[memberIndex];
      if (!member) return;
      const selItem = {
        kind: 'guild-member' as const,
        id: guildId,
        memberIndex,
      };
      if (e.originalEvent.shiftKey) {
        usePlanSelectionStore.getState().toggle(selItem);
      } else {
        setSelection([selItem]);
      }
      // Resolve the *initial* member position so the drag delta accumulates
      // from a stable base. Explicit `position` wins; otherwise the ring
      // positioner picks the slot we rendered at, which is the same the
      // pointer-down event fired on.
      const positions = assignRingPositions(g.members);
      const origPosition: [number, number] = positions[memberIndex] ?? [0, 0];
      const hadExplicitOrig = member.position !== undefined;
      down = {
        guildId,
        memberIndex,
        startX: e.point.x,
        startY: e.point.y,
        startLng: e.lngLat.lng,
        startLat: e.lngLat.lat,
        centerLat: g.center[1],
        origPosition,
        dragging: false,
      };
      let lastEastM = origPosition[0];
      let lastNorthM = origPosition[1];
      const undoWindow = beginDragUndoWindow(usePolycultureStore);

      const onMove = (ev: maplibregl.MapMouseEvent) => {
        if (!down) return;
        const dx = ev.point.x - down.startX;
        const dy = ev.point.y - down.startY;
        if (!down.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          down.dragging = true;
          undoWindow.start();
          map.dragPan.disable();
          setCursorIntent('grabbing');
        }
        if (!down.dragging) return;
        const dLng = ev.lngLat.lng - down.startLng;
        const dLat = ev.lngLat.lat - down.startLat;
        const [dEastM, dNorthM] = lonLatToMetresOffset(
          dLng,
          dLat,
          down.centerLat,
        );
        const nextEast = down.origPosition[0] + dEastM;
        const nextNorth = down.origPosition[1] + dNorthM;
        lastEastM = nextEast;
        lastNorthM = nextNorth;
        const guildNow = usePolycultureStore
          .getState()
          .guilds.find((x) => x.id === down!.guildId);
        if (!guildNow) return;
        updateGuild(down.guildId, {
          members: guildNow.members.map((m, i) =>
            i === down!.memberIndex
              ? { ...m, position: [nextEast, nextNorth] as [number, number] }
              : m,
          ),
        });
      };
      const onUp = (ev: maplibregl.MapMouseEvent) => {
        map.off('mousemove', onMove);
        map.off('mouseup', onUp);
        if (!down) return;
        const wasDrag = down.dragging;
        const guildId2 = down.guildId;
        const memberIndex2 = down.memberIndex;
        const origPos = down.origPosition;
        const downXY = { x: down.startX, y: down.startY };
        const hadExplicitOrigUp = hadExplicitOrig;
        down = null;
        map.dragPan.enable();
        setCursorIntent(null);
        if (wasDrag) {
          const finalEast = lastEastM;
          const finalNorth = lastNorthM;
          undoWindow.commit(
            () => {
              const cur = usePolycultureStore
                .getState()
                .guilds.find((x) => x.id === guildId2);
              if (!cur) return;
              if (hadExplicitOrigUp) {
                updateGuild(guildId2, {
                  members: cur.members.map((m, i) =>
                    i === memberIndex2
                      ? { ...m, position: origPos }
                      : m,
                  ),
                });
              } else {
                updateGuild(guildId2, {
                  members: cur.members.map((m, i) => {
                    if (i !== memberIndex2) return m;
                    const { position: _drop, ...rest } = m;
                    return rest;
                  }),
                });
              }
            },
            () => {
              const cur = usePolycultureStore
                .getState()
                .guilds.find((x) => x.id === guildId2);
              if (!cur) return;
              updateGuild(guildId2, {
                members: cur.members.map((m, i) =>
                  i === memberIndex2
                    ? { ...m, position: [finalEast, finalNorth] as [number, number] }
                    : m,
                ),
              });
            },
          );
          return;
        }
        // Click-without-drag → popover with Snap to ring + Remove.
        const anchor: [number, number] = ev?.lngLat
          ? [ev.lngLat.lng, ev.lngLat.lat]
          : (() => {
              try {
                const { lng, lat } = map.unproject([downXY.x, downXY.y]);
                return [lng, lat] as [number, number];
              } catch {
                return [0, 0] as [number, number];
              }
            })();
        const g2 = usePolycultureStore
          .getState()
          .guilds.find((x) => x.id === guildId2);
        if (!g2) return;
        const m2 = g2.members[memberIndex2];
        if (!m2) return;
        const speciesLabel =
          findSpecies(m2.speciesId)?.commonName ?? m2.speciesId;
        const hasExplicit = m2.position !== undefined;
        openForm({
          title: `Edit ${speciesLabel}`,
          anchor,
          fields: [],
          initial: {},
          onSave: () => {
            /* no editable fields — actions only */
          },
          onCancel: () => {
            /* no-op */
          },
          customActions: [
            {
              label: 'Snap to ring',
              onClick: (_values, close) => {
                if (!hasExplicit) {
                  close();
                  return;
                }
                const cur = usePolycultureStore
                  .getState()
                  .guilds.find((x) => x.id === guildId2);
                if (!cur) {
                  close();
                  return;
                }
                updateGuild(guildId2, {
                  members: cur.members.map((m, i) => {
                    if (i !== memberIndex2) return m;
                    const { position: _drop, ...rest } = m;
                    return rest;
                  }),
                });
                close();
              },
            },
            {
              label: 'Remove from guild',
              variant: 'danger',
              onClick: (_values, close) => {
                if (
                  typeof window !== 'undefined' &&
                  !window.confirm(`Remove ${speciesLabel} from this guild?`)
                ) {
                  return;
                }
                const cur = usePolycultureStore
                  .getState()
                  .guilds.find((x) => x.id === guildId2);
                if (!cur) {
                  close();
                  return;
                }
                updateGuild(guildId2, {
                  members: cur.members.filter((_, i) => i !== memberIndex2),
                });
                close();
              },
            },
          ],
        });
      };
      map.on('mousemove', onMove);
      map.on('mouseup', onUp);
    };

    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);
    map.on('mousedown', layerId, onMouseDown);

    return () => {
      try {
        map.off('mouseenter', layerId, onMouseEnter);
        map.off('mouseleave', layerId, onMouseLeave);
        map.off('mousedown', layerId, onMouseDown);
        map.dragPan.enable();
      } catch {
        /* map already disposed */
      }
    };
  }, [map, activeTool, setSelection, updateGuild, openForm, editable]);

  // Per-host canopy-union hover tooltip (minzoom 17). Cursor-following,
  // read-only, mouseleave hides. Closes the loop from the 2026-05-24
  // ADR: the steward could see *where* `canopyDedupedM2` lived
  // geometrically but had to look at SilvopastureIntegrationCard to
  // read the number; this surface puts the three m² values on the map.
  // No selection / drag / popover wiring — `SELECTABLE_LAYERS`
  // unchanged.
  useEffect(() => {
    if (!map) return;
    const layerId = `${LAYER_PREFIX}guild-host-canopy-union-fill`;

    // Pulls every host-canopy-union feature at the cursor (not just
    // the topmost), preserves MapLibre's render order (topmost first),
    // and dedups by hostId — MapLibre can emit the same feature twice
    // when its source has multiple visible tiles.
    const unpackEntries = (
      features: maplibregl.MapGeoJSONFeature[] | undefined,
    ): HostBlock[] => {
      if (!features || features.length === 0) return [];
      const seen = new Set<string>();
      const out: HostBlock[] = [];
      for (const f of features) {
        const p = f.properties;
        if (!p || p.kind !== 'host-canopy-union') continue;
        const hostId = String(p.hostId ?? '');
        if (!hostId || seen.has(hostId)) continue;
        seen.add(hostId);
        out.push({
          hostId,
          hostName: String(p.hostName ?? ''),
          unionAreaM2: Number(p.unionAreaM2) || 0,
          rawSumM2: Number(p.rawSumM2) || 0,
          guildCount: Number(p.guildCount) || 0,
          memberCount: Number(p.memberCount) || 0,
        });
      }
      return out;
    };

    const sameHostIdSet = (a: string[], b: string[]): boolean => {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    };

    const onMove = (e: maplibregl.MapLayerMouseEvent) => {
      // Suppress hover writes while pinned so the pinned read doesn't
      // jitter under cursor motion.
      if (pinnedUnion) return;
      const entries = unpackEntries(e.features);
      if (entries.length === 0) {
        setHoveredUnion(null);
        return;
      }
      setHoveredUnion({
        point: { x: e.point.x, y: e.point.y },
        entries,
      });
    };
    const onLeave = () => {
      if (pinnedUnion) return;
      setHoveredUnion(null);
    };
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const entries = unpackEntries(e.features);
      if (entries.length === 0) return;
      const hostIds = entries.map((x) => x.hostId).sort();
      // Toggle: clicking a stack whose hostId set matches the
      // currently-pinned stack unpins it; clicking any other stack
      // (or any stack when nothing is pinned) pins.
      if (pinnedUnion && sameHostIdSet(pinnedUnion.hostIds, hostIds)) {
        setPinnedUnion(null);
        return;
      }
      setPinnedUnion({
        point: { x: e.point.x, y: e.point.y },
        entries,
        hostIds,
      });
      // Clear hover so only one tooltip ever renders.
      setHoveredUnion(null);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setPinnedUnion(null);
    };
    // Tap-outside-the-map-canvas dismisses a pinned tooltip on touch
    // devices where ESC is unavailable. `pointerdown` unifies mouse +
    // touch; taps inside the canvas still flow through MapLibre's
    // `click` (toggle/replace), so this only fills the missing
    // tap-anywhere-off-the-union dismissal affordance.
    const onDocPointerDown = (ev: PointerEvent) => {
      if (!pinnedUnion) return;
      const canvasContainer = map.getCanvasContainer();
      if (!canvasContainer) return;
      const target = ev.target as Node | null;
      if (target && canvasContainer.contains(target)) return;
      // Slice K carve-out: when the pinned tooltip has the scroll-cap
      // active (4+ hosts), it carries pointer-events: auto so the
      // steward can scroll. A pointerdown on the tooltip's scrollbar
      // or its scrollable content would otherwise fall through here
      // (target is not inside the canvas container) and dismiss the
      // very surface the steward is interacting with. Exempt the
      // tooltip explicitly via the testid query — the portal mount
      // means the tooltip is a sibling of the canvas container, not
      // a descendant of it.
      if (
        target instanceof Element &&
        target.closest('[data-testid="host-canopy-union-tooltip"]')
      ) {
        return;
      }
      setPinnedUnion(null);
    };

    map.on('mousemove', layerId, onMove);
    map.on('mouseleave', layerId, onLeave);
    map.on('click', layerId, onClick);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDocPointerDown);

    return () => {
      try {
        map.off('mousemove', layerId, onMove);
        map.off('mouseleave', layerId, onLeave);
        map.off('click', layerId, onClick);
      } catch {
        /* map already disposed */
      }
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDocPointerDown);
    };
  }, [map, pinnedUnion]);

  // Click-to-edit + drag-to-move for placed Structures (poly fill).
  // Gated to `activeTool == null` so a Plan draw tool always wins.
  useEffect(() => {
    if (!map) return;
    if (!editable) return;
    if (activeTool !== null) return;
    const layerId = `${LAYER_PREFIX}poly-fill`;

    const TYPE_OPTIONS: { value: StructureType; label: string }[] = [
      { value: 'cabin',            label: 'Cabin' },
      { value: 'yurt',             label: 'Yurt' },
      { value: 'earthship',        label: 'Earthship' },
      { value: 'tent_glamping',    label: 'Tent / Glamping' },
      { value: 'pavilion',         label: 'Pavilion' },
      { value: 'classroom',        label: 'Classroom' },
      { value: 'prayer_space',     label: 'Prayer space' },
      { value: 'bathhouse',        label: 'Bathhouse' },
      { value: 'fire_circle',      label: 'Fire circle' },
      { value: 'lookout',          label: 'Lookout' },
      { value: 'greenhouse',       label: 'Greenhouse' },
      { value: 'barn',             label: 'Barn' },
      { value: 'animal_shelter',   label: 'Animal shelter' },
      { value: 'workshop',         label: 'Workshop' },
      { value: 'storage',          label: 'Storage shed' },
      { value: 'compost_station',  label: 'Compost station' },
      { value: 'water_pump_house', label: 'Pump house' },
      { value: 'solar_array',      label: 'Solar array' },
      { value: 'well',             label: 'Well' },
      { value: 'water_tank',       label: 'Water tank' },
    ];
    const PHASE_OPTIONS = [
      { value: 'Phase 1', label: 'Phase 1' },
      { value: 'Phase 2', label: 'Phase 2' },
      { value: 'Phase 3', label: 'Phase 3' },
      { value: 'Phase 4', label: 'Phase 4' },
    ];
    const midCost = (type: StructureType): number => {
      const [lo, hi] = STRUCTURE_TEMPLATES[type].costRange;
      return Math.round((lo + hi) / 2);
    };

    const DRAG_THRESHOLD_PX = 4;
    type StructDrag = {
      id: string;
      x: number;
      y: number;
      startLng: number;
      startLat: number;
      origCenter: [number, number];
      origGeom: GeoJSON.Polygon;
      dragging: boolean;
    };
    let down: StructDrag | null = null;

    const onMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (f?.properties?.kind === 'structure') {
        setCursorIntent('move');
      }
    };
    const onMouseLeave = () => {
      if (!down?.dragging) setCursorIntent(null);
    };

    const onMouseDown = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.kind !== 'structure') return;
      e.preventDefault();
      const id = String(f.properties.id);
      const st0 = getAllStructures().find((s) => s.id === id);
      if (!st0) return;
      const selItem = { kind: 'structure' as const, id };
      if (e.originalEvent.shiftKey) {
        usePlanSelectionStore.getState().toggle(selItem);
      } else {
        setSelection([selItem]);
      }
      down = {
        id,
        x: e.point.x,
        y: e.point.y,
        startLng: e.lngLat.lng,
        startLat: e.lngLat.lat,
        origCenter: st0.center,
        origGeom: st0.geometry,
        dragging: false,
      };
      let lastDLng = 0;
      let lastDLat = 0;
      // useStructureStore is now a V2-derived facade with no temporal
      // middleware of its own; route undo through the canonical V2 store.
      const undoWindow = beginDragUndoWindow(useBuiltEnvironmentStoreV2);

      const onMove = (ev: maplibregl.MapMouseEvent) => {
        if (!down) return;
        const dx = ev.point.x - down.x;
        const dy = ev.point.y - down.y;
        if (!down.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          down.dragging = true;
          undoWindow.start();
          map.dragPan.disable();
          setCursorIntent('grabbing');
        }
        if (!down.dragging) return;
        // Translate by delta — keeps the cursor's grab-offset relative to
        // the polygon, and works for vertex-edited footprints whose
        // widthM/depthM/rotationDeg no longer describe the geometry.
        const dLng = ev.lngLat.lng - down.startLng;
        const dLat = ev.lngLat.lat - down.startLat;
        lastDLng = dLng;
        lastDLat = dLat;
        const center: [number, number] = [
          down.origCenter[0] + dLng,
          down.origCenter[1] + dLat,
        ];
        const geometry = translateByDelta(down.origGeom, dLng, dLat);
        updateStructure(down.id, { center, geometry });
      };
      const onUp = (ev: maplibregl.MapMouseEvent) => {
        map.off('mousemove', onMove);
        map.off('mouseup', onUp);
        if (!down) return;
        const wasDrag = down.dragging;
        const id = down.id;
        const origCenter = down.origCenter;
        const origGeom = down.origGeom;
        const downXY = { x: down.x, y: down.y };
        down = null;
        map.dragPan.enable();
        setCursorIntent(null);
        if (wasDrag) {
          undoWindow.commit(
            () =>
              updateStructure(id, {
                center: origCenter,
                geometry: origGeom,
              }),
            () =>
              updateStructure(id, {
                center: [
                  origCenter[0] + lastDLng,
                  origCenter[1] + lastDLat,
                ],
                geometry: translateByDelta(origGeom, lastDLng, lastDLat),
              }),
          );
          return;
        }
        // Click (no drag) → open edit popover.
        const st = getAllStructures().find((s) => s.id === id);
        if (!st) return;
        const anchor: [number, number] =
          ev?.lngLat
            ? [ev.lngLat.lng, ev.lngLat.lat]
            : (() => {
                try {
                  const { lng, lat } = map.unproject([downXY.x, downXY.y]);
                  return [lng, lat] as [number, number];
                } catch {
                  return st.center;
                }
              })();
        openForm({
          title: 'Edit structure',
          anchor,
          fields: [
            { key: 'name', label: 'Name', kind: 'text', required: true },
            {
              key: 'type',
              label: 'Type',
              kind: 'select',
              required: true,
              options: TYPE_OPTIONS,
            },
            {
              key: 'phase',
              label: 'Phase',
              kind: 'select',
              options: PHASE_OPTIONS,
            },
            {
              key: 'rotationDeg',
              label: 'Rotation (°)',
              kind: 'number',
              placeholder: '0',
              suffix: '°',
            },
          ],
          initial: {
            name: st.name,
            type: st.type,
            phase: st.phase,
            rotationDeg: st.rotationDeg,
          },
          onSave: (values) => {
            const nextType = values.type as StructureType;
            const nextTpl = STRUCTURE_TEMPLATES[nextType] ?? STRUCTURE_TEMPLATES[st.type];
            const rawRot = Number(values.rotationDeg);
            const rotationDeg = Number.isFinite(rawRot)
              ? ((rawRot % 360) + 360) % 360
              : 0;
            const geometry = createFootprintPolygon(
              st.center,
              nextTpl.widthM,
              nextTpl.depthM,
              rotationDeg,
            );
            updateStructure(st.id, {
              name: String(values.name ?? nextTpl.label).trim() || nextTpl.label,
              type: nextType,
              geometry,
              rotationDeg,
              widthM: nextTpl.widthM,
              depthM: nextTpl.depthM,
              phase: String(values.phase ?? 'Phase 1'),
              costEstimate: midCost(nextType),
              infrastructureReqs: [...nextTpl.infrastructureReqs],
            });
          },
          onCancel: () => {
            /* no-op — record already exists */
          },
        });
      };
      map.on('mousemove', onMove);
      map.on('mouseup', onUp);
    };

    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);
    map.on('mousedown', layerId, onMouseDown);

    return () => {
      try {
        map.off('mouseenter', layerId, onMouseEnter);
        map.off('mouseleave', layerId, onMouseLeave);
        map.off('mousedown', layerId, onMouseDown);
        map.dragPan.enable();
      } catch {
        /* map already disposed */
      }
    };
  }, [map, activeTool, updateStructure, openForm, editable]);

  // Click-to-edit + drag-to-translate for non-structure polygon kinds
  // (zone, crop, paddock). Translates by lng/lat delta — no synthetic
  // `center` field needed; the geometry itself is the source of truth.
  useEffect(() => {
    if (!map) return;
    if (!editable) return;
    if (activeTool !== null) return;
    const layerId = `${LAYER_PREFIX}poly-fill`;
    const DRAG_THRESHOLD_PX = 4;
    const HANDLED: ReadonlyArray<string> = [
      'zone',
      'crop',
      'paddock',
      'water_catchment',
    ];

    type DragState = {
      kind: string;
      id: string;
      startX: number;
      startY: number;
      startLng: number;
      startLat: number;
      origGeom: GeoJSON.Polygon;
      origCenter: [number, number] | null;
      dragging: boolean;
    };
    let down: DragState | null = null;

    const onMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const k = f?.properties?.kind;
      if (typeof k === 'string' && HANDLED.includes(k)) {
        setCursorIntent('move');
      }
    };
    const onMouseLeave = () => {
      if (!down?.dragging) setCursorIntent(null);
    };

    const onMouseDown = (e: maplibregl.MapLayerMouseEvent) => {
      // Among overlapping zones, always prefer the lowest permacultureZone
      // (Z0 wins over Z1, Z1 over Z2, …) so an intensive-use zone drawn
      // first stays selectable when a less-intensive zone is drawn over it.
      // Non-zone kinds keep the default "topmost wins" pick.
      const feats = e.features ?? [];
      const zoneFeats = feats.filter((ff) => ff.properties?.kind === 'zone');
      const f =
        zoneFeats.length > 0
          ? zoneFeats.reduce((best, cur) =>
              Number(cur.properties?.permacultureZone ?? 2) <
              Number(best.properties?.permacultureZone ?? 2)
                ? cur
                : best,
            )
          : feats[0];
      const k = f?.properties?.kind;
      if (typeof k !== 'string' || !HANDLED.includes(k)) return;
      e.preventDefault();
      const id = String(f!.properties!.id);
      const orig = readRecordGeometry(k, id);
      if (!orig) return;
      // Water catchment also tracks an absolute centroid `center`
      // alongside its polygon `geometry`; we translate both on drag.
      let origCenter: [number, number] | null = null;
      if (k === 'water_catchment') {
        const wn = useWaterSystemsStore
          .getState()
          .waterNodes.find((x) => x.id === id);
        origCenter = wn?.center ?? null;
      }
      const planKind: PlanSelectionKind =
        k === 'water_catchment' ? 'water' : (k as PlanSelectionKind);
      const selItem = { kind: planKind, id };
      if (e.originalEvent.shiftKey) {
        usePlanSelectionStore.getState().toggle(selItem);
      } else {
        setSelection([selItem]);
      }
      down = {
        kind: k,
        id,
        startX: e.point.x,
        startY: e.point.y,
        startLng: e.lngLat.lng,
        startLat: e.lngLat.lat,
        origGeom: orig,
        origCenter,
        dragging: false,
      };
      let lastDLng = 0;
      let lastDLat = 0;
      const undoStore =
        k === 'zone'
          ? useZoneStore
          : k === 'crop'
            ? useCropStore
            : k === 'paddock'
              ? useLivestockStore
              : useWaterSystemsStore;
      const undoWindow = beginDragUndoWindow(undoStore);

      const onMove = (ev: maplibregl.MapMouseEvent) => {
        if (!down) return;
        const dx = ev.point.x - down.startX;
        const dy = ev.point.y - down.startY;
        if (!down.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          down.dragging = true;
          undoWindow.start();
          map.dragPan.disable();
          setCursorIntent('grabbing');
        }
        if (!down.dragging) return;
        const dLng = ev.lngLat.lng - down.startLng;
        const dLat = ev.lngLat.lat - down.startLat;
        lastDLng = dLng;
        lastDLat = dLat;
        const next = translateByDelta(down.origGeom, dLng, dLat);
        writeRecordGeometry(down.kind, down.id, next);
        if (down.kind === 'water_catchment' && down.origCenter) {
          updateWaterNode(down.id, {
            center: [
              down.origCenter[0] + dLng,
              down.origCenter[1] + dLat,
            ],
          });
        }
      };
      const onUp = (ev: maplibregl.MapMouseEvent) => {
        map.off('mousemove', onMove);
        map.off('mouseup', onUp);
        if (!down) return;
        const wasDrag = down.dragging;
        const k2 = down.kind;
        const id2 = down.id;
        const origGeom = down.origGeom;
        const origCenter = down.origCenter;
        const downXY = { x: down.startX, y: down.startY };
        down = null;
        map.dragPan.enable();
        setCursorIntent(null);
        if (wasDrag) {
          undoWindow.commit(
            () => {
              writeRecordGeometry(k2, id2, origGeom);
              if (k2 === 'water_catchment' && origCenter) {
                updateWaterNode(id2, { center: origCenter });
              }
            },
            () => {
              writeRecordGeometry(
                k2,
                id2,
                translateByDelta(origGeom, lastDLng, lastDLat),
              );
              if (k2 === 'water_catchment' && origCenter) {
                updateWaterNode(id2, {
                  center: [
                    origCenter[0] + lastDLng,
                    origCenter[1] + lastDLat,
                  ],
                });
              }
            },
          );
          return;
        }
        // Click (no drag) → open edit popover.
        const anchor: [number, number] = ev?.lngLat
          ? [ev.lngLat.lng, ev.lngLat.lat]
          : (() => {
              try {
                const { lng, lat } = map.unproject([downXY.x, downXY.y]);
                return [lng, lat] as [number, number];
              } catch {
                return [0, 0] as [number, number];
              }
            })();
        const schema = buildPolyEditSchema(k2, id2);
        if (!schema) return;
        openForm({ ...schema, anchor });
      };
      map.on('mousemove', onMove);
      map.on('mouseup', onUp);
    };

    const asPolygon = (
      g: GeoJSON.Geometry | undefined,
    ): GeoJSON.Polygon | null => (g?.type === 'Polygon' ? g : null);
    const readRecordGeometry = (
      k: string,
      id: string,
    ): GeoJSON.Polygon | null => {
      if (k === 'zone') {
        const r = useZoneStore.getState().zones.find((x) => x.id === id);
        return asPolygon(r?.geometry);
      }
      if (k === 'crop') {
        const r = useCropStore.getState().cropAreas.find((x) => x.id === id);
        return asPolygon(r?.geometry);
      }
      if (k === 'paddock') {
        const r = useLivestockStore
          .getState()
          .paddocks.find((x) => x.id === id);
        return asPolygon(r?.geometry);
      }
      if (k === 'water_catchment') {
        const r = useWaterSystemsStore
          .getState()
          .waterNodes.find((x) => x.id === id);
        return asPolygon(r?.geometry);
      }
      return null;
    };
    const writeRecordGeometry = (
      k: string,
      id: string,
      geom: GeoJSON.Geometry,
    ) => {
      if (k === 'zone' && geom.type === 'Polygon') {
        updateZone(id, { geometry: geom });
      } else if (k === 'crop' && geom.type === 'Polygon') {
        updateCropArea(id, { geometry: geom });
      } else if (k === 'paddock' && geom.type === 'Polygon') {
        updatePaddock(id, { geometry: geom });
      } else if (k === 'water_catchment' && geom.type === 'Polygon') {
        updateWaterNode(id, { geometry: geom });
      }
    };
    const buildPolyEditSchema = (k: string, id: string) => {
      if (k === 'zone') {
        const r = useZoneStore.getState().zones.find((x) => x.id === id);
        return r ? buildZoneEditSchema(r, updateZone) : null;
      }
      if (k === 'crop') {
        const r = useCropStore.getState().cropAreas.find((x) => x.id === id);
        return r
          ? buildCropEditSchema(
              r,
              updateCropArea,
              silvopastureHostOptions(projectId),
            )
          : null;
      }
      if (k === 'paddock') {
        const r = useLivestockStore
          .getState()
          .paddocks.find((x) => x.id === id);
        return r
          ? buildPaddockEditSchema(
              r,
              updatePaddock,
              silvopastureHostOptions(projectId),
            )
          : null;
      }
      if (k === 'water_catchment') {
        const r = useWaterSystemsStore
          .getState()
          .waterNodes.find((x) => x.id === id);
        return r ? buildWaterNodeEditSchema(r, updateWaterNode) : null;
      }
      return null;
    };

    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);
    map.on('mousedown', layerId, onMouseDown);

    return () => {
      try {
        map.off('mouseenter', layerId, onMouseEnter);
        map.off('mouseleave', layerId, onMouseLeave);
        map.off('mousedown', layerId, onMouseDown);
        map.dragPan.enable();
      } catch {
        /* map already disposed */
      }
    };
  }, [
    map,
    activeTool,
    updateZone,
    updateCropArea,
    updatePaddock,
    updateWaterNode,
    setSelection,
    openForm,
    editable,
  ]);

  // Click-to-edit + drag-to-translate for path + water-swale lines.
  useEffect(() => {
    if (!map) return;
    if (!editable) return;
    if (activeTool !== null) return;
    const layerId = `${LAYER_PREFIX}line`;
    const DRAG_THRESHOLD_PX = 4;
    const HANDLED: ReadonlyArray<string> = ['path', 'water_swale', 'utility'];

    type DragState = {
      kind: string;
      id: string;
      startX: number;
      startY: number;
      startLng: number;
      startLat: number;
      origGeom: GeoJSON.LineString;
      origCenter: [number, number] | null;
      dragging: boolean;
    };
    let down: DragState | null = null;

    const onMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const k = f?.properties?.kind;
      if (typeof k === 'string' && HANDLED.includes(k)) {
        setCursorIntent('move');
      }
    };
    const onMouseLeave = () => {
      if (!down?.dragging) setCursorIntent(null);
    };

    const onMouseDown = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const k = f?.properties?.kind;
      if (typeof k !== 'string' || !HANDLED.includes(k)) return;
      e.preventDefault();
      const id = String(f!.properties!.id);
      let origGeom: GeoJSON.LineString | null = null;
      let origCenter: [number, number] | null = null;
      if (k === 'path') {
        const r = usePathStore.getState().paths.find((x) => x.id === id);
        origGeom = r?.geometry ?? null;
      } else if (k === 'utility') {
        const r = useUtilityRunStore.getState().runs.find((x) => x.id === id);
        origGeom = r?.geometry ?? null;
      } else {
        const r = useWaterSystemsStore
          .getState()
          .waterNodes.find((x) => x.id === id);
        origGeom = r?.swaleGeometry ?? null;
        origCenter = r?.center ?? null;
      }
      if (!origGeom) return;
      const planKind: PlanSelectionKind =
        k === 'water_swale' ? 'water' : k === 'utility' ? 'utility' : 'path';
      const selItem = { kind: planKind, id };
      if (e.originalEvent.shiftKey) {
        usePlanSelectionStore.getState().toggle(selItem);
      } else {
        setSelection([selItem]);
      }
      down = {
        kind: k,
        id,
        startX: e.point.x,
        startY: e.point.y,
        startLng: e.lngLat.lng,
        startLat: e.lngLat.lat,
        origGeom,
        origCenter,
        dragging: false,
      };
      let lastDLng = 0;
      let lastDLat = 0;
      const undoStore =
        k === 'path'
          ? usePathStore
          : k === 'utility'
            ? useUtilityRunStore
            : useWaterSystemsStore;
      const undoWindow = beginDragUndoWindow(undoStore);

      const onMove = (ev: maplibregl.MapMouseEvent) => {
        if (!down) return;
        const dx = ev.point.x - down.startX;
        const dy = ev.point.y - down.startY;
        if (!down.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          down.dragging = true;
          undoWindow.start();
          map.dragPan.disable();
          setCursorIntent('grabbing');
        }
        if (!down.dragging) return;
        const dLng = ev.lngLat.lng - down.startLng;
        const dLat = ev.lngLat.lat - down.startLat;
        lastDLng = dLng;
        lastDLat = dLat;
        const next = translateByDelta(down.origGeom, dLng, dLat);
        if (down.kind === 'path') {
          updatePath(down.id, { geometry: next });
        } else if (down.kind === 'utility') {
          updateUtilityRun(down.id, { geometry: next });
        } else {
          updateWaterNode(down.id, { swaleGeometry: next });
          if (down.origCenter) {
            updateWaterNode(down.id, {
              center: [
                down.origCenter[0] + dLng,
                down.origCenter[1] + dLat,
              ],
            });
          }
        }
      };
      const onUp = (ev: maplibregl.MapMouseEvent) => {
        map.off('mousemove', onMove);
        map.off('mouseup', onUp);
        if (!down) return;
        const wasDrag = down.dragging;
        const k2 = down.kind;
        const id2 = down.id;
        const origGeom = down.origGeom;
        const origCenter = down.origCenter;
        const downXY = { x: down.startX, y: down.startY };
        down = null;
        map.dragPan.enable();
        setCursorIntent(null);
        if (wasDrag) {
          undoWindow.commit(
            () => {
              if (k2 === 'path') {
                updatePath(id2, { geometry: origGeom });
              } else if (k2 === 'utility') {
                updateUtilityRun(id2, { geometry: origGeom });
              } else {
                updateWaterNode(id2, { swaleGeometry: origGeom });
                if (origCenter) {
                  updateWaterNode(id2, { center: origCenter });
                }
              }
            },
            () => {
              const finalGeom = translateByDelta(origGeom, lastDLng, lastDLat);
              if (k2 === 'path') {
                updatePath(id2, { geometry: finalGeom });
              } else if (k2 === 'utility') {
                updateUtilityRun(id2, { geometry: finalGeom });
              } else {
                updateWaterNode(id2, { swaleGeometry: finalGeom });
                if (origCenter) {
                  updateWaterNode(id2, {
                    center: [
                      origCenter[0] + lastDLng,
                      origCenter[1] + lastDLat,
                    ],
                  });
                }
              }
            },
          );
          return;
        }
        const anchor: [number, number] = ev?.lngLat
          ? [ev.lngLat.lng, ev.lngLat.lat]
          : (() => {
              try {
                const { lng, lat } = map.unproject([downXY.x, downXY.y]);
                return [lng, lat] as [number, number];
              } catch {
                return [0, 0] as [number, number];
              }
            })();
        if (k2 === 'path') {
          const r2 = usePathStore.getState().paths.find((x) => x.id === id2);
          if (!r2) return;
          openForm({ ...buildPathEditSchema(r2, updatePath), anchor });
        } else if (k2 === 'utility') {
          const r2 = useUtilityRunStore
            .getState()
            .runs.find((x) => x.id === id2);
          if (!r2) return;
          openForm({
            ...buildUtilityRunEditSchema(r2, updateUtilityRun),
            anchor,
          });
        } else {
          const r2 = useWaterSystemsStore
            .getState()
            .waterNodes.find((x) => x.id === id2);
          if (!r2) return;
          openForm({
            ...buildWaterNodeEditSchema(r2, updateWaterNode),
            anchor,
          });
        }
      };
      map.on('mousemove', onMove);
      map.on('mouseup', onUp);
    };

    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);
    map.on('mousedown', layerId, onMouseDown);

    return () => {
      try {
        map.off('mouseenter', layerId, onMouseEnter);
        map.off('mouseleave', layerId, onMouseLeave);
        map.off('mousedown', layerId, onMouseDown);
        map.dragPan.enable();
      } catch {
        /* map already disposed */
      }
    };
  }, [
    map,
    activeTool,
    updatePath,
    updateWaterNode,
    updateUtilityRun,
    setSelection,
    openForm,
    editable,
  ]);

  // Click-to-edit + drag-to-translate for fertility-infra and water
  // (storage / sink) points. Both are point features on the same source
  // layer (`plan-data-point`); we dispatch by `kind` to the correct
  // store. Catchment-centroid points are intentionally NOT handled here —
  // catchments interact via their polygon footprint on the poly-fill
  // layer, and the centroid marker is a passive selection cue.
  useEffect(() => {
    if (!map) return;
    if (!editable) return;
    if (activeTool !== null) return;
    const layerId = `${LAYER_PREFIX}point`;
    const DRAG_THRESHOLD_PX = 4;
    const HANDLED: ReadonlyArray<string> = [
      'fertility',
      'water_storage',
      'water_sink',
    ];

    type DragState = {
      kind: string;
      id: string;
      startX: number;
      startY: number;
      startLng: number;
      startLat: number;
      origCenter: [number, number];
      dragging: boolean;
    };
    let down: DragState | null = null;

    const onMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const k = f?.properties?.kind;
      if (typeof k === 'string' && HANDLED.includes(k)) {
        setCursorIntent('move');
      }
    };
    const onMouseLeave = () => {
      if (!down?.dragging) setCursorIntent(null);
    };

    const onMouseDown = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const k = f?.properties?.kind;
      if (typeof k !== 'string' || !HANDLED.includes(k)) return;
      e.preventDefault();
      const id = String(f!.properties!.id);
      let origCenter: [number, number] | null = null;
      if (k === 'fertility') {
        const r = useClosedLoopStore
          .getState()
          .fertilityInfra.find((x) => x.id === id);
        origCenter = r?.center ?? null;
      } else {
        const r = useWaterSystemsStore
          .getState()
          .waterNodes.find((x) => x.id === id);
        origCenter = r?.center ?? null;
      }
      if (!origCenter) return;
      const planKind: PlanSelectionKind =
        k === 'fertility' ? 'fertility' : 'water';
      const selItem = { kind: planKind, id };
      if (e.originalEvent.shiftKey) {
        usePlanSelectionStore.getState().toggle(selItem);
      } else {
        setSelection([selItem]);
      }
      down = {
        kind: k,
        id,
        startX: e.point.x,
        startY: e.point.y,
        startLng: e.lngLat.lng,
        startLat: e.lngLat.lat,
        origCenter,
        dragging: false,
      };
      let lastDLng = 0;
      let lastDLat = 0;
      const undoStore = k === 'fertility' ? useClosedLoopStore : useWaterSystemsStore;
      const undoWindow = beginDragUndoWindow(undoStore);

      const onMove = (ev: maplibregl.MapMouseEvent) => {
        if (!down) return;
        const dx = ev.point.x - down.startX;
        const dy = ev.point.y - down.startY;
        if (!down.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          down.dragging = true;
          undoWindow.start();
          map.dragPan.disable();
          setCursorIntent('grabbing');
        }
        if (!down.dragging) return;
        const dLng = ev.lngLat.lng - down.startLng;
        const dLat = ev.lngLat.lat - down.startLat;
        lastDLng = dLng;
        lastDLat = dLat;
        const nextCenter: [number, number] = [
          down.origCenter[0] + dLng,
          down.origCenter[1] + dLat,
        ];
        if (down.kind === 'fertility') {
          updateFertilityInfra(down.id, { center: nextCenter });
        } else {
          updateWaterNode(down.id, { center: nextCenter });
        }
      };
      const onUp = (ev: maplibregl.MapMouseEvent) => {
        map.off('mousemove', onMove);
        map.off('mouseup', onUp);
        if (!down) return;
        const wasDrag = down.dragging;
        const k2 = down.kind;
        const id2 = down.id;
        const origCenter2 = down.origCenter;
        const downXY = { x: down.startX, y: down.startY };
        down = null;
        map.dragPan.enable();
        setCursorIntent(null);
        if (wasDrag) {
          undoWindow.commit(
            () => {
              if (k2 === 'fertility') {
                updateFertilityInfra(id2, { center: origCenter2 });
              } else {
                updateWaterNode(id2, { center: origCenter2 });
              }
            },
            () => {
              const finalCenter: [number, number] = [
                origCenter2[0] + lastDLng,
                origCenter2[1] + lastDLat,
              ];
              if (k2 === 'fertility') {
                updateFertilityInfra(id2, { center: finalCenter });
              } else {
                updateWaterNode(id2, { center: finalCenter });
              }
            },
          );
          return;
        }
        const anchor: [number, number] = ev?.lngLat
          ? [ev.lngLat.lng, ev.lngLat.lat]
          : (() => {
              try {
                const { lng, lat } = map.unproject([downXY.x, downXY.y]);
                return [lng, lat] as [number, number];
              } catch {
                return [0, 0] as [number, number];
              }
            })();
        if (k2 === 'fertility') {
          const r2 = useClosedLoopStore
            .getState()
            .fertilityInfra.find((x) => x.id === id2);
          if (!r2) return;
          openForm({
            ...buildFertilityEditSchema(r2, updateFertilityInfra),
            anchor,
          });
        } else {
          const r2 = useWaterSystemsStore
            .getState()
            .waterNodes.find((x) => x.id === id2);
          if (!r2) return;
          openForm({
            ...buildWaterNodeEditSchema(r2, updateWaterNode),
            anchor,
          });
        }
      };
      map.on('mousemove', onMove);
      map.on('mouseup', onUp);
    };

    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);
    map.on('mousedown', layerId, onMouseDown);

    return () => {
      try {
        map.off('mouseenter', layerId, onMouseEnter);
        map.off('mouseleave', layerId, onMouseLeave);
        map.off('mousedown', layerId, onMouseDown);
        map.dragPan.enable();
      } catch {
        /* map already disposed */
      }
    };
  }, [
    map,
    activeTool,
    updateFertilityInfra,
    updateWaterNode,
    setSelection,
    openForm,
    editable,
  ]);

  // Click-to-edit for setback rings. Rings are anchored to their source
  // feature via sourceKind+sourceId — they are NOT drag-translatable,
  // since translating would detach them from the "X metres of clearance
  // around <thing>" semantics. Saving the popover always re-buffers from
  // the source's current geometry; if the source has been deleted (or
  // moved off-project), the existing materialised geometry is preserved.
  useEffect(() => {
    if (!map) return;
    if (activeTool !== null) return;
    const layerId = `${LAYER_PREFIX}setback-fill`;

    const lookupSourceGeom = (
      kind: SetbackSourceKind,
      id: string,
    ):
      | GeoJSON.Polygon
      | GeoJSON.MultiPolygon
      | GeoJSON.LineString
      | null => {
      switch (kind) {
        case 'zone': {
          const r = useZoneStore
            .getState()
            .zones.find((x) => x.id === id && x.projectId === projectId);
          return r?.geometry ?? null;
        }
        case 'crop': {
          const r = useCropStore
            .getState()
            .cropAreas.find((x) => x.id === id && x.projectId === projectId);
          return r?.geometry ?? null;
        }
        case 'paddock': {
          const r = useLivestockStore
            .getState()
            .paddocks.find((x) => x.id === id && x.projectId === projectId);
          return r?.geometry ?? null;
        }
        case 'structure': {
          const r = getAllStructures().find(
            (x) => x.id === id && x.projectId === projectId,
          );
          return r?.geometry ?? null;
        }
        case 'path': {
          const r = usePathStore
            .getState()
            .paths.find((x) => x.id === id && x.projectId === projectId);
          return r?.geometry ?? null;
        }
        case 'utility': {
          const r = useUtilityRunStore
            .getState()
            .runs.find((x) => x.id === id && x.projectId === projectId);
          return r?.geometry ?? null;
        }
      }
    };

    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.kind !== 'setback') return;
      const id = String(f.properties.id);
      const r = useSetbackStore.getState().rings.find((x) => x.id === id);
      if (!r) return;
      const selItem = { kind: 'setback' as const, id };
      if (e.originalEvent.shiftKey) {
        usePlanSelectionStore.getState().toggle(selItem);
      } else {
        setSelection([selItem]);
      }
      const anchor: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const rebuffer = (distanceM: number) => {
        const src = lookupSourceGeom(r.sourceKind, r.sourceId);
        if (!src) return undefined;
        return bufferGeometry(src, distanceM);
      };
      openForm({
        ...buildSetbackRingEditSchema(r, updateSetbackRing, rebuffer),
        anchor,
      });
    };

    map.on('click', layerId, onClick);

    return () => {
      try {
        map.off('click', layerId, onClick);
      } catch {
        /* map already disposed */
      }
    };
  }, [
    map,
    activeTool,
    projectId,
    updateSetbackRing,
    setSelection,
    openForm,
    editable,
  ]);

  // Click-to-edit for flow connectors. Connectors are not drag-translatable
  // in v1 — translating would scramble the source→sink semantics that the
  // ▶ arrows along the line are advertising. Edits go through the inline
  // popover (name / kind / from-name / to-name / phase / enterprise).
  useEffect(() => {
    if (!map) return;
    if (activeTool !== null) return;
    const layerId = `${LAYER_PREFIX}flow-line`;

    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.kind !== 'flow') return;
      const id = String(f.properties.id);
      const r = useClosedLoopStore
        .getState()
        .materialFlows.find((x) => x.id === id);
      if (!r) return;
      const selItem = { kind: 'flow' as const, id };
      if (e.originalEvent.shiftKey) {
        usePlanSelectionStore.getState().toggle(selItem);
      } else {
        setSelection([selItem]);
      }
      const anchor: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      openForm({
        ...buildFlowConnectorEditSchema(r, updateFlowConnector, flowEndpointOptions),
        anchor,
      });
    };

    map.on('click', layerId, onClick);

    return () => {
      try {
        map.off('click', layerId, onClick);
      } catch {
        /* map already disposed */
      }
    };
  }, [
    map,
    activeTool,
    updateFlowConnector,
    flowEndpointOptions,
    setSelection,
    openForm,
    editable,
  ]);

  // Click-to-edit for monitoring transects. Like flow connectors and
  // setbacks, transects are not drag-translatable — moving the line
  // breaks the "this is the route I walk every <cadence>" semantics.
  useEffect(() => {
    if (!map) return;
    if (activeTool !== null) return;
    const layerId = `${LAYER_PREFIX}transect-line`;

    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.kind !== 'transect') return;
      const id = String(f.properties.id);
      const r = useMonitoringTransectStore
        .getState()
        .transects.find((x) => x.id === id);
      if (!r) return;
      const selItem = { kind: 'transect' as const, id };
      if (e.originalEvent.shiftKey) {
        usePlanSelectionStore.getState().toggle(selItem);
      } else {
        setSelection([selItem]);
      }
      const anchor: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      openForm({
        ...buildMonitoringTransectEditSchema(r, updateMonitoringTransect),
        anchor,
      });
    };

    map.on('click', layerId, onClick);

    return () => {
      try {
        map.off('click', layerId, onClick);
      } catch {
        /* map already disposed */
      }
    };
  }, [
    map,
    activeTool,
    updateMonitoringTransect,
    setSelection,
    openForm,
    editable,
  ]);

  // Read-only click→selection. The 5 composite mousedown handlers above
  // (guild, structure, polygon, line, point) each gate themselves on
  // `editable` to keep drag-to-translate disabled in Observe / Act. To
  // still surface the `PlanSelectionFloater` for those features in the
  // read-only stages, register a parallel click-only listener that just
  // writes to `usePlanSelectionStore`. In editable mode the existing
  // mousedown path also writes selection — duplicate writes are
  // idempotent. Catchment-centroid points are selected via their
  // poly-fill, so the `water_catchment` point kind is intentionally not
  // surfaced here.
  useEffect(() => {
    if (!map) return;
    if (activeTool !== null) return;
    const layerIds = [
      `${LAYER_PREFIX}point`,
      `${LAYER_PREFIX}poly-fill`,
      `${LAYER_PREFIX}line`,
    ];

    const KIND_MAP: Record<string, PlanSelectionKind | undefined> = {
      guild: 'guild',
      structure: 'structure',
      zone: 'zone',
      crop: 'crop',
      paddock: 'paddock',
      water_catchment: 'water',
      path: 'path',
      water_swale: 'water',
      utility: 'utility',
      fertility: 'fertility',
      water_storage: 'water',
      water_sink: 'water',
    };

    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const k = typeof f?.properties?.kind === 'string'
        ? f.properties.kind
        : null;
      if (!k) return;
      const planKind = KIND_MAP[k];
      if (!planKind) return;
      const id = String(f!.properties!.id);
      const selItem = { kind: planKind, id };
      if (e.originalEvent.shiftKey) {
        usePlanSelectionStore.getState().toggle(selItem);
      } else {
        setSelection([selItem]);
      }
    };

    for (const lid of layerIds) {
      map.on('click', lid, onClick);
    }
    return () => {
      for (const lid of layerIds) {
        try {
          map.off('click', lid, onClick);
        } catch {
          /* map already disposed */
        }
      }
    };
  }, [map, activeTool, setSelection]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (!map) return;
      try {
        const allLayers = map.getStyle()?.layers ?? [];
        for (const l of allLayers) {
          if (l.id.startsWith(LAYER_PREFIX) && map.getLayer(l.id)) {
            map.removeLayer(l.id);
          }
        }
        const sources = (map.getStyle()?.sources ?? {}) as Record<
          string,
          unknown
        >;
        for (const sid of Object.keys(sources)) {
          if (sid.startsWith(SOURCE_PREFIX) && map.getSource(sid)) {
            map.removeSource(sid);
          }
        }
      } catch {
        /* map already disposed */
      }
    };
  }, [map]);

  // Mirror activeUnion into displayedUnion so the tooltip can play its
  // CSS exit-fade after activeUnion → null. Two kinds of transition are
  // managed here:
  //
  //   1. Container fade (full dismiss): activeUnion → null flips the
  //      mirror's phase to 'exiting'. The tooltip's container
  //      onTransitionEnd (propertyName='opacity') fires onExited which
  //      clears the mirror. A 200 ms safety timeout covers the
  //      prefers-reduced-motion case (where transitionend never fires
  //      because `transition: none` makes the change instant) and any
  //      other edge where the event is missed.
  //
  //   2. Per-block fade (partial set change): activeUnion's hostId set
  //      changes while still non-null. We merge prev entries with the
  //      new active set by hostId — kept hosts get phase='entering'
  //      with refreshed data, dropped hosts get phase='exiting' and
  //      remain in the array until their own per-block
  //      onTransitionEnd fires onEntryExited, which drops them.
  //
  // Reverse-in-flight (re-enter mid-exit) is automatic with CSS
  // transitions: flipping a host's phase from 'exiting' back to
  // 'entering' transitions opacity from its current value back to 1
  // with no snap; flipping the container's phase from 'exiting' back
  // to 'entering' does the same at the container level.
  const activeUnion = pinnedUnion ?? hoveredUnion;
  useEffect(() => {
    if (activeUnion) {
      setDisplayedUnion((prev) => {
        const newIds = new Set(activeUnion.entries.map((e) => e.hostId));
        const prevEntries = prev?.entries ?? [];
        const prevIds = new Set(prevEntries.map((e) => e.hostId));
        // Preserve prev stack order (kept + still-exiting), then
        // append brand-new hosts in their MapLibre topmost-first
        // order. This keeps the visible block positions stable while
        // a host fades out instead of having the stack reflow.
        const merged: HostBlockEntry[] = [];
        for (const p of prevEntries) {
          if (newIds.has(p.hostId)) {
            const fresh = activeUnion.entries.find(
              (e) => e.hostId === p.hostId,
            )!;
            merged.push({ ...fresh, phase: 'entering' });
          } else {
            merged.push({ ...p, phase: 'exiting' });
          }
        }
        for (const e of activeUnion.entries) {
          if (!prevIds.has(e.hostId)) {
            merged.push({ ...e, phase: 'entering' });
          }
        }
        return {
          point: activeUnion.point,
          entries: merged,
          phase: 'entering',
        };
      });
      return;
    }
    setDisplayedUnion((prev) =>
      prev && prev.phase !== 'exiting'
        ? { ...prev, phase: 'exiting' }
        : prev,
    );
    const t = window.setTimeout(() => {
      setDisplayedUnion((prev) =>
        prev?.phase === 'exiting' ? null : prev,
      );
    }, 200);
    return () => window.clearTimeout(t);
  }, [activeUnion]);

  // Per-host union hover tooltip is portalled into the map's canvas
  // container so the cursor-pixel coordinates from `e.point` resolve
  // directly against the tooltip's `position: absolute` origin. No
  // other JSX is emitted — PlanDataLayers remains a side-effect-only
  // component for everything else.
  // Pinned tooltip takes precedence over hover; only one ever renders.
  if (!displayedUnion || !map) return null;
  const canvasContainer = map.getCanvasContainer();
  if (!canvasContainer) return null;
  return createPortal(
    <HostCanopyUnionTooltip
      point={displayedUnion.point}
      entries={displayedUnion.entries}
      pinned={!!pinnedUnion && displayedUnion.phase !== 'exiting'}
      exiting={displayedUnion.phase === 'exiting'}
      onExited={() => setDisplayedUnion(null)}
      onEntryExited={(hostId) => {
        setDisplayedUnion((prev) => {
          if (!prev) return prev;
          const next = prev.entries.filter((e) => e.hostId !== hostId);
          if (next.length === prev.entries.length) return prev;
          // If the last visible block just finished fading out, drop
          // the mirror entirely so the container doesn't sit empty.
          if (next.length === 0) return null;
          return { ...prev, entries: next };
        });
      }}
    />,
    canvasContainer,
  );
}
