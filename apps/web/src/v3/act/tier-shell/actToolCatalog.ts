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
    arm: { kind: 'form', formId: 'silv-s1-enterprise-mix-c1', prompt: 'Define species and breeds selected - cattle, sheep, goats, pigs, poultry, or combination' },
  },
  'silv-s1-enterprise-mix-c2': {
    id: 'silv-s1-enterprise-mix-c2', label: 'Production intent', icon: Target, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-enterprise-mix-c2', prompt: 'Define production intent per species - meat, milk, fibre, eggs, land improvement' },
  },
  'silv-s1-enterprise-mix-c3': {
    id: 'silv-s1-enterprise-mix-c3', label: 'Herd-mix rationale', icon: Layers, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-enterprise-mix-c3', prompt: 'Define herd mix rationale - why these species, why these numbers' },
  },
  'silv-s1-enterprise-mix-c4': {
    id: 'silv-s1-enterprise-mix-c4', label: 'Stocking density', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-enterprise-mix-c4', prompt: 'Define stocking density - animals per hectare, carrying capacity assessment' },
  },
  'silv-s1-enterprise-mix-c5': {
    id: 'silv-s1-enterprise-mix-c5', label: 'Mix compatibility', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-enterprise-mix-c5', prompt: 'Confirm mix is compatible with land type, labour availability, and market' },
  },
  'silv-s1-enterprise-mix-c6': {
    id: 'silv-s1-enterprise-mix-c6', label: 'Confirm agreed', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-enterprise-mix-c6', prompt: 'Confirm herd mix is agreed by all decision-makers' },
  },
  'silv-s1-land-improvement-philosophy-c1': {
    id: 'silv-s1-land-improvement-philosophy-c1', label: 'Improvement ethos', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-land-improvement-philosophy-c1', prompt: 'Define the land-improvement philosophy - is grazing designed to improve soil, pasture productivity, ecological condition, or a combination' },
  },
  'silv-s1-land-improvement-philosophy-c2': {
    id: 'silv-s1-land-improvement-philosophy-c2', label: 'Ecological outcomes', icon: Leaf, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-land-improvement-philosophy-c2', prompt: 'Identify ecological outcomes desired - plant species diversity, soil biology, water infiltration' },
  },
  'silv-s1-land-improvement-philosophy-c3': {
    id: 'silv-s1-land-improvement-philosophy-c3', label: 'Grazing windows', icon: Shuffle, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-land-improvement-philosophy-c3', prompt: 'Define grazing windows per zone - when animals are present, when land is rested' },
  },
  'silv-s1-land-improvement-philosophy-c4': {
    id: 'silv-s1-land-improvement-philosophy-c4', label: 'Confirm rest', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-land-improvement-philosophy-c4', prompt: 'Confirm grazing windows support land-improvement goals and rest periods' },
  },
  'silv-s1-land-improvement-philosophy-c5': {
    id: 'silv-s1-land-improvement-philosophy-c5', label: 'Align with intent', icon: Layers, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-land-improvement-philosophy-c5', prompt: 'Align grazing philosophy with the primary silvopasture production intent' },
  },
  'silv-s1-land-improvement-philosophy-c6': {
    id: 'silv-s1-land-improvement-philosophy-c6', label: 'Document gate', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-land-improvement-philosophy-c6', prompt: 'Document grazing philosophy as a gate on livestock management design' },
  },
  'silv-s1-animal-welfare-c1': {
    id: 'silv-s1-animal-welfare-c1', label: 'Welfare ethos', icon: Leaf, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-animal-welfare-c1', prompt: 'Define the livestock welfare philosophy - what excellent care means for each species' },
  },
  'silv-s1-animal-welfare-c2': {
    id: 'silv-s1-animal-welfare-c2', label: 'Non-negotiables', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-animal-welfare-c2', prompt: 'Identify welfare non-negotiables - breed selection, stocking density, access to feed/water/shelter' },
  },
  'silv-s1-animal-welfare-c3': {
    id: 'silv-s1-animal-welfare-c3', label: 'Health protocols', icon: FlaskConical, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-animal-welfare-c3', prompt: 'Define health and vaccination protocols per species' },
  },
  'silv-s1-animal-welfare-c4': {
    id: 'silv-s1-animal-welfare-c4', label: 'Handling & slaughter', icon: Beef, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-animal-welfare-c4', prompt: 'Define humane handling and slaughter intent - on-farm or licensed facility' },
  },
  'silv-s1-animal-welfare-c5': {
    id: 'silv-s1-animal-welfare-c5', label: 'Welfare vs goals', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-animal-welfare-c5', prompt: 'Confirm welfare commitment is compatible with production goals' },
  },
  'silv-s1-animal-welfare-c6': {
    id: 'silv-s1-animal-welfare-c6', label: 'Document gate', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'silv-s1-animal-welfare-c6', prompt: 'Document welfare philosophy as a gate on all livestock management design' },
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
    arm: { kind: 'form', formId: 'rf-s1-enterprise-mix-c1', prompt: 'Define primary market channel - wholesale, direct-to-consumer, mixed' },
  },
  'rf-s1-enterprise-mix-c2': {
    id: 'rf-s1-enterprise-mix-c2', label: 'Enterprise mix', icon: Layers, category: 'vision',
    arm: { kind: 'form', formId: 'rf-s1-enterprise-mix-c2', prompt: 'Define crop and livestock enterprise mix - vegetables, grains, animals, value-added products' },
  },
  'rf-s1-enterprise-mix-c3': {
    id: 'rf-s1-enterprise-mix-c3', label: 'Targets & calendar', icon: Target, category: 'vision',
    arm: { kind: 'form', formId: 'rf-s1-enterprise-mix-c3', prompt: 'Define production targets and seasonal calendar for each enterprise' },
  },
  'rf-s1-enterprise-mix-c4': {
    id: 'rf-s1-enterprise-mix-c4', label: 'Customer demand', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'rf-s1-enterprise-mix-c4', prompt: 'Identify customer base and demand level for each product' },
  },
  'rf-s1-enterprise-mix-c5': {
    id: 'rf-s1-enterprise-mix-c5', label: 'Capacity check', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'rf-s1-enterprise-mix-c5', prompt: 'Confirm mix is achievable within site soil, water, and labour capacity' },
  },
  'rf-s1-enterprise-mix-c6': {
    id: 'rf-s1-enterprise-mix-c6', label: 'Regen alignment', icon: Leaf, category: 'vision',
    arm: { kind: 'form', formId: 'rf-s1-enterprise-mix-c6', prompt: 'Confirm mix aligns with regenerative principles and ecological vision' },
  },
  'rf-s1-enterprise-mix-c7': {
    id: 'rf-s1-enterprise-mix-c7', label: 'Change process', icon: Shuffle, category: 'vision',
    arm: { kind: 'form', formId: 'rf-s1-enterprise-mix-c7', prompt: 'Define decision-making process for adding or removing enterprises' },
  },
  'rf-s1-enterprise-mix-c8': {
    id: 'rf-s1-enterprise-mix-c8', label: 'Confirm agreed', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'rf-s1-enterprise-mix-c8', prompt: 'Confirm enterprise mix is agreed by all operators' },
  },

  // -- market garden --
  'mgd-s1-production-targets-sales-c1': {
    id: 'mgd-s1-production-targets-sales-c1', label: 'Harvest value', icon: Wallet, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-production-targets-sales-c1', prompt: 'Define target total annual harvest value in dollars or kg' },
  },
  'mgd-s1-production-targets-sales-c2': {
    id: 'mgd-s1-production-targets-sales-c2', label: 'Market channel', icon: Target, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-production-targets-sales-c2', prompt: 'Define primary market channel - farmers market, wholesale, CSA, online, restaurant supply, or hybrid' },
  },
  'mgd-s1-production-targets-sales-c3': {
    id: 'mgd-s1-production-targets-sales-c3', label: 'Customer base', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-production-targets-sales-c3', prompt: 'Define customer base for each channel - volume and growth trajectory' },
  },
  'mgd-s1-production-targets-sales-c4': {
    id: 'mgd-s1-production-targets-sales-c4', label: 'Capacity check', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-production-targets-sales-c4', prompt: 'Confirm targets are achievable within site soil, water, and labour capacity' },
  },
  'mgd-s1-production-targets-sales-c5': {
    id: 'mgd-s1-production-targets-sales-c5', label: 'Pricing & margin', icon: Wallet, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-production-targets-sales-c5', prompt: 'Define pricing strategy and profit margin targets' },
  },
  'mgd-s1-production-targets-sales-c6': {
    id: 'mgd-s1-production-targets-sales-c6', label: 'Ramp realism', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-production-targets-sales-c6', prompt: 'Confirm targets are realistic for Year 1 ramp-up and Years 2-3 stabilisation' },
  },
  'mgd-s1-growing-system-philosophy-c1': {
    id: 'mgd-s1-growing-system-philosophy-c1', label: 'Growing ethos', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-growing-system-philosophy-c1', prompt: 'Define the core growing philosophy - organic, regenerative, integrated pest management, biodynamic, or hybrid' },
  },
  'mgd-s1-growing-system-philosophy-c2': {
    id: 'mgd-s1-growing-system-philosophy-c2', label: 'Soil targets', icon: FlaskConical, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-growing-system-philosophy-c2', prompt: 'Define soil health targets - fertility building, microbial life, water retention' },
  },
  'mgd-s1-growing-system-philosophy-c3': {
    id: 'mgd-s1-growing-system-philosophy-c3', label: 'Pest approach', icon: Bird, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-growing-system-philosophy-c3', prompt: 'Define pest and disease management approach - companion planting, mechanical, biological, acceptable chemical inputs' },
  },
  'mgd-s1-growing-system-philosophy-c4': {
    id: 'mgd-s1-growing-system-philosophy-c4', label: 'Rotation', icon: Shuffle, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-growing-system-philosophy-c4', prompt: 'Define crop rotation and succession strategy' },
  },
  'mgd-s1-growing-system-philosophy-c5': {
    id: 'mgd-s1-growing-system-philosophy-c5', label: 'Variety policy', icon: Sprout, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-growing-system-philosophy-c5', prompt: 'Define variety selection and saving philosophy - hybrid, heirloom, productivity vs. resilience' },
  },
  'mgd-s1-growing-system-philosophy-c6': {
    id: 'mgd-s1-growing-system-philosophy-c6', label: 'Feasibility', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-growing-system-philosophy-c6', prompt: 'Confirm philosophy is achievable within operator knowledge and site conditions' },
  },
  'mgd-s1-market-channels-c1': {
    id: 'mgd-s1-market-channels-c1', label: 'Food safety', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-market-channels-c1', prompt: 'Identify food safety compliance requirements for each channel - farmers market, wholesale, direct-to-consumer, processing' },
  },
  'mgd-s1-market-channels-c2': {
    id: 'mgd-s1-market-channels-c2', label: 'Labelling & cert', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-market-channels-c2', prompt: 'Identify labelling, certification, and traceability requirements' },
  },
  'mgd-s1-market-channels-c3': {
    id: 'mgd-s1-market-channels-c3', label: 'Packaging & cold', icon: Container, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-market-channels-c3', prompt: 'Define packaging and cold-chain requirements by product type' },
  },
  'mgd-s1-market-channels-c4': {
    id: 'mgd-s1-market-channels-c4', label: 'Regulatory risk', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-market-channels-c4', prompt: 'Assess regulatory risk per channel - highest to lowest compliance burden' },
  },
  'mgd-s1-market-channels-c5': {
    id: 'mgd-s1-market-channels-c5', label: 'Compliance cal', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-market-channels-c5', prompt: 'Define compliance calendar - inspection schedules, certification renewals' },
  },
  'mgd-s1-market-channels-c6': {
    id: 'mgd-s1-market-channels-c6', label: 'Reg advice', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'mgd-s1-market-channels-c6', prompt: 'Obtain regulatory advice on chosen channels before first sale' },
  },

  // -- orchard --
  'orch-s1-species-philosophy-c1': {
    id: 'orch-s1-species-philosophy-c1', label: 'Species ethos', icon: TreeDeciduous, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-species-philosophy-c1', prompt: 'Define the core species philosophy - heritage, climate-adapted, productivity focus, or conservation focus' },
  },
  'orch-s1-species-philosophy-c2': {
    id: 'orch-s1-species-philosophy-c2', label: 'Candidate species', icon: TreeDeciduous, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-species-philosophy-c2', prompt: 'Identify candidate species suited to site climate, soil, water - prioritise local provenance where possible' },
  },
  'orch-s1-species-philosophy-c3': {
    id: 'orch-s1-species-philosophy-c3', label: 'Disease pressure', icon: Bird, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-species-philosophy-c3', prompt: 'Define disease and pest pressure per species - resistance requirements' },
  },
  'orch-s1-species-philosophy-c4': {
    id: 'orch-s1-species-philosophy-c4', label: 'Portfolio', icon: Layers, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-species-philosophy-c4', prompt: 'Define the productive portfolio - monoculture, polyculture, or agroforestry integration' },
  },
  'orch-s1-species-philosophy-c5': {
    id: 'orch-s1-species-philosophy-c5', label: 'Climate fit', icon: Sun, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-species-philosophy-c5', prompt: 'Confirm species choice is compatible with climate projections for the orchard lifespan - 50+ years' },
  },
  'orch-s1-species-philosophy-c6': {
    id: 'orch-s1-species-philosophy-c6', label: 'Feasibility', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-species-philosophy-c6', prompt: 'Confirm choices are achievable within operator knowledge and site scale' },
  },
  'orch-s1-production-intent-c1': {
    id: 'orch-s1-production-intent-c1', label: 'Production intent', icon: Target, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-production-intent-c1', prompt: 'Define primary production intent - subsistence, local market, wholesale, or on-farm value-added processing' },
  },
  'orch-s1-production-intent-c2': {
    id: 'orch-s1-production-intent-c2', label: 'Target yield', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-production-intent-c2', prompt: 'Define target annual yield per hectare for primary species' },
  },
  'orch-s1-production-intent-c3': {
    id: 'orch-s1-production-intent-c3', label: 'Harvest timing', icon: Wheat, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-production-intent-c3', prompt: 'Define harvest timing and season - early, main, or extended season species' },
  },
  'orch-s1-production-intent-c4': {
    id: 'orch-s1-production-intent-c4', label: 'Processing', icon: Container, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-production-intent-c4', prompt: 'Define processing and preservation approach - fresh, dried, fermented, pressed, frozen' },
  },
  'orch-s1-production-intent-c5': {
    id: 'orch-s1-production-intent-c5', label: 'Storage needs', icon: Container, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-production-intent-c5', prompt: 'Identify storage requirements - cool storage, temperature and humidity control' },
  },
  'orch-s1-production-intent-c6': {
    id: 'orch-s1-production-intent-c6', label: 'Labour match', icon: HardHat, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-production-intent-c6', prompt: 'Confirm production intent and processing plan are matched to labour availability' },
  },
  'orch-s1-provenance-sourcing-c1': {
    id: 'orch-s1-provenance-sourcing-c1', label: 'Provenance', icon: MapPin, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-provenance-sourcing-c1', prompt: 'Define provenance preference - local, regional, certified, heirloom, conservation priority' },
  },
  'orch-s1-provenance-sourcing-c2': {
    id: 'orch-s1-provenance-sourcing-c2', label: 'Nursery suppliers', icon: Building2, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-provenance-sourcing-c2', prompt: 'Identify potential nursery suppliers - local, mail-order, specialty conservation' },
  },
  'orch-s1-provenance-sourcing-c3': {
    id: 'orch-s1-provenance-sourcing-c3', label: 'Tree size', icon: TreeDeciduous, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-provenance-sourcing-c3', prompt: 'Define tree size at planting - bare-root, small pot, large specimen' },
  },
  'orch-s1-provenance-sourcing-c4': {
    id: 'orch-s1-provenance-sourcing-c4', label: 'Establishment', icon: Fence, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-provenance-sourcing-c4', prompt: 'Define establishment support requirements - guards, mulch, staking, irrigation' },
  },
  'orch-s1-provenance-sourcing-c5': {
    id: 'orch-s1-provenance-sourcing-c5', label: 'Availability', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-provenance-sourcing-c5', prompt: 'Confirm tree availability aligns with planting timeline and budget' },
  },
  'orch-s1-provenance-sourcing-c6': {
    id: 'orch-s1-provenance-sourcing-c6', label: 'Quality standards', icon: FlaskConical, category: 'vision',
    arm: { kind: 'form', formId: 'orch-s1-provenance-sourcing-c6', prompt: 'Define quality standards for received stock - health assessment, rejection criteria' },
  },

  // -- livestock --
  'lvs-s1-enterprise-vision-c1': {
    id: 'lvs-s1-enterprise-vision-c1', label: 'Enterprise type', icon: Beef, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-enterprise-vision-c1', prompt: 'Define the enterprise type(s) - breeding herd/flock, grow-out/finishing, dairy, fibre, dual-purpose, or mixed' },
  },
  'lvs-s1-enterprise-vision-c2': {
    id: 'lvs-s1-enterprise-vision-c2', label: 'Species & breeds', icon: Beef, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-enterprise-vision-c2', prompt: 'Define species and candidate breeds - cattle, sheep, goats, pigs, poultry, or combination' },
  },
  'lvs-s1-enterprise-vision-c3': {
    id: 'lvs-s1-enterprise-vision-c3', label: 'Production intent', icon: Target, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-enterprise-vision-c3', prompt: 'Define production intent per species - meat, milk, eggs, fibre, breeding stock, land improvement' },
  },
  'lvs-s1-enterprise-vision-c4': {
    id: 'lvs-s1-enterprise-vision-c4', label: 'Integration logic', icon: Shuffle, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-enterprise-vision-c4', prompt: 'Define the integration logic between species if multi-species - leader-follower grazing, niche separation' },
  },
  'lvs-s1-enterprise-vision-c5': {
    id: 'lvs-s1-enterprise-vision-c5', label: 'Steward fit', icon: HardHat, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-enterprise-vision-c5', prompt: 'Confirm the enterprise vision fits the steward experience and available labour' },
  },
  'lvs-s1-enterprise-vision-c6': {
    id: 'lvs-s1-enterprise-vision-c6', label: 'Climate & feed', icon: Leaf, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-enterprise-vision-c6', prompt: 'Confirm the vision is consistent with the site climate and feed base' },
  },
  'lvs-s1-production-goals-c1': {
    id: 'lvs-s1-production-goals-c1', label: 'Production targets', icon: Target, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-production-goals-c1', prompt: 'Define measurable production targets - head sold/yr, kg liveweight, litres, dozen eggs, breeding replacements' },
  },
  'lvs-s1-production-goals-c2': {
    id: 'lvs-s1-production-goals-c2', label: 'Herd size', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-production-goals-c2', prompt: 'Define the target full-establishment herd/flock size' },
  },
  'lvs-s1-production-goals-c3': {
    id: 'lvs-s1-production-goals-c3', label: 'Establishment horizon', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-production-goals-c3', prompt: 'Define the establishment horizon - how many seasons to reach full scale' },
  },
  'lvs-s1-production-goals-c4': {
    id: 'lvs-s1-production-goals-c4', label: 'Stockmanship', icon: HardHat, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-production-goals-c4', prompt: 'Assess steward stockmanship capacity - daily check, handling, calving/lambing, health intervention skill' },
  },
  'lvs-s1-production-goals-c5': {
    id: 'lvs-s1-production-goals-c5', label: 'Budget envelope', icon: Wallet, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-production-goals-c5', prompt: 'Confirm capital and operating budget envelope is realistic for the scale' },
  },
  'lvs-s1-production-goals-c6': {
    id: 'lvs-s1-production-goals-c6', label: 'Continuity cover', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-production-goals-c6', prompt: 'Confirm a continuity / absence-cover plan exists - animals need daily care' },
  },
  'lvs-s1-welfare-ethic-c1': {
    id: 'lvs-s1-welfare-ethic-c1', label: 'Space & density', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-welfare-ethic-c1', prompt: 'Define minimum space and stocking-density standards per species' },
  },
  'lvs-s1-welfare-ethic-c2': {
    id: 'lvs-s1-welfare-ethic-c2', label: 'Shelter standards', icon: Home, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-welfare-ethic-c2', prompt: 'Define shelter standards per species - shade, wind protection, wet-weather and extreme-heat/cold refuge' },
  },
  'lvs-s1-welfare-ethic-c3': {
    id: 'lvs-s1-welfare-ethic-c3', label: 'Feed & water', icon: Droplet, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-welfare-ethic-c3', prompt: 'Define constant access to feed and clean water as a standing requirement' },
  },
  'lvs-s1-welfare-ethic-c4': {
    id: 'lvs-s1-welfare-ethic-c4', label: 'Handling norms', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-welfare-ethic-c4', prompt: 'Define a low-stress handling commitment and handling-frequency norms' },
  },
  'lvs-s1-welfare-ethic-c5': {
    id: 'lvs-s1-welfare-ethic-c5', label: 'Health & EOL', icon: FlaskConical, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-welfare-ethic-c5', prompt: 'Define a humane health-intervention and end-of-life / emergency-euthanasia protocol' },
  },
  'lvs-s1-welfare-ethic-c6': {
    id: 'lvs-s1-welfare-ethic-c6', label: 'Welfare compliance', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-s1-welfare-ethic-c6', prompt: 'Confirm standards meet or exceed applicable animal-welfare legislation' },
  },
  'lvs-sec-s1-enterprise-intent-c1': {
    id: 'lvs-sec-s1-enterprise-intent-c1', label: 'Enterprise intent', icon: Target, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-sec-s1-enterprise-intent-c1', prompt: 'Define the enterprise intent - product (meat, milk, fibre, eggs), land-management service, or both' },
  },
  'lvs-sec-s1-enterprise-intent-c2': {
    id: 'lvs-sec-s1-enterprise-intent-c2', label: 'Candidate species', icon: Beef, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-sec-s1-enterprise-intent-c2', prompt: 'Identify candidate species and classes of stock - ruminants, poultry, pigs, mixed' },
  },
  'lvs-sec-s1-enterprise-intent-c3': {
    id: 'lvs-sec-s1-enterprise-intent-c3', label: 'Host relationship', icon: Shuffle, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-sec-s1-enterprise-intent-c3', prompt: 'Define how the herd relates to the host enterprise - complementary, supplementary, or competing for land and labour' },
  },
  'lvs-sec-s1-enterprise-intent-c4': {
    id: 'lvs-sec-s1-enterprise-intent-c4', label: 'Experience & labour', icon: HardHat, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-sec-s1-enterprise-intent-c4', prompt: 'Identify operator livestock experience and the daily labour available for stock care' },
  },
  'lvs-sec-s1-enterprise-intent-c5': {
    id: 'lvs-sec-s1-enterprise-intent-c5', label: 'Compatibility', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'lvs-sec-s1-enterprise-intent-c5', prompt: 'Confirm enterprise intent is compatible with the host vision, scale, and stewardship capacity' },
  },

  // -- conservation --
  'con-s1-conservation-intent-c1': {
    id: 'con-s1-conservation-intent-c1', label: 'Reference state', icon: Leaf, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-conservation-intent-c1', prompt: 'Define reference ecological state - historical condition this site is being restored toward' },
  },
  'con-s1-conservation-intent-c2': {
    id: 'con-s1-conservation-intent-c2', label: 'Target species', icon: Bird, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-conservation-intent-c2', prompt: 'Identify target species - flora and fauna that define ecological success' },
  },
  'con-s1-conservation-intent-c3': {
    id: 'con-s1-conservation-intent-c3', label: 'Habitat types', icon: TreeDeciduous, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-conservation-intent-c3', prompt: 'Define target habitat types and their spatial extent' },
  },
  'con-s1-conservation-intent-c4': {
    id: 'con-s1-conservation-intent-c4', label: 'Outcome targets', icon: Target, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-conservation-intent-c4', prompt: 'Set measurable ecological outcome targets with timeframes - 5, 10, 25 years' },
  },
  'con-s1-conservation-intent-c5': {
    id: 'con-s1-conservation-intent-c5', label: 'Min viable state', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-conservation-intent-c5', prompt: 'Define minimum acceptable ecological state for Phase 1' },
  },
  'con-s1-conservation-intent-c6': {
    id: 'con-s1-conservation-intent-c6', label: 'Feasibility', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-conservation-intent-c6', prompt: 'Confirm targets are achievable given site conditions and landscape context' },
  },
  'con-s1-intervention-philosophy-c1': {
    id: 'con-s1-intervention-philosophy-c1', label: 'Intervention ethos', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-intervention-philosophy-c1', prompt: 'Define intervention philosophy - passive rewilding, assisted natural regeneration, active restoration, or hybrid' },
  },
  'con-s1-intervention-philosophy-c2': {
    id: 'con-s1-intervention-philosophy-c2', label: 'Acceptable methods', icon: Layers, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-intervention-philosophy-c2', prompt: 'List acceptable intervention methods - planting, earthworks, pest control, fire' },
  },
  'con-s1-intervention-philosophy-c3': {
    id: 'con-s1-intervention-philosophy-c3', label: 'Prohibited methods', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-intervention-philosophy-c3', prompt: 'List prohibited methods that conflict with the philosophy' },
  },
  'con-s1-intervention-philosophy-c4': {
    id: 'con-s1-intervention-philosophy-c4', label: 'Decision threshold', icon: Shuffle, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-intervention-philosophy-c4', prompt: 'Define decision-making threshold - what evidence triggers active intervention vs. allowing natural recovery' },
  },
  'con-s1-intervention-philosophy-c5': {
    id: 'con-s1-intervention-philosophy-c5', label: 'Confirm agreed', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-intervention-philosophy-c5', prompt: 'Confirm intervention philosophy is agreed by all parties with decision-making authority' },
  },
  'con-s1-tenure-covenant-c1': {
    id: 'con-s1-tenure-covenant-c1', label: 'Instruments', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-tenure-covenant-c1', prompt: 'Evaluate applicable conservation instruments - covenants, reserve declarations, easements, carbon credits' },
  },
  'con-s1-tenure-covenant-c2': {
    id: 'con-s1-tenure-covenant-c2', label: 'Implications', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-tenure-covenant-c2', prompt: 'Assess implications of each instrument for management flexibility' },
  },
  'con-s1-tenure-covenant-c3': {
    id: 'con-s1-tenure-covenant-c3', label: 'Covenant strategy', icon: Target, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-tenure-covenant-c3', prompt: 'Define covenant strategy - which instrument best matches conservation intent' },
  },
  'con-s1-tenure-covenant-c4': {
    id: 'con-s1-tenure-covenant-c4', label: 'Provider', icon: Building2, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-tenure-covenant-c4', prompt: 'Identify covenant provider or registering body' },
  },
  'con-s1-tenure-covenant-c5': {
    id: 'con-s1-tenure-covenant-c5', label: 'Legal advice', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-tenure-covenant-c5', prompt: 'Obtain legal advice before executing any covenant or carbon agreement' },
  },
  'con-s1-tenure-covenant-c6': {
    id: 'con-s1-tenure-covenant-c6', label: 'Conflict check', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'con-s1-tenure-covenant-c6', prompt: 'Confirm covenant terms do not conflict with planned interventions' },
  },

  // -- off-grid --
  'ofg-s1-resilience-philosophy-c1': {
    id: 'ofg-s1-resilience-philosophy-c1', label: 'Independence target', icon: Target, category: 'vision',
    arm: { kind: 'form', formId: 'ofg-s1-resilience-philosophy-c1', prompt: 'Define independence target per critical system - water, energy, food, communications, shelter' },
  },
  'ofg-s1-resilience-philosophy-c2': {
    id: 'ofg-s1-resilience-philosophy-c2', label: 'Backup & grid', icon: Zap, category: 'vision',
    arm: { kind: 'form', formId: 'ofg-s1-resilience-philosophy-c2', prompt: 'Define acceptable backup or grid connection where full independence is not the target' },
  },
  'ofg-s1-resilience-philosophy-c3': {
    id: 'ofg-s1-resilience-philosophy-c3', label: 'Worst-case span', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'ofg-s1-resilience-philosophy-c3', prompt: 'Define worst-case scenario resilience requirement - how long must all systems operate without resupply' },
  },
  'ofg-s1-resilience-philosophy-c4': {
    id: 'ofg-s1-resilience-philosophy-c4', label: 'Feasibility', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'ofg-s1-resilience-philosophy-c4', prompt: 'Confirm independence targets are achievable against site potential' },
  },
  'ofg-s1-resilience-philosophy-c5': {
    id: 'ofg-s1-resilience-philosophy-c5', label: 'Design constraint', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'ofg-s1-resilience-philosophy-c5', prompt: 'Document targets as design constraints - all Tier 3-4 systems sized against them' },
  },
  'ofg-s1-critical-systems-redundancy-c1': {
    id: 'ofg-s1-critical-systems-redundancy-c1', label: 'Criticality tiers', icon: Layers, category: 'vision',
    arm: { kind: 'form', formId: 'ofg-s1-critical-systems-redundancy-c1', prompt: 'Classify all systems by criticality - life-safety, essential, convenience' },
  },
  'ofg-s1-critical-systems-redundancy-c2': {
    id: 'ofg-s1-critical-systems-redundancy-c2', label: 'Redundancy spec', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'ofg-s1-critical-systems-redundancy-c2', prompt: 'Define redundancy requirement for each life-safety system - dual source, backup storage, manual fallback' },
  },
  'ofg-s1-critical-systems-redundancy-c3': {
    id: 'ofg-s1-critical-systems-redundancy-c3', label: 'Min viable op', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'ofg-s1-critical-systems-redundancy-c3', prompt: 'Define minimum viable operation standard for each critical system during failure' },
  },
  'ofg-s1-critical-systems-redundancy-c4': {
    id: 'ofg-s1-critical-systems-redundancy-c4', label: 'Max downtime', icon: AlertTriangle, category: 'vision',
    arm: { kind: 'form', formId: 'ofg-s1-critical-systems-redundancy-c4', prompt: 'Define maximum acceptable downtime per system before life-safety threshold is breached' },
  },
  'ofg-s1-critical-systems-redundancy-c5': {
    id: 'ofg-s1-critical-systems-redundancy-c5', label: 'Feasibility', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'ofg-s1-critical-systems-redundancy-c5', prompt: 'Confirm redundancy requirements are achievable on this site' },
  },

  // -- agritourism --
  'ag-s1-experience-vision-c1': {
    id: 'ag-s1-experience-vision-c1', label: 'Experience core', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-experience-vision-c1', prompt: 'Define the core guest experience in plain language - what makes this farm distinct' },
  },
  'ag-s1-experience-vision-c2': {
    id: 'ag-s1-experience-vision-c2', label: 'Visitor types', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-experience-vision-c2', prompt: 'Identify visitor types - day visitors, overnight guests, retreat participants, school groups' },
  },
  'ag-s1-experience-vision-c3': {
    id: 'ag-s1-experience-vision-c3', label: 'Commercial offer', icon: Wallet, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-experience-vision-c3', prompt: 'Define the commercial proposition - what is offered and at what price point' },
  },
  'ag-s1-experience-vision-c4': {
    id: 'ag-s1-experience-vision-c4', label: 'Hospitality identity', icon: Home, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-experience-vision-c4', prompt: "Define the farm's hospitality identity - authentic farm stay, luxury retreat, educational experience" },
  },
  'ag-s1-experience-vision-c5': {
    id: 'ag-s1-experience-vision-c5', label: 'Capacity check', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-experience-vision-c5', prompt: 'Confirm the commercial model is achievable within steward capacity' },
  },
  'ag-s1-experience-vision-c6': {
    id: 'ag-s1-experience-vision-c6', label: 'Non-negotiables', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-experience-vision-c6', prompt: 'Record what will never be compromised for commercial gain' },
  },
  'ag-s1-visitor-capacity-c1': {
    id: 'ag-s1-visitor-capacity-c1', label: 'Max capacity', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-visitor-capacity-c1', prompt: 'Define maximum simultaneous guest capacity - accommodation, dining, programming' },
  },
  'ag-s1-visitor-capacity-c2': {
    id: 'ag-s1-visitor-capacity-c2', label: 'Visit limits', icon: Layers, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-visitor-capacity-c2', prompt: 'Define visit type limits - maximum day visitors, overnight guests, event attendees' },
  },
  'ag-s1-visitor-capacity-c3': {
    id: 'ag-s1-visitor-capacity-c3', label: 'Op boundaries', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-visitor-capacity-c3', prompt: 'Define operational boundaries - what farm activities are incompatible with guest presence' },
  },
  'ag-s1-visitor-capacity-c4': {
    id: 'ag-s1-visitor-capacity-c4', label: 'Seasonal variation', icon: Sun, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-visitor-capacity-c4', prompt: 'Define seasonal capacity variation - peak and off-peak limits' },
  },
  'ag-s1-visitor-capacity-c5': {
    id: 'ag-s1-visitor-capacity-c5', label: 'Consistency check', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-visitor-capacity-c5', prompt: 'Confirm capacity is consistent with regulatory requirements and infrastructure potential' },
  },
  'ag-s1-regulatory-framework-c1': {
    id: 'ag-s1-regulatory-framework-c1', label: 'Food permits', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-regulatory-framework-c1', prompt: 'Identify food service permit requirements - preparation, service, storage' },
  },
  'ag-s1-regulatory-framework-c2': {
    id: 'ag-s1-regulatory-framework-c2', label: 'Accom licensing', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-regulatory-framework-c2', prompt: 'Identify accommodation licensing requirements for intended accommodation type' },
  },
  'ag-s1-regulatory-framework-c3': {
    id: 'ag-s1-regulatory-framework-c3', label: 'Liability insurance', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-regulatory-framework-c3', prompt: 'Define public liability insurance requirements and coverage' },
  },
  'ag-s1-regulatory-framework-c4': {
    id: 'ag-s1-regulatory-framework-c4', label: 'Health & safety', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-regulatory-framework-c4', prompt: 'Identify health and safety compliance requirements for public access' },
  },
  'ag-s1-regulatory-framework-c5': {
    id: 'ag-s1-regulatory-framework-c5', label: 'Resource consent', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-regulatory-framework-c5', prompt: 'Identify any resource consent requirements for visitor infrastructure' },
  },
  'ag-s1-regulatory-framework-c6': {
    id: 'ag-s1-regulatory-framework-c6', label: 'Compliance cal', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-regulatory-framework-c6', prompt: 'Define compliance calendar - renewal dates and ongoing obligations' },
  },
  'ag-s1-regulatory-framework-c7': {
    id: 'ag-s1-regulatory-framework-c7', label: 'Legal advice', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'ag-s1-regulatory-framework-c7', prompt: 'Obtain legal or compliance advice before any guest-facing infrastructure is built' },
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
    arm: { kind: 'form', formId: 'edu-s1-mission-audience-c1', prompt: 'Define primary educational mission in plain language' },
  },
  'edu-s1-mission-audience-c2': {
    id: 'edu-s1-mission-audience-c2', label: 'Audience', icon: UserCheck, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-mission-audience-c2', prompt: 'Identify primary audience - school groups, farmers, general public, practitioners, children' },
  },
  'edu-s1-mission-audience-c3': {
    id: 'edu-s1-mission-audience-c3', label: 'Learning outcomes', icon: Target, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-mission-audience-c3', prompt: 'Define learning outcomes per program type' },
  },
  'edu-s1-mission-audience-c4': {
    id: 'edu-s1-mission-audience-c4', label: 'Unique value', icon: Leaf, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-mission-audience-c4', prompt: 'Define what this site teaches that cannot be taught in a classroom' },
  },
  'edu-s1-mission-audience-c5': {
    id: 'edu-s1-mission-audience-c5', label: 'Capacity check', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-mission-audience-c5', prompt: 'Confirm mission is achievable within steward knowledge and site capacity' },
  },
  'edu-s1-curriculum-programs-c1': {
    id: 'edu-s1-curriculum-programs-c1', label: 'Program types', icon: Layers, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-curriculum-programs-c1', prompt: 'Define program types - day workshops, half-day tours, school excursions, multi-day residencies, online hybrid' },
  },
  'edu-s1-curriculum-programs-c2': {
    id: 'edu-s1-curriculum-programs-c2', label: 'Curriculum themes', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-curriculum-programs-c2', prompt: 'Define curriculum themes per program type - soil, food systems, ecology, permaculture design' },
  },
  'edu-s1-curriculum-programs-c3': {
    id: 'edu-s1-curriculum-programs-c3', label: 'Group size', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-curriculum-programs-c3', prompt: 'Define maximum group size per program type' },
  },
  'edu-s1-curriculum-programs-c4': {
    id: 'edu-s1-curriculum-programs-c4', label: 'Program calendar', icon: Sun, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-curriculum-programs-c4', prompt: 'Define annual program calendar - frequency, seasonality' },
  },
  'edu-s1-curriculum-programs-c5': {
    id: 'edu-s1-curriculum-programs-c5', label: 'Mission fit', icon: HelpCircle, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-curriculum-programs-c5', prompt: 'Confirm curriculum framework is consistent with educational mission' },
  },
  'edu-s1-curriculum-programs-c6': {
    id: 'edu-s1-curriculum-programs-c6', label: 'Review process', icon: Recycle, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-curriculum-programs-c6', prompt: 'Define curriculum development and review process' },
  },
  'edu-s1-regulatory-framework-c1': {
    id: 'edu-s1-regulatory-framework-c1', label: 'Liability insurance', icon: Lock, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-regulatory-framework-c1', prompt: 'Identify public access and liability insurance requirements' },
  },
  'edu-s1-regulatory-framework-c2': {
    id: 'edu-s1-regulatory-framework-c2', label: 'Child safety', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-regulatory-framework-c2', prompt: 'Identify working with children or vulnerable persons requirements if applicable' },
  },
  'edu-s1-regulatory-framework-c3': {
    id: 'edu-s1-regulatory-framework-c3', label: 'Food permits', icon: ShieldAlert, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-regulatory-framework-c3', prompt: 'Identify food handling permits if meals or food tasting is offered' },
  },
  'edu-s1-regulatory-framework-c4': {
    id: 'edu-s1-regulatory-framework-c4', label: 'Building permits', icon: Building2, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-regulatory-framework-c4', prompt: 'Identify building permits for teaching structures' },
  },
  'edu-s1-regulatory-framework-c5': {
    id: 'edu-s1-regulatory-framework-c5', label: 'Accreditation', icon: FileText, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-regulatory-framework-c5', prompt: 'Define any accreditation intent - RTO, CPD provider, curriculum alignment' },
  },
  'edu-s1-regulatory-framework-c6': {
    id: 'edu-s1-regulatory-framework-c6', label: 'Compliance cal', icon: Ruler, category: 'vision',
    arm: { kind: 'form', formId: 'edu-s1-regulatory-framework-c6', prompt: 'Define compliance calendar - renewal dates and ongoing obligations' },
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
