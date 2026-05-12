/**
 * Polyculture store — Scholar-aligned namespace consolidation
 * (plan few-concerns-shiny-quokka.md, ADR
 * 2026-04-30-site-annotations-store-scholar-aligned-namespaces.md).
 *
 * Holds guilds (assemblies) + species picks (palette). Guilds compose from
 * species; severing the palette from the assembly breaks the layered food
 * forest (Holmgren P8 + PDC Week 7 polyculture material).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

// ── Guilds ──────────────────────────────────────────────────────────────────

export type GuildLayer =
  | 'canopy'
  | 'sub_canopy'
  | 'shrub'
  | 'herbaceous'
  | 'ground_cover'
  | 'vine'
  | 'root';

export interface GuildMember {
  /** plantDatabase.ts id. */
  speciesId: string;
  layer: GuildLayer;
}

export interface Guild {
  id: string;
  projectId: string;
  name: string;
  /** speciesId of the anchor (typically a canopy / sub-canopy species). */
  anchorSpeciesId: string;
  members: GuildMember[];
  notes?: string;
  /**
   * Normalised site coordinates [u, v] in 0..1 space — used by the
   * GuildSpatialBuilderCard 2D ring canvas (parcel-relative, independent of
   * map bounds). Older guilds may instead encode this in `notes` as
   * `centroidUv:U,V` — readers should fall back to the notes regex until
   * those rows are migrated.
   */
  centroidUv?: [number, number];
  /**
   * Absolute geographic anchor [lng, lat] used by PlanDataLayers and on-map
   * drag. Set on placement via GuildTool. Older v1 guilds without `center`
   * won't render on the Plan map until re-placed (migration leaves it
   * undefined; see persist `version: 2`).
   */
  center?: [number, number];
  /**
   * PLAN-stage Module 9 — phaseStore phase id this guild belongs to.
   * Optional; undefined = unassigned. Lets the Phasing dashboard sequence
   * guild establishment by build phase.
   */
  phase?: string;
  /**
   * PLAN-stage Multi-Enterprise — `enterpriseStore` enterprise id this
   * guild belongs to. Optional; undefined = unassigned.
   */
  enterprise?: string;
  /**
   * PLAN-stage Module 7 (Phasing & Budgeting) — steward's estimate of
   * one-time establishment cost (USD) for this guild: nursery stock,
   * mulch, irrigation tie-ins, initial labour cash-cost, etc. Optional;
   * undefined = not yet estimated. Aggregated alongside PhaseTask costs
   * in `LaborBudgetSummaryCard` and rolled into the Yeomans Vegetation
   * tier. No data-derived default — Atlas does not assert species-level
   * costs because horticultural prices vary too widely by region.
   */
  establishmentCostUSD?: number;
  /**
   * PLAN-stage Module 7 — steward's estimate of one-time labour hours
   * for guild establishment (site prep, planting, mulching, staking,
   * initial watering). Optional; undefined = not yet estimated. Same
   * aggregation path as `establishmentCostUSD`.
   */
  establishmentLaborHrs?: number;
  createdAt: string;
}

// ── Species picks ───────────────────────────────────────────────────────────

export interface SpeciesPick {
  id: string;
  projectId: string;
  /** plantDatabase.ts id. */
  speciesId: string;
  /** Free-form steward note — e.g. "for north hedgerow". */
  intendedUse?: string;
  createdAt: string;
}

interface PolycultureState {
  guilds: Guild[];
  species: SpeciesPick[];

  addGuild: (g: Guild) => void;
  updateGuild: (id: string, patch: Partial<Guild>) => void;
  removeGuild: (id: string) => void;

  addSpeciesPick: (s: SpeciesPick) => void;
  removeSpeciesPick: (id: string) => void;
}

export const usePolycultureStore = create<PolycultureState>()(
  persist(
    temporal(
      (set) => ({
        guilds: [],
        species: [],

        addGuild: (g) => set((s) => ({ guilds: [...s.guilds, g] })),
        updateGuild: (id, patch) =>
          set((s) => ({ guilds: s.guilds.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
        removeGuild: (id) => set((s) => ({ guilds: s.guilds.filter((g) => g.id !== id) })),

        addSpeciesPick: (sp) => set((s) => ({ species: [...s.species, sp] })),
        removeSpeciesPick: (id) => set((s) => ({ species: s.species.filter((sp) => sp.id !== id) })),
      }),
      { limit: 200 },
    ),
    {
      name: 'ogden-polyculture',
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) {
          const s = (persisted as Partial<PolycultureState>) ?? {};
          return { guilds: s.guilds ?? [], species: s.species ?? [] };
        }
        return persisted as PolycultureState;
      },
    },
  ),
);

usePolycultureStore.persist.rehydrate();
