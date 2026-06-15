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
// Analysis-only prototype tools (aspect, dem) are intentionally OMITTED: they
// have no draw tool and no store, so showing an un-armable button is worse than
// not showing it. SLOPE is now drawable: s2-terrain-c2 exposes six per-class
// draw tools (slope-flat … slope-extreme) backed by slopeSurveyStore, surfaced
// only while the slope rail-takeover forces the map branch (mirrors veg-survey).

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
  Waypoints,
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
  Scissors,
  Eraser,
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

// A filled form field value. A text/hybrid field stores a string; a
// repeatable field stores a string[] (one entry per item). Keyed by the
// field spec's `key` in FormValue below.
export type FormFieldValue = string | string[];
// The structured output of one filled form: field key -> value.
export type FormValue = Record<string, FormFieldValue>;

export type FormLeafField =
  | { kind: 'hybrid'; key?: string; label?: string; optionSetId?: string; placeholder?: string }
  | { kind: 'text'; key?: string; label?: string; placeholder?: string; multiline?: boolean };

export type FormFieldSpec =
  | (FormLeafField & { required?: boolean })
  | {
      kind: 'repeatable';
      key: string;
      label: string;
      min: number;
      max: number;
      addLabel?: string;
      itemLabel?: string;
      item: FormLeafField;
    };

export type ActToolArm =
  | { kind: 'map'; mapToolId: MapToolId }
  | { kind: 'log'; quickLogId: string }
  | { kind: 'form'; formId: string; prompt: string; placeholder?: string; fields?: readonly FormFieldSpec[] }
  // Opens the Act-owned <ActFlowConnectorPopover> (list-capture of a source->sink
  // material flow into closedLoopStore). No spatial/draw arm: the popover renders
  // through the reusable Modal, not a map host.
  | { kind: 'flow' }
  // Imperative zone-seeding post-actions (trim the ring-seeded zones to the
  // parcel polygon / clear them). No map tool and no form -- the rail dispatches
  // these directly against useZoneStore in ActTierShell.handleActivateTool. The
  // SEED step itself is a kind:'map' arm (it arms the zone-seed-anchor placement
  // tool); only these two follow-up actions live here.
  | { kind: 'zone-action'; action: 'trim' | 'clear' };

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
      fields: [
        {
          kind: 'text',
          key: 'purpose',
          label: 'Primary purpose',
          multiline: true,
          required: true,
          placeholder: 'Describe the land project in 2-4 sentences.',
        },
      ],
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
      fields: [
        {
          kind: 'repeatable',
          key: 'criteria',
          label: 'Success criterion',
          min: 3,
          max: 5,
          addLabel: 'Add criterion',
          itemLabel: 'Criterion',
          item: {
            kind: 'hybrid',
            optionSetId: 'successCriteriaByType',
            placeholder: 'Pick a suggestion or type your own',
          },
        },
      ],
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
      fields: [
        {
          kind: 'text',
          key: 'hoursPerWeek',
          label: 'Hours available per week',
          required: true,
          placeholder: 'e.g. 20',
        },
        {
          kind: 'hybrid',
          key: 'seasonalVariation',
          label: 'Seasonal variation',
          optionSetId: 'laborSeasonality',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'repeatable',
          key: 'skills',
          label: 'Relevant skills',
          min: 0,
          max: 6,
          addLabel: 'Add skill',
          itemLabel: 'Skill',
          item: {
            kind: 'hybrid',
            optionSetId: 'laborSkillsByType',
            placeholder: 'Pick a skill or type your own',
          },
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Who is available, named helpers, constraints.',
        },
      ],
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
      fields: [
        {
          kind: 'text',
          key: 'initialBudget',
          label: 'Initial capital budget',
          required: true,
          placeholder: 'e.g. $25,000',
        },
        {
          kind: 'text',
          key: 'annualOperating',
          label: 'Estimated annual operating budget',
          placeholder: 'e.g. $8,000 / year',
        },
        {
          kind: 'text',
          key: 'restrictions',
          label: 'Restrictions on use of funds',
          multiline: true,
          placeholder: 'Any grant conditions, earmarks, or limits.',
        },
      ],
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
      fields: [
        {
          kind: 'repeatable',
          key: 'constraints',
          label: 'Constraint',
          min: 1,
          max: 8,
          addLabel: 'Add constraint',
          itemLabel: 'Constraint',
          item: {
            kind: 'hybrid',
            optionSetId: 'constraintsByType',
            placeholder: 'Pick a common constraint or type your own',
          },
        },
      ],
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
      fields: [
        {
          kind: 'repeatable',
          key: 'committed',
          label: 'Committed (will do regardless)',
          min: 1,
          max: 8,
          addLabel: 'Add committed element',
          itemLabel: 'Committed',
          item: {
            kind: 'text',
            placeholder: 'Something you will definitely do',
            key: 'value',
          },
        },
        {
          kind: 'repeatable',
          key: 'aspirational',
          label: 'Aspirational (if resources allow)',
          min: 0,
          max: 8,
          addLabel: 'Add aspirational element',
          itemLabel: 'Aspirational',
          item: {
            kind: 'text',
            placeholder: 'Something you want to do if resources allow',
            key: 'value',
          },
        },
      ],
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
      fields: [
        {
          kind: 'repeatable',
          key: 'assumptions',
          label: 'Assumption / known unknown',
          min: 1,
          max: 8,
          addLabel: 'Add assumption',
          itemLabel: 'Assumption',
          item: {
            kind: 'text',
            placeholder: 'Something you are assuming but have not verified',
            key: 'value',
          },
        },
      ],
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

  // s2-terrain-c2 draw-on-map slope survey. Six per-class polygon-draw tools;
  // the armed tool itself encodes which slope class the next polygon joins
  // (SlopeSurveyDrawHost reads it via SLOPE_CLASS_BY_TOOL). Surfaced only while
  // the slope rail-takeover is open; % of site is auto-computed from acreage.
  'slope-flat': {
    id: 'slope-flat',
    label: 'Draw flat (0–2%)',
    icon: Triangle,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'act.terrain.slope-flat' },
  },
  'slope-gentle': {
    id: 'slope-gentle',
    label: 'Draw gentle (2–5%)',
    icon: Triangle,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'act.terrain.slope-gentle' },
  },
  'slope-moderate': {
    id: 'slope-moderate',
    label: 'Draw moderate (5–10%)',
    icon: Triangle,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'act.terrain.slope-moderate' },
  },
  'slope-steep': {
    id: 'slope-steep',
    label: 'Draw steep (10–20%)',
    icon: Triangle,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'act.terrain.slope-steep' },
  },
  'slope-vsteep': {
    id: 'slope-vsteep',
    label: 'Draw very steep (20–30%)',
    icon: Triangle,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'act.terrain.slope-vsteep' },
  },
  'slope-extreme': {
    id: 'slope-extreme',
    label: 'Draw extreme (>30%)',
    icon: Triangle,
    category: 'terrain-survey',
    arm: { kind: 'map', mapToolId: 'act.terrain.slope-extreme' },
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
  'flow-connector': {
    id: 'flow-connector',
    label: 'Material flow',
    icon: Waypoints,
    category: 'water',
    // List-capture of a source->sink material flow (default greywater) into
    // closedLoopStore via <ActFlowConnectorPopover>; no map tool is armed.
    arm: { kind: 'flow' },
  },
  // Adopt an existing water body off the basemap into the water layer (dedup +
  // inline edit). Reuses the Observe AdoptBasemapWaterTool, already dispatched
  // by ObserveDrawHost (mounted on the Act canvas). Surfaced on water-reading
  // objectives so the steward imports what is already on the ground.
  'adopt-water': {
    id: 'adopt-water',
    label: 'Adopt water (from map)',
    icon: MapIcon,
    category: 'water',
    arm: { kind: 'map', mapToolId: 'observe.earth-water-ecology.adopt-water' },
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
  // s2-ecology-c1 draw-on-map vegetation survey. Arms the polygon-draw tool the
  // VegetationSurveyDrawHost guards on; the active community (which colour the
  // polygon takes + which register it joins) is chosen in VegetationSurveyPanel.
  // Surfaced only while the survey rail-takeover is open (ActTierShell forces it
  // into the bottom tray); it auto-computes % of site from drawn acreage.
  'vegetation-survey': {
    id: 'vegetation-survey',
    label: 'Draw vegetation community',
    icon: Trees,
    category: 'ecology-habitat',
    arm: { kind: 'map', mapToolId: 'act.ecology.veg-survey' },
  },
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
  // Adopt an existing building footprint off the basemap into the built-
  // environment layer (dedup + inline edit). Reuses the Observe
  // AdoptBasemapBuildingTool, already dispatched by ObserveDrawHost (mounted on
  // the Act canvas). Surfaced on existing-infrastructure-reading objectives so
  // the steward imports structures that are already on the ground.
  'adopt-building': {
    id: 'adopt-building',
    label: 'Adopt building (from map)',
    icon: MapIcon,
    category: 'structures',
    arm: { kind: 'map', mapToolId: 'observe.built-environment.adopt-basemap' },
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
  guild: {
    id: 'guild',
    label: 'Guild',
    icon: TreeDeciduous,
    category: 'production-systems',
    arm: { kind: 'map', mapToolId: 'plan.plant-systems.guild' },
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
  // Seed-from-rings flow (the tool stewards asked to bring back): arm the
  // ZoneSeedAnchorTool, click the home centre on the map, and full Mollison
  // Z0-Z5 rings grow from there (PlanDrawHost dispatches this id on the Act
  // canvas). The two follow-ups below trim those rings to the parcel boundary
  // and clear them. See wiki/log/2026-06-04-atlas-act-zone-seeding-toolbar.
  'zone-seed': {
    id: 'zone-seed',
    label: 'Seed zones from rings',
    icon: Sprout,
    category: 'zones-planning',
    arm: { kind: 'map', mapToolId: 'plan.zone-circulation.zone-seed-anchor' },
  },
  'zone-trim': {
    id: 'zone-trim',
    label: 'Trim seeded to parcel',
    icon: Scissors,
    category: 'zones-planning',
    arm: { kind: 'zone-action', action: 'trim' },
  },
  'zone-clear': {
    id: 'zone-clear',
    label: 'Clear seeded zones',
    icon: Eraser,
    category: 'zones-planning',
    arm: { kind: 'zone-action', action: 'clear' },
  },
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

  // ---- Per-type s1 intent capture forms (R2) ----
  // One form tool per checklist item on the per-type s1 vision/intent
  // objectives (the same objective class the universal s1-vision form arms
  // serve at project level). catalogue id == formId == checklist-item id, so
  // saving each form ticks that exact checklist item (handleFormSave ->
  // setItemComplete) and an objective's same-category form tools open as one
  // tabbed modal -- identical UX to the universal s1-vision arms. `prompt`
  // reuses the operator-authored checklist text (ASCII-normalised, imperative);
  // `placeholder` is intentionally omitted (the checklist instruction is
  // self-explanatory). All carry category: 'vision'. Authored 2026-06-03.

  // -- homestead --
  'hms-s1-household-needs-c1': {
    id: 'hms-s1-household-needs-c1',
    label: 'Household & ages',
    icon: UserCheck,
    category: 'vision',
    arm: {
      kind: 'form',
      formId: 'hms-s1-household-needs-c1',
      prompt: 'Define household composition and age range of occupants',
      fields: [
        {
          kind: 'text',
          key: 'householdSize',
          label: 'Number of occupants',
          required: true,
          placeholder: 'e.g. 4',
        },
        {
          kind: 'repeatable',
          key: 'members',
          label: 'Occupants by age band',
          min: 1,
          max: 12,
          addLabel: 'Add occupant',
          itemLabel: 'Occupant',
          item: {
            kind: 'hybrid',
            optionSetId: 'householdAgeBand',
            placeholder: 'Pick an age band or type your own',
          },
        },
      ],
    },
  },
  'hms-s1-household-needs-c2': {
    id: 'hms-s1-household-needs-c2',
    label: 'Food target',
    icon: Sprout,
    category: 'vision',
    arm: {
      kind: 'form',
      formId: 'hms-s1-household-needs-c2',
      prompt: 'Define household food production target - subsistence, supplementary, or commercial',
      fields: [
        {
          kind: 'hybrid',
          key: 'foodProductionTarget',
          label: 'Food production target',
          optionSetId: 'foodProductionTarget',
          required: true,
          placeholder: 'Pick a target or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'What does this target mean in practice? Any priorities or caveats.',
        },
      ],
    },
  },
  'hms-s1-household-needs-c3': {
    id: 'hms-s1-household-needs-c3',
    label: 'Enterprise scope',
    icon: Target,
    category: 'vision',
    arm: {
      kind: 'form',
      formId: 'hms-s1-household-needs-c3',
      prompt: 'Define domestic enterprise scope, if any - produce for own use only or for sale',
      fields: [
        {
          kind: 'hybrid',
          key: 'enterpriseScope',
          label: 'Enterprise scope',
          optionSetId: 'enterpriseScope',
          placeholder: 'Pick a scope or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'If any produce is intended for sale, note what and to whom.',
        },
      ],
    },
  },
  'hms-s1-household-needs-c4': {
    id: 'hms-s1-household-needs-c4',
    label: 'Labour available',
    icon: HardHat,
    category: 'vision',
    arm: {
      kind: 'form',
      formId: 'hms-s1-household-needs-c4',
      prompt: 'Identify household labour available for land management and enterprise work',
      fields: [
        {
          kind: 'text',
          key: 'hoursPerWeek',
          label: 'Hours available per week',
          required: true,
          placeholder: 'e.g. 20',
        },
        {
          kind: 'hybrid',
          key: 'seasonalVariation',
          label: 'Seasonal variation',
          optionSetId: 'laborSeasonality',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'repeatable',
          key: 'skills',
          label: 'Relevant skills',
          min: 0,
          max: 6,
          addLabel: 'Add skill',
          itemLabel: 'Skill',
          item: {
            kind: 'hybrid',
            optionSetId: 'laborSkillsByType',
            placeholder: 'Pick a skill or type your own',
          },
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Who is available, named helpers, constraints.',
        },
      ],
    },
  },
  'hms-s1-household-needs-c5': {
    id: 'hms-s1-household-needs-c5',
    label: 'Accessibility',
    icon: UserCheck,
    category: 'vision',
    arm: {
      kind: 'form',
      formId: 'hms-s1-household-needs-c5',
      prompt: 'Assess household accessibility requirements - mobility, health, age',
      fields: [
        {
          kind: 'repeatable',
          key: 'accessibilityNeeds',
          label: 'Accessibility requirement',
          min: 0,
          max: 8,
          addLabel: 'Add requirement',
          itemLabel: 'Requirement',
          item: {
            kind: 'hybrid',
            optionSetId: 'accessibilityNeed',
            placeholder: 'Pick a requirement or type your own',
          },
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Any specifics - who, what support, where on the land it matters.',
        },
      ],
    },
  },
  'hms-s1-household-needs-c6': {
    id: 'hms-s1-household-needs-c6',
    label: 'Space requirements',
    icon: Home,
    category: 'vision',
    arm: {
      kind: 'form',
      formId: 'hms-s1-household-needs-c6',
      prompt: 'Define household space requirements - dwelling footprint, gardens, outbuildings',
      fields: [
        {
          kind: 'text',
          key: 'dwellingFootprint',
          label: 'Dwelling footprint',
          placeholder: 'e.g. 120 sqm, 3-bedroom',
        },
        {
          kind: 'text',
          key: 'gardens',
          label: 'Gardens',
          placeholder: 'e.g. 200 sqm kitchen garden + orchard',
        },
        {
          kind: 'text',
          key: 'outbuildings',
          label: 'Outbuildings',
          multiline: true,
          placeholder: 'Sheds, barn, workshop, animal housing.',
        },
      ],
    },
  },
  'hms-s1-household-needs-c7': {
    id: 'hms-s1-household-needs-c7',
    label: 'Confirm agreed',
    icon: UserCheck,
    category: 'vision',
    arm: {
      kind: 'form',
      formId: 'hms-s1-household-needs-c7',
      prompt: 'Confirm household needs assessment is agreed by all occupants before design begins',
      fields: [
        {
          kind: 'hybrid',
          key: 'confirmAgreement',
          label: 'Agreed by all occupants?',
          optionSetId: 'confirmAgreement',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Any conditions, dissent, or follow-ups to resolve.',
        },
      ],
    },
  },

  // -- silvopasture --
  'silv-s1-enterprise-mix-c1': {
    id: 'silv-s1-enterprise-mix-c1', label: 'Species & breeds', icon: Beef, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-enterprise-mix-c1',
      prompt: 'Define species and breeds selected - cattle, sheep, goats, pigs, poultry, or combination',
      fields: [
        {
          kind: 'hybrid',
          key: 'species',
          label: 'Species selected',
          optionSetId: 'livestockSpecies',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Breeds and notes',
          multiline: true,
          placeholder: 'Specific breeds chosen, and why they suit this site.',
        },
      ],
    },
  },
  'silv-s1-enterprise-mix-c2': {
    id: 'silv-s1-enterprise-mix-c2', label: 'Production intent', icon: Target, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-enterprise-mix-c2',
      prompt: 'Define production intent per species - meat, milk, fibre, eggs, land improvement',
      fields: [
        {
          kind: 'hybrid',
          key: 'productionIntent',
          label: 'Production intent',
          optionSetId: 'livestockProductIntent',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Intent per species',
          multiline: true,
          placeholder: 'What each species is kept to produce.',
        },
      ],
    },
  },
  'silv-s1-enterprise-mix-c3': {
    id: 'silv-s1-enterprise-mix-c3', label: 'Herd-mix rationale', icon: Layers, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-enterprise-mix-c3',
      prompt: 'Define herd mix rationale - why these species, why these numbers',
      fields: [
        {
          kind: 'text',
          key: 'herdMixRationale',
          label: 'Herd mix rationale',
          multiline: true,
          placeholder: 'Why these species, and why these numbers.',
        },
      ],
    },
  },
  'silv-s1-enterprise-mix-c4': {
    id: 'silv-s1-enterprise-mix-c4', label: 'Stocking density', icon: Ruler, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-enterprise-mix-c4',
      prompt: 'Define stocking density - animals per hectare, carrying capacity assessment',
      fields: [
        {
          kind: 'text',
          key: 'stockingDensity',
          label: 'Stocking density',
          multiline: true,
          placeholder: 'Animals per hectare, and the carrying-capacity assessment behind it.',
        },
      ],
    },
  },
  'silv-s1-enterprise-mix-c5': {
    id: 'silv-s1-enterprise-mix-c5', label: 'Mix compatibility', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-enterprise-mix-c5',
      prompt: 'Confirm mix is compatible with land type, labour availability, and market',
      fields: [
        {
          kind: 'hybrid',
          key: 'compatible',
          label: 'Mix compatible with land type, labour availability, and market',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where the mix is or is not yet compatible, note it here.',
        },
      ],
    },
  },
  'silv-s1-enterprise-mix-c6': {
    id: 'silv-s1-enterprise-mix-c6', label: 'Confirm agreed', icon: UserCheck, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-enterprise-mix-c6',
      prompt: 'Confirm herd mix is agreed by all decision-makers',
      fields: [
        {
          kind: 'hybrid',
          key: 'agreed',
          label: 'Herd mix agreed by all decision-makers',
          optionSetId: 'confirmAgreement',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Who has agreed, and any conditions attached.',
        },
      ],
    },
  },
  'silv-s1-land-improvement-philosophy-c1': {
    id: 'silv-s1-land-improvement-philosophy-c1', label: 'Improvement ethos', icon: FileText, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-land-improvement-philosophy-c1',
      prompt: 'Define the land-improvement philosophy - is grazing designed to improve soil, pasture productivity, ecological condition, or a combination',
      fields: [
        {
          kind: 'hybrid',
          key: 'improvementGoal',
          label: 'Primary land-improvement goal',
          optionSetId: 'landImprovementGoal',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Philosophy notes',
          multiline: true,
          placeholder: 'What land improvement through grazing means here.',
        },
      ],
    },
  },
  'silv-s1-land-improvement-philosophy-c2': {
    id: 'silv-s1-land-improvement-philosophy-c2', label: 'Ecological outcomes', icon: Leaf, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-land-improvement-philosophy-c2',
      prompt: 'Identify ecological outcomes desired - plant species diversity, soil biology, water infiltration',
      fields: [
        {
          kind: 'repeatable',
          key: 'ecologicalOutcomes',
          label: 'Ecological outcomes desired',
          min: 1,
          max: 12,
          addLabel: 'Add outcome',
          itemLabel: 'Outcome',
          item: {
            kind: 'text',
            placeholder: 'A desired outcome - e.g. plant diversity, soil biology, water infiltration.',
          },
        },
      ],
    },
  },
  'silv-s1-land-improvement-philosophy-c3': {
    id: 'silv-s1-land-improvement-philosophy-c3', label: 'Grazing windows', icon: Shuffle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-land-improvement-philosophy-c3',
      prompt: 'Define grazing windows per zone - when animals are present, when land is rested',
      fields: [
        {
          kind: 'text',
          key: 'grazingWindows',
          label: 'Grazing windows per zone',
          multiline: true,
          placeholder: 'When animals are present, and when each zone is rested.',
        },
      ],
    },
  },
  'silv-s1-land-improvement-philosophy-c4': {
    id: 'silv-s1-land-improvement-philosophy-c4', label: 'Confirm rest', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-land-improvement-philosophy-c4',
      prompt: 'Confirm grazing windows support land-improvement goals and rest periods',
      fields: [
        {
          kind: 'hybrid',
          key: 'supportsGoals',
          label: 'Grazing windows support land-improvement goals and rest periods',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where the windows do or do not yet support the goals.',
        },
      ],
    },
  },
  'silv-s1-land-improvement-philosophy-c5': {
    id: 'silv-s1-land-improvement-philosophy-c5', label: 'Align with intent', icon: Layers, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-land-improvement-philosophy-c5',
      prompt: 'Align grazing philosophy with the primary silvopasture production intent',
      fields: [
        {
          kind: 'hybrid',
          key: 'aligned',
          label: 'Grazing philosophy aligned with the primary production intent',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'How the grazing philosophy serves the production intent.',
        },
      ],
    },
  },
  'silv-s1-land-improvement-philosophy-c6': {
    id: 'silv-s1-land-improvement-philosophy-c6', label: 'Document gate', icon: Lock, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-land-improvement-philosophy-c6',
      prompt: 'Document grazing philosophy as a gate on livestock management design',
      fields: [
        {
          kind: 'text',
          key: 'philosophyGate',
          label: 'Grazing philosophy gate',
          multiline: true,
          placeholder: 'The documented philosophy that gates livestock management design.',
        },
      ],
    },
  },
  'silv-s1-animal-welfare-c1': {
    id: 'silv-s1-animal-welfare-c1', label: 'Welfare ethos', icon: Leaf, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-animal-welfare-c1',
      prompt: 'Define the livestock welfare philosophy - what excellent care means for each species',
      fields: [
        {
          kind: 'text',
          key: 'welfarePhilosophy',
          label: 'Welfare philosophy',
          multiline: true,
          placeholder: 'What excellent care means for each species kept here.',
        },
      ],
    },
  },
  'silv-s1-animal-welfare-c2': {
    id: 'silv-s1-animal-welfare-c2', label: 'Non-negotiables', icon: Lock, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-animal-welfare-c2',
      prompt: 'Identify welfare non-negotiables - breed selection, stocking density, access to feed/water/shelter',
      fields: [
        {
          kind: 'repeatable',
          key: 'nonNegotiables',
          label: 'Welfare non-negotiables',
          min: 1,
          max: 12,
          addLabel: 'Add non-negotiable',
          itemLabel: 'Non-negotiable',
          item: {
            kind: 'text',
            placeholder: 'A welfare line that will not be crossed - e.g. access to shade and water.',
          },
        },
      ],
    },
  },
  'silv-s1-animal-welfare-c3': {
    id: 'silv-s1-animal-welfare-c3', label: 'Health protocols', icon: FlaskConical, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-animal-welfare-c3',
      prompt: 'Define health and vaccination protocols per species',
      fields: [
        {
          kind: 'text',
          key: 'healthProtocols',
          label: 'Health and vaccination protocols',
          multiline: true,
          placeholder: 'Health and vaccination protocols per species.',
        },
      ],
    },
  },
  'silv-s1-animal-welfare-c4': {
    id: 'silv-s1-animal-welfare-c4', label: 'Handling & slaughter', icon: Beef, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-animal-welfare-c4',
      prompt: 'Define humane handling and slaughter intent - on-farm or licensed facility',
      fields: [
        {
          kind: 'text',
          key: 'handlingSlaughter',
          label: 'Humane handling and slaughter intent',
          multiline: true,
          placeholder: 'Humane handling approach, and whether slaughter is on-farm or at a licensed facility.',
        },
      ],
    },
  },
  'silv-s1-animal-welfare-c5': {
    id: 'silv-s1-animal-welfare-c5', label: 'Welfare vs goals', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-animal-welfare-c5',
      prompt: 'Confirm welfare commitment is compatible with production goals',
      fields: [
        {
          kind: 'hybrid',
          key: 'compatible',
          label: 'Welfare commitment compatible with production goals',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where welfare and production goals reinforce or tension each other.',
        },
      ],
    },
  },
  'silv-s1-animal-welfare-c6': {
    id: 'silv-s1-animal-welfare-c6', label: 'Document gate', icon: Lock, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'silv-s1-animal-welfare-c6',
      prompt: 'Document welfare philosophy as a gate on all livestock management design',
      fields: [
        {
          kind: 'text',
          key: 'welfareGate',
          label: 'Welfare philosophy gate',
          multiline: true,
          placeholder: 'The documented welfare philosophy that gates all livestock management design.',
        },
      ],
    },
  },
  'silv-sec-s1-livestock-intent-c1': {
    id: 'silv-sec-s1-livestock-intent-c1', label: 'Integration rationale', icon: Layers, category: 'vision',
    arm: { kind: 'form', formId: 'silv-sec-s1-livestock-intent-c1', prompt: 'Define the integration rationale - grazing as a land-management tool, a production enterprise, or both' },
  },
  'silv-sec-s1-livestock-intent-c2': {
    id: 'silv-sec-s1-livestock-intent-c2', label: 'Candidate species', icon: Beef, category: 'vision',
    arm: { kind: 'form', formId: 'silv-sec-s1-livestock-intent-c2', prompt: 'Identify candidate species and classes of stock under consideration - ruminants, poultry, mixed' },
  },
  'silv-sec-s1-livestock-intent-c3': {
    id: 'silv-sec-s1-livestock-intent-c3', label: 'Relation to primary', icon: Shuffle, category: 'vision',
    arm: { kind: 'form', formId: 'silv-sec-s1-livestock-intent-c3', prompt: 'Define how livestock relate to the primary enterprise - complementary, supplementary, or competing for land' },
  },
  'silv-sec-s1-livestock-intent-c4': {
    id: 'silv-sec-s1-livestock-intent-c4', label: 'Experience & labour', icon: HardHat, category: 'vision',
    arm: { kind: 'form', formId: 'silv-sec-s1-livestock-intent-c4', prompt: 'Who will do daily stock care, and do they have the experience and hours for it?' },
  },
  'silv-sec-s1-livestock-intent-c5': {
    id: 'silv-sec-s1-livestock-intent-c5', label: 'Confirm fit', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'silv-sec-s1-livestock-intent-c5', prompt: 'Confirm livestock intent is compatible with the primary enterprise vision and site scale' },
  },

  // -- regenerative farm --
  'rf-s1-enterprise-mix-c1': {
    id: 'rf-s1-enterprise-mix-c1', label: 'Market channel', icon: Target, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'rf-s1-enterprise-mix-c1',
      prompt: 'Define primary market channel - wholesale, direct-to-consumer, mixed',
      // Sale-adjacent: free-text leaf, not an enumerated channel set (Amanah).
      fields: [
        {
          kind: 'text',
          key: 'marketChannel',
          label: 'Primary market channel',
          multiline: true,
          placeholder: 'e.g. wholesale, direct-to-consumer, mixed',
        },
      ],
    },
  },
  'rf-s1-enterprise-mix-c2': {
    id: 'rf-s1-enterprise-mix-c2', label: 'Enterprise mix', icon: Layers, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'rf-s1-enterprise-mix-c2',
      prompt: 'Define crop and livestock enterprise mix - vegetables, grains, animals, value-added products',
      fields: [
        {
          kind: 'repeatable',
          key: 'enterprises',
          label: 'Enterprises',
          min: 1,
          max: 10,
          addLabel: 'Add enterprise',
          itemLabel: 'Enterprise',
          item: {
            kind: 'text',
            placeholder: 'e.g. market vegetables, laying hens, value-added preserves',
          },
        },
      ],
    },
  },
  'rf-s1-enterprise-mix-c3': {
    id: 'rf-s1-enterprise-mix-c3', label: 'Targets & calendar', icon: Target, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'rf-s1-enterprise-mix-c3',
      prompt: 'Define production targets and seasonal calendar for each enterprise',
      fields: [
        {
          kind: 'text',
          key: 'targetsCalendar',
          label: 'Production targets & seasonal calendar',
          multiline: true,
          placeholder: 'Per enterprise: target volume/yield and the months it runs.',
        },
      ],
    },
  },
  'rf-s1-enterprise-mix-c4': {
    id: 'rf-s1-enterprise-mix-c4', label: 'Customer demand', icon: UserCheck, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'rf-s1-enterprise-mix-c4',
      prompt: 'Identify customer base and demand level for each product',
      // Sale-adjacent: free-text leaf, no enumerated demand/sales set (Amanah).
      fields: [
        {
          kind: 'text',
          key: 'customerDemand',
          label: 'Customer base & demand level',
          multiline: true,
          placeholder: 'Who buys each product, and how strong is demand?',
        },
      ],
    },
  },
  'rf-s1-enterprise-mix-c5': {
    id: 'rf-s1-enterprise-mix-c5', label: 'Capacity check', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'rf-s1-enterprise-mix-c5',
      prompt: 'Confirm mix is achievable within site soil, water, and labour capacity',
      fields: [
        {
          kind: 'hybrid',
          key: 'feasible',
          label: 'Achievable within capacity',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Any soil, water, or labour limits that shape the mix.',
        },
      ],
    },
  },
  'rf-s1-enterprise-mix-c6': {
    id: 'rf-s1-enterprise-mix-c6', label: 'Regen alignment', icon: Leaf, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'rf-s1-enterprise-mix-c6',
      prompt: 'Confirm mix aligns with regenerative principles and ecological vision',
      fields: [
        {
          kind: 'hybrid',
          key: 'aligns',
          label: 'Aligns with regenerative vision',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where the mix advances - or strains - the regenerative vision.',
        },
      ],
    },
  },
  'rf-s1-enterprise-mix-c7': {
    id: 'rf-s1-enterprise-mix-c7', label: 'Change process', icon: Shuffle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'rf-s1-enterprise-mix-c7',
      prompt: 'Define decision-making process for adding or removing enterprises',
      fields: [
        {
          kind: 'text',
          key: 'decisionProcess',
          label: 'Decision-making process',
          multiline: true,
          placeholder: 'Who decides, on what review cadence, and against which criteria?',
        },
      ],
    },
  },
  'rf-s1-enterprise-mix-c8': {
    id: 'rf-s1-enterprise-mix-c8', label: 'Confirm agreed', icon: UserCheck, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'rf-s1-enterprise-mix-c8',
      prompt: 'Confirm enterprise mix is agreed by all operators',
      fields: [
        {
          kind: 'hybrid',
          key: 'confirmAgreement',
          label: 'Agreed by all operators',
          optionSetId: 'confirmAgreement',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Any conditions or dissent to record.',
        },
      ],
    },
  },

  // -- market garden --
  'mgd-s1-production-targets-sales-c1': {
    id: 'mgd-s1-production-targets-sales-c1', label: 'Harvest value', icon: Wallet, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-production-targets-sales-c1',
      prompt: 'Define target total annual harvest value in dollars or kg',
      fields: [
        {
          kind: 'text',
          key: 'harvestValue',
          label: 'Target total annual harvest value',
          multiline: true,
          placeholder: 'In dollars or kg, the total annual harvest this garden aims to produce.',
        },
      ],
    },
  },
  'mgd-s1-production-targets-sales-c2': {
    id: 'mgd-s1-production-targets-sales-c2', label: 'Market channel', icon: Target, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-production-targets-sales-c2',
      prompt: 'Define primary market channel - farmers market, wholesale, CSA, online, restaurant supply, or hybrid',
      fields: [
        {
          kind: 'text',
          key: 'marketChannel',
          label: 'Primary market channel',
          multiline: true,
          placeholder: 'Farmers market, wholesale, CSA, online, restaurant supply, or hybrid - and why.',
        },
      ],
    },
  },
  'mgd-s1-production-targets-sales-c3': {
    id: 'mgd-s1-production-targets-sales-c3', label: 'Customer base', icon: UserCheck, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-production-targets-sales-c3',
      prompt: 'Define customer base for each channel - volume and growth trajectory',
      fields: [
        {
          kind: 'text',
          key: 'customerBase',
          label: 'Customer base per channel',
          multiline: true,
          placeholder: 'For each channel, the expected volume and how it is likely to grow.',
        },
      ],
    },
  },
  'mgd-s1-production-targets-sales-c4': {
    id: 'mgd-s1-production-targets-sales-c4', label: 'Capacity check', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-production-targets-sales-c4',
      prompt: 'Confirm targets are achievable within site soil, water, and labour capacity',
      fields: [
        {
          kind: 'hybrid',
          key: 'achievable',
          label: 'Targets achievable within soil, water, and labour capacity',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where soil, water, or labour limits a target, note it here.',
        },
      ],
    },
  },
  'mgd-s1-production-targets-sales-c5': {
    id: 'mgd-s1-production-targets-sales-c5', label: 'Pricing & margin', icon: Wallet, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-production-targets-sales-c5',
      prompt: 'Define pricing strategy and profit margin targets',
      fields: [
        {
          kind: 'text',
          key: 'pricingStrategy',
          label: 'Pricing strategy and profit margin targets',
          multiline: true,
          placeholder: 'How prices are set and the margin each channel aims for.',
        },
      ],
    },
  },
  'mgd-s1-production-targets-sales-c6': {
    id: 'mgd-s1-production-targets-sales-c6', label: 'Ramp realism', icon: Ruler, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-production-targets-sales-c6',
      prompt: 'Confirm targets are realistic for Year 1 ramp-up and Years 2-3 stabilisation',
      fields: [
        {
          kind: 'hybrid',
          key: 'realistic',
          label: 'Targets realistic for Year 1 ramp-up and Years 2-3 stabilisation',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Any assumption behind the ramp-up or stabilisation targets, noted here.',
        },
      ],
    },
  },
  'mgd-s1-growing-system-philosophy-c1': {
    id: 'mgd-s1-growing-system-philosophy-c1', label: 'Growing ethos', icon: FileText, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-growing-system-philosophy-c1',
      prompt: 'Define the core growing philosophy - organic, regenerative, integrated pest management, biodynamic, or hybrid',
      fields: [
        {
          kind: 'hybrid',
          key: 'philosophy',
          label: 'Core growing philosophy',
          optionSetId: 'growingPhilosophy',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'What this philosophy means in practice for this garden.',
        },
      ],
    },
  },
  'mgd-s1-growing-system-philosophy-c2': {
    id: 'mgd-s1-growing-system-philosophy-c2', label: 'Soil targets', icon: FlaskConical, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-growing-system-philosophy-c2',
      prompt: 'Define soil health targets - fertility building, microbial life, water retention',
      fields: [
        {
          kind: 'text',
          key: 'soilHealth',
          label: 'Soil health targets',
          multiline: true,
          placeholder: 'Fertility building, microbial life, water retention - the soil outcomes to reach.',
        },
      ],
    },
  },
  'mgd-s1-growing-system-philosophy-c3': {
    id: 'mgd-s1-growing-system-philosophy-c3', label: 'Pest approach', icon: Bird, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-growing-system-philosophy-c3',
      prompt: 'Define pest and disease management approach - companion planting, mechanical, biological, acceptable chemical inputs',
      fields: [
        {
          kind: 'text',
          key: 'pestManagement',
          label: 'Pest and disease management approach',
          multiline: true,
          placeholder: 'Companion planting, mechanical, biological, and any acceptable chemical inputs.',
        },
      ],
    },
  },
  'mgd-s1-growing-system-philosophy-c4': {
    id: 'mgd-s1-growing-system-philosophy-c4', label: 'Rotation', icon: Shuffle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-growing-system-philosophy-c4',
      prompt: 'Define crop rotation and succession strategy',
      fields: [
        {
          kind: 'text',
          key: 'rotation',
          label: 'Crop rotation and succession strategy',
          multiline: true,
          placeholder: 'How beds are rotated and successions are sequenced through the year.',
        },
      ],
    },
  },
  'mgd-s1-growing-system-philosophy-c5': {
    id: 'mgd-s1-growing-system-philosophy-c5', label: 'Variety policy', icon: Sprout, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-growing-system-philosophy-c5',
      prompt: 'Define variety selection and saving philosophy - hybrid, heirloom, productivity vs. resilience',
      fields: [
        {
          kind: 'text',
          key: 'varietySelection',
          label: 'Variety selection and saving philosophy',
          multiline: true,
          placeholder: 'Hybrid or heirloom, and how productivity is weighed against resilience.',
        },
      ],
    },
  },
  'mgd-s1-growing-system-philosophy-c6': {
    id: 'mgd-s1-growing-system-philosophy-c6', label: 'Feasibility', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-growing-system-philosophy-c6',
      prompt: 'Confirm philosophy is achievable within operator knowledge and site conditions',
      fields: [
        {
          kind: 'hybrid',
          key: 'achievable',
          label: 'Philosophy achievable within operator knowledge and site conditions',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where operator knowledge or site conditions limit the philosophy, note it here.',
        },
      ],
    },
  },
  'mgd-s1-market-channels-c1': {
    id: 'mgd-s1-market-channels-c1', label: 'Food safety', icon: ShieldAlert, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-market-channels-c1',
      prompt: 'Identify food safety compliance requirements for each channel - farmers market, wholesale, direct-to-consumer, processing',
      fields: [
        {
          kind: 'text',
          key: 'foodSafety',
          label: 'Food safety compliance requirements per channel',
          multiline: true,
          placeholder: 'For farmers market, wholesale, direct-to-consumer, and processing - what each requires.',
        },
      ],
    },
  },
  'mgd-s1-market-channels-c2': {
    id: 'mgd-s1-market-channels-c2', label: 'Labelling & cert', icon: FileText, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-market-channels-c2',
      prompt: 'Identify labelling, certification, and traceability requirements',
      fields: [
        {
          kind: 'text',
          key: 'labelling',
          label: 'Labelling, certification, and traceability requirements',
          multiline: true,
          placeholder: 'What must appear on labels, which certifications apply, and how produce is traced.',
        },
      ],
    },
  },
  'mgd-s1-market-channels-c3': {
    id: 'mgd-s1-market-channels-c3', label: 'Packaging & cold', icon: Container, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-market-channels-c3',
      prompt: 'Define packaging and cold-chain requirements by product type',
      fields: [
        {
          kind: 'text',
          key: 'packaging',
          label: 'Packaging and cold-chain requirements by product type',
          multiline: true,
          placeholder: 'How each product type is packed and what cold-chain it needs.',
        },
      ],
    },
  },
  'mgd-s1-market-channels-c4': {
    id: 'mgd-s1-market-channels-c4', label: 'Regulatory risk', icon: ShieldAlert, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-market-channels-c4',
      prompt: 'Assess regulatory risk per channel - highest to lowest compliance burden',
      fields: [
        {
          kind: 'text',
          key: 'regulatoryRisk',
          label: 'Regulatory risk per channel',
          multiline: true,
          placeholder: 'Rank the channels from highest to lowest compliance burden, with reasons.',
        },
      ],
    },
  },
  'mgd-s1-market-channels-c5': {
    id: 'mgd-s1-market-channels-c5', label: 'Compliance cal', icon: Ruler, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-market-channels-c5',
      prompt: 'Define compliance calendar - inspection schedules, certification renewals',
      fields: [
        {
          kind: 'text',
          key: 'complianceCalendar',
          label: 'Compliance calendar',
          multiline: true,
          placeholder: 'Inspection schedules and certification renewals to track across the year.',
        },
      ],
    },
  },
  'mgd-s1-market-channels-c6': {
    id: 'mgd-s1-market-channels-c6', label: 'Reg advice', icon: Lock, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'mgd-s1-market-channels-c6',
      prompt: 'Obtain regulatory advice on chosen channels before first sale',
      fields: [
        {
          kind: 'hybrid',
          key: 'adviceStatus',
          label: 'Regulatory advice status',
          optionSetId: 'adviceStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Who is advising on the chosen channels, and what remains before first sale.',
        },
      ],
    },
  },

  // -- orchard --
  'orch-s1-species-philosophy-c1': {
    id: 'orch-s1-species-philosophy-c1', label: 'Species ethos', icon: TreeDeciduous, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-species-philosophy-c1',
      prompt: 'Define the core species philosophy - heritage, climate-adapted, productivity focus, or conservation focus',
      fields: [
        {
          kind: 'hybrid',
          key: 'speciesFocus',
          label: 'Core species philosophy',
          optionSetId: 'orchardSpeciesFocus',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'What this species philosophy means for the orchard.',
        },
      ],
    },
  },
  'orch-s1-species-philosophy-c2': {
    id: 'orch-s1-species-philosophy-c2', label: 'Candidate species', icon: TreeDeciduous, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-species-philosophy-c2',
      prompt: 'Identify candidate species suited to site climate, soil, water - prioritise local provenance where possible',
      fields: [
        {
          kind: 'repeatable',
          key: 'candidateSpecies',
          label: 'Candidate species',
          min: 1,
          max: 20,
          addLabel: 'Add species',
          itemLabel: 'Species',
          item: {
            kind: 'text',
            placeholder: 'A species suited to site climate, soil, and water.',
          },
        },
      ],
    },
  },
  'orch-s1-species-philosophy-c3': {
    id: 'orch-s1-species-philosophy-c3', label: 'Disease pressure', icon: Bird, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-species-philosophy-c3',
      prompt: 'Define disease and pest pressure per species - resistance requirements',
      fields: [
        {
          kind: 'text',
          key: 'diseasePestPressure',
          label: 'Disease and pest pressure per species',
          multiline: true,
          placeholder: 'Resistance requirements and known pressures per species.',
        },
      ],
    },
  },
  'orch-s1-species-philosophy-c4': {
    id: 'orch-s1-species-philosophy-c4', label: 'Portfolio', icon: Layers, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-species-philosophy-c4',
      prompt: 'Define the productive portfolio - monoculture, polyculture, or agroforestry integration',
      fields: [
        {
          kind: 'text',
          key: 'portfolio',
          label: 'Productive portfolio',
          multiline: true,
          placeholder: 'Monoculture, polyculture, or agroforestry integration.',
        },
      ],
    },
  },
  'orch-s1-species-philosophy-c5': {
    id: 'orch-s1-species-philosophy-c5', label: 'Climate fit', icon: Sun, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-species-philosophy-c5',
      prompt: 'Confirm species choice is compatible with climate projections for the orchard lifespan - 50+ years',
      fields: [
        {
          kind: 'hybrid',
          key: 'climateCompatible',
          label: 'Species choice compatible with climate projections for the orchard lifespan',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'How the species choice holds up against 50-plus-year climate projections.',
        },
      ],
    },
  },
  'orch-s1-species-philosophy-c6': {
    id: 'orch-s1-species-philosophy-c6', label: 'Feasibility', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-species-philosophy-c6',
      prompt: 'Confirm choices are achievable within operator knowledge and site scale',
      fields: [
        {
          kind: 'hybrid',
          key: 'achievable',
          label: 'Choices achievable within operator knowledge and site scale',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where operator knowledge or site scale limits the choices, note it here.',
        },
      ],
    },
  },
  'orch-s1-production-intent-c1': {
    id: 'orch-s1-production-intent-c1', label: 'Production intent', icon: Target, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-production-intent-c1',
      prompt: 'Define primary production intent - subsistence, local market, wholesale, or on-farm value-added processing',
      fields: [
        {
          kind: 'text',
          key: 'productionIntent',
          label: 'Primary production intent',
          multiline: true,
          placeholder: 'Subsistence, local market, wholesale, or on-farm value-added processing.',
        },
      ],
    },
  },
  'orch-s1-production-intent-c2': {
    id: 'orch-s1-production-intent-c2', label: 'Target yield', icon: Ruler, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-production-intent-c2',
      prompt: 'Define target annual yield per hectare for primary species',
      fields: [
        {
          kind: 'text',
          key: 'targetYield',
          label: 'Target annual yield per hectare for primary species',
          multiline: true,
          placeholder: 'The yield per hectare aimed for, for the primary species.',
        },
      ],
    },
  },
  'orch-s1-production-intent-c3': {
    id: 'orch-s1-production-intent-c3', label: 'Harvest timing', icon: Wheat, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-production-intent-c3',
      prompt: 'Define harvest timing and season - early, main, or extended season species',
      fields: [
        {
          kind: 'text',
          key: 'harvestTiming',
          label: 'Harvest timing and season',
          multiline: true,
          placeholder: 'Early, main, or extended season species and their windows.',
        },
      ],
    },
  },
  'orch-s1-production-intent-c4': {
    id: 'orch-s1-production-intent-c4', label: 'Processing', icon: Container, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-production-intent-c4',
      prompt: 'Define processing and preservation approach - fresh, dried, fermented, pressed, frozen',
      fields: [
        {
          kind: 'hybrid',
          key: 'processing',
          label: 'Processing and preservation approach',
          optionSetId: 'orchardProcessing',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'How the harvest is handled - fresh, dried, fermented, pressed, frozen.',
        },
      ],
    },
  },
  'orch-s1-production-intent-c5': {
    id: 'orch-s1-production-intent-c5', label: 'Storage needs', icon: Container, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-production-intent-c5',
      prompt: 'Identify storage requirements - cool storage, temperature and humidity control',
      fields: [
        {
          kind: 'text',
          key: 'storage',
          label: 'Storage requirements',
          multiline: true,
          placeholder: 'Cool storage, temperature and humidity control.',
        },
      ],
    },
  },
  'orch-s1-production-intent-c6': {
    id: 'orch-s1-production-intent-c6', label: 'Labour match', icon: HardHat, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-production-intent-c6',
      prompt: 'Confirm production intent and processing plan are matched to labour availability',
      fields: [
        {
          kind: 'hybrid',
          key: 'labourMatched',
          label: 'Production intent and processing plan matched to labour availability',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where the plan outruns available labour, note it here.',
        },
      ],
    },
  },
  'orch-s1-provenance-sourcing-c1': {
    id: 'orch-s1-provenance-sourcing-c1', label: 'Provenance', icon: MapPin, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-provenance-sourcing-c1',
      prompt: 'Define provenance preference - local, regional, certified, heirloom, conservation priority',
      fields: [
        {
          kind: 'hybrid',
          key: 'provenance',
          label: 'Provenance preference',
          optionSetId: 'orchardProvenance',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'What this provenance preference means for sourcing.',
        },
      ],
    },
  },
  'orch-s1-provenance-sourcing-c2': {
    id: 'orch-s1-provenance-sourcing-c2', label: 'Nursery suppliers', icon: Building2, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-provenance-sourcing-c2',
      prompt: 'Identify potential nursery suppliers - local, mail-order, specialty conservation',
      fields: [
        {
          kind: 'repeatable',
          key: 'suppliers',
          label: 'Potential nursery suppliers',
          min: 1,
          max: 12,
          addLabel: 'Add supplier',
          itemLabel: 'Supplier',
          item: {
            kind: 'text',
            placeholder: 'Local, mail-order, or specialty conservation nursery.',
          },
        },
      ],
    },
  },
  'orch-s1-provenance-sourcing-c3': {
    id: 'orch-s1-provenance-sourcing-c3', label: 'Tree size', icon: TreeDeciduous, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-provenance-sourcing-c3',
      prompt: 'Define tree size at planting - bare-root, small pot, large specimen',
      fields: [
        {
          kind: 'hybrid',
          key: 'stockSize',
          label: 'Tree size at planting',
          optionSetId: 'treeStockSize',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Why this stock size suits the planting plan.',
        },
      ],
    },
  },
  'orch-s1-provenance-sourcing-c4': {
    id: 'orch-s1-provenance-sourcing-c4', label: 'Establishment', icon: Fence, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-provenance-sourcing-c4',
      prompt: 'Define establishment support requirements - guards, mulch, staking, irrigation',
      fields: [
        {
          kind: 'repeatable',
          key: 'establishmentSupport',
          label: 'Establishment support requirements',
          min: 1,
          max: 10,
          addLabel: 'Add requirement',
          itemLabel: 'Requirement',
          item: {
            kind: 'text',
            placeholder: 'Guards, mulch, staking, irrigation, and the like.',
          },
        },
      ],
    },
  },
  'orch-s1-provenance-sourcing-c5': {
    id: 'orch-s1-provenance-sourcing-c5', label: 'Availability', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-provenance-sourcing-c5',
      prompt: 'Confirm tree availability aligns with planting timeline and budget',
      fields: [
        {
          kind: 'hybrid',
          key: 'availabilityAligned',
          label: 'Tree availability aligns with planting timeline and budget',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Any mismatch between stock availability, the planting timeline, and budget.',
        },
      ],
    },
  },
  'orch-s1-provenance-sourcing-c6': {
    id: 'orch-s1-provenance-sourcing-c6', label: 'Quality standards', icon: FlaskConical, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'orch-s1-provenance-sourcing-c6',
      prompt: 'Define quality standards for received stock - health assessment, rejection criteria',
      fields: [
        {
          kind: 'text',
          key: 'qualityStandards',
          label: 'Quality standards for received stock',
          multiline: true,
          placeholder: 'Health assessment and rejection criteria for incoming stock.',
        },
      ],
    },
  },

  // -- livestock --
  'lvs-s1-enterprise-vision-c1': {
    id: 'lvs-s1-enterprise-vision-c1', label: 'Enterprise type', icon: Beef, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-enterprise-vision-c1',
      prompt: 'Define the enterprise type(s) - breeding herd/flock, grow-out/finishing, dairy, fibre, dual-purpose, or mixed',
      fields: [
        {
          kind: 'hybrid',
          key: 'enterpriseType',
          label: 'Enterprise type',
          optionSetId: 'lvsEnterpriseType',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'If more than one type, note how they combine.',
        },
      ],
    },
  },
  'lvs-s1-enterprise-vision-c2': {
    id: 'lvs-s1-enterprise-vision-c2', label: 'Species & breeds', icon: Beef, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-enterprise-vision-c2',
      prompt: 'Define species and candidate breeds - cattle, sheep, goats, pigs, poultry, or combination',
      fields: [
        {
          kind: 'hybrid',
          key: 'species',
          label: 'Species',
          optionSetId: 'livestockSpecies',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Candidate breeds and notes',
          multiline: true,
          placeholder: 'Specific candidate breeds, and why they suit this site.',
        },
      ],
    },
  },
  'lvs-s1-enterprise-vision-c3': {
    id: 'lvs-s1-enterprise-vision-c3', label: 'Production intent', icon: Target, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-enterprise-vision-c3',
      prompt: 'Define production intent per species - meat, milk, eggs, fibre, breeding stock, land improvement',
      fields: [
        {
          kind: 'hybrid',
          key: 'productionIntent',
          label: 'Production intent',
          optionSetId: 'livestockProductIntent',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Intent per species',
          multiline: true,
          placeholder: 'What each species is kept to produce.',
        },
      ],
    },
  },
  'lvs-s1-enterprise-vision-c4': {
    id: 'lvs-s1-enterprise-vision-c4', label: 'Integration logic', icon: Shuffle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-enterprise-vision-c4',
      prompt: 'Define the integration logic between species if multi-species - leader-follower grazing, niche separation',
      fields: [
        {
          kind: 'text',
          key: 'integrationLogic',
          label: 'Integration logic between species',
          multiline: true,
          placeholder: 'Leader-follower grazing, niche separation, or how the species share the land.',
        },
      ],
    },
  },
  'lvs-s1-enterprise-vision-c5': {
    id: 'lvs-s1-enterprise-vision-c5', label: 'Steward fit', icon: HardHat, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-enterprise-vision-c5',
      prompt: 'Confirm the enterprise vision fits the steward experience and available labour',
      fields: [
        {
          kind: 'hybrid',
          key: 'fitsSteward',
          label: 'Enterprise vision fits steward experience and available labour',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where experience or labour limits the vision, note it here.',
        },
      ],
    },
  },
  'lvs-s1-enterprise-vision-c6': {
    id: 'lvs-s1-enterprise-vision-c6', label: 'Climate & feed', icon: Leaf, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-enterprise-vision-c6',
      prompt: 'Confirm the vision is consistent with the site climate and feed base',
      fields: [
        {
          kind: 'hybrid',
          key: 'climateFeedFit',
          label: 'Vision consistent with site climate and feed base',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'How the vision holds up against the site climate and feed base.',
        },
      ],
    },
  },
  'lvs-s1-production-goals-c1': {
    id: 'lvs-s1-production-goals-c1', label: 'Production targets', icon: Target, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-production-goals-c1',
      prompt: 'Define measurable production targets - head sold/yr, kg liveweight, litres, dozen eggs, breeding replacements',
      fields: [
        {
          kind: 'text',
          key: 'productionTargets',
          label: 'Measurable production targets',
          multiline: true,
          placeholder: 'Head per year, kg liveweight, litres, dozen eggs, breeding replacements.',
        },
      ],
    },
  },
  'lvs-s1-production-goals-c2': {
    id: 'lvs-s1-production-goals-c2', label: 'Herd size', icon: Ruler, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-production-goals-c2',
      prompt: 'Define the target full-establishment herd/flock size',
      fields: [
        {
          kind: 'text',
          key: 'herdSize',
          label: 'Target full-establishment herd or flock size',
          multiline: true,
          placeholder: 'The herd or flock size aimed for at full establishment.',
        },
      ],
    },
  },
  'lvs-s1-production-goals-c3': {
    id: 'lvs-s1-production-goals-c3', label: 'Establishment horizon', icon: Ruler, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-production-goals-c3',
      prompt: 'Define the establishment horizon - how many seasons to reach full scale',
      fields: [
        {
          kind: 'text',
          key: 'establishmentHorizon',
          label: 'Establishment horizon',
          multiline: true,
          placeholder: 'How many seasons to reach full scale.',
        },
      ],
    },
  },
  'lvs-s1-production-goals-c4': {
    id: 'lvs-s1-production-goals-c4', label: 'Stockmanship', icon: HardHat, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-production-goals-c4',
      prompt: 'Assess steward stockmanship capacity - daily check, handling, calving/lambing, health intervention skill',
      fields: [
        {
          kind: 'text',
          key: 'stockmanship',
          label: 'Steward stockmanship capacity',
          multiline: true,
          placeholder: 'Daily check, handling, calving or lambing, and health-intervention skill.',
        },
      ],
    },
  },
  'lvs-s1-production-goals-c5': {
    id: 'lvs-s1-production-goals-c5', label: 'Budget envelope', icon: Wallet, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-production-goals-c5',
      prompt: 'Confirm capital and operating budget envelope is realistic for the scale',
      fields: [
        {
          kind: 'hybrid',
          key: 'budgetRealistic',
          label: 'Capital and operating budget envelope realistic for the scale',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where the budget envelope is or is not yet realistic for the scale.',
        },
      ],
    },
  },
  'lvs-s1-production-goals-c6': {
    id: 'lvs-s1-production-goals-c6', label: 'Continuity cover', icon: UserCheck, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-production-goals-c6',
      prompt: 'Confirm a continuity / absence-cover plan exists - animals need daily care',
      fields: [
        {
          kind: 'hybrid',
          key: 'continuityCover',
          label: 'Continuity / absence-cover plan exists',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Who covers daily care during an absence.',
        },
      ],
    },
  },
  'lvs-s1-welfare-ethic-c1': {
    id: 'lvs-s1-welfare-ethic-c1', label: 'Space & density', icon: Ruler, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-welfare-ethic-c1',
      prompt: 'Define minimum space and stocking-density standards per species',
      fields: [
        {
          kind: 'text',
          key: 'spaceDensity',
          label: 'Minimum space and stocking-density standards',
          multiline: true,
          placeholder: 'Minimum space and stocking-density standards per species.',
        },
      ],
    },
  },
  'lvs-s1-welfare-ethic-c2': {
    id: 'lvs-s1-welfare-ethic-c2', label: 'Shelter standards', icon: Home, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-welfare-ethic-c2',
      prompt: 'Define shelter standards per species - shade, wind protection, wet-weather and extreme-heat/cold refuge',
      fields: [
        {
          kind: 'text',
          key: 'shelterStandards',
          label: 'Shelter standards per species',
          multiline: true,
          placeholder: 'Shade, wind protection, wet-weather and extreme heat or cold refuge.',
        },
      ],
    },
  },
  'lvs-s1-welfare-ethic-c3': {
    id: 'lvs-s1-welfare-ethic-c3', label: 'Feed & water', icon: Droplet, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-welfare-ethic-c3',
      prompt: 'Define constant access to feed and clean water as a standing requirement',
      fields: [
        {
          kind: 'text',
          key: 'feedWater',
          label: 'Feed and clean-water access requirement',
          multiline: true,
          placeholder: 'How constant access to feed and clean water is assured.',
        },
      ],
    },
  },
  'lvs-s1-welfare-ethic-c4': {
    id: 'lvs-s1-welfare-ethic-c4', label: 'Handling norms', icon: UserCheck, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-welfare-ethic-c4',
      prompt: 'Define a low-stress handling commitment and handling-frequency norms',
      fields: [
        {
          kind: 'text',
          key: 'handlingNorms',
          label: 'Low-stress handling commitment and frequency norms',
          multiline: true,
          placeholder: 'The low-stress handling commitment and how often animals are handled.',
        },
      ],
    },
  },
  'lvs-s1-welfare-ethic-c5': {
    id: 'lvs-s1-welfare-ethic-c5', label: 'Health & EOL', icon: FlaskConical, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-welfare-ethic-c5',
      prompt: 'Define a humane health-intervention and end-of-life / emergency-euthanasia protocol',
      fields: [
        {
          kind: 'text',
          key: 'healthEolProtocol',
          label: 'Humane health-intervention and end-of-life protocol',
          multiline: true,
          placeholder: 'The humane health-intervention and end-of-life or emergency-euthanasia protocol.',
        },
      ],
    },
  },
  'lvs-s1-welfare-ethic-c6': {
    id: 'lvs-s1-welfare-ethic-c6', label: 'Welfare compliance', icon: Lock, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-s1-welfare-ethic-c6',
      prompt: 'Confirm standards meet or exceed applicable animal-welfare legislation',
      fields: [
        {
          kind: 'hybrid',
          key: 'meetsLegislation',
          label: 'Standards meet or exceed applicable animal-welfare legislation',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Which legislation applies, and how the standards meet or exceed it.',
        },
      ],
    },
  },
  'lvs-sec-s1-enterprise-intent-c1': {
    id: 'lvs-sec-s1-enterprise-intent-c1', label: 'Enterprise intent', icon: Target, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-sec-s1-enterprise-intent-c1',
      prompt: 'Define the enterprise intent - product (meat, milk, fibre, eggs), land-management service, or both',
      fields: [
        {
          kind: 'text',
          key: 'enterpriseIntent',
          label: 'Enterprise intent',
          multiline: true,
          placeholder: 'Product (meat, milk, fibre, eggs), land-management service, or both.',
        },
      ],
    },
  },
  'lvs-sec-s1-enterprise-intent-c2': {
    id: 'lvs-sec-s1-enterprise-intent-c2', label: 'Candidate species', icon: Beef, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-sec-s1-enterprise-intent-c2',
      prompt: 'Identify candidate species and classes of stock - ruminants, poultry, pigs, mixed',
      fields: [
        {
          kind: 'repeatable',
          key: 'candidateStock',
          label: 'Candidate species and classes of stock',
          min: 1,
          max: 12,
          addLabel: 'Add candidate',
          itemLabel: 'Candidate',
          item: {
            kind: 'text',
            placeholder: 'A candidate species or class of stock - e.g. ruminants, poultry, pigs.',
          },
        },
      ],
    },
  },
  'lvs-sec-s1-enterprise-intent-c3': {
    id: 'lvs-sec-s1-enterprise-intent-c3', label: 'Host relationship', icon: Shuffle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-sec-s1-enterprise-intent-c3',
      prompt: 'Define how the herd relates to the host enterprise - complementary, supplementary, or competing for land and labour',
      fields: [
        {
          kind: 'hybrid',
          key: 'hostRelation',
          label: 'How the herd relates to the host enterprise',
          optionSetId: 'enterpriseRelation',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'How the herd and the host enterprise share or contend for land and labour.',
        },
      ],
    },
  },
  'lvs-sec-s1-enterprise-intent-c4': {
    id: 'lvs-sec-s1-enterprise-intent-c4', label: 'Experience & labour', icon: HardHat, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-sec-s1-enterprise-intent-c4',
      prompt: 'Identify operator livestock experience and the daily labour available for stock care',
      fields: [
        {
          kind: 'text',
          key: 'experienceLabour',
          label: 'Operator experience and daily labour for stock care',
          multiline: true,
          placeholder: 'Operator livestock experience and the daily labour available for stock care.',
        },
      ],
    },
  },
  'lvs-sec-s1-enterprise-intent-c5': {
    id: 'lvs-sec-s1-enterprise-intent-c5', label: 'Compatibility', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'lvs-sec-s1-enterprise-intent-c5',
      prompt: 'Confirm enterprise intent is compatible with the host vision, scale, and stewardship capacity',
      fields: [
        {
          kind: 'hybrid',
          key: 'hostCompatible',
          label: 'Enterprise intent compatible with host vision, scale, and stewardship capacity',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where the herd and the host vision reinforce or strain each other.',
        },
      ],
    },
  },

  // -- conservation --
  'con-s1-conservation-intent-c1': {
    id: 'con-s1-conservation-intent-c1', label: 'Reference state', icon: Leaf, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-conservation-intent-c1',
      prompt: 'Define reference ecological state - historical condition this site is being restored toward',
      fields: [
        {
          kind: 'text',
          key: 'referenceState',
          label: 'Reference ecological state',
          multiline: true,
          placeholder: 'The historical condition this site is being restored toward.',
        },
      ],
    },
  },
  'con-s1-conservation-intent-c2': {
    id: 'con-s1-conservation-intent-c2', label: 'Target species', icon: Bird, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-conservation-intent-c2',
      prompt: 'Identify target species - flora and fauna that define ecological success',
      fields: [
        {
          kind: 'repeatable',
          key: 'targetSpecies',
          label: 'Target species',
          min: 1,
          max: 30,
          addLabel: 'Add species',
          itemLabel: 'Species',
          item: {
            kind: 'text',
            placeholder: 'A flora or fauna species that defines ecological success',
          },
        },
      ],
    },
  },
  'con-s1-conservation-intent-c3': {
    id: 'con-s1-conservation-intent-c3', label: 'Habitat types', icon: TreeDeciduous, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-conservation-intent-c3',
      prompt: 'Define target habitat types and their spatial extent',
      fields: [
        {
          kind: 'text',
          key: 'habitatTypes',
          label: 'Target habitat types and spatial extent',
          multiline: true,
          placeholder: 'The habitat types to establish and the area each should cover.',
        },
      ],
    },
  },
  'con-s1-conservation-intent-c4': {
    id: 'con-s1-conservation-intent-c4', label: 'Outcome targets', icon: Target, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-conservation-intent-c4',
      prompt: 'Set measurable ecological outcome targets with timeframes - 5, 10, 25 years',
      fields: [
        {
          kind: 'text',
          key: 'outcomeTargets',
          label: 'Measurable outcome targets with timeframes',
          multiline: true,
          placeholder: 'Measurable ecological outcomes at 5, 10, and 25 years.',
        },
      ],
    },
  },
  'con-s1-conservation-intent-c5': {
    id: 'con-s1-conservation-intent-c5', label: 'Min viable state', icon: Ruler, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-conservation-intent-c5',
      prompt: 'Define minimum acceptable ecological state for Phase 1',
      fields: [
        {
          kind: 'text',
          key: 'minViableState',
          label: 'Minimum acceptable ecological state for Phase 1',
          multiline: true,
          placeholder: 'The minimum ecological state that counts as Phase 1 success.',
        },
      ],
    },
  },
  'con-s1-conservation-intent-c6': {
    id: 'con-s1-conservation-intent-c6', label: 'Feasibility', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-conservation-intent-c6',
      prompt: 'Confirm targets are achievable given site conditions and landscape context',
      fields: [
        {
          kind: 'hybrid',
          key: 'achievable',
          label: 'Targets achievable given site and landscape context',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where site conditions or landscape context limit a target, note it here.',
        },
      ],
    },
  },
  'con-s1-intervention-philosophy-c1': {
    id: 'con-s1-intervention-philosophy-c1', label: 'Intervention ethos', icon: FileText, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-intervention-philosophy-c1',
      prompt: 'Define intervention philosophy - passive rewilding, assisted natural regeneration, active restoration, or hybrid',
      fields: [
        {
          kind: 'hybrid',
          key: 'philosophy',
          label: 'Intervention philosophy',
          optionSetId: 'conservationIntervention',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'What this philosophy means for how the site is managed.',
        },
      ],
    },
  },
  'con-s1-intervention-philosophy-c2': {
    id: 'con-s1-intervention-philosophy-c2', label: 'Acceptable methods', icon: Layers, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-intervention-philosophy-c2',
      prompt: 'List acceptable intervention methods - planting, earthworks, pest control, fire',
      fields: [
        {
          kind: 'repeatable',
          key: 'acceptableMethods',
          label: 'Acceptable intervention methods',
          min: 1,
          max: 20,
          addLabel: 'Add method',
          itemLabel: 'Method',
          item: {
            kind: 'text',
            placeholder: 'e.g. planting, earthworks, pest control, fire',
          },
        },
      ],
    },
  },
  'con-s1-intervention-philosophy-c3': {
    id: 'con-s1-intervention-philosophy-c3', label: 'Prohibited methods', icon: Lock, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-intervention-philosophy-c3',
      prompt: 'List prohibited methods that conflict with the philosophy',
      fields: [
        {
          kind: 'repeatable',
          key: 'prohibitedMethods',
          label: 'Prohibited methods',
          min: 0,
          max: 20,
          addLabel: 'Add prohibited method',
          itemLabel: 'Prohibited method',
          item: {
            kind: 'text',
            placeholder: 'A method that conflicts with the philosophy',
          },
        },
      ],
    },
  },
  'con-s1-intervention-philosophy-c4': {
    id: 'con-s1-intervention-philosophy-c4', label: 'Decision threshold', icon: Shuffle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-intervention-philosophy-c4',
      prompt: 'Define decision-making threshold - what evidence triggers active intervention vs. allowing natural recovery',
      fields: [
        {
          kind: 'text',
          key: 'decisionThreshold',
          label: 'Decision-making threshold',
          multiline: true,
          placeholder: 'What evidence triggers active intervention rather than allowing natural recovery.',
        },
      ],
    },
  },
  'con-s1-intervention-philosophy-c5': {
    id: 'con-s1-intervention-philosophy-c5', label: 'Confirm agreed', icon: UserCheck, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-intervention-philosophy-c5',
      prompt: 'Confirm intervention philosophy is agreed by all parties with decision-making authority',
      fields: [
        {
          kind: 'hybrid',
          key: 'agreed',
          label: 'Agreed by all parties with decision-making authority',
          optionSetId: 'confirmAgreement',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Who agreed, and any conditions noted.',
        },
      ],
    },
  },
  'con-s1-tenure-covenant-c1': {
    id: 'con-s1-tenure-covenant-c1', label: 'Instruments', icon: FileText, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-tenure-covenant-c1',
      prompt: 'Evaluate applicable conservation instruments - covenants, reserve declarations, easements, carbon credits',
      fields: [
        {
          kind: 'text',
          key: 'instruments',
          label: 'Applicable conservation instruments',
          multiline: true,
          placeholder: 'Covenants, reserve declarations, easements, carbon credits - which could apply here and why.',
        },
      ],
    },
  },
  'con-s1-tenure-covenant-c2': {
    id: 'con-s1-tenure-covenant-c2', label: 'Implications', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-tenure-covenant-c2',
      prompt: 'Assess implications of each instrument for management flexibility',
      fields: [
        {
          kind: 'text',
          key: 'implications',
          label: 'Implications for management flexibility',
          multiline: true,
          placeholder: 'How each instrument would constrain or enable future management.',
        },
      ],
    },
  },
  'con-s1-tenure-covenant-c3': {
    id: 'con-s1-tenure-covenant-c3', label: 'Covenant strategy', icon: Target, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-tenure-covenant-c3',
      prompt: 'Define covenant strategy - which instrument best matches conservation intent',
      fields: [
        {
          kind: 'text',
          key: 'covenantStrategy',
          label: 'Covenant strategy',
          multiline: true,
          placeholder: 'Which instrument best matches the conservation intent, and why.',
        },
      ],
    },
  },
  'con-s1-tenure-covenant-c4': {
    id: 'con-s1-tenure-covenant-c4', label: 'Provider', icon: Building2, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-tenure-covenant-c4',
      prompt: 'Identify covenant provider or registering body',
      fields: [
        {
          kind: 'text',
          key: 'provider',
          label: 'Covenant provider or registering body',
          multiline: true,
          placeholder: 'The organisation or authority that would hold or register the covenant.',
        },
      ],
    },
  },
  'con-s1-tenure-covenant-c5': {
    id: 'con-s1-tenure-covenant-c5', label: 'Legal advice', icon: Lock, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-tenure-covenant-c5',
      prompt: 'Obtain legal advice before executing any covenant or carbon agreement',
      fields: [
        {
          kind: 'hybrid',
          key: 'adviceStatus',
          label: 'Legal advice status',
          optionSetId: 'adviceStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Who is advising, and what remains before any covenant or agreement is executed.',
        },
      ],
    },
  },
  'con-s1-tenure-covenant-c6': {
    id: 'con-s1-tenure-covenant-c6', label: 'Conflict check', icon: ShieldAlert, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'con-s1-tenure-covenant-c6',
      prompt: 'Confirm covenant terms do not conflict with planned interventions',
      fields: [
        {
          kind: 'hybrid',
          key: 'noConflict',
          label: 'Covenant terms do not conflict with planned interventions',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Any covenant term that constrains a planned intervention, noted here.',
        },
      ],
    },
  },

  // -- off-grid --
  'ofg-s1-resilience-philosophy-c1': {
    id: 'ofg-s1-resilience-philosophy-c1', label: 'Independence target', icon: Target, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ofg-s1-resilience-philosophy-c1',
      prompt: 'Define independence target per critical system - water, energy, food, communications, shelter',
      fields: [
        {
          kind: 'text',
          key: 'independenceTargets',
          label: 'Independence target per system',
          multiline: true,
          placeholder: 'For water, energy, food, communications, and shelter - the level of independence each must reach.',
        },
      ],
    },
  },
  'ofg-s1-resilience-philosophy-c2': {
    id: 'ofg-s1-resilience-philosophy-c2', label: 'Backup & grid', icon: Zap, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ofg-s1-resilience-philosophy-c2',
      prompt: 'Define acceptable backup or grid connection where full independence is not the target',
      fields: [
        {
          kind: 'text',
          key: 'backupPlan',
          label: 'Acceptable backup or grid connection',
          multiline: true,
          placeholder: 'Where full independence is not the target, what backup or grid connection is acceptable.',
        },
      ],
    },
  },
  'ofg-s1-resilience-philosophy-c3': {
    id: 'ofg-s1-resilience-philosophy-c3', label: 'Worst-case span', icon: ShieldAlert, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ofg-s1-resilience-philosophy-c3',
      prompt: 'Define worst-case scenario resilience requirement - how long must all systems operate without resupply',
      fields: [
        {
          kind: 'text',
          key: 'worstCase',
          label: 'Worst-case resilience requirement',
          multiline: true,
          placeholder: 'How long all systems must operate without resupply in a worst-case scenario.',
        },
      ],
    },
  },
  'ofg-s1-resilience-philosophy-c4': {
    id: 'ofg-s1-resilience-philosophy-c4', label: 'Feasibility', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ofg-s1-resilience-philosophy-c4',
      prompt: 'Confirm independence targets are achievable against site potential',
      fields: [
        {
          kind: 'hybrid',
          key: 'achievable',
          label: 'Targets achievable against site potential',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where site potential limits a target, note it here.',
        },
      ],
    },
  },
  'ofg-s1-resilience-philosophy-c5': {
    id: 'ofg-s1-resilience-philosophy-c5', label: 'Design constraint', icon: FileText, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ofg-s1-resilience-philosophy-c5',
      prompt: 'Document targets as design constraints - all Tier 3-4 systems sized against them',
      fields: [
        {
          kind: 'text',
          key: 'designConstraints',
          label: 'Targets as design constraints',
          multiline: true,
          placeholder: 'How these targets bind Tier 3-4 system sizing.',
        },
      ],
    },
  },
  'ofg-s1-critical-systems-redundancy-c1': {
    id: 'ofg-s1-critical-systems-redundancy-c1', label: 'Criticality tiers', icon: Layers, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ofg-s1-critical-systems-redundancy-c1',
      prompt: 'Classify all systems by criticality - life-safety, essential, convenience',
      fields: [
        {
          kind: 'repeatable',
          key: 'systems',
          label: 'Systems by criticality',
          min: 1,
          max: 16,
          addLabel: 'Add system',
          itemLabel: 'System',
          item: {
            kind: 'text',
            placeholder: 'e.g. Water supply - life-safety',
          },
        },
      ],
    },
  },
  'ofg-s1-critical-systems-redundancy-c2': {
    id: 'ofg-s1-critical-systems-redundancy-c2', label: 'Redundancy spec', icon: ShieldAlert, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ofg-s1-critical-systems-redundancy-c2',
      prompt: 'Define redundancy requirement for each life-safety system - dual source, backup storage, manual fallback',
      fields: [
        {
          kind: 'text',
          key: 'redundancy',
          label: 'Redundancy per life-safety system',
          multiline: true,
          placeholder: 'Dual source, backup storage, or manual fallback for each life-safety system.',
        },
      ],
    },
  },
  'ofg-s1-critical-systems-redundancy-c3': {
    id: 'ofg-s1-critical-systems-redundancy-c3', label: 'Min viable op', icon: Ruler, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ofg-s1-critical-systems-redundancy-c3',
      prompt: 'Define minimum viable operation standard for each critical system during failure',
      fields: [
        {
          kind: 'text',
          key: 'minViable',
          label: 'Minimum viable operation standard',
          multiline: true,
          placeholder: 'The minimum acceptable operation of each critical system during failure.',
        },
      ],
    },
  },
  'ofg-s1-critical-systems-redundancy-c4': {
    id: 'ofg-s1-critical-systems-redundancy-c4', label: 'Max downtime', icon: AlertTriangle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ofg-s1-critical-systems-redundancy-c4',
      prompt: 'Define maximum acceptable downtime per system before life-safety threshold is breached',
      fields: [
        {
          kind: 'text',
          key: 'maxDowntime',
          label: 'Maximum acceptable downtime',
          multiline: true,
          placeholder: 'Per system, the downtime before the life-safety threshold is breached.',
        },
      ],
    },
  },
  'ofg-s1-critical-systems-redundancy-c5': {
    id: 'ofg-s1-critical-systems-redundancy-c5', label: 'Feasibility', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ofg-s1-critical-systems-redundancy-c5',
      prompt: 'Confirm redundancy requirements are achievable on this site',
      fields: [
        {
          kind: 'hybrid',
          key: 'achievable',
          label: 'Redundancy achievable on this site',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where the site limits redundancy, note it here.',
        },
      ],
    },
  },

  // -- agritourism --
  'ag-s1-experience-vision-c1': {
    id: 'ag-s1-experience-vision-c1', label: 'Experience core', icon: FileText, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-experience-vision-c1',
      prompt: 'Define the core guest experience in plain language - what makes this farm distinct',
      fields: [
        {
          kind: 'text',
          key: 'experience',
          label: 'Core guest experience',
          multiline: true,
          placeholder: 'In plain language, what a guest comes here for and what makes this farm distinct.',
        },
      ],
    },
  },
  'ag-s1-experience-vision-c2': {
    id: 'ag-s1-experience-vision-c2', label: 'Visitor types', icon: UserCheck, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-experience-vision-c2',
      prompt: 'Identify visitor types - day visitors, overnight guests, retreat participants, school groups',
      fields: [
        {
          kind: 'repeatable',
          key: 'visitorTypes',
          label: 'Visitor types',
          min: 1,
          max: 8,
          addLabel: 'Add visitor type',
          itemLabel: 'Visitor type',
          item: {
            kind: 'hybrid',
            optionSetId: 'agVisitorType',
            placeholder: 'Pick or describe',
          },
        },
      ],
    },
  },
  'ag-s1-experience-vision-c3': {
    id: 'ag-s1-experience-vision-c3', label: 'Commercial offer', icon: Wallet, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-experience-vision-c3',
      prompt: 'Define the commercial proposition - what is offered and at what price point',
      fields: [
        {
          kind: 'text',
          key: 'proposition',
          label: 'Commercial proposition',
          multiline: true,
          placeholder: 'What is offered to guests and at what price point.',
        },
      ],
    },
  },
  'ag-s1-experience-vision-c4': {
    id: 'ag-s1-experience-vision-c4', label: 'Hospitality identity', icon: Home, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-experience-vision-c4',
      prompt: "Define the farm's hospitality identity - authentic farm stay, luxury retreat, educational experience",
      fields: [
        {
          kind: 'hybrid',
          key: 'identity',
          label: 'Hospitality identity',
          optionSetId: 'agHospitalityIdentity',
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'What this hospitality identity means for how guests are received.',
        },
      ],
    },
  },
  'ag-s1-experience-vision-c5': {
    id: 'ag-s1-experience-vision-c5', label: 'Capacity check', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-experience-vision-c5',
      prompt: 'Confirm the commercial model is achievable within steward capacity',
      fields: [
        {
          kind: 'hybrid',
          key: 'achievable',
          label: 'Commercial model achievable within steward capacity',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where steward capacity limits the commercial model, note it here.',
        },
      ],
    },
  },
  'ag-s1-experience-vision-c6': {
    id: 'ag-s1-experience-vision-c6', label: 'Non-negotiables', icon: Lock, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-experience-vision-c6',
      prompt: 'Record what will never be compromised for commercial gain',
      fields: [
        {
          kind: 'text',
          key: 'nonNegotiables',
          label: 'What will never be compromised for commercial gain',
          multiline: true,
          placeholder: 'The lines that stay fixed no matter the commercial pressure.',
        },
      ],
    },
  },
  'ag-s1-visitor-capacity-c1': {
    id: 'ag-s1-visitor-capacity-c1', label: 'Max capacity', icon: Ruler, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-visitor-capacity-c1',
      prompt: 'Define maximum simultaneous guest capacity - accommodation, dining, programming',
      fields: [
        {
          kind: 'text',
          key: 'maxCapacity',
          label: 'Maximum simultaneous guest capacity',
          multiline: true,
          placeholder: 'Accommodation, dining, and programming - the most guests the site can host at once.',
        },
      ],
    },
  },
  'ag-s1-visitor-capacity-c2': {
    id: 'ag-s1-visitor-capacity-c2', label: 'Visit limits', icon: Layers, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-visitor-capacity-c2',
      prompt: 'Define visit type limits - maximum day visitors, overnight guests, event attendees',
      fields: [
        {
          kind: 'text',
          key: 'visitLimits',
          label: 'Visit type limits',
          multiline: true,
          placeholder: 'Maximum day visitors, overnight guests, and event attendees.',
        },
      ],
    },
  },
  'ag-s1-visitor-capacity-c3': {
    id: 'ag-s1-visitor-capacity-c3', label: 'Op boundaries', icon: ShieldAlert, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-visitor-capacity-c3',
      prompt: 'Define operational boundaries - what farm activities are incompatible with guest presence',
      fields: [
        {
          kind: 'text',
          key: 'opBoundaries',
          label: 'Operational boundaries',
          multiline: true,
          placeholder: 'Which farm activities are incompatible with guests being present.',
        },
      ],
    },
  },
  'ag-s1-visitor-capacity-c4': {
    id: 'ag-s1-visitor-capacity-c4', label: 'Seasonal variation', icon: Sun, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-visitor-capacity-c4',
      prompt: 'Define seasonal capacity variation - peak and off-peak limits',
      fields: [
        {
          kind: 'text',
          key: 'seasonalVariation',
          label: 'Seasonal capacity variation',
          multiline: true,
          placeholder: 'Peak and off-peak limits across the year.',
        },
      ],
    },
  },
  'ag-s1-visitor-capacity-c5': {
    id: 'ag-s1-visitor-capacity-c5', label: 'Consistency check', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-visitor-capacity-c5',
      prompt: 'Confirm capacity is consistent with regulatory requirements and infrastructure potential',
      fields: [
        {
          kind: 'hybrid',
          key: 'consistent',
          label: 'Capacity consistent with regulatory requirements and infrastructure potential',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Any gap between intended capacity and what regulation or infrastructure allows.',
        },
      ],
    },
  },
  'ag-s1-regulatory-framework-c1': {
    id: 'ag-s1-regulatory-framework-c1', label: 'Food permits', icon: ShieldAlert, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-regulatory-framework-c1',
      prompt: 'Identify food service permit requirements - preparation, service, storage',
      fields: [
        {
          kind: 'text',
          key: 'foodPermits',
          label: 'Food service permit requirements',
          multiline: true,
          placeholder: 'Preparation, service, and storage permits the food offering will need.',
        },
      ],
    },
  },
  'ag-s1-regulatory-framework-c2': {
    id: 'ag-s1-regulatory-framework-c2', label: 'Accom licensing', icon: FileText, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-regulatory-framework-c2',
      prompt: 'Identify accommodation licensing requirements for intended accommodation type',
      fields: [
        {
          kind: 'text',
          key: 'accomLicensing',
          label: 'Accommodation licensing requirements',
          multiline: true,
          placeholder: 'Licensing the intended accommodation type will require.',
        },
      ],
    },
  },
  'ag-s1-regulatory-framework-c3': {
    id: 'ag-s1-regulatory-framework-c3', label: 'Liability insurance', icon: Lock, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-regulatory-framework-c3',
      prompt: 'Define public liability insurance requirements and coverage',
      fields: [
        {
          kind: 'text',
          key: 'liabilityInsurance',
          label: 'Public liability insurance requirements and coverage',
          multiline: true,
          placeholder: 'The cover required for public access, and the level of coverage.',
        },
      ],
    },
  },
  'ag-s1-regulatory-framework-c4': {
    id: 'ag-s1-regulatory-framework-c4', label: 'Health & safety', icon: ShieldAlert, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-regulatory-framework-c4',
      prompt: 'Identify health and safety compliance requirements for public access',
      fields: [
        {
          kind: 'text',
          key: 'healthSafety',
          label: 'Health and safety compliance requirements for public access',
          multiline: true,
          placeholder: 'What public access requires for health and safety compliance.',
        },
      ],
    },
  },
  'ag-s1-regulatory-framework-c5': {
    id: 'ag-s1-regulatory-framework-c5', label: 'Resource consent', icon: FileText, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-regulatory-framework-c5',
      prompt: 'Identify any resource consent requirements for visitor infrastructure',
      fields: [
        {
          kind: 'text',
          key: 'resourceConsent',
          label: 'Resource consent requirements for visitor infrastructure',
          multiline: true,
          placeholder: 'Any consent needed for visitor infrastructure.',
        },
      ],
    },
  },
  'ag-s1-regulatory-framework-c6': {
    id: 'ag-s1-regulatory-framework-c6', label: 'Compliance cal', icon: Ruler, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-regulatory-framework-c6',
      prompt: 'Define compliance calendar - renewal dates and ongoing obligations',
      fields: [
        {
          kind: 'text',
          key: 'complianceCalendar',
          label: 'Compliance calendar',
          multiline: true,
          placeholder: 'Renewal dates and ongoing obligations to track across the year.',
        },
      ],
    },
  },
  'ag-s1-regulatory-framework-c7': {
    id: 'ag-s1-regulatory-framework-c7', label: 'Legal advice', icon: Lock, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'ag-s1-regulatory-framework-c7',
      prompt: 'Obtain legal or compliance advice before any guest-facing infrastructure is built',
      fields: [
        {
          kind: 'hybrid',
          key: 'adviceStatus',
          label: 'Legal or compliance advice status',
          optionSetId: 'adviceStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Who is advising, and what remains before any guest-facing infrastructure is built.',
        },
      ],
    },
  },

  // -- ecovillage --
  'ev-s1-legal-governance-c1': {
    id: 'ev-s1-legal-governance-c1', label: 'Entity options', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-legal-governance-c1', prompt: 'Evaluate legal entity options - land trust, co-operative, company, charitable trust, incorporated society' },
  },
  'ev-s1-legal-governance-c8': {
    id: 'ev-s1-legal-governance-c8', label: 'Jurisdiction', icon: MapIcon, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-legal-governance-c8', prompt: 'Confirm governing jurisdiction - province, territory, or nation of registration' },
  },
  'ev-s1-legal-governance-c2': {
    id: 'ev-s1-legal-governance-c2', label: 'Entity choice', icon: Target, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-legal-governance-c2', prompt: 'Select legal entity and document rationale' },
  },
  'ev-s1-legal-governance-c3': {
    id: 'ev-s1-legal-governance-c3', label: 'Tenure model', icon: MapPin, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-legal-governance-c3', prompt: 'Define land tenure model - collective ownership, leasehold, equity shares, or hybrid' },
  },
  'ev-s1-legal-governance-c4': {
    id: 'ev-s1-legal-governance-c4', label: 'Decision model', icon: Shuffle, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-legal-governance-c4', prompt: 'Define decision-making framework - consensus, sociocracy, majority vote, or hybrid' },
  },
  'ev-s1-legal-governance-c5': {
    id: 'ev-s1-legal-governance-c5', label: 'Financial gov', icon: Wallet, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-legal-governance-c5', prompt: 'Define financial governance - how community funds are held, authorised, and reported' },
  },
  'ev-s1-legal-governance-c6': {
    id: 'ev-s1-legal-governance-c6', label: 'Membership terms', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-legal-governance-c6', prompt: 'Establish membership rights and obligations in the governance model' },
  },
  'ev-s1-legal-governance-c7': {
    id: 'ev-s1-legal-governance-c7', label: 'Legal advice', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-legal-governance-c7', prompt: 'Obtain legal advice on chosen structure before finalising' },
  },
  'ev-s1-provision-balance-c1': {
    id: 'ev-s1-provision-balance-c1', label: 'Communal infra', icon: Building2, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-provision-balance-c1', prompt: 'Define communal infrastructure commitments - water, energy, sanitation, shared buildings' },
  },
  'ev-s1-provision-balance-c2': {
    id: 'ev-s1-provision-balance-c2', label: 'Food system', icon: Sprout, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-provision-balance-c2', prompt: 'Define food system approach - communal production, individual plots, or hybrid' },
  },
  'ev-s1-provision-balance-c3': {
    id: 'ev-s1-provision-balance-c3', label: 'Financial sharing', icon: Wallet, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-provision-balance-c3', prompt: 'Define financial sharing model - communal fund contributions, shared cost pools' },
  },
  'ev-s1-provision-balance-c4': {
    id: 'ev-s1-provision-balance-c4', label: 'Household rights', icon: Home, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-provision-balance-c4', prompt: 'Define private household entitlements - space, resources, privacy' },
  },
  'ev-s1-provision-balance-c5': {
    id: 'ev-s1-provision-balance-c5', label: 'Balance conflicts', icon: Shuffle, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-provision-balance-c5', prompt: 'Resolve conflicts between communal efficiency and household autonomy' },
  },
  'ev-s1-provision-balance-c6': {
    id: 'ev-s1-provision-balance-c6', label: 'Confirm agreed', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-provision-balance-c6', prompt: 'Confirm provision balance is agreed by all founding members' },
  },
  'ev-s1-conflict-framework-c1': {
    id: 'ev-s1-conflict-framework-c1', label: 'Decision process', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-conflict-framework-c1', prompt: 'Define formal decision-making process with clear steps and quorum requirements' },
  },
  'ev-s1-conflict-framework-c2': {
    id: 'ev-s1-conflict-framework-c2', label: 'Dispute pathway', icon: Shuffle, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-conflict-framework-c2', prompt: 'Define dispute resolution pathway - informal, mediation, formal arbitration' },
  },
  'ev-s1-conflict-framework-c3': {
    id: 'ev-s1-conflict-framework-c3', label: 'Community accord', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-conflict-framework-c3', prompt: 'Establish community agreements on behaviour, noise, visitors, and shared space use' },
  },
  'ev-s1-conflict-framework-c4': {
    id: 'ev-s1-conflict-framework-c4', label: 'Exit process', icon: DoorOpen, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-conflict-framework-c4', prompt: 'Define member exit process - notice period, financial settlement, dwelling transition' },
  },
  'ev-s1-conflict-framework-c5': {
    id: 'ev-s1-conflict-framework-c5', label: 'Dissolution', icon: AlertTriangle, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-conflict-framework-c5', prompt: 'Define community dissolution protocol - how assets are distributed if the community ends' },
  },
  'ev-s1-conflict-framework-c6': {
    id: 'ev-s1-conflict-framework-c6', label: 'Review cadence', icon: Recycle, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-conflict-framework-c6', prompt: 'Establish regular community review process - frequency, format, decision record-keeping' },
  },
  'ev-s1-conflict-framework-c7': {
    id: 'ev-s1-conflict-framework-c7', label: 'Sign-off', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'ev-s1-conflict-framework-c7', prompt: 'Obtain all founding member signatures on community agreement framework before Act begins' },
  },

  // -- education --
  'edu-s1-mission-audience-c1': {
    id: 'edu-s1-mission-audience-c1', label: 'Mission', icon: FileText, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-mission-audience-c1',
      prompt: 'Define primary educational mission in plain language',
      fields: [
        {
          kind: 'text',
          key: 'mission',
          label: 'Primary educational mission',
          multiline: true,
          placeholder: 'In plain language, what this site exists to teach.',
        },
      ],
    },
  },
  'edu-s1-mission-audience-c2': {
    id: 'edu-s1-mission-audience-c2', label: 'Audience', icon: UserCheck, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-mission-audience-c2',
      prompt: 'Identify primary audience - school groups, farmers, general public, practitioners, children',
      fields: [
        {
          kind: 'repeatable',
          key: 'audience',
          label: 'Primary audience',
          min: 1,
          max: 8,
          addLabel: 'Add audience',
          itemLabel: 'Audience',
          item: {
            kind: 'hybrid',
            optionSetId: 'educationAudience',
            placeholder: 'Pick or describe',
          },
        },
      ],
    },
  },
  'edu-s1-mission-audience-c3': {
    id: 'edu-s1-mission-audience-c3', label: 'Learning outcomes', icon: Target, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-mission-audience-c3',
      prompt: 'Define learning outcomes per program type',
      fields: [
        {
          kind: 'text',
          key: 'learningOutcomes',
          label: 'Learning outcomes per program type',
          multiline: true,
          placeholder: 'What a participant should know or be able to do after each program type.',
        },
      ],
    },
  },
  'edu-s1-mission-audience-c4': {
    id: 'edu-s1-mission-audience-c4', label: 'Unique value', icon: Leaf, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-mission-audience-c4',
      prompt: 'Define what this site teaches that cannot be taught in a classroom',
      fields: [
        {
          kind: 'text',
          key: 'distinctiveTeaching',
          label: 'What this site teaches that a classroom cannot',
          multiline: true,
          placeholder: 'The hands-on or place-based learning unique to this site.',
        },
      ],
    },
  },
  'edu-s1-mission-audience-c5': {
    id: 'edu-s1-mission-audience-c5', label: 'Capacity check', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-mission-audience-c5',
      prompt: 'Confirm mission is achievable within steward knowledge and site capacity',
      fields: [
        {
          kind: 'hybrid',
          key: 'achievable',
          label: 'Mission achievable within steward knowledge and site capacity',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Where steward knowledge or site capacity limits the mission, note it here.',
        },
      ],
    },
  },
  'edu-s1-curriculum-programs-c1': {
    id: 'edu-s1-curriculum-programs-c1', label: 'Program types', icon: Layers, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-curriculum-programs-c1',
      prompt: 'Define program types - day workshops, half-day tours, school excursions, multi-day residencies, online hybrid',
      fields: [
        {
          kind: 'repeatable',
          key: 'programTypes',
          label: 'Program types',
          min: 1,
          max: 10,
          addLabel: 'Add program type',
          itemLabel: 'Program type',
          item: {
            kind: 'hybrid',
            optionSetId: 'educationProgramType',
            placeholder: 'Pick or describe',
          },
        },
      ],
    },
  },
  'edu-s1-curriculum-programs-c2': {
    id: 'edu-s1-curriculum-programs-c2', label: 'Curriculum themes', icon: FileText, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-curriculum-programs-c2',
      prompt: 'Define curriculum themes per program type - soil, food systems, ecology, permaculture design',
      fields: [
        {
          kind: 'text',
          key: 'themes',
          label: 'Curriculum themes per program type',
          multiline: true,
          placeholder: 'Soil, food systems, ecology, permaculture design - the themes each program covers.',
        },
      ],
    },
  },
  'edu-s1-curriculum-programs-c3': {
    id: 'edu-s1-curriculum-programs-c3', label: 'Group size', icon: Ruler, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-curriculum-programs-c3',
      prompt: 'Define maximum group size per program type',
      fields: [
        {
          kind: 'text',
          key: 'maxGroupSize',
          label: 'Maximum group size per program type',
          multiline: true,
          placeholder: 'The largest group each program type can safely and effectively host.',
        },
      ],
    },
  },
  'edu-s1-curriculum-programs-c4': {
    id: 'edu-s1-curriculum-programs-c4', label: 'Program calendar', icon: Sun, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-curriculum-programs-c4',
      prompt: 'Define annual program calendar - frequency, seasonality',
      fields: [
        {
          kind: 'text',
          key: 'calendar',
          label: 'Annual program calendar',
          multiline: true,
          placeholder: 'How often each program runs and how it tracks the seasons.',
        },
      ],
    },
  },
  'edu-s1-curriculum-programs-c5': {
    id: 'edu-s1-curriculum-programs-c5', label: 'Mission fit', icon: HelpCircle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-curriculum-programs-c5',
      prompt: 'Confirm curriculum framework is consistent with educational mission',
      fields: [
        {
          kind: 'hybrid',
          key: 'consistent',
          label: 'Curriculum framework consistent with educational mission',
          optionSetId: 'confirmStatus',
          required: true,
          placeholder: 'Pick or describe',
        },
        {
          kind: 'text',
          key: 'notes',
          label: 'Notes',
          multiline: true,
          placeholder: 'Any gap between the curriculum and the stated mission, noted here.',
        },
      ],
    },
  },
  'edu-s1-curriculum-programs-c6': {
    id: 'edu-s1-curriculum-programs-c6', label: 'Review process', icon: Recycle, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-curriculum-programs-c6',
      prompt: 'Define curriculum development and review process',
      fields: [
        {
          kind: 'text',
          key: 'reviewProcess',
          label: 'Curriculum development and review process',
          multiline: true,
          placeholder: 'How the curriculum is developed, reviewed, and kept current.',
        },
      ],
    },
  },
  'edu-s1-regulatory-framework-c1': {
    id: 'edu-s1-regulatory-framework-c1', label: 'Liability insurance', icon: Lock, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-regulatory-framework-c1',
      prompt: 'Identify public access and liability insurance requirements',
      fields: [
        {
          kind: 'text',
          key: 'insurance',
          label: 'Public access and liability insurance requirements',
          multiline: true,
          placeholder: 'The cover required for public access, and any conditions attached.',
        },
      ],
    },
  },
  'edu-s1-regulatory-framework-c2': {
    id: 'edu-s1-regulatory-framework-c2', label: 'Child safety', icon: ShieldAlert, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-regulatory-framework-c2',
      prompt: 'Identify working with children or vulnerable persons requirements if applicable',
      fields: [
        {
          kind: 'text',
          key: 'childrenChecks',
          label: 'Working with children or vulnerable persons requirements',
          multiline: true,
          placeholder: 'Checks, clearances, or supervision required for programs involving children or vulnerable persons.',
        },
      ],
    },
  },
  'edu-s1-regulatory-framework-c3': {
    id: 'edu-s1-regulatory-framework-c3', label: 'Food permits', icon: ShieldAlert, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-regulatory-framework-c3',
      prompt: 'Identify food handling permits if meals or food tasting is offered',
      fields: [
        {
          kind: 'text',
          key: 'foodPermits',
          label: 'Food handling permits',
          multiline: true,
          placeholder: 'Permits needed where meals or food tasting are part of a program.',
        },
      ],
    },
  },
  'edu-s1-regulatory-framework-c4': {
    id: 'edu-s1-regulatory-framework-c4', label: 'Building permits', icon: Building2, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-regulatory-framework-c4',
      prompt: 'Identify building permits for teaching structures',
      fields: [
        {
          kind: 'text',
          key: 'buildingPermits',
          label: 'Building permits for teaching structures',
          multiline: true,
          placeholder: 'Approvals required for any classroom, shelter, or teaching structure.',
        },
      ],
    },
  },
  'edu-s1-regulatory-framework-c5': {
    id: 'edu-s1-regulatory-framework-c5', label: 'Accreditation', icon: FileText, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-regulatory-framework-c5',
      prompt: 'Define any accreditation intent - RTO, CPD provider, curriculum alignment',
      fields: [
        {
          kind: 'text',
          key: 'accreditation',
          label: 'Accreditation intent',
          multiline: true,
          placeholder: 'RTO, CPD provider, curriculum alignment - any formal accreditation being pursued.',
        },
      ],
    },
  },
  'edu-s1-regulatory-framework-c6': {
    id: 'edu-s1-regulatory-framework-c6', label: 'Compliance cal', icon: Ruler, category: 'vision',
    arm: {
      kind: 'form',
      formId: 'edu-s1-regulatory-framework-c6',
      prompt: 'Define compliance calendar - renewal dates and ongoing obligations',
      fields: [
        {
          kind: 'text',
          key: 'complianceCalendar',
          label: 'Compliance calendar',
          multiline: true,
          placeholder: 'Renewal dates and ongoing obligations to track across the year.',
        },
      ],
    },
  },

  // -- wellness --
  'well-s1-healing-philosophy-c1': {
    id: 'well-s1-healing-philosophy-c1', label: 'Healing ethos', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-healing-philosophy-c1', prompt: 'Define the healing philosophy in plain language - what this sanctuary believes about healing' },
  },
  'well-s1-healing-philosophy-c2': {
    id: 'well-s1-healing-philosophy-c2', label: 'Modalities', icon: Leaf, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-healing-philosophy-c2', prompt: 'Identify primary therapeutic modalities offered - somatic, contemplative, nature-based, integrative' },
  },
  'well-s1-healing-philosophy-c3': {
    id: 'well-s1-healing-philosophy-c3', label: 'Therapeutic intent', icon: Target, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-healing-philosophy-c3', prompt: 'Define the therapeutic intent - restoration, recovery, deepening, retreat' },
  },
  'well-s1-healing-philosophy-c4': {
    id: 'well-s1-healing-philosophy-c4', label: 'Environment musts', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-healing-philosophy-c4', prompt: 'Establish which environmental conditions are non-negotiable for this philosophy - silence thresholds, light quality, privacy levels' },
  },
  'well-s1-healing-philosophy-c5': {
    id: 'well-s1-healing-philosophy-c5', label: 'Confirm agreed', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-healing-philosophy-c5', prompt: 'Confirm healing philosophy is agreed by all founding practitioners' },
  },
  'well-s1-healing-philosophy-c6': {
    id: 'well-s1-healing-philosophy-c6', label: 'Design constraint', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-healing-philosophy-c6', prompt: 'Document philosophy as a design constraint - all Tier 3-4 decisions evaluated against it' },
  },
  'well-s1-guest-intake-c1': {
    id: 'well-s1-guest-intake-c1', label: 'Guest profile', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-guest-intake-c1', prompt: 'Define target guest profile - who this sanctuary serves' },
  },
  'well-s1-guest-intake-c2': {
    id: 'well-s1-guest-intake-c2', label: 'Welcomed', icon: Leaf, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-guest-intake-c2', prompt: 'Define conditions actively welcomed - burnout, grief, stress, life transition' },
  },
  'well-s1-guest-intake-c3': {
    id: 'well-s1-guest-intake-c3', label: 'Assess first', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-guest-intake-c3', prompt: 'Define conditions requiring practitioner assessment before admission' },
  },
  'well-s1-guest-intake-c4': {
    id: 'well-s1-guest-intake-c4', label: 'Out of scope', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-guest-intake-c4', prompt: 'Define conditions outside scope - those requiring clinical referral only' },
  },
  'well-s1-guest-intake-c5': {
    id: 'well-s1-guest-intake-c5', label: 'Intake process', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-guest-intake-c5', prompt: 'Define intake process - how guest suitability is assessed' },
  },
  'well-s1-guest-intake-c6': {
    id: 'well-s1-guest-intake-c6', label: 'Scope fit', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-guest-intake-c6', prompt: 'Confirm intake framework is consistent with practitioner scope of practice' },
  },
  'well-s1-regulatory-standards-c1': {
    id: 'well-s1-regulatory-standards-c1', label: 'Qualifications', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-regulatory-standards-c1', prompt: 'Define required practitioner qualifications for each modality offered' },
  },
  'well-s1-regulatory-standards-c2': {
    id: 'well-s1-regulatory-standards-c2', label: 'Registration', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-regulatory-standards-c2', prompt: 'Define professional registration and insurance requirements' },
  },
  'well-s1-regulatory-standards-c3': {
    id: 'well-s1-regulatory-standards-c3', label: 'Scope bounds', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-regulatory-standards-c3', prompt: 'Define scope of practice boundaries for each modality - what is and is not offered' },
  },
  'well-s1-regulatory-standards-c4': {
    id: 'well-s1-regulatory-standards-c4', label: 'Health & safety', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-regulatory-standards-c4', prompt: 'Identify health and safety compliance requirements for therapeutic services' },
  },
  'well-s1-regulatory-standards-c5': {
    id: 'well-s1-regulatory-standards-c5', label: 'Licensing', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-regulatory-standards-c5', prompt: 'Identify food service and accommodation licensing requirements' },
  },
  'well-s1-regulatory-standards-c6': {
    id: 'well-s1-regulatory-standards-c6', label: 'Compliance cal', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-regulatory-standards-c6', prompt: 'Define compliance calendar - renewal dates, CPD requirements, audit obligations' },
  },
  'well-s1-regulatory-standards-c7': {
    id: 'well-s1-regulatory-standards-c7', label: 'Legal advice', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-regulatory-standards-c7', prompt: 'Obtain legal or professional advice before any therapeutic service is offered' },
  },
  'well-s1-privacy-policy-c1': {
    id: 'well-s1-privacy-policy-c1', label: 'Data collected', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-privacy-policy-c1', prompt: 'Define what guest information is collected and why' },
  },
  'well-s1-privacy-policy-c2': {
    id: 'well-s1-privacy-policy-c2', label: 'Data handling', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-privacy-policy-c2', prompt: 'Define data storage, access, and retention policy' },
  },
  'well-s1-privacy-policy-c3': {
    id: 'well-s1-privacy-policy-c3', label: 'Confidentiality', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-privacy-policy-c3', prompt: 'Define confidentiality obligations for all practitioners and staff' },
  },
  'well-s1-privacy-policy-c4': {
    id: 'well-s1-privacy-policy-c4', label: 'Disclosure', icon: AlertTriangle, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-privacy-policy-c4', prompt: 'Define disclosure protocol - what triggers a mandatory disclosure and to whom' },
  },
  'well-s1-privacy-policy-c5': {
    id: 'well-s1-privacy-policy-c5', label: 'Consent', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-privacy-policy-c5', prompt: 'Define guest consent process for any information sharing' },
  },
  'well-s1-privacy-policy-c6': {
    id: 'well-s1-privacy-policy-c6', label: 'Legal advice', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'well-s1-privacy-policy-c6', prompt: 'Obtain legal advice on privacy obligations for therapeutic services in this jurisdiction' },
  },
  'well-sec-s1-healing-philosophy-c1': {
    id: 'well-sec-s1-healing-philosophy-c1', label: 'Healing ethos', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'well-sec-s1-healing-philosophy-c1', prompt: 'Define the healing philosophy this wellness layer brings to the host project - what it believes about healing' },
  },
  'well-sec-s1-healing-philosophy-c2': {
    id: 'well-sec-s1-healing-philosophy-c2', label: 'Modalities', icon: Leaf, category: 'vision',
    arm: { kind: 'form', formId: 'well-sec-s1-healing-philosophy-c2', prompt: 'Identify the therapeutic modalities the layer offers alongside the primary land use' },
  },
  'well-sec-s1-healing-philosophy-c3': {
    id: 'well-sec-s1-healing-philosophy-c3', label: 'Host compatibility', icon: Shuffle, category: 'vision',
    arm: { kind: 'form', formId: 'well-sec-s1-healing-philosophy-c3', prompt: 'Define which host activities and conditions are compatible with therapeutic guest presence' },
  },
  'well-sec-s1-healing-philosophy-c4': {
    id: 'well-sec-s1-healing-philosophy-c4', label: 'Environment musts', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'well-sec-s1-healing-philosophy-c4', prompt: 'Establish the non-negotiable environmental conditions the healing layer requires - silence, light, privacy' },
  },
  'well-sec-s1-healing-philosophy-c5': {
    id: 'well-sec-s1-healing-philosophy-c5', label: 'Supports primary', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'well-sec-s1-healing-philosophy-c5', prompt: 'Confirm the healing overlay supports rather than competes with the primary land purpose' },
  },
  'well-sec-s1-regulatory-standards-c1': {
    id: 'well-sec-s1-regulatory-standards-c1', label: 'Qualifications', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'well-sec-s1-regulatory-standards-c1', prompt: 'Identify required practitioner qualifications and registrations for each modality offered' },
  },
  'well-sec-s1-regulatory-standards-c2': {
    id: 'well-sec-s1-regulatory-standards-c2', label: 'Insurance & scope', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'well-sec-s1-regulatory-standards-c2', prompt: 'Define professional insurance and scope-of-practice requirements for the therapeutic layer' },
  },
  'well-sec-s1-regulatory-standards-c3': {
    id: 'well-sec-s1-regulatory-standards-c3', label: 'Compliance obligations', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'well-sec-s1-regulatory-standards-c3', prompt: 'Identify therapeutic-service health, safety, and licensing obligations beyond the primary use' },
  },
  'well-sec-s1-regulatory-standards-c4': {
    id: 'well-sec-s1-regulatory-standards-c4', label: 'Compliance cal', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'well-sec-s1-regulatory-standards-c4', prompt: 'Define the compliance calendar for the therapeutic layer - renewals, CPD, audits' },
  },
  'well-sec-s1-regulatory-standards-c5': {
    id: 'well-sec-s1-regulatory-standards-c5', label: 'Gate before service', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'well-sec-s1-regulatory-standards-c5', prompt: 'Confirm no therapeutic service is offered until all qualifications and insurance are in place' },
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
