/**
 * elementCatalog — static catalog of permaculture design elements available
 * in the Vision-Layout canvas palette.
 *
 * Categories are Yeomans-ordered (water first, soil-amenities last) per the
 * Permaculture Scholar synthesis (wiki/concepts/atlas-sidebar-permaculture.md,
 * 2026-04-28). Each element declares geometry kind, default Yeomans phase,
 * MapboxDraw mode, and a colour token. Icons use Lucide.
 */

import {
  Armchair,
  Bird,
  Building2,
  Compass,
  Droplets,
  Eye,
  Flame,
  Flower2,
  Footprints,
  Fuel,
  Home,
  LandPlot,
  Leaf,
  Mountain,
  ParkingSquare,
  Recycle,
  RotateCw,
  Route,
  Signpost,
  Sprout,
  Square,
  Tent,
  TreeDeciduous,
  Trees,
  Umbrella,
  Users,
  Utensils,
  Waves,
  Wheat,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { DrawMode } from '../../observe/components/draw/useMapboxDrawTool.js';
import type { PhaseKey } from '../types.js';

export type DesignCategory =
  | 'water'
  | 'access'
  | 'grazing'
  | 'structure'
  | 'machinery'
  | 'amenity'
  | 'vegetation'
  | 'earthworks'
  | 'habitat'
  | 'custom';

export interface DesignElementSpec {
  /** Stable kind id, e.g. `paddock`, `pond`. Used as feature.properties.kind. */
  kind: string;
  category: DesignCategory;
  label: string;
  icon: LucideIcon;
  geometry: 'point' | 'line' | 'polygon';
  drawMode: DrawMode;
  /** Yeomans Scale of Permanence phase this element belongs to. */
  phase: PhaseKey;
  /** Hex colour for the rendered feature. Drawn from lib/tokens.ts palette. */
  color: string;
  /**
   * Approximate excavation depth (cm) for this element. Drives the
   * buried-utility conflict check in `checkUtilityConflicts` —
   * elements whose depth exceeds the threshold (30 cm) trigger the
   * veto dialog when their geometry intersects a recorded utility.
   * Omit (or set 0) for above-grade elements.
   *
   * Per ADR 2026-05-10-plan-earthwork-utility-veto.md.
   */
  earthworkDepthCm?: number;
  /**
   * Approximate mature canopy / spread spacing (metres). Drives the
   * spacing-snap preview ring + same-category overlap rejection in
   * `useContinuousPointDrawTool` for point kinds. Omit when no
   * meaningful spacing applies (e.g. line / polygon kinds).
   */
  defaultSpacingM?: number;
  /**
   * Approximate real-world width (metres) for linear kinds. Drives the
   * width-aware line rendering in DesignElementLayers — converts metres
   * to screen pixels via a zoom-interpolated expression so a hedgerow
   * (~2 m) reads visibly wider than a path (~0.8 m) at zoom ≥18.
   * Omit for point / polygon kinds.
   */
  defaultWidthM?: number;
}

export interface DesignCategorySpec {
  key: DesignCategory;
  label: string;
  elements: DesignElementSpec[];
}

const COLORS = {
  water: '#3a8aa8',
  waterEphemeral: '#7aa8b8',
  access: '#8a6a3f',
  accessFoot: '#c4a265',
  grazing: '#7aa86a',
  grazingOrchard: '#4a8a5a',
  grazingSilvo: '#5a9a6a',
  grazingMix: '#a5c47a',
  structure: '#a85a3f',
  machinery: '#6a6a6a',
  amenity: '#c4a265',
  amenityFire: '#c87a3f',
  amenityCompost: '#6a5a4a',
  // Social-node amenities (Rec #6 v2) — the "nets in the flow" the Scholar
  // describes: benches, picnic tables, shaded seats, signage, and gathering
  // pavilions placed at high-traffic Z1/Z2 path intersections. Warm earth
  // tones to read as human-comfort points distinct from the fire-circle.
  amenitySeat: '#caa46a',
  amenityTable: '#bd9a5f',
  amenitySign: '#9a7b4a',
  amenityGather: '#b58a52',
  vegetationOak: '#52784a',
  vegetationPine: '#2f5e38',
  vegetationApple: '#7faa54',
  vegetationShrub: '#6a9648',
  vegetationHedge: '#4a7a3a',
  earthworksBerm: '#8c6a4c',
  earthworksBed: '#735238',
  earthworksTerrace: '#806142',
  habitatBox: '#6a4a7a',
  habitatPerch: '#8a6a98',
  habitatBrush: '#7a5a3a',
  habitatSnag: '#5a4632',
  habitatInsectary: '#b08a3f',
  habitatWetland: '#4a8a98',
} as const;

export const DESIGN_CATEGORIES: DesignCategorySpec[] = [
  {
    key: 'grazing',
    label: 'Grazing & Land Use',
    elements: [
      { kind: 'paddock',     category: 'grazing',  label: 'Paddock',      icon: LandPlot,      geometry: 'polygon', drawMode: 'draw_polygon', phase: 'subdivision', color: COLORS.grazing },
      { kind: 'orchard',     category: 'grazing',  label: 'Orchard',      icon: TreeDeciduous, geometry: 'polygon', drawMode: 'draw_polygon', phase: 'trees',       color: COLORS.grazingOrchard },
      { kind: 'silvopasture',category: 'grazing',  label: 'Silvopasture', icon: Trees,         geometry: 'polygon', drawMode: 'draw_polygon', phase: 'trees',       color: COLORS.grazingSilvo },
      { kind: 'pasture-mix', category: 'grazing',  label: 'Pasture Mix',  icon: Wheat,         geometry: 'polygon', drawMode: 'draw_polygon', phase: 'soil',        color: COLORS.grazingMix },
    ],
  },
  {
    key: 'structure',
    label: 'Structures',
    elements: [
      { kind: 'yurt',       category: 'structure', label: 'Yurt',       icon: Tent,      geometry: 'point', drawMode: 'draw_point', phase: 'buildings', color: COLORS.structure },
      { kind: 'greenhouse', category: 'structure', label: 'Greenhouse', icon: Home,      geometry: 'point', drawMode: 'draw_point', phase: 'buildings', color: COLORS.structure },
      { kind: 'barn',       category: 'structure', label: 'Barn',       icon: Building2, geometry: 'point', drawMode: 'draw_point', phase: 'buildings', color: COLORS.structure },
      { kind: 'shed',       category: 'structure', label: 'Shed',       icon: Warehouse, geometry: 'point', drawMode: 'draw_point', phase: 'buildings', color: COLORS.structure },
    ],
  },
  {
    key: 'machinery',
    label: 'Machinery & Equipment',
    elements: [
      { kind: 'machinery-shed', category: 'machinery', label: 'Machinery Shed', icon: Warehouse,     geometry: 'point',   drawMode: 'draw_point',   phase: 'buildings', color: COLORS.machinery },
      { kind: 'equipment-yard', category: 'machinery', label: 'Equipment Yard', icon: ParkingSquare, geometry: 'polygon', drawMode: 'draw_polygon', phase: 'buildings', color: COLORS.machinery },
      { kind: 'fuel-station',   category: 'machinery', label: 'Fuel Station',   icon: Fuel,          geometry: 'point',   drawMode: 'draw_point',   phase: 'buildings', color: COLORS.machinery },
      { kind: 'turnaround',     category: 'machinery', label: 'Turnaround',     icon: RotateCw,      geometry: 'polygon', drawMode: 'draw_polygon', phase: 'access',    color: COLORS.machinery },
    ],
  },
  {
    key: 'water',
    label: 'Water Systems',
    // Canonical-ownership note (C4, 2026-05-22): infrastructure utilities —
    // water tank, well/pump, solar array, septic — are authored as Built-
    // Environment V2 features via the `be.*` tools, which are the canonical
    // owner. The typed utility-point tool (UtilityPointTool → utilityStore)
    // covers the 11 utility types with NO BE equivalent. This `water-tank`
    // sketch kind is retained for legacy freeform sketches only; do not delete
    // (existing projects may reference it). See
    // wiki/decisions/2026-05-22-atlas-canonical-feature-ownership-c4.md.
    elements: [
      { kind: 'water-tank', category: 'water', label: 'Water Tank', icon: Droplets, geometry: 'point',   drawMode: 'draw_point',       phase: 'water', color: COLORS.water },
      { kind: 'pond',       category: 'water', label: 'Pond',       icon: Waves,    geometry: 'polygon', drawMode: 'draw_polygon',     phase: 'water', color: COLORS.water, earthworkDepthCm: 200 },
      { kind: 'swale',      category: 'water', label: 'Swale',      icon: Sprout,   geometry: 'line',    drawMode: 'draw_line_string', phase: 'water', color: COLORS.water, earthworkDepthCm: 60, defaultWidthM: 1.5 },
      { kind: 'spring',     category: 'water', label: 'Spring',     icon: Leaf,     geometry: 'point',   drawMode: 'draw_point',       phase: 'water', color: COLORS.waterEphemeral },
    ],
  },
  {
    key: 'access',
    label: 'Access & Paths',
    elements: [
      { kind: 'path',   category: 'access', label: 'Path',   icon: Footprints, geometry: 'line',  drawMode: 'draw_line_string', phase: 'access', color: COLORS.accessFoot, defaultWidthM: 0.8 },
      { kind: 'road',   category: 'access', label: 'Road',   icon: Route,      geometry: 'line',  drawMode: 'draw_line_string', phase: 'access', color: COLORS.access, earthworkDepthCm: 40, defaultWidthM: 4.0 },
      { kind: 'gate',   category: 'access', label: 'Gate',   icon: Compass,    geometry: 'point', drawMode: 'draw_point',       phase: 'access', color: COLORS.access },
      { kind: 'bridge', category: 'access', label: 'Bridge', icon: Route,      geometry: 'point', drawMode: 'draw_point',       phase: 'access', color: COLORS.access },
    ],
  },
  {
    key: 'vegetation',
    label: 'Vegetation',
    elements: [
      { kind: 'oak-tree',   category: 'vegetation', label: 'Oak Tree',   icon: TreeDeciduous, geometry: 'point', drawMode: 'draw_point',       phase: 'trees', color: COLORS.vegetationOak,   defaultSpacingM: 10 },
      { kind: 'pine-tree',  category: 'vegetation', label: 'Pine Tree',  icon: Trees,         geometry: 'point', drawMode: 'draw_point',       phase: 'trees', color: COLORS.vegetationPine,  defaultSpacingM: 6  },
      { kind: 'apple-tree', category: 'vegetation', label: 'Apple Tree', icon: TreeDeciduous, geometry: 'point', drawMode: 'draw_point',       phase: 'trees', color: COLORS.vegetationApple, defaultSpacingM: 5  },
      { kind: 'shrub',      category: 'vegetation', label: 'Shrub',      icon: Leaf,          geometry: 'point', drawMode: 'draw_point',       phase: 'trees', color: COLORS.vegetationShrub, defaultSpacingM: 2  },
      { kind: 'hedgerow',   category: 'vegetation', label: 'Hedgerow',   icon: Trees,         geometry: 'line',  drawMode: 'draw_line_string', phase: 'trees', color: COLORS.vegetationHedge, defaultWidthM: 2.0 },
    ],
  },
  {
    key: 'earthworks',
    label: 'Earthworks',
    elements: [
      { kind: 'berm',       category: 'earthworks', label: 'Berm',       icon: Mountain, geometry: 'point', drawMode: 'draw_point', phase: 'landshape', color: COLORS.earthworksBerm,    earthworkDepthCm: 50 },
      { kind: 'raised-bed', category: 'earthworks', label: 'Raised bed', icon: Square,   geometry: 'point', drawMode: 'draw_point', phase: 'soil',      color: COLORS.earthworksBed },
      { kind: 'terrace',    category: 'earthworks', label: 'Terrace',    icon: Mountain, geometry: 'point', drawMode: 'draw_point', phase: 'landshape', color: COLORS.earthworksTerrace, earthworkDepthCm: 100 },
    ],
  },
  {
    key: 'amenity',
    label: 'Amenity & Culture',
    elements: [
      { kind: 'parking',         category: 'amenity', label: 'Parking',         icon: ParkingSquare, geometry: 'point',   drawMode: 'draw_point',   phase: 'buildings', color: COLORS.amenity },
      { kind: 'prayer-pavilion', category: 'amenity', label: 'Prayer Pavilion', icon: Home,          geometry: 'point',   drawMode: 'draw_point',   phase: 'buildings', color: COLORS.amenity },
      { kind: 'fire-circle',     category: 'amenity', label: 'Fire Circle',     icon: Flame,         geometry: 'point',   drawMode: 'draw_point',   phase: 'buildings', color: COLORS.amenityFire },
      { kind: 'compost',         category: 'amenity', label: 'Compost',         icon: Recycle,       geometry: 'polygon', drawMode: 'draw_polygon', phase: 'soil',      color: COLORS.amenityCompost },
      // Social-node amenities (Rec #6 v2). Point kinds so SocialNodesCard's
      // coverage detector (which counts Point social elements within
      // COVERED_RADIUS_M of a Z1/Z2 path intersection) recognises them.
      { kind: 'bench',              category: 'amenity', label: 'Bench',              icon: Armchair, geometry: 'point', drawMode: 'draw_point', phase: 'buildings', color: COLORS.amenitySeat },
      { kind: 'picnic-table',       category: 'amenity', label: 'Picnic Table',       icon: Utensils, geometry: 'point', drawMode: 'draw_point', phase: 'buildings', color: COLORS.amenityTable },
      { kind: 'shaded-seat',        category: 'amenity', label: 'Shaded Seat',        icon: Umbrella, geometry: 'point', drawMode: 'draw_point', phase: 'buildings', color: COLORS.amenitySeat },
      { kind: 'signage-post',       category: 'amenity', label: 'Signage Post',       icon: Signpost, geometry: 'point', drawMode: 'draw_point', phase: 'buildings', color: COLORS.amenitySign },
      { kind: 'gathering-pavilion', category: 'amenity', label: 'Gathering Pavilion', icon: Users,    geometry: 'point', drawMode: 'draw_point', phase: 'buildings', color: COLORS.amenityGather },
    ],
  },
  // 2026-05-21 — Habitat-feature unification (A2 ↔ B5 ↔ D0 wiring slice).
  // The 9 habitat types from habitatFeatureStore become first-class
  // design-element kinds. Three (hedgerow / shrub / pond) already live
  // under Vegetation / Water; the remaining 7 land here under a new
  // `habitat` category. B5 audit math reads designElementsStore directly,
  // so placing these kinds now feeds the beneficial-habitat coverage score.
  {
    key: 'habitat',
    label: 'Habitat Features',
    elements: [
      { kind: 'owl-box',         category: 'habitat', label: 'Owl box',         icon: Bird,    geometry: 'point',   drawMode: 'draw_point',       phase: 'trees', color: COLORS.habitatBox,       defaultSpacingM: 30 },
      { kind: 'raptor-perch',    category: 'habitat', label: 'Raptor perch',    icon: Eye,     geometry: 'point',   drawMode: 'draw_point',       phase: 'trees', color: COLORS.habitatPerch,     defaultSpacingM: 50 },
      { kind: 'nest-box',        category: 'habitat', label: 'Nest box',        icon: Bird,    geometry: 'point',   drawMode: 'draw_point',       phase: 'trees', color: COLORS.habitatBox,       defaultSpacingM: 8  },
      { kind: 'brush-pile',      category: 'habitat', label: 'Brush pile',      icon: Sprout,  geometry: 'point',   drawMode: 'draw_point',       phase: 'soil',  color: COLORS.habitatBrush },
      { kind: 'snag',            category: 'habitat', label: 'Standing snag',   icon: TreeDeciduous, geometry: 'point', drawMode: 'draw_point',     phase: 'trees', color: COLORS.habitatSnag,      defaultSpacingM: 15 },
      { kind: 'insectary-strip', category: 'habitat', label: 'Insectary strip', icon: Flower2, geometry: 'line',    drawMode: 'draw_line_string', phase: 'soil',  color: COLORS.habitatInsectary, defaultWidthM: 1.2 },
      { kind: 'wetland-edge',    category: 'habitat', label: 'Wetland edge',    icon: Waves,   geometry: 'polygon', drawMode: 'draw_polygon',     phase: 'water', color: COLORS.habitatWetland },
    ],
  },
];

export function findElementSpec(kind: string): DesignElementSpec | null {
  for (const cat of DESIGN_CATEGORIES) {
    const found = cat.elements.find((e) => e.kind === kind);
    if (found) return found;
  }
  return null;
}
