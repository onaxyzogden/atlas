/**
 * Canonical split of `UtilityType` between the typed UtilityPointTool and the
 * Built-Environment V2 tools (C4, 2026-05-22).
 *
 * Four utility types are exact duplicates of BE V2 `utility` kinds
 * (solar-array / water-tank / well / septic). BE V2 is their canonical owner
 * (2026-05-10 BE-unification ADR), so they are excluded here; the
 * UtilityPointTool offers only the remaining 11 types that have no BE
 * equivalent. Pure module (no React / map deps) so the split can be unit-
 * tested in isolation. See
 * wiki/decisions/2026-05-22-atlas-canonical-feature-ownership-c4.md.
 */

import {
  UTILITY_TYPE_CONFIG,
  type UtilityType,
} from '../../../../store/utilityStore.js';

/** The 4 utility types owned canonically by Built-Environment V2 (`be.*`). */
export const BE_OWNED_UTILITY_TYPES = [
  'solar_panel',
  'water_tank',
  'well_pump',
  'septic',
] as const satisfies readonly UtilityType[];

const BE_OWNED = new Set<UtilityType>(BE_OWNED_UTILITY_TYPES);

/** The 11 utility types with no BE equivalent — offered by UtilityPointTool. */
export const UTILITY_POINT_TYPES: UtilityType[] = (
  Object.keys(UTILITY_TYPE_CONFIG) as UtilityType[]
).filter((t) => !BE_OWNED.has(t));

/** Ready-to-render select options for the inline popover. */
export const UTILITY_POINT_TYPE_OPTIONS: { value: string; label: string }[] =
  UTILITY_POINT_TYPES.map((t) => ({
    value: t,
    label: UTILITY_TYPE_CONFIG[t].label,
  }));
