/**
 * builtEnvironmentKinds — canonical kind registry for the unified
 * Built Environment entity (see builtEnvironment.ts).
 *
 * Spans the union of:
 *   - Observe builtEnvironmentStore (8 kinds, descriptive)
 *   - Plan structureStore (20 kinds, prescriptive)
 *   - Plan designElementsStore structure-class kinds (greenhouse, barn,
 *     shed, machinery-shed, fuel-station, equipment-yard, water-tank,
 *     parking, prayer-pavilion, fire-circle, compost)
 *
 * All kinds support both `state: 'existing' | 'proposed'` at the schema
 * level. Per-kind `defaultStates` flags which states are commonly authored
 * — UI surfaces may hide the state toggle for kinds where the off-axis
 * state is non-sensical (e.g. `parking` in `existing` is fine but rarely
 * needs proposed-economic fields), but the store always accepts both.
 *
 * Naming: kebab-case, matches the `elementCatalog.ts` convention. Legacy
 * snake_case structure types (cabin, prayer_space) are aliased to their
 * kebab-case canonical names for migration; no kind has both forms in the
 * registry.
 */

import type { BuiltEnvironmentState } from './builtEnvironment.js';

// ─────────────────────────────────────────────────────────────────────────
// Categories — preserved from elementCatalog.ts for UI grouping
// ─────────────────────────────────────────────────────────────────────────

export type BuiltEnvironmentCategory =
  | 'building'      // habitable + assembly: cabin, yurt, prayer-pavilion, classroom, ...
  | 'agricultural'  // barn, greenhouse, animal-shelter, compost, ...
  | 'utility'       // well, septic, water-tank, water-pump-house, solar-array, ...
  | 'infrastructure'// power-line, buried-utility, fence, gate, driveway, road, ...
  | 'machinery'     // machinery-shed, fuel-station, equipment-yard, ...
  | 'amenity';      // fire-circle, lookout, parking, ...

export type BuiltEnvironmentGeometryType = 'point' | 'line' | 'polygon';
export type BuiltEnvironmentRenderMode = 'glb' | 'extrusion' | 'flat';

export interface BuiltEnvironmentKindSpec {
  /** Canonical kebab-case kind id. */
  kind: string;
  /** Human label for menus + tooltips. */
  label: string;
  /** UI grouping. */
  category: BuiltEnvironmentCategory;
  /** Concrete geometry constraint. The store rejects mismatched geometry. */
  geometryType: BuiltEnvironmentGeometryType;
  /** Lucide icon name (or any string the UI maps to a glyph). */
  icon: string;
  /** Default fill colour for flat/extrusion fallback. CSS hex. */
  color: string;
  /** Which states the UI should surface by default. Schema accepts both
   *  regardless — this only governs default authoring affordances. */
  defaultStates: BuiltEnvironmentState[];
  /** 3D rendering mode. `flat` = no 3D layer, fall back to 2D fill/line. */
  renderMode: BuiltEnvironmentRenderMode;
  /** Default real-world height in metres. Applies to extrusion + GLB scale-Y. */
  defaultHeightM?: number;
  /** Default footprint side length for point geometries (metres). */
  defaultFootprintM?: number;
  /** GLB asset URL when `renderMode === 'glb'`. */
  glbUrl?: string;
  /** Default Yeomans phase tag for proposed-state placement. */
  defaultPhase?: string;
  /** Aliases — alternate kind ids that migrate to this canonical kind. */
  aliases?: string[];
}

// ─────────────────────────────────────────────────────────────────────────
// Generic GLB fallback (matches elementHeights.ts)
// ─────────────────────────────────────────────────────────────────────────

const GENERIC_GLB = '/models/structures/_generic_box.glb';

// ─────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────

/**
 * Authoritative kind table. Order is the suggested UI surfacing order
 * (Observe palette + Plan palette both consume this).
 */
export const BUILT_ENVIRONMENT_KINDS: Readonly<Record<string, BuiltEnvironmentKindSpec>> =
  Object.freeze({
    // ── Buildings — habitable + assembly ─────────────────────────────────
    building: {
      kind: 'building',
      label: 'Building',
      category: 'building',
      geometryType: 'polygon',
      icon: 'Home',
      color: '#9ca3af',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'glb',
      defaultHeightM: 5.0,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
    },
    cabin: {
      kind: 'cabin',
      label: 'Cabin',
      category: 'building',
      geometryType: 'polygon',
      icon: 'Home',
      color: '#a16207',
      defaultStates: ['proposed'],
      renderMode: 'glb',
      defaultHeightM: 4.0,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
    },
    yurt: {
      kind: 'yurt',
      label: 'Yurt',
      category: 'building',
      geometryType: 'polygon',
      icon: 'Tent',
      color: '#b45309',
      defaultStates: ['proposed'],
      renderMode: 'glb',
      defaultHeightM: 3.5,
      defaultFootprintM: 6,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
    },
    'tent-glamping': {
      kind: 'tent-glamping',
      label: 'Tent / Glamping',
      category: 'building',
      geometryType: 'polygon',
      icon: 'Tent',
      color: '#d97706',
      defaultStates: ['proposed'],
      renderMode: 'glb',
      defaultHeightM: 2.8,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
      aliases: ['tent_glamping'],
    },
    'prayer-pavilion': {
      kind: 'prayer-pavilion',
      label: 'Prayer Pavilion',
      category: 'building',
      geometryType: 'polygon',
      icon: 'Sparkles',
      color: '#0ea5e9',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'glb',
      defaultHeightM: 4.0,
      defaultFootprintM: 7,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
      aliases: ['prayer_space', 'prayer-space'],
    },
    pavilion: {
      kind: 'pavilion',
      label: 'Pavilion',
      category: 'building',
      geometryType: 'polygon',
      icon: 'Tent',
      color: '#0284c7',
      defaultStates: ['proposed'],
      renderMode: 'glb',
      defaultHeightM: 3.5,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
    },
    classroom: {
      kind: 'classroom',
      label: 'Classroom',
      category: 'building',
      geometryType: 'polygon',
      icon: 'BookOpen',
      color: '#0369a1',
      defaultStates: ['proposed'],
      renderMode: 'glb',
      defaultHeightM: 3.5,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
    },
    bathhouse: {
      kind: 'bathhouse',
      label: 'Bathhouse',
      category: 'building',
      geometryType: 'polygon',
      icon: 'Droplets',
      color: '#0891b2',
      defaultStates: ['proposed'],
      renderMode: 'glb',
      defaultHeightM: 3.0,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
    },
    earthship: {
      kind: 'earthship',
      label: 'Earthship',
      category: 'building',
      geometryType: 'polygon',
      icon: 'Mountain',
      color: '#78350f',
      defaultStates: ['proposed'],
      renderMode: 'glb',
      defaultHeightM: 3.5,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
    },
    workshop: {
      kind: 'workshop',
      label: 'Workshop',
      category: 'building',
      geometryType: 'polygon',
      icon: 'Wrench',
      color: '#6b7280',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'glb',
      defaultHeightM: 4.5,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
    },
    lookout: {
      kind: 'lookout',
      label: 'Lookout',
      category: 'building',
      geometryType: 'polygon',
      icon: 'Eye',
      color: '#525252',
      defaultStates: ['proposed'],
      renderMode: 'glb',
      defaultHeightM: 6.0,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
    },

    // ── Agricultural ─────────────────────────────────────────────────────
    barn: {
      kind: 'barn',
      label: 'Barn',
      category: 'agricultural',
      geometryType: 'polygon',
      icon: 'Warehouse',
      color: '#7c2d12',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'glb',
      defaultHeightM: 6.0,
      defaultFootprintM: 10,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
    },
    greenhouse: {
      kind: 'greenhouse',
      label: 'Greenhouse',
      category: 'agricultural',
      geometryType: 'polygon',
      icon: 'Sprout',
      color: '#16a34a',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'glb',
      defaultHeightM: 3.0,
      defaultFootprintM: 8,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
    },
    shed: {
      kind: 'shed',
      label: 'Shed',
      category: 'agricultural',
      geometryType: 'polygon',
      icon: 'Box',
      color: '#a3a3a3',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'glb',
      defaultHeightM: 2.5,
      defaultFootprintM: 4,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
      aliases: ['storage'],
    },
    'animal-shelter': {
      kind: 'animal-shelter',
      label: 'Animal Shelter',
      category: 'agricultural',
      geometryType: 'polygon',
      icon: 'Warehouse',
      color: '#92400e',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'glb',
      defaultHeightM: 3.5,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
      aliases: ['animal_shelter'],
    },
    compost: {
      kind: 'compost',
      label: 'Compost Station',
      category: 'agricultural',
      geometryType: 'polygon',
      icon: 'Leaf',
      color: '#4d7c0f',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'extrusion',
      defaultHeightM: 1.0,
      defaultFootprintM: 3,
      defaultPhase: 'soil',
      aliases: ['compost_station', 'compost-station'],
    },

    // ── Utility ──────────────────────────────────────────────────────────
    well: {
      kind: 'well',
      label: 'Well',
      category: 'utility',
      geometryType: 'point',
      icon: 'Droplet',
      color: '#0284c7',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'extrusion',
      defaultHeightM: 1.2,
      defaultFootprintM: 2,
      defaultPhase: 'water',
    },
    septic: {
      kind: 'septic',
      label: 'Septic',
      category: 'utility',
      geometryType: 'polygon',
      icon: 'Droplets',
      color: '#71717a',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'flat',
      defaultPhase: 'water',
    },
    'water-tank': {
      kind: 'water-tank',
      label: 'Water Tank',
      category: 'utility',
      geometryType: 'polygon',
      icon: 'Droplets',
      color: '#0369a1',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'glb',
      defaultHeightM: 3.0,
      defaultFootprintM: 4,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'water',
      aliases: ['water_tank'],
    },
    'water-pump-house': {
      kind: 'water-pump-house',
      label: 'Pump House',
      category: 'utility',
      geometryType: 'polygon',
      icon: 'Wrench',
      color: '#0c4a6e',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'glb',
      defaultHeightM: 2.5,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'water',
      aliases: ['water_pump_house'],
    },
    'solar-array': {
      kind: 'solar-array',
      label: 'Solar Array',
      category: 'utility',
      geometryType: 'polygon',
      icon: 'Sun',
      color: '#facc15',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'extrusion',
      defaultHeightM: 1.5,
      defaultPhase: 'building',
      aliases: ['solar_array'],
    },

    // ── Infrastructure (lines + driveways) ──────────────────────────────
    'power-line': {
      kind: 'power-line',
      label: 'Power Line',
      category: 'infrastructure',
      geometryType: 'line',
      icon: 'Zap',
      color: '#facc15',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'flat',
      defaultPhase: 'access',
      aliases: ['powerLine'],
    },
    'buried-utility': {
      kind: 'buried-utility',
      label: 'Buried Utility',
      category: 'infrastructure',
      geometryType: 'line',
      icon: 'Cable',
      color: '#a855f7',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'flat',
      defaultPhase: 'access',
      aliases: ['buriedUtility'],
    },
    fence: {
      kind: 'fence',
      label: 'Fence',
      category: 'infrastructure',
      geometryType: 'line',
      icon: 'Minus',
      color: '#52525b',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'flat',
      defaultPhase: 'subdivision',
    },
    gate: {
      kind: 'gate',
      label: 'Gate',
      category: 'infrastructure',
      geometryType: 'point',
      icon: 'DoorOpen',
      color: '#d4d4d8',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'flat',
      defaultFootprintM: 1.5,
      defaultPhase: 'subdivision',
    },
    driveway: {
      kind: 'driveway',
      label: 'Driveway',
      category: 'infrastructure',
      geometryType: 'line',
      icon: 'Route',
      color: '#78716c',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'flat',
      defaultPhase: 'access',
      aliases: ['existingDriveway', 'existing-driveway'],
    },

    // ── Machinery ────────────────────────────────────────────────────────
    'machinery-shed': {
      kind: 'machinery-shed',
      label: 'Machinery Shed',
      category: 'machinery',
      geometryType: 'polygon',
      icon: 'Truck',
      color: '#4b5563',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'glb',
      defaultHeightM: 4.0,
      defaultFootprintM: 8,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'building',
    },
    'fuel-station': {
      kind: 'fuel-station',
      label: 'Fuel Station',
      category: 'machinery',
      geometryType: 'polygon',
      icon: 'Fuel',
      color: '#dc2626',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'glb',
      defaultHeightM: 3.0,
      defaultFootprintM: 5,
      glbUrl: GENERIC_GLB,
      defaultPhase: 'access',
    },
    'equipment-yard': {
      kind: 'equipment-yard',
      label: 'Equipment Yard',
      category: 'machinery',
      geometryType: 'polygon',
      icon: 'Warehouse',
      color: '#9ca3af',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'extrusion',
      defaultHeightM: 0.3,
      defaultPhase: 'access',
    },

    // ── Amenity ──────────────────────────────────────────────────────────
    'fire-circle': {
      kind: 'fire-circle',
      label: 'Fire Circle',
      category: 'amenity',
      geometryType: 'polygon',
      icon: 'Flame',
      color: '#ea580c',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'extrusion',
      defaultHeightM: 0.4,
      defaultFootprintM: 2,
      defaultPhase: 'building',
      aliases: ['fire_circle'],
    },
    parking: {
      kind: 'parking',
      label: 'Parking',
      category: 'amenity',
      geometryType: 'polygon',
      icon: 'Square',
      color: '#a8a29e',
      defaultStates: ['existing', 'proposed'],
      renderMode: 'flat',
      defaultPhase: 'access',
    },
  });

// ─────────────────────────────────────────────────────────────────────────
// Lookups
// ─────────────────────────────────────────────────────────────────────────

/** All canonical kind ids. */
export const BUILT_ENVIRONMENT_KIND_IDS: readonly string[] = Object.freeze(
  Object.keys(BUILT_ENVIRONMENT_KINDS),
);

/** Reverse alias map — alias → canonical. Built once at module load. */
const ALIAS_TO_CANONICAL: Readonly<Record<string, string>> = Object.freeze(
  Object.values(BUILT_ENVIRONMENT_KINDS).reduce<Record<string, string>>((acc, spec) => {
    if (spec.aliases) {
      for (const alias of spec.aliases) {
        acc[alias] = spec.kind;
      }
    }
    return acc;
  }, {}),
);

/** Resolve `kind` (canonical or alias) to its canonical spec, or undefined. */
export function getBuiltEnvironmentKind(
  kind: string,
): BuiltEnvironmentKindSpec | undefined {
  if (BUILT_ENVIRONMENT_KINDS[kind]) return BUILT_ENVIRONMENT_KINDS[kind];
  const canonical = ALIAS_TO_CANONICAL[kind];
  return canonical ? BUILT_ENVIRONMENT_KINDS[canonical] : undefined;
}

/** Resolve `kind` (canonical or alias) to its canonical id, or undefined. */
export function canonicalizeKind(kind: string): string | undefined {
  if (BUILT_ENVIRONMENT_KINDS[kind]) return kind;
  return ALIAS_TO_CANONICAL[kind];
}

/** True if the kind+geometry pair matches the registry constraint. */
export function isGeometryValidForKind(
  kind: string,
  geometryType: BuiltEnvironmentGeometryType,
): boolean {
  const spec = getBuiltEnvironmentKind(kind);
  return !!spec && spec.geometryType === geometryType;
}

/** Filter kinds by category. */
export function getKindsByCategory(
  category: BuiltEnvironmentCategory,
): BuiltEnvironmentKindSpec[] {
  return Object.values(BUILT_ENVIRONMENT_KINDS).filter((s) => s.category === category);
}
