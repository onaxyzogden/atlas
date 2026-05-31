// actToolCatalog.ts
//
// Single source of truth for the Act tier-shell categorized tools rail. Maps a
// stable catalogue id (reused from the tier-prototype vocabulary) to its label,
// lucide icon, category, and the REAL action it arms:
//
//   - kind: 'map'   -> arms a placement/draw tool via useMapToolStore.setActiveTool.
//                      Each `mapToolId` is a member of the MapToolId union, so a
//                      typo fails `tsc` (the main safety net). Every id below was
//                      verified against the live DrawHost dispatch (ObserveDrawHost
//                      bespoke cases + registry path; PlanDrawHost switch +
//                      DESIGN_ELEMENT_TOOL_IDS) so arming actually mounts a tool.
//   - kind: 'log'   -> routes through QUICK_LOGS (act.* field logs) via the shell's
//                      existing setActiveModule + setActiveTool path.
//   - kind: 'form'  -> opens a VisionFormModal for text/decision capture on
//                      non-spatial checklist items. `formId` matches the checklist
//                      item id; `prompt` is shown as the modal heading; `placeholder`
//                      is optional helper text inside the textarea.
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
  Triangle,
  Spline,
  Sun,
  Wind,
  Flame,
  Snowflake,
  ShieldAlert,
  CloudRain,
  Container,
  Leaf,
  Bird,
  Wheat,
  Ruler,
  StickyNote,
  Map as MapIcon,
  CircleDashed,
  Footprints,
  MapPin,
  UserCheck,
  FileText,
  Target,
  HardHat,
  Wallet,
  Lock,
  Layers,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import type { MapToolId } from '../../observe/components/measure/useMapToolStore.js';

export type ActToolCategoryId =
  | 'vision'
  | 'terrain-survey'
  | 'climate-sectors'
  | 'water'
  | 'soil'
  | 'ecology-habitat'
  | 'access-utilities'
  | 'structures'
  | 'production-systems'
  | 'zones-planning'
  | 'people'
  | 'field-logs';

export interface ActToolCategoryMeta {
  id: ActToolCategoryId;
  label: string;
}

/** Display order + labels for the categories shown in the rail. */
export const ACT_TOOL_CATEGORIES: readonly ActToolCategoryMeta[] = [
  { id: 'vision', label: 'Vision & Setup' },
  { id: 'terrain-survey', label: 'Terrain & Survey' },
  { id: 'climate-sectors', label: 'Climate & Sectors' },
  { id: 'water', label: 'Water & Hydrology' },
  { id: 'soil', label: 'Soil' },
  { id: 'ecology-habitat', label: 'Ecology & Habitat' },
  { id: 'access-utilities', label: 'Access & Utilities' },
  { id: 'structures', label: 'Structures' },
  { id: 'production-systems', label: 'Production Systems' },
  { id: 'zones-planning', label: 'Zones & Planning' },
  { id: 'people', label: 'People & Stakeholders' },
  { id: 'field-logs', label: 'Field logs' },
] as const;

export type ActToolArm =
  | { kind: 'map'; mapToolId: MapToolId }
  | { kind: 'log'; quickLogId: string }
  | { kind: 'form'; formId: string; prompt: string; placeholder?: string };

export interface ActTool {
  id: string;
  label: string;
  icon: LucideIcon;
  category: ActToolCategoryId;
  arm: ActToolArm;
}

export const ACT_TOOL_CATALOG: Record<string, ActTool> = {
  // ---- Vision & Setup (form tools -- open a text-capture popup) ----
  'purpose-statement': {
    id: 'purpose-statement',
    label: 'Primary purpose',
    icon: FileText,
    category: 'vision',
    arm: {
      kind: 'form',
      formId: 's1-vision-c1',
      prompt: 'State the primary purpose of this land project in plain language',
      placeholder:
        'Describe the land project in 2-4 sentences. What is it for? Who does it serve? What does success look like in plain terms?',
    },
  },
  'success-criteria': {
    id: 'success-criteria',
    label: 'Success criteria',
    icon: Target,
    category: 'vision',
    arm: {
      kind: 'form',
      formId: 's1-vision-c2',
      prompt: 'Define 3-5 measurable success criteria for the first planning cycle',
      placeholder:
        'List each criterion on its own line. Make them specific and measurable -- e.g. "10mm/hr infiltration rate on all surveyed zones by end of year 1."',
    },
  },
  'labour-inventory': {
    id: 'labour-inventory',
    label: 'Labour inventory',
    icon: HardHat,
    category: 'vision',
    arm: {
      kind: 'form',
      formId: 's1-vision-labour',
      prompt: 'Inventory available labour -- hours per week, seasonal variation, skill level',
      placeholder:
        'Who is available? How many hours per week? Does availability change by season? Note relevant skills (earthworks, fencing, irrigation, etc.).',
    },
  },
  'capital-budget': {
    id: 'capital-budget',
    label: 'Capital budget',
    icon: Wallet,
    category: 'vision',
    arm: {
      kind: 'form',
      formId: 's1-vision-c3',
      prompt: 'Inventory available capital -- initial budget and estimated annual operating budget',
      placeholder:
        'State the initial capital available and an estimated annual operating budget. Note any restrictions on how funds can be used.',
    },
  },
  constraints: {
    id: 'constraints',
    label: 'Constraints',
    icon: Lock,
    category: 'vision',
    arm: {
      kind: 'form',
      formId: 's1-vision-constraints',
      prompt: 'Identify non-negotiables and hard constraints',
      placeholder:
        'What cannot change? Include legal, financial, physical, or personal constraints. List each on its own line.',
    },
  },
  'vision-classify': {
    id: 'vision-classify',
    label: 'Vision elements',
    icon: Layers,
    category: 'vision',
    arm: {
      kind: 'form',
      formId: 's1-vision-classify',
      prompt: 'Classify vision elements as committed vs. aspirational',
      placeholder:
        'Committed: things you will definitely do regardless of cost or effort.\nAspirational: things you want to do if resources allow.',
    },
  },
  assumptions: {
    id: 'assumptions',
    label: 'Assumptions',
    icon: HelpCircle,
    category: 'vision',
    arm: {
      kind: 'form',
      formId: 's1-vision-assumptions',
      prompt: 'Record assumptions and known unknowns',
      placeholder:
        'What are you assuming to be true that you have not yet verified? What do you know you do not know? List each on its own line.',
    },
  },

  // ---- Terrain & Survey ----
  contour: {
    id: 'contour',
    label: 'Contour lines',
    icon: Mountain,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'observe.topography.contour-line' },
  },
  'high-point': {
    id: 'high-point',
    label: 'High points',
    icon: Triangle,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'observe.topography.high-point' },
  },
  drainage: {
    id: 'drainage',
    label: 'Drainage lines',
    icon: Waves,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'observe.topography.drainage-line' },
  },
  'runoff-path': {
    id: 'runoff-path',
    label: 'Runoff paths',
    icon: Spline,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'observe.topography.runoff-path' },
  },
  erosion: {
    id: 'erosion',
    label: 'Erosion risk',
    icon: AlertTriangle,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'observe.topography.erosion-flag' },
  },

  // ---- Climate & Sectors ----
  'sun-sector': {
    id: 'sun-sector',
    label: 'Sun sectors',
    icon: Sun,
    category: 'climate-sectors',
    arm: { kind: 'map', mapToolId: 'observe.sectors-zones.sun-summer' },
  },
  'wind-sector': {
    id: 'wind-sector',
    label: 'Wind sectors',
    icon: Wind,
    category: 'climate-sectors',
    arm: { kind: 'map', mapToolId: 'observe.sectors-zones.wind-prevailing' },
  },
  'fire-sector': {
    id: 'fire-sector',
    label: 'Fire sector',
    icon: Flame,
    category: 'climate-sectors',
    arm: { kind: 'map', mapToolId: 'observe.sectors-zones.fire' },
  },
  'frost-pocket': {
    id: 'frost-pocket',
    label: 'Frost pockets',
    icon: Snowflake,
    category: 'climate-sectors',
    arm: { kind: 'map', mapToolId: 'observe.macroclimate-hazards.frost-pocket' },
  },
  'hazard-zone': {
    id: 'hazard-zone',
    label: 'Hazard zones',
    icon: ShieldAlert,
    category: 'climate-sectors',
    arm: { kind: 'map', mapToolId: 'observe.macroclimate-hazards.hazard-zone' },
  },

  // ---- Water & Hydrology ----
  watercourse: {
    id: 'watercourse',
    label: 'Watercourses',
    icon: Waves,
    category: 'water',
    arm: { kind: 'map', mapToolId: 'observe.earth-water-ecology.watercourse' },
  },
  catchment: {
    id: 'catchment',
    label: 'Catchment areas',
    icon: CloudRain,
    category: 'water',
    arm: { kind: 'map', mapToolId: 'plan.water-management.catchment' },
  },
  spring: {
    id: 'spring',
    label: 'Springs',
    icon: Droplet,
    category: 'water',
    arm: { kind: 'map', mapToolId: 'plan.water-management.spring' },
  },
  storage: {
    id: 'storage',
    label: 'Water storage',
    icon: Container,
    category: 'water',
    arm: { kind: 'map', mapToolId: 'plan.water-management.storage' },
  },
  swale: {
    id: 'swale',
    label: 'Swales',
    icon: Waves,
    category: 'water',
    arm: { kind: 'map', mapToolId: 'plan.water-management.swale' },
  },
  sink: {
    id: 'sink',
    label: 'Sinks / overflow',
    icon: Droplets,
    category: 'water',
    arm: { kind: 'map', mapToolId: 'plan.water-management.sink' },
  },

  // ---- Soil ----
  soil: {
    id: 'soil',
    label: 'Soil sampling',
    icon: FlaskConical,
    category: 'soil',
    arm: { kind: 'map', mapToolId: 'observe.earth-water-ecology.soil-sample' },
  },
  'fertility-unit': {
    id: 'fertility-unit',
    label: 'Fertility units',
    icon: Wheat,
    category: 'soil',
    arm: { kind: 'map', mapToolId: 'plan.soil-fertility.fertility-unit' },
  },
  transect: {
    id: 'transect',
    label: 'Monitoring transect',
    icon: Ruler,
    category: 'soil',
    arm: { kind: 'map', mapToolId: 'plan.principle-verification.transect' },
  },

  // ---- Ecology & Habitat ----
  vegetation: {
    id: 'vegetation',
    label: 'Vegetation cover',
    icon: Trees,
    category: 'ecology-habitat',
    arm: { kind: 'map', mapToolId: 'observe.earth-water-ecology.vegetation' },
  },
  pasture: {
    id: 'pasture',
    label: 'Pasture / grassland',
    icon: Leaf,
    category: 'ecology-habitat',
    arm: { kind: 'map', mapToolId: 'observe.earth-water-ecology.pasture' },
  },
  'wildlife-sector': {
    id: 'wildlife-sector',
    label: 'Wildlife corridors',
    icon: Bird,
    category: 'ecology-habitat',
    arm: { kind: 'map', mapToolId: 'observe.sectors-zones.wildlife' },
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
  path: {
    id: 'path',
    label: 'Paths',
    icon: Footprints,
    category: 'access-utilities',
    arm: { kind: 'map', mapToolId: 'plan.zone-circulation.path' },
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

  // ---- Zones & Planning ----
  zone: {
    id: 'zone',
    label: 'Zones',
    icon: MapIcon,
    category: 'zones-planning',
    arm: { kind: 'map', mapToolId: 'plan.zone-circulation.zone' },
  },
  'buffer-ring': {
    id: 'buffer-ring',
    label: 'Buffer zones',
    icon: CircleDashed,
    category: 'zones-planning',
    arm: { kind: 'map', mapToolId: 'plan.zone-circulation.buffer-ring' },
  },
  note: {
    id: 'note',
    label: 'Field note',
    icon: StickyNote,
    category: 'zones-planning',
    arm: { kind: 'map', mapToolId: 'plan.principle-verification.note' },
  },

  // ---- People & Stakeholders ----
  'neighbour-pin': {
    id: 'neighbour-pin',
    label: 'Neighbours',
    icon: MapPin,
    category: 'people',
    arm: { kind: 'map', mapToolId: 'observe.human-context.neighbour-pin' },
  },
  steward: {
    id: 'steward',
    label: 'Stewards',
    icon: UserCheck,
    category: 'people',
    arm: { kind: 'map', mapToolId: 'observe.human-context.steward' },
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
