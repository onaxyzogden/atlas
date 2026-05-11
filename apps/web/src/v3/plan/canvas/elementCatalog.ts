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
  Building2,
  Compass,
  Droplets,
  Flame,
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
  Sprout,
  Square,
  Tent,
  TreeDeciduous,
  Trees,
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
  | 'zone-marker'
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
  vegetationOak: '#52784a',
  vegetationPine: '#2f5e38',
  vegetationApple: '#7faa54',
  vegetationShrub: '#6a9648',
  vegetationHedge: '#4a7a3a',
  earthworksBerm: '#8c6a4c',
  earthworksBed: '#735238',
  earthworksTerrace: '#806142',
  zoneMarker0: '#d8d8d8',
  zoneMarker1: '#f3c766',
  zoneMarker2: '#a6d172',
  zoneMarker3: '#73b366',
  zoneMarker4: '#598c4c',
  zoneMarker5: '#406640',
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
    elements: [
      { kind: 'water-tank', category: 'water', label: 'Water Tank', icon: Droplets, geometry: 'point',   drawMode: 'draw_point',       phase: 'water', color: COLORS.water },
      { kind: 'pond',       category: 'water', label: 'Pond',       icon: Waves,    geometry: 'polygon', drawMode: 'draw_polygon',     phase: 'water', color: COLORS.water, earthworkDepthCm: 200 },
      { kind: 'swale',      category: 'water', label: 'Swale',      icon: Sprout,   geometry: 'line',    drawMode: 'draw_line_string', phase: 'water', color: COLORS.water, earthworkDepthCm: 60 },
      { kind: 'spring',     category: 'water', label: 'Spring',     icon: Leaf,     geometry: 'point',   drawMode: 'draw_point',       phase: 'water', color: COLORS.waterEphemeral },
    ],
  },
  {
    key: 'access',
    label: 'Access & Paths',
    elements: [
      { kind: 'path',   category: 'access', label: 'Path',   icon: Footprints, geometry: 'line',  drawMode: 'draw_line_string', phase: 'access', color: COLORS.accessFoot },
      { kind: 'road',   category: 'access', label: 'Road',   icon: Route,      geometry: 'line',  drawMode: 'draw_line_string', phase: 'access', color: COLORS.access, earthworkDepthCm: 40 },
      { kind: 'gate',   category: 'access', label: 'Gate',   icon: Compass,    geometry: 'point', drawMode: 'draw_point',       phase: 'access', color: COLORS.access },
      { kind: 'bridge', category: 'access', label: 'Bridge', icon: Route,      geometry: 'point', drawMode: 'draw_point',       phase: 'access', color: COLORS.access },
    ],
  },
  {
    key: 'vegetation',
    label: 'Vegetation',
    elements: [
      { kind: 'oak-tree',   category: 'vegetation', label: 'Oak Tree',   icon: TreeDeciduous, geometry: 'point', drawMode: 'draw_point',       phase: 'trees', color: COLORS.vegetationOak },
      { kind: 'pine-tree',  category: 'vegetation', label: 'Pine Tree',  icon: Trees,         geometry: 'point', drawMode: 'draw_point',       phase: 'trees', color: COLORS.vegetationPine },
      { kind: 'apple-tree', category: 'vegetation', label: 'Apple Tree', icon: TreeDeciduous, geometry: 'point', drawMode: 'draw_point',       phase: 'trees', color: COLORS.vegetationApple },
      { kind: 'shrub',      category: 'vegetation', label: 'Shrub',      icon: Leaf,          geometry: 'point', drawMode: 'draw_point',       phase: 'trees', color: COLORS.vegetationShrub },
      { kind: 'hedgerow',   category: 'vegetation', label: 'Hedgerow',   icon: Trees,         geometry: 'line',  drawMode: 'draw_line_string', phase: 'trees', color: COLORS.vegetationHedge },
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
    key: 'zone-marker',
    label: 'Zone Markers',
    elements: [
      { kind: 'zone-0', category: 'zone-marker', label: 'Zone 0', icon: Home,          geometry: 'point', drawMode: 'draw_point', phase: 'subdivision', color: COLORS.zoneMarker0 },
      { kind: 'zone-1', category: 'zone-marker', label: 'Zone 1', icon: Sprout,        geometry: 'point', drawMode: 'draw_point', phase: 'subdivision', color: COLORS.zoneMarker1 },
      { kind: 'zone-2', category: 'zone-marker', label: 'Zone 2', icon: TreeDeciduous, geometry: 'point', drawMode: 'draw_point', phase: 'subdivision', color: COLORS.zoneMarker2 },
      { kind: 'zone-3', category: 'zone-marker', label: 'Zone 3', icon: Wheat,         geometry: 'point', drawMode: 'draw_point', phase: 'subdivision', color: COLORS.zoneMarker3 },
      { kind: 'zone-4', category: 'zone-marker', label: 'Zone 4', icon: Trees,         geometry: 'point', drawMode: 'draw_point', phase: 'subdivision', color: COLORS.zoneMarker4 },
      { kind: 'zone-5', category: 'zone-marker', label: 'Zone 5', icon: Leaf,          geometry: 'point', drawMode: 'draw_point', phase: 'subdivision', color: COLORS.zoneMarker5 },
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
