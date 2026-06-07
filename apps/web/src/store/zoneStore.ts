/**
 * Zone store — manages custom land-use zones with localStorage persistence.
 *
 * Zones are drawn on the map as polygons with custom names, colors,
 * categories, and primary/secondary use designations.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import { temporal } from 'zundo';
import { zone } from '../lib/tokens';

export type ZoneCategory =
  | 'habitation'
  | 'food_production'
  | 'livestock'
  | 'commons'
  | 'spiritual'
  | 'education'
  | 'retreat'
  | 'conservation'
  | 'water_retention'
  | 'infrastructure'
  | 'access'
  | 'buffer'
  | 'future_expansion';

/**
 * Invasive-species pressure — qualitative observation per zone.
 * Intentionally coarse (4 bands) so stewards can tag from a walk-through
 * without needing a formal survey. Mirrors the biological-activity vocab
 * used in `soilSampleStore`.
 */
export type InvasivePressure = 'none' | 'low' | 'medium' | 'high';

/**
 * Succession stage — where the vegetation community currently sits on
 * the disturbed-to-climax gradient. Canonical 5-value scale shared with
 * `VegetationPatch` observations (vegetationStore). `disturbed` is the
 * raw early state (was `bare` pre-v3); `late` is the mature-but-not-yet-
 * climax band. On a zone this is the optional manual *override* that
 * wins over the observed value (see vegetationResolver).
 */
export type SuccessionStage =
  | 'disturbed'
  | 'pioneer'
  | 'mid'
  | 'late'
  | 'climax';

/**
 * Seasonality / phased-use tag — when during the year the zone is
 * actually in use. Captures the design distinction between a zone that
 * works year-round (e.g., a barn), one that's seasonal (e.g., a summer
 * camping area), and one that's intentionally temporary (e.g., an event
 * staging zone for a one-off gathering or a phased construction laydown).
 *
 * Spec: §8 `seasonal-temporary-phased-use-zones` (featureManifest).
 */
export type Seasonality =
  | 'year_round'
  | 'summer'
  | 'winter'
  | 'spring_fall'
  | 'temporary';

/**
 * Ground-cover state — what is physically on the ground in this zone right
 * now, independent of succession stage or category. Captured by stewards in
 * Observe so the auto-design pipeline can match interventions to suitable
 * patches (e.g. orchard-block prefers `bare-soil` or `sparse-grasses`;
 * livestock prefers `thriving-grasses`; swale-system avoids `wetland` and
 * `forest`).
 *
 * Orthogonal to `successionStage` (which tracks the vegetation community
 * along the bare→climax gradient) because two zones at "pioneer" can have
 * very different ground covers (sand vs sparse-grasses vs bare-soil).
 *
 * Spec: wiki/decisions/2026-05-14-auto-design-pipeline.md.
 */
export type GroundCoverState =
  | 'barren'
  | 'bare-soil'
  | 'sparse-grasses'
  | 'thriving-grasses'
  | 'sand'
  | 'rocky'
  | 'forest'
  | 'wetland';

export const INVASIVE_PRESSURE_LABELS: Record<InvasivePressure, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const INVASIVE_PRESSURE_COLORS: Record<InvasivePressure, string> = {
  none: '#6ba47a',
  low: '#d4c564',
  medium: '#c88b4a',
  high: '#a8574a',
};

export const SUCCESSION_STAGE_LABELS: Record<SuccessionStage, string> = {
  disturbed: 'Disturbed',
  pioneer: 'Pioneer',
  mid: 'Mid-succession',
  late: 'Late-succession',
  climax: 'Climax',
};

/**
 * Succession palette — disturbed (raw earth) → climax (deep canopy).
 * Matches the former Observe `ECOLOGY_STAGE_COLOR` ramp so migrated
 * ecology zones keep their on-map appearance.
 */
export const SUCCESSION_STAGE_COLORS: Record<SuccessionStage, string> = {
  disturbed: '#a85a3f',
  pioneer: '#c4a265',
  mid: '#7aa86a',
  late: '#4a8a5a',
  climax: '#2a6a3a',
};

export const SEASONALITY_LABELS: Record<Seasonality, string> = {
  year_round: 'Year-round',
  summer: 'Summer only',
  winter: 'Winter only',
  spring_fall: 'Spring / Fall',
  temporary: 'Temporary / event',
};

/**
 * Season-tinted swatches: warm hues for summer, cool for winter, neutral
 * for year-round, soft green for shoulder seasons, dashed-purple feel
 * for temporary use. Picked to read distinctly from invasive/succession
 * palettes so the three rollups don't blur together.
 */
export const SEASONALITY_COLORS: Record<Seasonality, string> = {
  year_round: '#7e8a6f',
  summer: '#d68b4a',
  winter: '#5a87a8',
  spring_fall: '#9bb37a',
  temporary: '#a87fb8',
};

export const GROUND_COVER_LABELS: Record<GroundCoverState, string> = {
  barren: 'Barren / dead',
  'bare-soil': 'Bare soil',
  'sparse-grasses': 'Sparse grasses',
  'thriving-grasses': 'Thriving grasses',
  sand: 'Sand',
  rocky: 'Rocky',
  forest: 'Forest',
  wetland: 'Wetland',
};

/**
 * Earth-tone palette ordered from least → most living matter so the legend
 * reads as a productivity gradient. Wetland gets a distinct blue; sand a
 * pale tan; rocky a cool grey.
 */
export const GROUND_COVER_COLORS: Record<GroundCoverState, string> = {
  barren: '#7a6a55',
  'bare-soil': '#a08561',
  'sparse-grasses': '#bfa86a',
  'thriving-grasses': '#6ba47a',
  sand: '#dccd9a',
  rocky: '#8a8780',
  forest: '#3f6b4c',
  wetland: '#5a87a8',
};

export const ZONE_CATEGORY_CONFIG: Record<ZoneCategory, { label: string; color: string; icon: string }> = {
  habitation:       { label: 'Habitation',        color: zone.habitation, icon: '🏠' },
  food_production:  { label: 'Food Production',   color: zone.food_production, icon: '🌱' },
  livestock:        { label: 'Livestock',          color: zone.livestock, icon: '🐑' },
  commons:          { label: 'Commons',            color: zone.commons, icon: '🌳' },
  spiritual:        { label: 'Spiritual',          color: zone.spiritual, icon: '🕌' },
  education:        { label: 'Education',          color: zone.education, icon: '📚' },
  retreat:          { label: 'Retreat / Guest',    color: zone.retreat, icon: '🏕' },
  conservation:     { label: 'Conservation',       color: zone.conservation, icon: '🌿' },
  water_retention:  { label: 'Water Retention',    color: zone.water_retention, icon: '💧' },
  infrastructure:   { label: 'Infrastructure',     color: zone.infrastructure, icon: '⚡' },
  access:           { label: 'Access / Circulation', color: zone.access, icon: '🛤' },
  buffer:           { label: 'Buffer / Setback',   color: zone.buffer, icon: '◻' },
  future_expansion: { label: 'Future Expansion',   color: zone.future_expansion, icon: '📐' },
};

/**
 * Which zone categories make permaculture sense at each Z-level.
 * Z0 is the home centre (habitation, sacred, learning); intensity tapers
 * outward to Z5 wilderness (conservation, buffer, water retention).
 * `infrastructure` / `access` are admitted wherever they realistically
 * appear. The first entry per level is the sensible default.
 *
 * Single source of truth: the Zone draw tool's category picker AND the
 * ring-seed generator both read this — they must not diverge.
 */
export const Z_TO_CATEGORIES: Record<string, ZoneCategory[]> = {
  '0': ['habitation', 'spiritual', 'education', 'infrastructure'],
  '1': ['habitation', 'food_production', 'spiritual', 'education', 'infrastructure', 'access'],
  '2': ['food_production', 'livestock', 'education', 'retreat', 'water_retention', 'infrastructure', 'access'],
  '3': ['food_production', 'livestock', 'water_retention', 'access', 'buffer'],
  '4': ['livestock', 'commons', 'conservation', 'water_retention', 'buffer', 'future_expansion', 'access'],
  '5': ['conservation', 'commons', 'water_retention', 'buffer', 'future_expansion'],
};

/** Sensible default category for a Z-level (first admissible entry). */
export function defaultCategoryForZ(z: number): ZoneCategory {
  const list = Z_TO_CATEGORIES[String(z)];
  return list?.[0] ?? 'food_production';
}

/**
 * How a zone came to exist. Extensible: future generators (parcel-fill,
 * template, AI) add their own tag and ride the same provisional review.
 */
export type ZoneSeedProvenance = 'manual' | 'ring-seed';

export interface LandZone {
  id: string;
  projectId: string;
  name: string;
  category: ZoneCategory;
  color: string;
  primaryUse: string;
  secondaryUse: string;
  notes: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  areaM2: number;
  /**
   * Ecological condition notes — optional per-zone tags captured by
   * stewards during walk-throughs. Drive the §7 EcologicalDashboard
   * rollup card and feed future regeneration-priority logic. Left
   * undefined on existing zones; no migration required because both
   * fields are optional.
   * Spec: §7 `invasive-succession-mapping` (featureManifest).
   */
  invasivePressure?: InvasivePressure | null;
  successionStage?: SuccessionStage | null;
  /**
   * Season / phased-use tag. Optional — undefined means the steward
   * hasn't made a call yet. No persist version bump because the field
   * is optional; existing zones load with `undefined`.
   * Spec: §8 `seasonal-temporary-phased-use-zones`.
   */
  seasonality?: Seasonality | null;
  /**
   * Ground-cover state — what is physically on the ground in this zone
   * right now (barren / bare-soil / sparse-grasses / thriving-grasses /
   * sand / rocky / forest / wetland). Drives the auto-design pipeline's
   * zone-affinity matching. Optional; undefined = not yet observed.
   * Spec: wiki/decisions/2026-05-14-auto-design-pipeline.md.
   */
  groundCover?: GroundCoverState | null;
  /**
   * PLAN-stage Module 3 — Holmgren / Mollison permaculture zone level
   * (Z0–Z5). Z0 = home, Z1 = daily-touch, …, Z5 = wilderness. Optional;
   * unset zones render with their existing category color.
   * Spec: PLAN spec §4 zone-and-circulation.
   */
  permacultureZone?: 0 | 1 | 2 | 3 | 4 | 5;
  /**
   * PLAN-stage Module 9 — phaseStore phase id this zone belongs to.
   * Optional; undefined = unassigned (rendered in "All phases" view only).
   * Drives the project-type cross-check chip on Multi-Enterprise items
   * and the Phasing dashboard's per-feature phase rollup.
   */
  phase?: string;
  /**
   * PLAN-stage Multi-Enterprise — `enterpriseStore` enterprise id this
   * zone belongs to. Optional; undefined = unassigned. Drives the
   * enterprise-grouped lens recolor and the Multi-Enterprise project-type
   * cross-check chip on items #1, #2, #6.
   */
  enterprise?: string;
  /**
   * First-class "home centre" anchor flag. The Mollison ring overlay and
   * the ring-seed generator both key off this. Decoupled from
   * `permacultureZone === 0` so two unrelated Z0 zones don't silently
   * each spawn a ring set — exactly one zone per project should carry
   * this. Optional; falls back to `permacultureZone === 0` for zones
   * created before this field existed (no migration needed).
   */
  isHomeCentre?: boolean;
  /**
   * Provenance of this zone. `'ring-seed'` zones are generated drafts
   * (rendered provisionally) until the steward edits or accepts them;
   * absent / `'manual'` = hand-drawn. Unified across all future zone
   * generators so the map has one provisional vocabulary, not one per
   * generator. Optional; no persist version bump.
   */
  seedProvenance?: ZoneSeedProvenance;
  /**
   * Steward opt-in: this zone is suitable grazing land. The auto-design
   * generator places paddocks/fences ONLY in zones flagged `true` — it is
   * an explicit toggle, not derived from category or ring. Optional;
   * undefined/false = not suitable. No persist version bump (optional
   * field; existing zones load with `undefined`).
   */
  suitableForLivestock?: boolean;
  /**
   * Steward-side display flag set by the PlacedFeaturesCard visibility
   * toggle. When `true`, canvas zone layers suppress this zone; the row
   * still appears in the inventory (dimmed). Optional — undefined /
   * false = shown.
   */
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
  /** Server-assigned UUID after backend sync (undefined = not yet synced) */
  serverId?: string;
}

interface ZoneState {
  zones: LandZone[];

  addZone: (zone: LandZone) => void;
  updateZone: (id: string, updates: Partial<LandZone>) => void;
  deleteZone: (id: string) => void;
  /**
   * Bulk-remove every ring-seed draft for a project in one undo step.
   * Hand-drawn (`manual`) zones are untouched. Returns the count removed
   * so the caller can surface it.
   */
  clearSeededZones: (projectId: string) => number;
  /**
   * Returns a freshly-allocated array. **Do NOT call inside a Zustand
   * selector** — new snapshot every render → infinite loop.
   * Subscribe to `state.zones` raw and derive in `useMemo`.
   * See: wiki/decisions/2026-04-26-zustand-selector-stability.md
   */
  getProjectZones: (projectId: string) => LandZone[];
}

export const useZoneStore = create<ZoneState>()(
  persist(
    temporal(
      (set, get) => ({
        zones: [],

        addZone: (zone) => set((s) => ({ zones: [...s.zones, zone] })),

        updateZone: (id, updates) =>
          set((s) => ({
            zones: s.zones.map((z) =>
              z.id === id ? { ...z, ...updates, updatedAt: new Date().toISOString() } : z,
            ),
          })),

        deleteZone: (id) => set((s) => ({ zones: s.zones.filter((z) => z.id !== id) })),

        clearSeededZones: (projectId) => {
          const before = get().zones;
          const removed = before.filter(
            (z) => z.projectId === projectId && z.seedProvenance === 'ring-seed',
          ).length;
          if (removed > 0) {
            set({
              zones: before.filter(
                (z) =>
                  !(
                    z.projectId === projectId &&
                    z.seedProvenance === 'ring-seed'
                  ),
              ),
            });
          }
          return removed;
        },

        getProjectZones: (projectId) => get().zones.filter((z) => z.projectId === projectId),
      }),
      { limit: 200 },
    ),
    {
      name: 'ogden-zones',
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as { zones?: LandZone[] };
        if (version < 2 && Array.isArray(state.zones)) {
          // v1 → v2: add serverId field to all existing zones
          state.zones = state.zones.map((z) => ({ serverId: undefined, ...z }));
        }
        if (version < 3 && Array.isArray(state.zones)) {
          // v2 → v3: succession scale 4-value → canonical 5-value.
          // Legacy `bare` becomes `disturbed`; the rest are unchanged.
          state.zones = state.zones.map((z) =>
            (z.successionStage as unknown) === 'bare'
              ? { ...z, successionStage: 'disturbed' }
              : z,
          );
        }
        return state;
      },
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
rehydrateWithLogging(useZoneStore);

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenZoneStore = useZoneStore;
}
