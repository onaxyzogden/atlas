// actToolCatalog.ts
//
// Single source of truth for the Act tier-shell categorized tools rail. Maps a
// stable catalogue id (reused from the tier-prototype vocabulary) to its label,
// lucide icon, category, and the REAL action it arms:
//
//   - kind: 'map'  -> arms a placement/draw tool via useMapToolStore.setActiveTool.
//                     Each `mapToolId` is a member of the MapToolId union, so a
//                     typo fails `tsc` (the main safety net). Every id below was
//                     verified against the live DrawHost dispatch (ObserveDrawHost
//                     bespoke cases + registry path; PlanDrawHost switch +
//                     DESIGN_ELEMENT_TOOL_IDS) so arming actually mounts a tool.
//   - kind: 'log'  -> routes through QUICK_LOGS (act.* field logs) via the shell's
//                     existing setActiveModule + setActiveTool path.
//
// This file lives in the app layer (not packages/shared) because it imports the
// MapToolId union and lucide icons, both app-only. The objective->tool mapping
// (packages/shared/src/relationships/objectiveActTools.ts) returns catalogue-id
// strings only and stays free of these deps; the rail joins ids against this
// catalogue.
//
// Analysis-only prototype tools (slope, aspect, dem) are intentionally OMITTED:
// they have no draw tool and no store, so showing an un-armable button is worse
// than not showing it.

import {
  Mountain,
  Waves,
  FlaskConical,
  Trees,
  AlertTriangle,
  Route,
  Zap,
  Droplet,
  DoorOpen,
  Car,
  Fence,
  Building2,
  Warehouse,
  Home,
  Box,
  Droplets,
  Sprout,
  TreeDeciduous,
  Beef,
  LayoutGrid,
  Recycle,
  Shuffle,
  type LucideIcon,
} from 'lucide-react';
import type { MapToolId } from '../../observe/components/measure/useMapToolStore.js';

export type ActToolCategoryId =
  | 'terrain-survey'
  | 'access-utilities'
  | 'structures'
  | 'production-systems'
  | 'field-logs';

export interface ActToolCategoryMeta {
  id: ActToolCategoryId;
  label: string;
}

/** Display order + labels for the categories shown in the rail. */
export const ACT_TOOL_CATEGORIES: readonly ActToolCategoryMeta[] = [
  { id: 'terrain-survey', label: 'Terrain & Survey' },
  { id: 'access-utilities', label: 'Access & Utilities' },
  { id: 'structures', label: 'Structures' },
  { id: 'production-systems', label: 'Production Systems' },
  { id: 'field-logs', label: 'Field logs' },
] as const;

export type ActToolArm =
  | { kind: 'map'; mapToolId: MapToolId }
  | { kind: 'log'; quickLogId: string };

export interface ActTool {
  id: string;
  label: string;
  icon: LucideIcon;
  category: ActToolCategoryId;
  arm: ActToolArm;
}

export const ACT_TOOL_CATALOG: Record<string, ActTool> = {
  // ---- Terrain & Survey ----
  contour: {
    id: 'contour',
    label: 'Contour lines',
    icon: Mountain,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'observe.topography.contour-line' },
  },
  drainage: {
    id: 'drainage',
    label: 'Drainage lines',
    icon: Waves,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'observe.topography.drainage-line' },
  },
  soil: {
    id: 'soil',
    label: 'Soil sampling',
    icon: FlaskConical,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'observe.earth-water-ecology.soil-sample' },
  },
  vegetation: {
    id: 'vegetation',
    label: 'Vegetation cover',
    icon: Trees,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'observe.earth-water-ecology.vegetation' },
  },
  erosion: {
    id: 'erosion',
    label: 'Erosion risk',
    icon: AlertTriangle,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'observe.topography.erosion-flag' },
  },

  // ---- Access & Utilities ----
  roads: {
    id: 'roads',
    label: 'Roads & paths',
    icon: Route,
    category: 'access-utilities',
    arm: { kind: 'map', mapToolId: 'plan.zone-circulation.road' },
  },
  power: {
    id: 'power',
    label: 'Power lines',
    icon: Zap,
    category: 'access-utilities',
    arm: { kind: 'map', mapToolId: 'observe.built-environment.power-line' },
  },
  'water-lines': {
    id: 'water-lines',
    label: 'Water lines',
    icon: Droplet,
    category: 'access-utilities',
    arm: { kind: 'map', mapToolId: 'plan.structures-subsystems.utility-run' },
  },
  gates: {
    id: 'gates',
    label: 'Gates',
    icon: DoorOpen,
    category: 'access-utilities',
    arm: { kind: 'map', mapToolId: 'observe.built-environment.gate' },
  },
  parking: {
    id: 'parking',
    label: 'Parking',
    icon: Car,
    category: 'access-utilities',
    arm: { kind: 'map', mapToolId: 'observe.built-environment.parking' },
  },
  fencing: {
    id: 'fencing',
    label: 'Fencing',
    icon: Fence,
    category: 'access-utilities',
    arm: { kind: 'map', mapToolId: 'observe.built-environment.fence' },
  },

  // ---- Structures ----
  buildings: {
    id: 'buildings',
    label: 'Buildings',
    icon: Building2,
    category: 'structures',
    arm: { kind: 'map', mapToolId: 'observe.built-environment.building' },
  },
  barns: {
    id: 'barns',
    label: 'Barns',
    icon: Warehouse,
    category: 'structures',
    arm: { kind: 'map', mapToolId: 'observe.built-environment.barn' },
  },
  dwellings: {
    id: 'dwellings',
    label: 'Dwellings',
    icon: Home,
    category: 'structures',
    arm: { kind: 'map', mapToolId: 'observe.built-environment.cabin' },
  },
  tanks: {
    id: 'tanks',
    label: 'Tanks',
    icon: Box,
    category: 'structures',
    arm: { kind: 'map', mapToolId: 'observe.built-environment.water-tank' },
  },
  wells: {
    id: 'wells',
    label: 'Wells',
    icon: Droplets,
    category: 'structures',
    arm: { kind: 'map', mapToolId: 'observe.built-environment.well' },
  },

  // ---- Production Systems ----
  crops: {
    id: 'crops',
    label: 'Crop areas',
    icon: Sprout,
    category: 'production-systems',
    arm: { kind: 'map', mapToolId: 'plan.plant-systems.crop-area' },
  },
  orchards: {
    id: 'orchards',
    label: 'Orchards',
    icon: TreeDeciduous,
    category: 'production-systems',
    arm: { kind: 'map', mapToolId: 'plan.plant-systems.orchard' },
  },
  paddocks: {
    id: 'paddocks',
    label: 'Paddocks',
    icon: Beef,
    category: 'production-systems',
    arm: { kind: 'map', mapToolId: 'plan.livestock.paddock' },
  },
  beds: {
    id: 'beds',
    label: 'Garden beds',
    icon: LayoutGrid,
    category: 'production-systems',
    // CropAreaTool — bed/garden type is chosen in the placement popover.
    arm: { kind: 'map', mapToolId: 'plan.plant-systems.crop-area' },
  },
  compost: {
    id: 'compost',
    label: 'Compost',
    icon: Recycle,
    category: 'production-systems',
    arm: { kind: 'map', mapToolId: 'observe.built-environment.compost' },
  },

  // ---- Field logs (act.* — route through QUICK_LOGS) ----
  harvest: {
    id: 'harvest',
    label: 'Log harvest',
    icon: Sprout,
    category: 'field-logs',
    arm: { kind: 'log', quickLogId: 'plants-food' },
  },
  water: {
    id: 'water',
    label: 'Log water check',
    icon: Droplet,
    category: 'field-logs',
    arm: { kind: 'log', quickLogId: 'water' },
  },
  livestock: {
    id: 'livestock',
    label: 'Log livestock move',
    icon: Shuffle,
    category: 'field-logs',
    arm: { kind: 'log', quickLogId: 'animals-livestock' },
  },
};

/** Resolve catalogue ids to ActTool objects, dropping any unknown id. */
export function resolveActTools(ids: readonly string[]): ActTool[] {
  const out: ActTool[] = [];
  for (const id of ids) {
    const tool = ACT_TOOL_CATALOG[id];
    if (tool) out.push(tool);
  }
  return out;
}
