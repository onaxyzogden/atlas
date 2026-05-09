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

import { useEffect, useMemo } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useWaterSystemsStore } from '../../../store/waterSystemsStore.js';
import { useZoneStore } from '../../../store/zoneStore.js';
import { usePathStore } from '../../../store/pathStore.js';
import { useCropStore } from '../../../store/cropStore.js';
import { useClosedLoopStore } from '../../../store/closedLoopStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { usePolycultureStore } from '../../../store/polycultureStore.js';
import { useStructureStore } from '../../../store/structureStore.js';
import {
  useLayeringLensStore,
  RANK_COLOR,
} from '../../../store/layeringLensStore.js';
import { useEnterpriseStore } from '../../../store/enterpriseStore.js';
import { useEcologicalNoteStore } from '../../../store/ecologicalNoteStore.js';
import { useUtilityRunStore } from '../../../store/utilityRunStore.js';
import {
  useSetbackStore,
  type SetbackSourceKind,
} from '../../../store/setbackStore.js';
import { useFlowConnectorStore } from '../../../store/flowConnectorStore.js';
import { useMonitoringTransectStore } from '../../../store/monitoringTransectStore.js';
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
import type { StructureType } from '../../../store/structureStore.js';
import { translateByDelta } from './translateGeometry.js';
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
  const guilds = usePolycultureStore((s) => s.guilds);
  const updateGuild = usePolycultureStore((s) => s.updateGuild);
  const structures = useStructureStore((s) => s.structures);
  const updateStructure = useStructureStore((s) => s.updateStructure);
  const ecologicalNotes = useEcologicalNoteStore((s) => s.notes);
  const utilityRuns = useUtilityRunStore((s) => s.runs);
  const updateUtilityRun = useUtilityRunStore((s) => s.updateRun);
  const setbackRings = useSetbackStore((s) => s.rings);
  const updateSetbackRing = useSetbackStore((s) => s.updateRing);
  const flowConnectors = useFlowConnectorStore((s) => s.connectors);
  const updateFlowConnector = useFlowConnectorStore((s) => s.updateConnector);
  const monitoringTransects = useMonitoringTransectStore((s) => s.transects);
  const updateMonitoringTransect = useMonitoringTransectStore(
    (s) => s.updateTransect,
  );
  const activeTool = useMapToolStore((s) => s.activeTool);
  const openForm = useInlineFormStore((s) => s.open);
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

  const { polyFC, lineFC, pointFC, labelFC, setbackFC, flowFC, transectFC } = useMemo(() => {
    const polys: GeoJSON.Feature[] = [];
    const lines: GeoJSON.Feature[] = [];
    const points: GeoJSON.Feature[] = [];
    const labels: GeoJSON.Feature[] = [];
    const setbacks: GeoJSON.Feature[] = [];
    const flows: GeoJSON.Feature[] = [];
    const transects: GeoJSON.Feature[] = [];

    // Zones (polygon) — Yeomans rank 4 (Access; activity proximity).
    for (const z of zones) {
      if (z.projectId !== projectId) continue;
      const props = {
        id: z.id,
        kind: 'zone',
        color: z.color,
        label: z.name,
        yeomansRank: 4,
        enterprise: z.enterprise ?? '',
      };
      polys.push({ type: 'Feature', id: z.id, properties: props, geometry: z.geometry });
      try {
        const c = turf.centroid(z.geometry).geometry;
        labels.push({ type: 'Feature', id: z.id, properties: props, geometry: c });
      } catch {
        /* skip */
      }
    }

    // Crop areas (polygon) — Module 5 Plant Systems. Yeomans rank 8.
    for (const c of cropAreas) {
      if (c.projectId !== projectId) continue;
      const props = {
        id: c.id,
        kind: 'crop',
        color: c.color,
        label: c.name,
        yeomansRank: 8,
        enterprise: c.enterprise ?? '',
      };
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
      const props = {
        id: pd.id,
        kind: 'paddock',
        color: pd.color,
        label: pd.name,
        yeomansRank: 9,
        enterprise: pd.enterprise ?? '',
      };
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
      const props = {
        id: n.id,
        kind: planKind,
        color,
        label: n.name,
        yeomansRank: 2,
        enterprise: n.enterprise ?? '',
      };
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
      const props = {
        id: r.id,
        kind: 'setback',
        color: r.color,
        label: r.name,
        yeomansRank: 4,
        enterprise: r.enterprise ?? '',
      };
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
      const props = {
        id: fc.id,
        kind: 'flow',
        color: fc.color,
        label: fc.name,
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

    return {
      polyFC: { type: 'FeatureCollection' as const, features: polys },
      lineFC: { type: 'FeatureCollection' as const, features: lines },
      pointFC: { type: 'FeatureCollection' as const, features: points },
      labelFC: { type: 'FeatureCollection' as const, features: labels },
      setbackFC: { type: 'FeatureCollection' as const, features: setbacks },
      flowFC: { type: 'FeatureCollection' as const, features: flows },
      transectFC: { type: 'FeatureCollection' as const, features: transects },
    };
  }, [waterNodes, zones, paths, cropAreas, fertilityInfra, paddocks, guilds, structures, ecologicalNotes, utilityRuns, setbackRings, flowConnectors, monitoringTransects, projectId]);

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

      const ensureLayer = (spec: maplibregl.LayerSpecification) => {
        if (!map.getLayer(spec.id)) map.addLayer(spec);
      };

      // Colour expression toggles between per-feature `color` (default) and
      // a lens-mode-driven `match` (when the layering lens is enabled). The
      // two modes are: Yeomans rank (default) or enterprise-id (recolour by
      // multi-enterprise tag).
      const colorExpr = lensEnabled
        ? lensMode === 'enterprise'
          ? enterpriseColorExpr(enterprises)
          : rankColorExpr()
        : ['get', 'color'];

      ensureLayer({
        id: `${LAYER_PREFIX}poly-fill`,
        type: 'fill',
        source: polySid,
        paint: { 'fill-color': colorExpr as never, 'fill-opacity': 0.28 },
      });
      ensureLayer({
        id: `${LAYER_PREFIX}poly-line`,
        type: 'line',
        source: polySid,
        paint: {
          'line-color': colorExpr as never,
          'line-width': 1.5,
          'line-opacity': 0.9,
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
        paint: {
          'line-color': colorExpr as never,
          'line-width': 2,
          'line-opacity': 0.9,
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

      // Re-apply paint properties on existing layers so the toggle takes
      // effect for already-created layers (ensureLayer is a no-op when the
      // layer exists).
      try {
        map.setPaintProperty(`${LAYER_PREFIX}poly-fill`, 'fill-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}poly-line`, 'line-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}line`, 'line-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}point`, 'circle-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}point`, 'circle-stroke-color', strokeColorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}point`, 'circle-stroke-width', strokeWidthExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}point`, 'circle-radius', radiusExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}setback-fill`, 'fill-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}setback-line`, 'line-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}flow-line`, 'line-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}flow-arrow`, 'text-color', colorExpr as never);
        map.setPaintProperty(`${LAYER_PREFIX}transect-line`, 'line-color', colorExpr as never);
      } catch {
        /* layer may have been removed mid-toggle */
      }
      ensureLayer({
        id: `${LAYER_PREFIX}label`,
        type: 'symbol',
        source: labelSid,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
          'text-allow-overlap': false,
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
    lensEnabled,
    lensMode,
    enterprises,
    selectedGuildId,
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
        map.getCanvas().style.cursor = 'move';
      }
    };
    const onMouseLeave = () => {
      if (!down?.dragging) map.getCanvas().style.cursor = '';
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

      const onMove = (ev: maplibregl.MapMouseEvent) => {
        if (!down) return;
        const dx = ev.point.x - down.startX;
        const dy = ev.point.y - down.startY;
        if (!down.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          down.dragging = true;
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'grabbing';
        }
        if (!down.dragging) return;
        const dLng = ev.lngLat.lng - down.startLng;
        const dLat = ev.lngLat.lat - down.startLat;
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
        const downXY = { x: down.startX, y: down.startY };
        down = null;
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
        if (wasDrag) return;
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
        openForm({ ...buildGuildEditSchema(r2, updateGuild), anchor });
      };
      map.on('mousemove', onMove);
      map.on('mouseup', onUp);
    };
    const onBgClick = (e: maplibregl.MapMouseEvent) => {
      if (!map.getLayer(layerId)) return;
      try {
        const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
        const hit = features.find((feat) => feat.properties?.kind === 'guild');
        if (!hit) setSelection([]);
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
        map.getCanvas().style.cursor = 'move';
      }
    };
    const onMouseLeave = () => {
      if (!down?.dragging) map.getCanvas().style.cursor = '';
    };

    const onMouseDown = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.kind !== 'structure') return;
      e.preventDefault();
      const id = String(f.properties.id);
      const st0 = useStructureStore
        .getState()
        .structures.find((s) => s.id === id);
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

      const onMove = (ev: maplibregl.MapMouseEvent) => {
        if (!down) return;
        const dx = ev.point.x - down.x;
        const dy = ev.point.y - down.y;
        if (!down.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          down.dragging = true;
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'grabbing';
        }
        if (!down.dragging) return;
        // Translate by delta — keeps the cursor's grab-offset relative to
        // the polygon, and works for vertex-edited footprints whose
        // widthM/depthM/rotationDeg no longer describe the geometry.
        const dLng = ev.lngLat.lng - down.startLng;
        const dLat = ev.lngLat.lat - down.startLat;
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
        const downXY = { x: down.x, y: down.y };
        down = null;
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
        if (wasDrag) return;
        // Click (no drag) → open edit popover.
        const st = useStructureStore
          .getState()
          .structures.find((s) => s.id === id);
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
      origGeom: GeoJSON.Geometry;
      origCenter: [number, number] | null;
      dragging: boolean;
    };
    let down: DragState | null = null;

    const onMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const k = f?.properties?.kind;
      if (typeof k === 'string' && HANDLED.includes(k)) {
        map.getCanvas().style.cursor = 'move';
      }
    };
    const onMouseLeave = () => {
      if (!down?.dragging) map.getCanvas().style.cursor = '';
    };

    const onMouseDown = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
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

      const onMove = (ev: maplibregl.MapMouseEvent) => {
        if (!down) return;
        const dx = ev.point.x - down.startX;
        const dy = ev.point.y - down.startY;
        if (!down.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          down.dragging = true;
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'grabbing';
        }
        if (!down.dragging) return;
        const dLng = ev.lngLat.lng - down.startLng;
        const dLat = ev.lngLat.lat - down.startLat;
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
        const downXY = { x: down.startX, y: down.startY };
        down = null;
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
        if (wasDrag) return;
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

    const readRecordGeometry = (
      k: string,
      id: string,
    ): GeoJSON.Geometry | null => {
      if (k === 'zone') {
        const r = useZoneStore.getState().zones.find((x) => x.id === id);
        return r?.geometry ?? null;
      }
      if (k === 'crop') {
        const r = useCropStore.getState().cropAreas.find((x) => x.id === id);
        return r?.geometry ?? null;
      }
      if (k === 'paddock') {
        const r = useLivestockStore
          .getState()
          .paddocks.find((x) => x.id === id);
        return r?.geometry ?? null;
      }
      if (k === 'water_catchment') {
        const r = useWaterSystemsStore
          .getState()
          .waterNodes.find((x) => x.id === id);
        return r?.geometry ?? null;
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
        return r ? buildCropEditSchema(r, updateCropArea) : null;
      }
      if (k === 'paddock') {
        const r = useLivestockStore
          .getState()
          .paddocks.find((x) => x.id === id);
        return r ? buildPaddockEditSchema(r, updatePaddock) : null;
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
        map.getCanvas().style.cursor = 'move';
      }
    };
    const onMouseLeave = () => {
      if (!down?.dragging) map.getCanvas().style.cursor = '';
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

      const onMove = (ev: maplibregl.MapMouseEvent) => {
        if (!down) return;
        const dx = ev.point.x - down.startX;
        const dy = ev.point.y - down.startY;
        if (!down.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          down.dragging = true;
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'grabbing';
        }
        if (!down.dragging) return;
        const dLng = ev.lngLat.lng - down.startLng;
        const dLat = ev.lngLat.lat - down.startLat;
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
        const downXY = { x: down.startX, y: down.startY };
        down = null;
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
        if (wasDrag) return;
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
        map.getCanvas().style.cursor = 'move';
      }
    };
    const onMouseLeave = () => {
      if (!down?.dragging) map.getCanvas().style.cursor = '';
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

      const onMove = (ev: maplibregl.MapMouseEvent) => {
        if (!down) return;
        const dx = ev.point.x - down.startX;
        const dy = ev.point.y - down.startY;
        if (!down.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          down.dragging = true;
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'grabbing';
        }
        if (!down.dragging) return;
        const dLng = ev.lngLat.lng - down.startLng;
        const dLat = ev.lngLat.lat - down.startLat;
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
        const downXY = { x: down.startX, y: down.startY };
        down = null;
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
        if (wasDrag) return;
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
    if (!editable) return;
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
          const r = useStructureStore
            .getState()
            .structures.find((x) => x.id === id && x.projectId === projectId);
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

    const onMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
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

    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);
    map.on('click', layerId, onClick);

    return () => {
      try {
        map.off('mouseenter', layerId, onMouseEnter);
        map.off('mouseleave', layerId, onMouseLeave);
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
    if (!editable) return;
    if (activeTool !== null) return;
    const layerId = `${LAYER_PREFIX}flow-line`;

    const onMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.kind !== 'flow') return;
      const id = String(f.properties.id);
      const r = useFlowConnectorStore
        .getState()
        .connectors.find((x) => x.id === id);
      if (!r) return;
      const selItem = { kind: 'flow' as const, id };
      if (e.originalEvent.shiftKey) {
        usePlanSelectionStore.getState().toggle(selItem);
      } else {
        setSelection([selItem]);
      }
      const anchor: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      openForm({
        ...buildFlowConnectorEditSchema(r, updateFlowConnector),
        anchor,
      });
    };

    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);
    map.on('click', layerId, onClick);

    return () => {
      try {
        map.off('mouseenter', layerId, onMouseEnter);
        map.off('mouseleave', layerId, onMouseLeave);
        map.off('click', layerId, onClick);
      } catch {
        /* map already disposed */
      }
    };
  }, [
    map,
    activeTool,
    updateFlowConnector,
    setSelection,
    openForm,
    editable,
  ]);

  // Click-to-edit for monitoring transects. Like flow connectors and
  // setbacks, transects are not drag-translatable — moving the line
  // breaks the "this is the route I walk every <cadence>" semantics.
  useEffect(() => {
    if (!map) return;
    if (!editable) return;
    if (activeTool !== null) return;
    const layerId = `${LAYER_PREFIX}transect-line`;

    const onMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };
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

    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);
    map.on('click', layerId, onClick);

    return () => {
      try {
        map.off('mouseenter', layerId, onMouseEnter);
        map.off('mouseleave', layerId, onMouseLeave);
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

  return null;
}
