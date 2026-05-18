/**
 * soilBiologyProfiles — Sub-project B2, soil food-web layer (static data).
 *
 * A B2-owned lookup of per-species root-zone biology: mycorrhizal
 * association type and dominant root-exudate class. The plant catalog
 * has no mycorrhizal/exudate fields and is deliberately NOT extended —
 * B2 owns this table the way B1's checker owns the companion bridge.
 *
 * Coverage is best-effort, not exhaustive. soilFoodWebMath emits an
 * explicit `unmatched` info finding for any guild member absent here,
 * so a missing species is reported, never silently passed.
 *
 * Keys are plantCatalog speciesIds. resolveProfile (in soilFoodWebMath)
 * adds a normalized-commonName fallback probe.
 */

export type MycorrhizaType = 'arbuscular' | 'ecto' | 'ericoid' | 'none';
export type ExudateClass = 'sugar' | 'organic_acid' | 'phenolic' | 'mixed';

export interface SoilBiologyProfile {
  mycorrhiza: MycorrhizaType;
  exudateClass: ExudateClass;
  note?: string;
}

/**
 * speciesId → soil-biology profile. Generalised at family level from
 * published mycorrhizal-association literature; treat as a design
 * heuristic, not a soil assay.
 */
export const SOIL_BIOLOGY_PROFILES: Record<string, SoilBiologyProfile> = {
  // Rosaceae pome/stone fruit — arbuscular
  apple: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },
  pear: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },
  plum: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },
  cherry: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },
  peach: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },

  // Juglandaceae — arbuscular, juglone-bearing phenolic exudate
  black_walnut: {
    mycorrhiza: 'arbuscular',
    exudateClass: 'phenolic',
    note: 'Juglone-dominated rhizosphere — allelopathic phenolic load.',
  },
  pecan: { mycorrhiza: 'arbuscular', exudateClass: 'phenolic' },

  // Fagaceae — ectomycorrhizal
  white_oak: { mycorrhiza: 'ecto', exudateClass: 'phenolic' },
  red_oak: { mycorrhiza: 'ecto', exudateClass: 'phenolic' },
  chestnut: { mycorrhiza: 'ecto', exudateClass: 'phenolic' },

  // Pinaceae / Betulaceae — ectomycorrhizal
  pine: { mycorrhiza: 'ecto', exudateClass: 'organic_acid' },
  birch: { mycorrhiza: 'ecto', exudateClass: 'organic_acid' },

  // Ericaceae — ericoid
  blueberry: { mycorrhiza: 'ericoid', exudateClass: 'organic_acid' },

  // Fabaceae legumes — arbuscular, sugar-rich (nodule-supported)
  clover: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },
  alfalfa: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },
  vetch: { mycorrhiza: 'arbuscular', exudateClass: 'sugar' },

  // Dynamic accumulators / herbaceous — arbuscular, organic-acid bias
  comfrey: {
    mycorrhiza: 'arbuscular',
    exudateClass: 'organic_acid',
    note: 'Deep tap-root mineral mobiliser — organic-acid rhizosphere.',
  },
  yarrow: { mycorrhiza: 'arbuscular', exudateClass: 'mixed' },

  // Brassicaceae — non-mycorrhizal
  mustard: { mycorrhiza: 'none', exudateClass: 'phenolic' },
  radish: { mycorrhiza: 'none', exudateClass: 'phenolic' },
};
