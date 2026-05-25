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
import type { Map as MaplibreMap, ExpressionSpecification } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useHumanContextStore } from '../../../../store/humanContextStore.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { useExternalForcesStore } from '../../../../store/externalForcesStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useVegetationStore } from '../../../../store/vegetationStore.js';
import { GROUND_COVER_COLORS } from '../../../../store/zoneStore.js';
import { usePastureStore } from '../../../../store/pastureStore.js';
import { useConventionalCropStore } from '../../../../store/conventionalCropStore.js';
import { useSwotStore } from '../../../../store/swotStore.js';
import { useSoilSampleStore } from '../../../../store/soilSampleStore.js';
import { useFieldVerification } from '../../../../lib/fieldVerification/useFieldVerification.js';
import {
  useBuildingsForProject,
  useWellsForProject,
  useSepticsForProject,
  usePowerLinesForProject,
  useBuriedUtilitiesForProject,
  useFencesForProject,
  useGatesForProject,
  useExistingDrivewaysForProject,
} from '../../../../store/builtEnvironmentSelectors.js';
import { useMatrixTogglesStore } from '../../../../store/matrixTogglesStore.js';
import { useAnnotationDetailStore } from '../../../../store/annotationDetailStore.js';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { useObserveSelectionStore } from '../../../../store/observeSelectionStore.js';
import { useMapToolStore } from '../measure/useMapToolStore.js';
import { openBeInlineEditByObserveKind } from '../../../builtEnvironment/inline/openBeInlineEdit.js';
import type { MatrixToggleKey } from '../../../../store/matrixTogglesStore.js';
import {
  registerObserveIcons,
  tryRegisterMissingObserveIcon,
} from '../../lib/lucideSprite.js';
import type { AnnotationKind } from '../draw/annotationFieldSchemas.js';
import type { ObserveModule } from '../../types.js';
import { LINE_KIND_DEFAULT_WIDTH_M } from '@ogden/shared';

/**
 * Width-aware line-width paint expression. Converts the feature's
 * `widthM` property (real-world metres) into screen pixels via a zoom-
 * interpolated exponential. The `max(…)` floors keep narrow kinds
 * (fence at 0.1 m, power-line at 0.2 m) legible at low zoom. Per the
 * 2026-05-21 drawn-line-feature-width slice.
 */
// Accept `number | undefined` because `noUncheckedIndexedAccess` makes
// `LINE_KIND_DEFAULT_WIDTH_M[kind]` return that union; a missing kind
// falls back to 1 m so the paint expression always has a positive number.
const beLineWidthExpr = (defaultM: number | undefined): ExpressionSpecification => {
  const m = defaultM ?? 1;
  return [
    'interpolate',
    ['exponential', 2],
    ['zoom'],
    12, ['max', 0.5, ['*', ['coalesce', ['get', 'widthM'], m], 0.05]],
    19, ['max', 1.5, ['*', ['coalesce', ['get', 'widthM'], m], 1.6]],
    22, ['max', 2,   ['*', ['coalesce', ['get', 'widthM'], m], 25]],
  ] as unknown as ExpressionSpecification;
};

interface Props {
  map: MaplibreMap;
  projectId: string | null;
  /**
   * When a single OBSERVE objective is focused in the map (reached via the
   * compass's "Open on Map"), only the data layers belonging to that module
   * stay visible — every other annotation group is hidden, mirroring the
   * strict single-objective rail focus. `null`/omitted = full overlays (the
   * bare `/observe` view), so nothing changes outside focus mode. The sector
   * compass HUD (`SectorCompassOverlay`) stays always-ambient and is not
   * scoped here.
   */
  activeModule?: ObserveModule | null;
  /**
   * Need focus: the union of modules a focused `ObservationNeed` declares via
   * its `requiredLayers` (normalized through `requiredLayersToModules`). When
   * set to a non-empty array it SUPERSEDES `activeModule` — only specs whose
   * module is in this set stay visible, so a need can foreground layers from
   * several modules at once (e.g. topography + hydrology). `null`/empty = fall
   * back to the single-`activeModule` gate above.
   */
  focusModules?: ObserveModule[] | null;
}

const SOURCE_PREFIX = 'observe-anno-';
const LAYER_PREFIX = 'observe-anno-';

/**
 * Maps each annotation `LayerSpec.id` to the OBSERVE module it represents,
 * so single-objective focus can hide everything outside the active module.
 * Permaculture zones (`human-zones`, sourced from the human-context store)
 * belong to the steward's "Sectors & Zones" objective. `field-verification`
 * is cross-module ground-truth with no single home — omitted here so it is
 * hidden under strict focus (shown only when no objective is active).
 */
const SPEC_MODULE: Record<string, ObserveModule> = {
  'human-points': 'human-context',
  'human-roads': 'human-context',
  'human-zones': 'sectors-zones',
  hazards: 'macroclimate-hazards',
  'topography-lines': 'topography',
  'topography-points': 'topography',
  'topography-runoff': 'topography',
  'topography-erosion': 'topography',
  'water-lines': 'earth-water-ecology',
  'water-bodies': 'earth-water-ecology',
  'soil-points': 'earth-water-ecology',
  ecology: 'earth-water-ecology',
  pasture: 'earth-water-ecology',
  'pasture-fence': 'earth-water-ecology',
  'conventional-crop': 'earth-water-ecology',
  swot: 'swot-synthesis',
  'be-buildings': 'built-environment',
  'be-wells': 'built-environment',
  'be-septics': 'built-environment',
  'be-power-lines': 'built-environment',
  'be-buried-utilities': 'built-environment',
  'be-fences': 'built-environment',
  'be-gates': 'built-environment',
  'be-driveways': 'built-environment',
};
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
  /** Optional independent sub-toggle from `useMatrixTogglesStore`. When
   *  set, this group is gated SOLELY by its own sub-toggle (it is shown
   *  as an independent overlay row in BaseMapCard and must not also be
   *  ANDed with the `observeAnnotations` master). When omitted, the
   *  group falls under the `observeAnnotations` master toggle. PLAN-
   *  stage-only keys (`sunPath`, `zoneRings`) are excluded — Observe
   *  annotation specs never gate on them. */
  toggleKey?: Exclude<
    MatrixToggleKey,
    'observeAnnotations' | 'sunPath' | 'zoneRings' | 'seededZones'
  >;
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

// ── Component ──────────────────────────────────────────────────────────────────

export default function ObserveAnnotationLayers({
  map,
  projectId,
  activeModule = null,
  focusModules = null,
}: Props) {
  // Objective focus supersedes the single-module gate: build the lookup once.
  // Empty/null ⇒ no set ⇒ the existing `activeModule` path is used unchanged.
  // (Referenced inline inside the apply effect below — like `subToggles` — with
  // the source prop `focusModules` carried in the dependency array.)
  const focusSet =
    focusModules && focusModules.length > 0 ? new Set(focusModules) : null;
  const visible = useMatrixTogglesStore((s) => s.observeAnnotations);
  // Per-group sub-toggles. A spec with a `toggleKey` is gated SOLELY by
  // its own sub-toggle (each is an independent overlay row in
  // BaseMapCard, so it must not also depend on the `observeAnnotations`
  // master). A spec WITHOUT a `toggleKey` falls under the master.
  const sectorsVisible = useMatrixTogglesStore((s) => s.sectors);
  const topographyVisible = useMatrixTogglesStore((s) => s.topography);
  const zonesVisible = useMatrixTogglesStore((s) => s.zones);
  const waterVisible = useMatrixTogglesStore((s) => s.water);
  const builtEnvironmentVisible = useMatrixTogglesStore((s) => s.builtEnvironment);
  const scheduledMovesVisible = useMatrixTogglesStore((s) => s.scheduledMoves);
  const subToggles: Record<
    Exclude<
      MatrixToggleKey,
      'observeAnnotations' | 'sunPath' | 'zoneRings' | 'seededZones'
    >,
    boolean
  > = {
    sectors: sectorsVisible,
    topography: topographyVisible,
    zones: zonesVisible,
    water: waterVisible,
    builtEnvironment: builtEnvironmentVisible,
    scheduledMoves: scheduledMovesVisible,
  };

  // Subscribe by full namespace (per ADR 2026-04-26 — no inline filtering in
  // the selector) and filter via useMemo below.
  const neighbours = useHumanContextStore((s) => s.neighbours);
  const households = useHumanContextStore((s) => s.households);
  const accessRoads = useHumanContextStore((s) => s.accessRoads);
  const permacultureZones = useHumanContextStore((s) => s.permacultureZones);
  const contours = useTopographyStore((s) => s.contours);
  const highPoints = useTopographyStore((s) => s.highPoints);
  const drainageLines = useTopographyStore((s) => s.drainageLines);
  const erosionFlags = useTopographyStore((s) => s.erosionFlags);
  const runoffPaths = useTopographyStore((s) => s.runoffPaths);
  const hazards = useExternalForcesStore((s) => s.hazards);
  const watercourses = useWaterSystemsStore((s) => s.watercourses);
  const waterbodies = useWaterSystemsStore((s) => s.waterbodies);
  const vegetationPatches = useVegetationStore((s) => s.patches);
  const pastures = usePastureStore((s) => s.pastures);
  const conventionalCrops = useConventionalCropStore((s) => s.conventionalCrops);
  const swot = useSwotStore((s) => s.swot);
  const soilSamples = useSoilSampleStore((s) => s.samples);
  // Field-verification axis (OLOS gap #10): buffered influence zones derived
  // on the fly from soil samples + monitoring transects. Glows brighter where
  // the ground has been read recently, fades as observations decay. Falls
  // under the `observeAnnotations` master toggle (no independent sub-toggle).
  const { zones: verificationZones } = useFieldVerification(projectId ?? undefined);
  // Phase 6.B: read built-environment slices directly from V2 via the
  // project-filtered selector hooks. Each hook is already memoized so
  // identity stays stable when nothing in this project's slice changed —
  // the `inProject(...)` filter below becomes a no-op for these 8 arrays
  // (kept in place so the rest of the helper stays uniform).
  const beProjectId = projectId ?? '';
  const buildings = useBuildingsForProject(beProjectId);
  const wells = useWellsForProject(beProjectId);
  const septics = useSepticsForProject(beProjectId);
  const powerLines = usePowerLinesForProject(beProjectId);
  const buriedUtilities = useBuriedUtilitiesForProject(beProjectId);
  const fences = useFencesForProject(beProjectId);
  const gates = useGatesForProject(beProjectId);
  const existingDriveways = useExistingDrivewaysForProject(beProjectId);

  const layerSpecs = useMemo<LayerSpec[]>(() => {
    if (!projectId) return [];

    const inProject = <T extends { projectId: string }>(arr: T[]): T[] =>
      arr.filter((x) => x.projectId === projectId);

    const result: LayerSpec[] = [];

    // ── Field-verification zones (OLOS gap #10) ─────────────────────────────
    // Pushed FIRST so it renders beneath every annotation: a soft sub-regional
    // glow showing where the ground has been corroborated/verified by recent
    // field observations. Distinct earth-green ramp (verified = deep, the same
    // climax green as ecology) so it reads as "ground-truth" not "hazard".
    // Opacity scales with level so verified zones glow brighter than merely
    // corroborated ones; both fade as their underlying observations decay.
    if (verificationZones.features.length) {
      const levelColor: ExpressionSpecification = [
        'match',
        ['get', 'level'],
        'verified',
        '#2a6a3a',
        'corroborated',
        '#7a8a3c',
        '#8a7a68',
      ] as unknown as ExpressionSpecification;
      const levelFillOpacity: ExpressionSpecification = [
        'match',
        ['get', 'level'],
        'verified',
        0.22,
        'corroborated',
        0.14,
        0.07,
      ] as unknown as ExpressionSpecification;
      result.push({
        id: 'field-verification',
        data: verificationZones as GeoJSON.FeatureCollection,
        layers: [
          {
            id: `${LAYER_PREFIX}field-verification-fill`,
            type: 'fill',
            source: `${SOURCE_PREFIX}field-verification`,
            paint: {
              'fill-color': levelColor,
              'fill-opacity': levelFillOpacity,
            },
          },
          {
            id: `${LAYER_PREFIX}field-verification-line`,
            type: 'line',
            source: `${SOURCE_PREFIX}field-verification`,
            paint: {
              'line-color': levelColor,
              'line-width': 1,
              'line-opacity': 0.5,
              'line-dasharray': [2, 2],
            },
          },
        ],
      });
    }

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
            type: 'symbol',
            source: `${SOURCE_PREFIX}human-points`,
            layout: {
              // Resolves to `observe-neighbourPin` or `observe-household`
              // per feature; both keys registered by `lucideSprite.ts`.
              'icon-image': ['concat', 'observe-', ['get', 'annoKind']],
              'icon-size': 1.0,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-anchor': 'center',
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
        toggleKey: 'zones',
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

    // Sector wedges are no longer rendered as MapLibre layers — the
    // `SectorCompassOverlay` HUD (mounted in `ObserveLayout`) now summarises
    // wind petals + solar arcs + manual sector arrows in a single compass
    // rose at the bottom-right of the map.

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
        toggleKey: 'topography',
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
        toggleKey: 'topography',
        data: { type: 'FeatureCollection', features: hpFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}topography-points`,
            type: 'symbol',
            source: `${SOURCE_PREFIX}topography-points`,
            layout: {
              'icon-image': 'observe-highPoint',
              'icon-size': 1.0,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-anchor': 'center',
            },
          },
        ],
      });
    }

    // ── Topography: runoff paths ───────────────────────────────────────────
    const runoffFeatures: GeoJSON.Feature[] = inProject(runoffPaths).map((r) => ({
      type: 'Feature',
      properties: {
        flowCondition: r.flowCondition,
        color:
          r.flowCondition === 'severe'
            ? '#c4452f'
            : r.flowCondition === 'active'
              ? '#3a8aa8'
              : '#7aa8b8',
        annoKind: 'runoffPath',
        annoId: r.id,
      },
      geometry: r.geometry,
    }));
    if (runoffFeatures.length) {
      result.push({
        id: 'topography-runoff',
        toggleKey: 'topography',
        data: { type: 'FeatureCollection', features: runoffFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}topography-runoff`,
            type: 'line',
            source: `${SOURCE_PREFIX}topography-runoff`,
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 2,
              'line-opacity': 0.85,
              'line-dasharray': [2, 1.5],
            },
          },
        ],
      });
    }

    // ── Topography: erosion flags ──────────────────────────────────────────
    const erosionFeatures: GeoJSON.Feature[] = inProject(erosionFlags).map((e) => ({
      type: 'Feature',
      properties: {
        severity: e.severity,
        color:
          e.severity === 'high'
            ? '#c4452f'
            : e.severity === 'medium'
              ? '#c87a3f'
              : '#c4a265',
        annoKind: 'erosionFlag',
        annoId: e.id,
      },
      geometry: { type: 'Point', coordinates: e.position },
    }));
    if (erosionFeatures.length) {
      result.push({
        id: 'topography-erosion',
        toggleKey: 'topography',
        data: { type: 'FeatureCollection', features: erosionFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}topography-erosion`,
            type: 'circle',
            source: `${SOURCE_PREFIX}topography-erosion`,
            paint: {
              'circle-radius': 6,
              'circle-color': ['get', 'color'],
              'circle-stroke-color': '#3a2a1a',
              'circle-stroke-width': 1.5,
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
        toggleKey: 'water',
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

    // ── Waterbodies (adopted from basemap — polygons) ──────────────────────
    const waterbodyFeatures: GeoJSON.Feature[] = inProject(waterbodies).map((wb) => ({
      type: 'Feature',
      properties: {
        kind: wb.kind,
        label: wb.name ?? '',
        annoKind: 'waterbody',
        annoId: wb.id,
      },
      geometry: wb.geometry,
    }));
    if (waterbodyFeatures.length) {
      result.push({
        id: 'water-bodies',
        toggleKey: 'water',
        data: { type: 'FeatureCollection', features: waterbodyFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}water-bodies-fill`,
            type: 'fill',
            source: `${SOURCE_PREFIX}water-bodies`,
            paint: {
              'fill-color': '#5b8aa8',
              'fill-opacity': 0.45,
            },
          },
          {
            id: `${LAYER_PREFIX}water-bodies-line`,
            type: 'line',
            source: `${SOURCE_PREFIX}water-bodies`,
            paint: {
              'line-color': PALETTE.water,
              'line-width': 1.25,
              'line-opacity': 0.9,
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
            type: 'symbol',
            source: `${SOURCE_PREFIX}soil-points`,
            layout: {
              'icon-image': 'observe-soilSample',
              'icon-size': 1.0,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-anchor': 'center',
            },
          },
        ],
      });
    }

    // ── Vegetation patches ─────────────────────────────────────────────────
    const ecoFeatures: GeoJSON.Feature[] = inProject(vegetationPatches).map((z) => ({
      type: 'Feature',
      properties: {
        stage: z.successionStage,
        cover: z.groundCover,
        color: GROUND_COVER_COLORS[z.groundCover] ?? PALETTE.ecologyMid,
        label: z.label ?? '',
        annoKind: 'vegetation',
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

    // ── Pasture / paddock ───────────────────────────────────────────────────
    const PASTURE_COLOR: Record<string, string> = {
      'open-pasture': '#c9a86a',
      paddock: '#b58550',
      hayfield: '#d4b878',
    };
    const pastureFeatures: GeoJSON.Feature[] = inProject(pastures).map((p) => ({
      type: 'Feature',
      properties: {
        kind: p.kind,
        color: PASTURE_COLOR[p.kind] ?? PASTURE_COLOR.paddock,
        label: p.label ?? '',
        annoKind: 'pasture',
        annoId: p.id,
      },
      geometry: p.geometry,
    }));
    if (pastureFeatures.length) {
      result.push({
        id: 'pasture',
        data: { type: 'FeatureCollection', features: pastureFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}pasture-fill`,
            type: 'fill',
            source: `${SOURCE_PREFIX}pasture`,
            paint: {
              'fill-color': ['get', 'color'],
              'fill-opacity': 0.22,
            },
          },
          {
            id: `${LAYER_PREFIX}pasture-line`,
            type: 'line',
            source: `${SOURCE_PREFIX}pasture`,
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 1.5,
              'line-opacity': 0.85,
            },
          },
        ],
      });
    }

    // Paddock fence — extruded ribbon around the boundary (paddock subtype only).
    // ~1.5 m tall, ~0.4 m wide; only visible when the camera is tilted.
    const paddockFenceFeatures: GeoJSON.Feature[] = [];
    for (const p of inProject(pastures)) {
      if (p.kind !== 'paddock') continue;
      try {
        const boundary = turf.polygonToLine(
          turf.feature(p.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon),
        );
        const ribbon = turf.buffer(boundary as never, 0.4, { units: 'meters' }) as
          | GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
          | undefined;
        if (!ribbon) continue;
        paddockFenceFeatures.push({
          type: 'Feature',
          properties: { annoKind: 'pastureFence', annoId: p.id },
          geometry: ribbon.geometry,
        });
      } catch {
        // skip malformed geometry
      }
    }
    if (paddockFenceFeatures.length) {
      result.push({
        id: 'pasture-fence',
        data: { type: 'FeatureCollection', features: paddockFenceFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}pasture-fence-extrusion`,
            type: 'fill-extrusion',
            source: `${SOURCE_PREFIX}pasture-fence`,
            paint: {
              'fill-extrusion-color': '#5a4326',
              'fill-extrusion-height': 1.5,
              'fill-extrusion-base': 0,
              'fill-extrusion-opacity': 0.92,
            },
          },
        ],
      });
    }

    // ── Conventional crop ──────────────────────────────────────────────────
    const CROP_COLOR: Record<string, string> = {
      'annual-row': '#a8854a',
      'perennial-monoculture': '#8e7136',
      'cover-cropped': '#9aa56b',
      fallow: '#c4b89a',
    };
    const conventionalCropFeatures: GeoJSON.Feature[] = inProject(
      conventionalCrops,
    ).map((c) => ({
      type: 'Feature',
      properties: {
        kind: c.kind,
        color: CROP_COLOR[c.kind] ?? CROP_COLOR['annual-row'],
        label: c.label ?? '',
        annoKind: 'conventionalCrop',
        annoId: c.id,
      },
      geometry: c.geometry,
    }));
    if (conventionalCropFeatures.length) {
      result.push({
        id: 'conventional-crop',
        data: { type: 'FeatureCollection', features: conventionalCropFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}conventional-crop-fill`,
            type: 'fill',
            source: `${SOURCE_PREFIX}conventional-crop`,
            // Crops are "patches" that sit on top of the vegetation / pasture
            // matrix wash (0.22). Raised opacity so they read as occluding
            // patches instead of additive blends — operator can then draw the
            // ground-cover matrix once across the whole area without tracing
            // around individual crop blocks.
            paint: {
              'fill-color': ['get', 'color'],
              'fill-opacity': 0.55,
            },
          },
          {
            id: `${LAYER_PREFIX}conventional-crop-line`,
            type: 'line',
            source: `${SOURCE_PREFIX}conventional-crop`,
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
            type: 'symbol',
            source: `${SOURCE_PREFIX}swot`,
            layout: {
              // Resolves to `observe-swotTag-S/W/O/T` based on bucket.
              'icon-image': [
                'concat',
                'observe-swotTag-',
                ['get', 'bucket'],
              ],
              'icon-size': 1.0,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-anchor': 'center',
            },
          },
        ],
      });
    }

    // ── Built Environment ──────────────────────────────────────────────────

    // Buildings (polygons)
    const buildingFeatures: GeoJSON.Feature[] = inProject(buildings).map((b) => ({
      type: 'Feature',
      properties: {
        subtype: b.subtype,
        label: b.label ?? '',
        annoKind: 'building',
        annoId: b.id,
      },
      geometry: b.geometry,
    }));
    if (buildingFeatures.length) {
      result.push({
        id: 'be-buildings',
        toggleKey: 'builtEnvironment',
        data: { type: 'FeatureCollection', features: buildingFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}be-buildings-fill`,
            type: 'fill',
            source: `${SOURCE_PREFIX}be-buildings`,
            // Patch-on-matrix: buildings occlude ground-cover wash beneath.
            paint: { 'fill-color': '#6a6a6a', 'fill-opacity': 0.6 },
          },
          {
            id: `${LAYER_PREFIX}be-buildings-line`,
            type: 'line',
            source: `${SOURCE_PREFIX}be-buildings`,
            paint: { 'line-color': '#3a3a3a', 'line-width': 1.2, 'line-opacity': 0.9 },
          },
        ],
      });
    }

    // Wells (points)
    const wellFeatures: GeoJSON.Feature[] = inProject(wells).map((w) => ({
      type: 'Feature',
      properties: { kind: w.kind, annoKind: 'well', annoId: w.id },
      geometry: { type: 'Point', coordinates: w.position },
    }));
    if (wellFeatures.length) {
      result.push({
        id: 'be-wells',
        toggleKey: 'builtEnvironment',
        data: { type: 'FeatureCollection', features: wellFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}be-wells`,
            type: 'circle',
            source: `${SOURCE_PREFIX}be-wells`,
            paint: {
              'circle-radius': 6,
              'circle-color': '#3a8aa8',
              'circle-stroke-color': '#1a4a5a',
              'circle-stroke-width': 1.2,
            },
          },
        ],
      });
    }

    // Septic (polygons)
    const septicFeatures: GeoJSON.Feature[] = inProject(septics).map((sp) => ({
      type: 'Feature',
      properties: { kind: sp.kind, annoKind: 'septic', annoId: sp.id },
      geometry: sp.geometry,
    }));
    if (septicFeatures.length) {
      result.push({
        id: 'be-septics',
        toggleKey: 'builtEnvironment',
        data: { type: 'FeatureCollection', features: septicFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}be-septics-fill`,
            type: 'fill',
            source: `${SOURCE_PREFIX}be-septics`,
            paint: { 'fill-color': '#7a6a3f', 'fill-opacity': 0.3 },
          },
          {
            id: `${LAYER_PREFIX}be-septics-line`,
            type: 'line',
            source: `${SOURCE_PREFIX}be-septics`,
            paint: { 'line-color': '#4a3a2a', 'line-width': 1, 'line-opacity': 0.85 },
          },
        ],
      });
    }

    // Power lines
    const powerLineFeatures: GeoJSON.Feature[] = inProject(powerLines).map((p) => ({
      type: 'Feature',
      properties: {
        placement: p.placement,
        annoKind: 'powerLine',
        annoId: p.id,
        widthM: p.widthM ?? LINE_KIND_DEFAULT_WIDTH_M['power-line'],
      },
      geometry: p.geometry,
    }));
    if (powerLineFeatures.length) {
      result.push({
        id: 'be-power-lines',
        toggleKey: 'builtEnvironment',
        data: { type: 'FeatureCollection', features: powerLineFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}be-power-lines`,
            type: 'line',
            source: `${SOURCE_PREFIX}be-power-lines`,
            paint: {
              'line-color': '#c87a3f',
              'line-width': beLineWidthExpr(LINE_KIND_DEFAULT_WIDTH_M['power-line']),
              'line-opacity': 0.9,
            },
          },
        ],
      });
    }

    // Buried utilities
    const buriedUtilityFeatures: GeoJSON.Feature[] = inProject(buriedUtilities).map(
      (u) => ({
        type: 'Feature',
        properties: {
          kind: u.kind,
          annoKind: 'buriedUtility',
          annoId: u.id,
          widthM: u.widthM ?? LINE_KIND_DEFAULT_WIDTH_M['buried-utility'],
        },
        geometry: u.geometry,
      }),
    );
    if (buriedUtilityFeatures.length) {
      result.push({
        id: 'be-buried-utilities',
        toggleKey: 'builtEnvironment',
        data: { type: 'FeatureCollection', features: buriedUtilityFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}be-buried-utilities`,
            type: 'line',
            source: `${SOURCE_PREFIX}be-buried-utilities`,
            paint: {
              'line-color': '#7a7a7a',
              'line-width': beLineWidthExpr(LINE_KIND_DEFAULT_WIDTH_M['buried-utility']),
              'line-opacity': 0.85,
              'line-dasharray': [2, 2],
            },
          },
        ],
      });
    }

    // Fences
    const fenceFeatures: GeoJSON.Feature[] = inProject(fences).map((f) => ({
      type: 'Feature',
      properties: {
        kind: f.kind,
        annoKind: 'fence',
        annoId: f.id,
        widthM: f.widthM ?? LINE_KIND_DEFAULT_WIDTH_M['fence'],
      },
      geometry: f.geometry,
    }));
    if (fenceFeatures.length) {
      result.push({
        id: 'be-fences',
        toggleKey: 'builtEnvironment',
        data: { type: 'FeatureCollection', features: fenceFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}be-fences`,
            type: 'line',
            source: `${SOURCE_PREFIX}be-fences`,
            paint: {
              'line-color': '#5a4a3a',
              'line-width': beLineWidthExpr(LINE_KIND_DEFAULT_WIDTH_M['fence']),
              'line-opacity': 0.85,
            },
          },
        ],
      });
    }

    // Gates (points)
    const gateFeatures: GeoJSON.Feature[] = inProject(gates).map((g) => ({
      type: 'Feature',
      properties: { label: g.label ?? '', annoKind: 'gate', annoId: g.id },
      geometry: { type: 'Point', coordinates: g.position },
    }));
    if (gateFeatures.length) {
      result.push({
        id: 'be-gates',
        toggleKey: 'builtEnvironment',
        data: { type: 'FeatureCollection', features: gateFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}be-gates`,
            type: 'circle',
            source: `${SOURCE_PREFIX}be-gates`,
            paint: {
              'circle-radius': 5,
              'circle-color': '#c4a265',
              'circle-stroke-color': '#3a2a1a',
              'circle-stroke-width': 1.2,
            },
          },
        ],
      });
    }

    // Existing driveways
    const drivewayFeatures: GeoJSON.Feature[] = inProject(existingDriveways).map((d) => ({
      type: 'Feature',
      properties: {
        surface: d.surface,
        annoKind: 'existingDriveway',
        annoId: d.id,
        widthM: d.widthM ?? LINE_KIND_DEFAULT_WIDTH_M['driveway'],
      },
      geometry: d.geometry,
    }));
    if (drivewayFeatures.length) {
      result.push({
        id: 'be-driveways',
        toggleKey: 'builtEnvironment',
        data: { type: 'FeatureCollection', features: drivewayFeatures },
        layers: [
          {
            id: `${LAYER_PREFIX}be-driveways`,
            type: 'line',
            source: `${SOURCE_PREFIX}be-driveways`,
            paint: {
              'line-color': '#8a6a3f',
              'line-width': beLineWidthExpr(LINE_KIND_DEFAULT_WIDTH_M['driveway']),
              'line-opacity': 0.9,
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
    erosionFlags,
    runoffPaths,
    hazards,
    watercourses,
    waterbodies,
    vegetationPatches,
    pastures,
    conventionalCrops,
    swot,
    soilSamples,
    verificationZones,
    buildings,
    wells,
    septics,
    powerLines,
    buriedUtilities,
    fences,
    gates,
    existingDriveways,
    map,
  ]);

  const openDetail = useAnnotationDetailStore((s) => s.open);
  const openForm = useAnnotationFormStore((s) => s.open);
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
        if (shift) {
          toggleSelection({ kind, id });
          return;
        }
        // First click only selects — never pop the editor. The popup opens
        // on a second click of the already-sole-selected feature (or via the
        // SelectionFloater Edit button / double-click detail panel). This
        // keeps a stray click from yanking the form open.
        const sel = useObserveSelectionStore.getState().selected;
        const alreadySole =
          sel.length === 1 &&
          sel[0]?.kind === kind &&
          sel[0]?.id === id;
        setSelection([{ kind, id }]);
        if (!alreadySole) return;
        // Re-click on the already-selected feature → reopen the same
        // editable popup that appeared on first draw — BE kinds route to the
        // floating inline popover (parity with Plan), others fall through to
        // the slide-up form. Skip when a draw tool is active (mid-creation)
        // or when the form is already showing this exact record.
        if (useMapToolStore.getState().activeTool) return;
        const active = useAnnotationFormStore.getState().active;
        if (active?.existingId === id && active.kind === kind) return;
        if (!projectId) return;
        if (openBeInlineEditByObserveKind(kind, id)) return;
        openForm({
          kind,
          geometry: null,
          mode: 'edit',
          existingId: id,
          projectId,
        });
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
      map.on('click', layerId, onClick);
      map.on('dblclick', layerId, onDbl);
      clickHandlers.set(layerId, onClick);
      dblHandlers.set(layerId, onDbl);
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
      if ((map.getStyle()?.layers?.length ?? 0) === 0) {
        return;
      }

      // Re-register Lucide sprite images. `registerObserveIcons` is
      // idempotent (per-id `hasImage` guard) and safe to fire-and-forget;
      // any layer referencing an icon before it's loaded is recovered via
      // the `styleimagemissing` listener below.
      void registerObserveIcons(map);

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
        // Single-objective focus: when a module is active (or an objective's
        // requiredLayers set is in focus), only matching specs stay visible
        // (AND'd into the existing toggle gate). Neither set ⇒ full overlays,
        // so this is a no-op outside focus mode. `focusSet` supersedes the
        // single `activeModule` gate so an objective can span several modules.
        const specModule = SPEC_MODULE[spec.id];
        const moduleMatch = focusSet
          ? specModule != null && focusSet.has(specModule)
          : activeModule == null || specModule === activeModule;
        const specVisible =
          moduleMatch &&
          (spec.toggleKey ? subToggles[spec.toggleKey] : visible);
        for (const layer of spec.layers) {
          if (!map.getLayer(layer.id)) {
            map.addLayer(layer as AnnoLayer);
          }
          map.setLayoutProperty(
            layer.id,
            'visibility',
            specVisible ? 'visible' : 'none',
          );
          // Click + cursor handlers: idempotent via Map<id, handler> guard.
          wireClick(layer.id);
        }
      }

      // Apply visibility to all our layers: toggleKey'd specs follow their
      // own independent sub-toggle; untoggled specs follow the master.
      for (const spec of layerSpecs) {
        const specModule = SPEC_MODULE[spec.id];
        const moduleMatch = focusSet
          ? specModule != null && focusSet.has(specModule)
          : activeModule == null || specModule === activeModule;
        const specVisible =
          moduleMatch &&
          (spec.toggleKey ? subToggles[spec.toggleKey] : visible);
        for (const layer of spec.layers) {
          if (map.getLayer(layer.id)) {
            map.setLayoutProperty(
              layer.id,
              'visibility',
              specVisible ? 'visible' : 'none',
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

    // styleimagemissing fires when a symbol layer references an icon-image
    // that isn't (yet) in the sprite. Defensive: registerObserveIcons() is
    // already called from apply(), but if the layer is added before the
    // image-load promise resolves, MapLibre will hit this path and we
    // backfill on demand.
    const onImageMissing = (e: { id: string }) => {
      void tryRegisterMissingObserveIcon(map, e.id);
    };
    map.on('styleimagemissing', onImageMissing);

    return () => {
      // Wrap in try/catch: map.off() with a layerId argument accesses
      // MapLibre internals that crash on a removed map (style already
      // destroyed). Listener cleanup is best-effort on unmount.
      try {
        map.off('style.load', onStyle);
        map.off('styleimagemissing', onImageMissing);
        map.off('click', onMapClick);
        // Remove click/dblclick handlers per layer id so a re-render or
        // unmount doesn't leave dangling listeners on stale layer ids.
        for (const [layerId, h] of clickHandlers) {
          map.off('click', layerId, h);
        }
        for (const [layerId, h] of dblHandlers) {
          map.off('dblclick', layerId, h);
        }
      } catch {
        // map already removed — nothing to clean up
      }
    };
    // layerSpecs is the memoised set of FeatureCollections + layer specs;
    // visibility toggles are also captured here so the master toggle takes
    // effect without remounting the component.
  }, [
    map,
    layerSpecs,
    visible,
    sectorsVisible,
    topographyVisible,
    zonesVisible,
    waterVisible,
    builtEnvironmentVisible,
    openDetail,
    openForm,
    haloData,
    setSelection,
    toggleSelection,
    clearSelection,
    projectId,
    activeModule,
    focusModules,
  ]);

  // Clean up everything when the component unmounts (route change).
  useEffect(() => {
    return () => {
      if (!map) return;
      // Wrap in try/catch: DiagnoseMap may have already called map.remove()
      // before this cleanup fires (timing races during route transitions mean
      // the map can be in a half-destroyed state where getLayer() throws).
      // Cleanup is best-effort — if the map is already gone, nothing to do.
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
        // map already removed — nothing to clean up
      }
    };
  }, [map]);

  return null;
}
