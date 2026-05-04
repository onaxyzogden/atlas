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
    { name: 'ogden-polyculture', version: 1 },
  ),
);

usePolycultureStore.persist.rehydrate();
