import type { GuildLayer } from '../../../../store/site-annotations.js';
import type { EcologicalFunction } from '../../../../data/plantCatalog.js';

export const LAYER_ORDER: GuildLayer[] = [
  'canopy',
  'sub_canopy',
  'shrub',
  'herbaceous',
  'ground_cover',
  'vine',
  'root',
];

export const LAYER_LABEL: Record<GuildLayer, string> = {
  canopy: 'Canopy',
  sub_canopy: 'Sub-canopy',
  shrub: 'Shrub',
  herbaceous: 'Herbaceous',
  ground_cover: 'Ground cover',
  vine: 'Vine',
  root: 'Root',
};

/**
 * Pale layer-tint palette — used to colour ring fills + member dots so
 * each canopy stratum reads at a glance.
 */
export const LAYER_TINT: Record<GuildLayer, string> = {
  canopy: '#3d8a3d',
  sub_canopy: '#6aa84f',
  shrub: '#94c47d',
  herbaceous: '#c8d77a',
  ground_cover: '#e1d97a',
  vine: '#c89b6b',
  root: '#8b6f4a',
};

/**
 * Returns the layers that should be rendered as rings around an anchor
 * sitting at `anchorLayer`. Layers at or above the anchor are skipped
 * (no canopy ring around a canopy anchor; no sub_canopy ring around a
 * sub_canopy anchor). Vine + root always appear as rings since they
 * occupy distinct vertical niches relative to any tree anchor.
 */
export function ringsBelowAnchor(anchorLayer: GuildLayer | null): GuildLayer[] {
  if (!anchorLayer) return [];
  const idx = LAYER_ORDER.indexOf(anchorLayer);
  return LAYER_ORDER.slice(idx + 1);
}

/** Short tag-chip label for an ecological function. */
export const FUNCTION_SHORT: Record<EcologicalFunction, string> = {
  n_fixer: 'N-fix',
  dynamic_accumulator: 'Acc',
  insectary: 'Ins',
  pollinator: 'Poll',
  wildlife_food: 'Wild',
  edible_yield: 'Edible',
  timber: 'Timber',
  fodder: 'Fodder',
  medicinal: 'Med',
};

/**
 * Picks the most informative single-tag for a member's chip. Order of
 * preference matches the typical permaculture-design rationale for why a
 * companion exists in the guild (function-first, food-second).
 */
const FUNCTION_PRIORITY: EcologicalFunction[] = [
  'n_fixer',
  'dynamic_accumulator',
  'insectary',
  'pollinator',
  'medicinal',
  'wildlife_food',
  'edible_yield',
  'timber',
  'fodder',
];

export function primaryFunction(
  fns: readonly EcologicalFunction[],
): EcologicalFunction | null {
  for (const f of FUNCTION_PRIORITY) if (fns.includes(f)) return f;
  return fns[0] ?? null;
}
