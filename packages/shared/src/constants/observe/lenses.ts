// lenses.ts
//
// OLOS Observe — "observational lenses": a 6-way grouping layered ABOVE the
// 16 universal domains (../universalDomain.ts). Each lens collects the domains
// that a steward tends to read together when walking the land, and carries the
// display identity (label, glyph, colour) used by the lens-organized Observe
// surfaces.
//
// The 16 domains remain the source of truth for data; lenses are a navigation /
// colour layer over them. The map below is keyed by the canonical
// `UniversalDomain` enum, so the compiler enforces that every domain belongs to
// exactly one lens (same completeness pattern as universalDomain.ts).
//
// Coverage (16 domains, each in exactly one lens):
//   foundation     = topography, land-base
//   climate        = climate, energy-resources
//   water          = hydrology
//   living         = soil, ecology, plants-food, animals-livestock
//   human          = vision-intent, people-governance, economics-capacity, risk-compliance
//   infrastructure = built-infrastructure, access-circulation, monitoring-records

import type { UniversalDomain } from '../../schemas/universalDomain.schema.js';
import { UNIVERSAL_DOMAINS } from '../universalDomain.js';

/** The 6 observational lenses. */
export type ObserveLensId =
  | 'foundation'
  | 'climate'
  | 'water'
  | 'living'
  | 'human'
  | 'infrastructure';

/** Canonical ordering of the lenses for tab bars / rails. */
export const OBSERVE_LENS_IDS: readonly ObserveLensId[] = [
  'foundation',
  'climate',
  'water',
  'living',
  'human',
  'infrastructure',
] as const;

/**
 * Domain → lens assignment. Keyed by the canonical enum so the compiler
 * guarantees all 16 domains are mapped, each to exactly one lens. This is the
 * source of truth for the grouping; `OBSERVE_LENSES[*].domains` is derived from it.
 */
export const DOMAIN_TO_LENS: Record<UniversalDomain, ObserveLensId> = {
  'topography': 'foundation',
  'land-base': 'foundation',
  'climate': 'climate',
  'energy-resources': 'climate',
  'hydrology': 'water',
  'soil': 'living',
  'ecology': 'living',
  'plants-food': 'living',
  'animals-livestock': 'living',
  'vision-intent': 'human',
  'people-governance': 'human',
  'economics-capacity': 'human',
  'risk-compliance': 'human',
  'built-infrastructure': 'infrastructure',
  'access-circulation': 'infrastructure',
  'monitoring-records': 'infrastructure',
};

/** Display identity + domain membership for one lens. */
export interface ObserveLens {
  id: ObserveLensId;
  /** User-facing label (tab bars, rails, headers). */
  label: string;
  /** Single-glyph icon. */
  icon: string;
  /** Primary accent colour (hex). */
  color: string;
  /** Dim/background tint of the accent (hex). */
  colorDim: string;
  /** Colour used for this lens's marks on the map (hex). */
  mapColor: string;
  /** Domains belonging to this lens, in canonical UNIVERSAL_DOMAINS order. */
  domains: readonly UniversalDomain[];
}

/** Per-lens display identity (domains attached below from DOMAIN_TO_LENS). */
const LENS_META: Record<ObserveLensId, Omit<ObserveLens, 'domains'>> = {
  foundation:     { id: 'foundation',     label: 'Foundation',     icon: '◈', color: '#9E7A4A', colorDim: '#261A0A', mapColor: '#9E7A4A' },
  climate:        { id: 'climate',        label: 'Climate',        icon: '◎', color: '#D4944A', colorDim: '#2E1F0A', mapColor: '#D4944A' },
  water:          { id: 'water',          label: 'Water',          icon: '◉', color: '#4A82A4', colorDim: '#0E2030', mapColor: '#4A82A4' },
  living:         { id: 'living',         label: 'Living Systems', icon: '✦', color: '#7A9E6E', colorDim: '#1A2618', mapColor: '#7A9E6E' },
  human:          { id: 'human',          label: 'Human Systems',  icon: '◇', color: '#8A6AB4', colorDim: '#1E1630', mapColor: '#8A6AB4' },
  infrastructure: { id: 'infrastructure', label: 'Infrastructure', icon: '◫', color: '#3A9B8A', colorDim: '#0E2420', mapColor: '#3A9B8A' },
};

/** Domains grouped by lens, each list in canonical UNIVERSAL_DOMAINS order. */
const domainsByLens = (lensId: ObserveLensId): readonly UniversalDomain[] =>
  UNIVERSAL_DOMAINS.filter((d) => DOMAIN_TO_LENS[d] === lensId);

/**
 * The 6 observational lenses, in canonical order, each with its display
 * identity and the domains it groups. The lens layer for the Observe surfaces.
 */
export const OBSERVE_LENSES: readonly ObserveLens[] = OBSERVE_LENS_IDS.map(
  (id) => ({ ...LENS_META[id], domains: domainsByLens(id) }),
);

/** Look up the lens a given domain belongs to. */
export function getLensForDomain(domainId: UniversalDomain): ObserveLensId {
  return DOMAIN_TO_LENS[domainId];
}

/** Look up a lens record by id. */
export function getObserveLens(lensId: ObserveLensId): ObserveLens {
  // OBSERVE_LENSES is keyed 1:1 with OBSERVE_LENS_IDS, so this is always defined.
  return OBSERVE_LENSES.find((l) => l.id === lensId) as ObserveLens;
}
