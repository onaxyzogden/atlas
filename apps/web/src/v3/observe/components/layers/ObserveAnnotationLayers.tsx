/**
 * ObserveAnnotationLayers — renders steward-placed OBSERVE annotations as
 * persistent MapLibre layers. Mounted as a `DiagnoseMap` render-prop child
 * alongside `MapToolbar` and `ObserveDrawHost`.
 *
 * Subscribes to the seven Scholar-aligned namespaces (humanContext, hazards,
 * sectors, topography, waterSystems, ecology, swot) plus soilSamples,
 * filters by projectId, and assembles GeoJSON FeatureCollections per
 * (module × geometry-type). Sources + layers are re-added after every
 * `style.load` so they survive basemap swaps. The `observeAnnotations`
 * master toggle in the Overlays popover hides the entire layer set.
 *
 * Colour palette is module-coded (Earth-Green): human=warm yellow,
 * hazards=amber, topography=brown, water=blue, soil=slate, ecology=green,
 * sectors=gold, swot=violet.
 */

import { useEffect, useMemo } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useHumanContextStore } from '../../../../store/humanContextStore.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { useExternalForcesStore } from '../../../../store/externalForcesStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useEcologyStore } from '../../../../store/ecologyStore.js';
import { useSwotStore } from '../../../../store/swotStore.js';
import { useSoilSampleStore } from '../../../../store/soilSampleStore.js';
import { useHomesteadStore } from '../../../../store/homesteadStore.js';
import { useMatrixTogglesStore } from '../../../../store/matrixTogglesStore.js';
import { useAnnotationDetailStore } from '../../../../store/annotationDetailStore.js';
import { useObserveSelectionStore } from '../../../../store/observeSelectionStore.js';
import type { AnnotationKind } from '../draw/annotationFieldSchemas.js';

interface Props {
  map: MaplibreMap;
  projectId: string | null;
}

const SOURCE_PREFIX = 'observe-anno-';
const LAYER_PREFIX = 'observe-anno-';
const HALO_SOURCE = 'observe-anno-selection';
const HALO_LAYER_CIRCLE = 'observe-anno-selection-circle';
const HALO_LAYER_LINE = 'observe-anno-selection-line';
const HALO_COLOR = '#c4a265';
const HALO_OUTLINE = '#3a2a1a';

interface LayerSpec {
  /** Stable id suffix; `${SOURCE_PREFIX}${id}` is the source id. */
  id: string;
  data: GeoJSON.FeatureCollection;
  /** One or more MapLibre layer specs over this source. */
  layers: maplibregl.LayerSpecification[];
}

type AnnoLayer = maplibregl.LayerSpecification;

// ── Module palette (Earth-Green) ───────────────────────────────────────────────
const PALETTE = {
  human: '#c4a265',
  humanRoadPublic: '#8a6a3f',
  humanRoadPrivate: '#a8884f',
  humanRoadFootpath: '#c4a265',
  humanZoneRing: 'rgba(196,162,101,0.18)',
  humanZoneStroke: '#7a6a3f',
  hazard: '#c87a3f',
  topographyContour: '#8a6a3f',
  topographyDrainage: '#5b7a8a',
  topographyHigh: '#a85a3f',
  topographyLow: '#5b7a8a',
  water: '#3a8aa8',
  waterEphemeral: '#7aa8b8',
  soil: '#6a5a4a',
  ecologyDisturbed: '#a85a3f',
  ecologyPioneer: '#c4a265',
  ecologyMid: '#7aa86a',
  ecologyLate: '#4a8a5a',
  ecologyClimax: '#2a6a3a',
  sector: '#c4a265',
  sectorWind: '#5b7a8a',
  sectorFire: '#c87a3f',
  sectorView: '#7aa86a',
  swotS: '#4a8a5a',
  swotW: '#a85a3f',
  swotO: '#3a8aa8',
  swotT: '#7c5a8a',
};

const ECOLOGY_STAGE_COLOR: Record<string, string> = {
  disturbed: PALETTE.ecologyDisturbed,
  pioneer: PALETTE.ecologyPioneer,
  mid: PALETTE.ecologyMid,
  late: PALETTE.ecologyLate,
  climax: PALETTE.ecologyClimax,
};

const SECTOR_TYPE_COLOR: Record<string, string> = {
  sun_summer: '#e0b860',
  sun_winter: '#c89048',
  wind_prevailing: PALETTE.sectorWind,
  wind_storm: '#3a5a7a',
  fire: PALETTE.sectorFire,
  noise: '#7a7a7a',
  wildlife: PALETTE.sectorView,
  view: '#9a8aa8',
};

const SWOT_COLOR: Record<string, string> = {
  S: PALETTE.swotS,
  W: PALETTE.swotW,
  O: PALETTE.swotO,
  T: PALETTE.swotT,
};

const ROAD_COLOR: Record<string, string> = {
  public: PALETTE.humanRoadPublic,
  private: PALETTE.humanRoadPrivate,
  footpath: PALETTE.humanRoadFootpath,
};

// ── Geometry helpers ───────────────────────────────────────────────────────────

/** Build a circular polygon (lng/lat) approximating a circle of `radiusM`. */
function circlePolygon(
  center: [number, number],
  radiusM: number,
  steps = 64,
): GeoJSON.Polygon {
  const f = turf.circle(center, radiusM / 1000, { steps, units: 'kilometers' });
  return f.geometry;
}

/** Build a wedge (sector) polygon anchored at `center`, opening along
 *  `bearingDeg` ± `arcDeg/2`, with outer radius `radiusM`. */
function wedgePolygon(
  center: [number, number],
  bearingDeg: number,
  arcDeg: number,
  radiusM: number,
  steps = 24,
): GeoJSON.Polygon {
  const half = arcDeg / 2;
  const start = bearingDeg - half;
  const end = bearingDeg + half;
  const ring: [number, number][] = [center];
  for (let i = 0; i <= steps; i++) {
    const b = start + ((end - start) * i) / steps;
    const dest = turf.destination(turf.point(center), radiusM / 1000, b, {
      units: 'kilometers',
    });
    const c = dest.geometry.coordinates as [number, number];
    ring.push(c);
  }
  ring.push(center);
  return { type: 'Polygon', coordinates: [ring] };
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ObserveAnnotationLayers({ map, projectId }: Props) {
  const visible = useMatrixTogglesStore((s) => s.observeAnnotations);

  // Subscribe by full namespace (per ADR 2026-04-26 — no inline filtering in
  // the selector) and filter via useMemo below.
  const neighbours = useHumanContextStore((s) => s.neighbours);
  const households = useHumanContextStore((s) => s.households);
  const accessRoads = useHumanContextStore((s) => s.accessRoads);
  const permacultureZones = useHumanContextStore((s) => s.permacultureZones);
  const contours = useTopographyStore((s) => s.contours);
  const highPoints = useTopographyStore((s) => s.highPoints);
  const drainageLines = useTopographyStore((s) => s.drainageLines);
  const hazards = useExternalForcesStore((s) => s.hazards);
  const sectors = useExternalForcesStore((s) => s.sectors);
  const watercourses = useWaterSystemsStore((s) => s.watercourses);
  const ecologyZones = useEcologyStore((s) => s.ecologyZones);
  const swot = useSwotStore((s) => s.swot);
  const soilSamples = useSoilSampleStore((s) => s.samples);
  const homesteadByProject = useHomesteadStore((s) => s.byProject);
  const homestead = projectId ? homesteadByProject[projectId] : undefined;

  const layerSpecs = useMemo<LayerSpec[]>(() => {
    if (!projectId) return [];

    const inProject = <T extends { projectId: string }>(arr: T[]): T[] =>
      arr.filter((x) => x.projectId === projectId);

    const result: LayerSpec[] = [];

    // ── Human Context: points (neighbours + households) ─────────────────────
    const humanPoints: GeoJSON.Feature[] = [
      ...inProject(neighbours).map<GeoJSON.Feature>((n) => ({
        type: 'Feature',
        properties: {
          kind: 'neighbour',
          label: n.label ?? '',
          annoKind: 'neighbourPin',
          annoId: n.id,
        },
        geometry: { type: 'Point', coordinates: n.position },
      })),
      ...inProject(households).map<GeoJSON.Feature>((h) => ({
        type: 'Feature',
        properties: {
          kind: 'household',
          label: h.label ?? '',
          annoKind: 'household',
          annoId: h.id,
        },
        geometry: { type: 'Point', coordinates: h.position },
      })),
    ];
    if (humanPoints.length) {
      result.push({
        id: 'human-points',
        data: { type: 'FeatureCollection', features: humanPoints },
        layers: [
          {
            id: `${LAYER_PREFIX}human-points`,
            type: 'circle',
            source: `${SOURCE_PREFIX}human-points`,
            paint: {
              'circle-radius': [
                'case',
                ['==', ['get', 'kind'], 'household'],
                7,
                5,
              ],
              'circle-color': PALETTE.human,
              'circle-stroke-color': '#3a2a1a',
              'circle-stroke-width': 1.25,
              'circle-opacity': 0.9,
            },
          },
        ],
      });
    }

    // ── Human Context: access roads ─────────────────────────────────────────
    const roadFeatures: GeoJSON.Feature[] = inProject(accessRoads).map((r) => ({
      type: 'Feature',
      properties: {
        kind: r.kind,
        color: ROAD_COLOR[r.kind] ?? PALETTE.human,
        annoKind: 'accessRoad',
        annoId: r.id,
      },
      geometry: r.geometry,
    }));
    if (roadFeatures.length) {
      result.push({
        id: 'human-roads',
        data: { type: 'FeatureCollection', features: roadFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}human-roads-solid`,
            type: 'line',
            source: `${SOURCE_PREFIX}human-roads`,
            filter: ['!=', ['get', 'kind'], 'footpath'],
            paint: {
              'line-color': ['get', 'color'],
              'line-width': [
                'case',
                ['==', ['get', 'kind'], 'public'],
                3,
                2,
              ],
              'line-opacity': 0.85,
            },
          },
          {
            id: `${LAYER_PREFIX}human-roads-foot`,
            type: 'line',
            source: `${SOURCE_PREFIX}human-roads`,
            filter: ['==', ['get', 'kind'], 'footpath'],
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 1.25,
              'line-opacity': 0.85,
              'line-dasharray': [2, 2],
            },
          },
        ],
      });
    }

    // ── Human Context: permaculture zones (six concentric rings) ────────────
    const zoneFeatures: GeoJSON.Feature[] = [];
    for (const z of inProject(permacultureZones)) {
      z.ringRadiiM.forEach((radiusM, i) => {
        if (!radiusM || radiusM <= 0) return;
        zoneFeatures.push({
          type: 'Feature',
          properties: { ring: i, label: `Zone ${i}` },
          geometry: circlePolygon(z.anchorPoint, radiusM),
        });
      });
    }
    if (zoneFeatures.length) {
      // Render largest first so smaller rings layer on top.
      zoneFeatures.sort(
        (a, b) =>
          ((b.properties?.ring as number) ?? 0) -
          ((a.properties?.ring as number) ?? 0),
      );
      result.push({
        id: 'human-zones',
        data: { type: 'FeatureCollection', features: zoneFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}human-zones-fill`,
            type: 'fill',
            source: `${SOURCE_PREFIX}human-zones`,
            paint: {
              'fill-color': PALETTE.humanZoneRing,
              'fill-opacity': 0.35,
            },
          },
          {
            id: `${LAYER_PREFIX}human-zones-line`,
            type: 'line',
            source: `${SOURCE_PREFIX}human-zones`,
            paint: {
              'line-color': PALETTE.humanZoneStroke,
              'line-width': 1,
              'line-opacity': 0.55,
              'line-dasharray': [3, 2],
            },
          },
        ],
      });
    }

    // ── Hazards (polygon-only — historical tabular hazards have no geometry) ─
    const hazardFeatures: GeoJSON.Feature[] = inProject(hazards)
      .filter((h) => !!h.geometry)
      .map((h) => ({
        type: 'Feature',
        properties: {
          kind: h.type,
          severity: h.severity ?? 'med',
          annoKind: h.type === 'frost' ? 'frostPocket' : 'hazardZone',
          annoId: h.id,
        },
        geometry: h.geometry as GeoJSON.Polygon,
      }));
    if (hazardFeatures.length) {
      result.push({
        id: 'hazards',
        data: { type: 'FeatureCollection', features: hazardFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}hazards-fill`,
            type: 'fill',
            source: `${SOURCE_PREFIX}hazards`,
            paint: {
              'fill-color': PALETTE.hazard,
              'fill-opacity': 0.18,
            },
          },
          {
            id: `${LAYER_PREFIX}hazards-line`,
            type: 'line',
            source: `${SOURCE_PREFIX}hazards`,
            paint: {
              'line-color': PALETTE.hazard,
              'line-width': 1.5,
              'line-opacity': 0.85,
              'line-dasharray': [4, 2],
            },
          },
        ],
      });
    }

    // ── Sectors (anchor on homestead, fall back to map center) ──────────────
    const projectSectors = inProject(sectors);
    if (projectSectors.length) {
      const center = map.getCenter();
      const anchor: [number, number] = homestead ?? [center.lng, center.lat];
      const sectorFeatures: GeoJSON.Feature[] = projectSectors.map((s) => ({
        type: 'Feature',
        properties: {
          kind: s.type,
          color: SECTOR_TYPE_COLOR[s.type] ?? PALETTE.sector,
        },
        geometry: wedgePolygon(anchor, s.bearingDeg, s.arcDeg, 250),
      }));
      result.push({
        id: 'sectors',
        data: { type: 'FeatureCollection', features: sectorFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}sectors-fill`,
            type: 'fill',
            source: `${SOURCE_PREFIX}sectors`,
            paint: {
              'fill-color': ['get', 'color'],
              'fill-opacity': 0.16,
            },
          },
          {
            id: `${LAYER_PREFIX}sectors-line`,
            type: 'line',
            source: `${SOURCE_PREFIX}sectors`,
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 1,
              'line-opacity': 0.55,
            },
          },
        ],
      });
    }

    // ── Topography: lines (contours + drainage) ─────────────────────────────
    const topoLines: GeoJSON.Feature[] = [
      ...inProject(contours).map<GeoJSON.Feature>((c) => ({
        type: 'Feature',
        properties: {
          kind: 'contour',
          color: PALETTE.topographyContour,
          annoKind: 'contourLine',
          annoId: c.id,
        },
        geometry: c.geometry,
      })),
      ...inProject(drainageLines).map<GeoJSON.Feature>((d) => ({
        type: 'Feature',
        properties: {
          kind: 'drainage',
          color: PALETTE.topographyDrainage,
          annoKind: 'drainageLine',
          annoId: d.id,
        },
        geometry: d.geometry,
      })),
    ];
    if (topoLines.length) {
      result.push({
        id: 'topography-lines',
        data: { type: 'FeatureCollection', features: topoLines },
        layers: [
          {
            id: `${LAYER_PREFIX}topography-contours`,
            type: 'line',
            source: `${SOURCE_PREFIX}topography-lines`,
            filter: ['==', ['get', 'kind'], 'contour'],
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 1.5,
              'line-opacity': 0.8,
            },
          },
          {
            id: `${LAYER_PREFIX}topography-drainage`,
            type: 'line',
            source: `${SOURCE_PREFIX}topography-lines`,
            filter: ['==', ['get', 'kind'], 'drainage'],
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 1.5,
              'line-opacity': 0.8,
              'line-dasharray': [3, 2],
            },
          },
        ],
      });
    }

    // ── Topography: high/low points ────────────────────────────────────────
    const hpFeatures: GeoJSON.Feature[] = inProject(highPoints).map((h) => ({
      type: 'Feature',
      properties: {
        kind: h.kind,
        color:
          h.kind === 'high' ? PALETTE.topographyHigh : PALETTE.topographyLow,
        label: h.label ?? '',
        annoKind: 'highPoint',
        annoId: h.id,
      },
      geometry: { type: 'Point', coordinates: h.position },
    }));
    if (hpFeatures.length) {
      result.push({
        id: 'topography-points',
        data: { type: 'FeatureCollection', features: hpFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}topography-points`,
            type: 'circle',
            source: `${SOURCE_PREFIX}topography-points`,
            paint: {
              'circle-radius': 5,
              'circle-color': ['get', 'color'],
              'circle-stroke-color': '#3a2a1a',
              'circle-stroke-width': 1.25,
              'circle-opacity': 0.9,
            },
          },
        ],
      });
    }

    // ── Watercourses (natural drainage) ────────────────────────────────────
    const waterFeatures: GeoJSON.Feature[] = inProject(watercourses).map((w) => ({
      type: 'Feature',
      properties: {
        kind: w.kind,
        perennial: w.perennial ?? false,
        annoKind: 'watercourse',
        annoId: w.id,
      },
      geometry: w.geometry,
    }));
    if (waterFeatures.length) {
      result.push({
        id: 'water-lines',
        data: { type: 'FeatureCollection', features: waterFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}water-perennial`,
            type: 'line',
            source: `${SOURCE_PREFIX}water-lines`,
            filter: ['==', ['get', 'perennial'], true],
            paint: {
              'line-color': PALETTE.water,
              'line-width': 2,
              'line-opacity': 0.9,
            },
          },
          {
            id: `${LAYER_PREFIX}water-ephemeral`,
            type: 'line',
            source: `${SOURCE_PREFIX}water-lines`,
            filter: ['!=', ['get', 'perennial'], true],
            paint: {
              'line-color': PALETTE.waterEphemeral,
              'line-width': 2,
              'line-opacity': 0.9,
              'line-dasharray': [3, 2],
            },
          },
        ],
      });
    }

    // ── Soil samples (only those with a location) ──────────────────────────
    const soilFeatures: GeoJSON.Feature[] = inProject(soilSamples)
      .filter((s) => s.location !== null)
      .map((s) => ({
        type: 'Feature',
        properties: {
          label: s.label,
          depth: s.depth,
          annoKind: 'soilSample',
          annoId: s.id,
        },
        geometry: {
          type: 'Point',
          coordinates: s.location as [number, number],
        },
      }));
    if (soilFeatures.length) {
      result.push({
        id: 'soil-points',
        data: { type: 'FeatureCollection', features: soilFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}soil-points`,
            type: 'circle',
            source: `${SOURCE_PREFIX}soil-points`,
            paint: {
              'circle-radius': 5,
              'circle-color': PALETTE.soil,
              'circle-stroke-color': '#1a1208',
              'circle-stroke-width': 1.25,
              'circle-opacity': 0.85,
            },
          },
        ],
      });
    }

    // ── Ecology zones ──────────────────────────────────────────────────────
    const ecoFeatures: GeoJSON.Feature[] = inProject(ecologyZones).map((z) => ({
      type: 'Feature',
      properties: {
        stage: z.dominantStage,
        color: ECOLOGY_STAGE_COLOR[z.dominantStage] ?? PALETTE.ecologyMid,
        label: z.label ?? '',
        annoKind: 'ecologyZone',
        annoId: z.id,
      },
      geometry: z.geometry,
    }));
    if (ecoFeatures.length) {
      result.push({
        id: 'ecology',
        data: { type: 'FeatureCollection', features: ecoFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}ecology-fill`,
            type: 'fill',
            source: `${SOURCE_PREFIX}ecology`,
            paint: {
              'fill-color': ['get', 'color'],
              'fill-opacity': 0.22,
            },
          },
          {
            id: `${LAYER_PREFIX}ecology-line`,
            type: 'line',
            source: `${SOURCE_PREFIX}ecology`,
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 1.5,
              'line-opacity': 0.85,
            },
          },
        ],
      });
    }

    // ── SWOT pins ──────────────────────────────────────────────────────────
    const swotFeatures: GeoJSON.Feature[] = inProject(swot)
      .filter((e) => !!e.position)
      .map((e) => ({
        type: 'Feature',
        properties: {
          bucket: e.bucket,
          color: SWOT_COLOR[e.bucket] ?? PALETTE.swotO,
          title: e.title,
          annoKind: 'swotTag',
          annoId: e.id,
        },
        geometry: {
          type: 'Point',
          coordinates: e.position as [number, number],
        },
      }));
    if (swotFeatures.length) {
      result.push({
        id: 'swot',
        data: { type: 'FeatureCollection', features: swotFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}swot-points`,
            type: 'circle',
            source: `${SOURCE_PREFIX}swot`,
            paint: {
              'circle-radius': 6,
              'circle-color': ['get', 'color'],
              'circle-stroke-color': '#fff',
              'circle-stroke-width': 1.5,
              'circle-opacity': 0.9,
            },
          },
        ],
      });
    }

    return result;
  }, [
    projectId,
    neighbours,
    households,
    accessRoads,
    permacultureZones,
    contours,
    highPoints,
    drainageLines,
    hazards,
    sectors,
    watercourses,
    ecologyZones,
    swot,
    soilSamples,
    homestead,
    map,
  ]);

  const openDetail = useAnnotationDetailStore((s) => s.open);
  const selected = useObserveSelectionStore((s) => s.selected);
  const setSelection = useObserveSelectionStore((s) => s.set);
  const toggleSelection = useObserveSelectionStore((s) => s.toggle);
  const clearSelection = useObserveSelectionStore((s) => s.clear);

  // Derive selected features (points + lines/polygons) for the halo source.
  const haloData = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!selected.length)
      return { type: 'FeatureCollection', features: [] };
    const wanted = new Set(selected.map((s) => `${s.kind}:${s.id}`));
    const features: GeoJSON.Feature[] = [];
    for (const spec of layerSpecs) {
      for (const f of spec.data.features) {
        const props = f.properties ?? {};
        const kind = (props as Record<string, unknown>).annoKind;
        const id = (props as Record<string, unknown>).annoId;
        if (typeof kind !== 'string' || typeof id !== 'string') continue;
        if (wanted.has(`${kind}:${id}`)) {
          features.push(f);
        }
      }
    }
    return { type: 'FeatureCollection', features };
  }, [layerSpecs, selected]);

  // Apply layers to the map. Tracks which (source × layer) ids we've added so
  // we can clean up stale entries when annotations are removed or hidden.
  useEffect(() => {
    if (!map) return;

    // Multi-select uses shift-click; disable MapLibre boxZoom so the
    // gesture isn't intercepted. Idempotent.
    map.boxZoom.disable();

    // Click semantics on annotation layers:
    //   plain click  → set selection to [{ kind, id }]
    //   shift-click  → toggle membership (multi-select)
    //   double-click → open detail panel
    //   empty-map click (no annotation feature hit) → clear selection
    // Click handlers are registered per layer id once, removed on cleanup.
    type LayerClick = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      },
    ) => void;
    const clickHandlers = new Map<string, LayerClick>();
    const dblHandlers = new Map<string, LayerClick>();
    const enterHandlers = new Map<string, () => void>();
    const leaveHandlers = new Map<string, () => void>();

    /** Track when a click was handled by a layer, so the empty-map click
     *  handler can know to skip clearing (MapLibre fires both layer click
     *  and the global click on the same event). */
    let consumedAt = 0;

    const wireClick = (layerId: string) => {
      if (clickHandlers.has(layerId)) return;
      const onClick: LayerClick = (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties ?? {};
        const kind = (props as Record<string, unknown>).annoKind as
          | AnnotationKind
          | undefined;
        const id = (props as Record<string, unknown>).annoId as
          | string
          | undefined;
        if (!kind || !id) return;
        consumedAt = e.originalEvent.timeStamp;
        const shift = (e.originalEvent as MouseEvent).shiftKey;
        if (shift) toggleSelection({ kind, id });
        else setSelection([{ kind, id }]);
      };
      const onDbl: LayerClick = (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties ?? {};
        const kind = (props as Record<string, unknown>).annoKind as
          | AnnotationKind
          | undefined;
        const id = (props as Record<string, unknown>).annoId as
          | string
          | undefined;
        if (!kind || !id) return;
        // Stop the map's default zoom-on-double-click for this gesture.
        e.preventDefault();
        openDetail({ kind, id });
      };
      const onEnter = () => {
        map.getCanvas().style.cursor = 'pointer';
      };
      const onLeave = () => {
        map.getCanvas().style.cursor = '';
      };
      map.on('click', layerId, onClick);
      map.on('dblclick', layerId, onDbl);
      map.on('mouseenter', layerId, onEnter);
      map.on('mouseleave', layerId, onLeave);
      clickHandlers.set(layerId, onClick);
      dblHandlers.set(layerId, onDbl);
      enterHandlers.set(layerId, onEnter);
      leaveHandlers.set(layerId, onLeave);
    };

    /** Empty-map click → clear selection. Skips when a layer click consumed
     *  the same event (within 50ms — same gesture). */
    const onMapClick = (e: maplibregl.MapMouseEvent) => {
      if (e.originalEvent.timeStamp - consumedAt < 50) return;
      clearSelection();
    };
    map.on('click', onMapClick);

    const apply = () => {
      // Bail if style isn't ready yet.
      if ((map.getStyle()?.layers?.length ?? 0) === 0) return;

      // Compute desired ids.
      const desiredSourceIds = new Set([
        ...layerSpecs.map((spec) => `${SOURCE_PREFIX}${spec.id}`),
        HALO_SOURCE,
      ]);
      const desiredLayerIds = new Set<string>([
        HALO_LAYER_CIRCLE,
        HALO_LAYER_LINE,
      ]);
      for (const spec of layerSpecs) {
        for (const l of spec.layers) desiredLayerIds.add(l.id);
      }

      // Remove any of our layers that are no longer desired.
      const allLayers = map.getStyle()?.layers ?? [];
      for (const l of allLayers) {
        if (l.id.startsWith(LAYER_PREFIX) && !desiredLayerIds.has(l.id)) {
          if (map.getLayer(l.id)) map.removeLayer(l.id);
        }
      }
      // Remove any of our sources that are no longer desired.
      const sources = (map.getStyle()?.sources ?? {}) as Record<
        string,
        unknown
      >;
      for (const sid of Object.keys(sources)) {
        if (sid.startsWith(SOURCE_PREFIX) && !desiredSourceIds.has(sid)) {
          if (map.getSource(sid)) map.removeSource(sid);
        }
      }

      // Add or update sources, then layers.
      for (const spec of layerSpecs) {
        const sid = `${SOURCE_PREFIX}${spec.id}`;
        const existing = map.getSource(sid) as
          | maplibregl.GeoJSONSource
          | undefined;
        if (existing) {
          existing.setData(spec.data);
        } else {
          map.addSource(sid, { type: 'geojson', data: spec.data });
        }
        for (const layer of spec.layers) {
          if (!map.getLayer(layer.id)) {
            map.addLayer(layer as AnnoLayer);
          } else {
            // Layer exists; refresh visibility based on master toggle.
            map.setLayoutProperty(
              layer.id,
              'visibility',
              visible ? 'visible' : 'none',
            );
          }
          // Click + cursor handlers: idempotent via Map<id, handler> guard.
          wireClick(layer.id);
        }
      }

      // Apply visibility toggle to all our layers.
      for (const spec of layerSpecs) {
        for (const layer of spec.layers) {
          if (map.getLayer(layer.id)) {
            map.setLayoutProperty(
              layer.id,
              'visibility',
              visible ? 'visible' : 'none',
            );
          }
        }
      }

      // ── Selection halo: single source + 2 stacked layers ──────────────────
      const haloSource = map.getSource(HALO_SOURCE) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (haloSource) {
        haloSource.setData(haloData);
      } else {
        map.addSource(HALO_SOURCE, { type: 'geojson', data: haloData });
      }
      if (!map.getLayer(HALO_LAYER_LINE)) {
        map.addLayer({
          id: HALO_LAYER_LINE,
          type: 'line',
          source: HALO_SOURCE,
          filter: ['!=', ['geometry-type'], 'Point'],
          paint: {
            'line-color': HALO_COLOR,
            'line-width': 4,
            'line-opacity': 0.9,
          },
        });
      }
      if (!map.getLayer(HALO_LAYER_CIRCLE)) {
        map.addLayer({
          id: HALO_LAYER_CIRCLE,
          type: 'circle',
          source: HALO_SOURCE,
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-radius': 11,
            'circle-color': 'transparent',
            'circle-stroke-color': HALO_COLOR,
            'circle-stroke-width': 3,
            'circle-stroke-opacity': 0.95,
            'circle-pitch-alignment': 'map',
          },
        });
      }
      // Always keep halo layers above all annotation layers + visible per master.
      const haloVisible = visible && haloData.features.length > 0;
      for (const id of [HALO_LAYER_LINE, HALO_LAYER_CIRCLE]) {
        if (map.getLayer(id)) {
          map.setLayoutProperty(
            id,
            'visibility',
            haloVisible ? 'visible' : 'none',
          );
          // Re-stack on top of annotation layers (cheap when halo is empty).
          try {
            map.moveLayer(id);
          } catch {
            /* ignore — layer not yet in style */
          }
        }
      }
    };

    apply();

    const onStyle = () => apply();
    map.on('style.load', onStyle);

    return () => {
      map.off('style.load', onStyle);
      map.off('click', onMapClick);
      // Remove click/hover handlers per layer id so a re-render or unmount
      // doesn't leave dangling listeners on stale layer ids.
      for (const [layerId, h] of clickHandlers) {
        map.off('click', layerId, h);
      }
      for (const [layerId, h] of dblHandlers) {
        map.off('dblclick', layerId, h);
      }
      for (const [layerId, h] of enterHandlers) {
        map.off('mouseenter', layerId, h);
      }
      for (const [layerId, h] of leaveHandlers) {
        map.off('mouseleave', layerId, h);
      }
    };
    // layerSpecs is the memoised set of FeatureCollections + layer specs;
    // visibility toggles are also captured here so the master toggle takes
    // effect without remounting the component.
  }, [
    map,
    layerSpecs,
    visible,
    openDetail,
    haloData,
    setSelection,
    toggleSelection,
    clearSelection,
  ]);

  // Clean up everything when the component unmounts (route change).
  useEffect(() => {
    return () => {
      if (!map) return;
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
    };
  }, [map]);

  return null;
}
