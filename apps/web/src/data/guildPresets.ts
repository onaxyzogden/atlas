/**
 * Guild presets — premade polyculture templates for the Plan-stage GuildTool.
 *
 * Each preset names an anchor species + canonical companion members across the
 * seven canopy layers. Selecting a preset in GuildTool's inline popover
 * auto-fills `name`, `anchorSpeciesId`, and `members` on the placed Guild;
 * users may still override fields before save.
 *
 * All species ids reference {@link PLANT_DATABASE} stable ids (`pl-*`). On
 * module load, presets are filtered against the live database via
 * {@link resolveValidPresets}: any member referencing a missing/renamed
 * species id is dropped silently with a `console.warn`; a preset whose
 * anchor is missing is dropped entirely. This means future plant-DB renames
 * never crash the canvas.
 *
 * v1 starter set (temperate / northern temperate, drawn from species already
 * in PLANT_DATABASE):
 *   - Apple guild (Hemenway classic)
 *   - Nitrogen-fixer pioneer
 *   - Food forest 7-layer sample
 *   - Pollinator edge
 *
 * Three Sisters (corn / beans / squash) is deferred — those species are not
 * yet in the plant database.
 */

import { PLANT_DATABASE, findSpecies, type PlantSpecies } from './plantDatabase.js';
import type { GuildMember } from '../store/polycultureStore.js';

export interface GuildPreset {
  id: string;
  name: string;
  description: string;
  /** Stable speciesId of the anchor; must resolve in PLANT_DATABASE. */
  anchorSpeciesId: string;
  /** Companion members — each member's layer must match the species' canonical layer. */
  members: GuildMember[];
  /** Optional Guild.notes seed applied when the preset is chosen. */
  notes?: string;
}

export const GUILD_PRESETS: GuildPreset[] = [
  {
    id: 'gp-apple-guild',
    name: 'Apple guild (Hemenway classic)',
    description:
      'Apple anchor with N-fixing ground cover, dynamic accumulator, insectary herbs, and shade-tolerant berries — the canonical introductory food-forest guild.',
    anchorSpeciesId: 'pl-101', // Malus domestica — Apple, sub-canopy
    members: [
      { speciesId: 'pl-202', layer: 'shrub' },        // Black currant
      { speciesId: 'pl-301', layer: 'herbaceous' },   // Comfrey (dynamic accumulator)
      { speciesId: 'pl-302', layer: 'herbaceous' },   // Garlic chive (insectary)
      { speciesId: 'pl-303', layer: 'herbaceous' },   // Yarrow (insectary, dynamic)
      { speciesId: 'pl-401', layer: 'ground_cover' }, // White clover (n-fixer)
      { speciesId: 'pl-402', layer: 'ground_cover' }, // Strawberry
      { speciesId: 'pl-602', layer: 'root' },         // Garlic
    ],
    notes: 'Intro food-forest guild from Toby Hemenway, Gaia\'s Garden.',
  },
  {
    id: 'gp-nitrogen-pioneer',
    name: 'Nitrogen-fixer pioneer',
    description:
      'Establishment-phase guild for degraded soils — N-fixing canopy, sub-canopy, shrub, and ground cover layers building fertility before fruiting species are interplanted.',
    anchorSpeciesId: 'pl-004', // Black locust — canopy, n-fixer
    members: [
      { speciesId: 'pl-107', layer: 'sub_canopy' },   // Black alder (n-fixer)
      { speciesId: 'pl-206', layer: 'shrub' },        // Siberian pea shrub (n-fixer)
      { speciesId: 'pl-301', layer: 'herbaceous' },   // Comfrey (dynamic accumulator)
      { speciesId: 'pl-401', layer: 'ground_cover' }, // White clover (n-fixer)
    ],
    notes: 'Pioneer succession — chop-and-drop N-fixers prepare soil before fruiting overstory.',
  },
  {
    id: 'gp-food-forest-7layer',
    name: 'Food forest 7-layer sample',
    description:
      'Demonstrates the complete seven-layer forest-garden ontology: canopy through root, with N-fixing layers throughout.',
    anchorSpeciesId: 'pl-101', // Apple — sub-canopy anchor
    members: [
      { speciesId: 'pl-004', layer: 'canopy' },       // Black locust (canopy, n-fixer)
      { speciesId: 'pl-207', layer: 'shrub' },        // Hazelnut
      { speciesId: 'pl-301', layer: 'herbaceous' },   // Comfrey
      { speciesId: 'pl-401', layer: 'ground_cover' }, // White clover (n-fixer)
      { speciesId: 'pl-501', layer: 'vine' },         // Concord grape
      { speciesId: 'pl-601', layer: 'root' },         // Jerusalem artichoke
    ],
    notes: 'One species per layer — covers canopy / sub-canopy / shrub / herbaceous / ground / vine / root.',
  },
  {
    id: 'gp-pollinator-edge',
    name: 'Pollinator edge',
    description:
      'Hedge / edge guild emphasizing pollinator and insectary support — flowering anchor + shrub berry + nectar-rich herbaceous layer.',
    anchorSpeciesId: 'pl-103', // Sweet cherry — sub-canopy, pollinator
    members: [
      { speciesId: 'pl-203', layer: 'shrub' },        // Elderberry (pollinator, medicinal)
      { speciesId: 'pl-303', layer: 'herbaceous' },   // Yarrow (insectary)
      { speciesId: 'pl-304', layer: 'herbaceous' },   // Purple coneflower (pollinator)
      { speciesId: 'pl-305', layer: 'herbaceous' },   // Borage (pollinator, dynamic)
      { speciesId: 'pl-403', layer: 'ground_cover' }, // Creeping thyme (pollinator)
    ],
    notes: 'Edge / hedgerow planting — flowering succession from spring (cherry) to summer (coneflower) to late summer (thyme).',
  },
];

/**
 * Filter presets against a species database — drops members whose
 * `speciesId` is missing, drops a preset entirely if its anchor is missing.
 * Logs a `console.warn` per drop so seed-data regressions surface in dev.
 *
 * Pass a custom database for tests; defaults to the live PLANT_DATABASE.
 */
export function resolveValidPresets(database: PlantSpecies[] = PLANT_DATABASE): GuildPreset[] {
  const ids = new Set(database.map((p) => p.id));
  const valid: GuildPreset[] = [];
  for (const preset of GUILD_PRESETS) {
    if (!ids.has(preset.anchorSpeciesId)) {
      console.warn(
        `[guildPresets] dropping preset "${preset.id}" — anchor speciesId "${preset.anchorSpeciesId}" not found in PLANT_DATABASE`,
      );
      continue;
    }
    const members = preset.members.filter((m) => {
      if (!ids.has(m.speciesId)) {
        console.warn(
          `[guildPresets] preset "${preset.id}" — dropping member with missing speciesId "${m.speciesId}"`,
        );
        return false;
      }
      return true;
    });
    valid.push({ ...preset, members });
  }
  return valid;
}

/** Lookup a preset by id from the validated list. */
export function findGuildPreset(id: string): GuildPreset | undefined {
  return resolveValidPresets().find((p) => p.id === id);
}

// Re-export for convenience at call sites that don't already import findSpecies.
export { findSpecies };
