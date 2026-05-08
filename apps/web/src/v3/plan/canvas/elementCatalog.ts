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
  Home,
  LandPlot,
  Leaf,
  ParkingSquare,
  Recycle,
  Route,
  Sprout,
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
  | 'amenity';

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
  amenity: '#c4a265',
  amenityFire: '#c87a3f',
  amenityCompost: '#6a5a4a',
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
    key: 'water',
    label: 'Water Systems',
    elements: [
      { kind: 'water-tank', category: 'water', label: 'Water Tank', icon: Droplets, geometry: 'point',   drawMode: 'draw_point',       phase: 'water', color: COLORS.water },
      { kind: 'pond',       category: 'water', label: 'Pond',       icon: Waves,    geometry: 'polygon', drawMode: 'draw_polygon',     phase: 'water', color: COLORS.water },
      { kind: 'swale',      category: 'water', label: 'Swale',      icon: Sprout,   geometry: 'line',    drawMode: 'draw_line_string', phase: 'water', color: COLORS.water },
      { kind: 'spring',     category: 'water', label: 'Spring',     icon: Leaf,     geometry: 'point',   drawMode: 'draw_point',       phase: 'water', color: COLORS.waterEphemeral },
    ],
  },
  {
    key: 'access',
    label: 'Access & Paths',
    elements: [
      { kind: 'path',   category: 'access', label: 'Path',   icon: Footprints, geometry: 'line',  drawMode: 'draw_line_string', phase: 'access', color: COLORS.accessFoot },
      { kind: 'road',   category: 'access', label: 'Road',   icon: Route,      geometry: 'line',  drawMode: 'draw_line_string', phase: 'access', color: COLORS.access },
      { kind: 'gate',   category: 'access', label: 'Gate',   icon: Compass,    geometry: 'point', drawMode: 'draw_point',       phase: 'access', color: COLORS.access },
      { kind: 'bridge', category: 'access', label: 'Bridge', icon: Route,      geometry: 'point', drawMode: 'draw_point',       phase: 'access', color: COLORS.access },
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
