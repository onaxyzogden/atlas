/**
 * builtEnvironmentTools — single source of truth for the Built Environment
 * left-rail tool list shared by Observe (`ObserveTools`) and Plan
 * (`PlanTools`). Both rails surface the same kinds in the same order with
 * the same labels + icons; only the `toolId` prefix differs per stage.
 *
 * The list is derived from the canonical `BUILT_ENVIRONMENT_KINDS` registry
 * in `@ogden/shared`. Adding a kind to the registry surfaces it in both
 * rails automatically.
 */

import {
  AlertTriangle,
  BookOpen,
  Box,
  Cable,
  DoorOpen,
  Droplet,
  Droplets,
  Eye,
  Fence,
  Flame,
  Fuel,
  Home,
  Leaf,
  Minus,
  Mountain,
  Recycle,
  Route,
  Sparkles,
  Sprout,
  Square,
  Sun,
  Tent,
  TreeDeciduous,
  TreePine,
  Trees,
  Truck,
  Warehouse,
  Wheat,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  BUILT_ENVIRONMENT_KINDS,
  type BuiltEnvironmentCategory,
} from '@ogden/shared';

/** Resolves a registry `icon` string to its Lucide component.
 *  Unknown names fall back to a neutral square. */
export const BE_ICON_MAP: Readonly<Record<string, LucideIcon>> = {
  Home,
  Tent,
  Sparkles,
  BookOpen,
  Droplets,
  Mountain,
  Wrench,
  Eye,
  Warehouse,
  Sprout,
  Box,
  Leaf,
  Droplet,
  Sun,
  Zap,
  Cable,
  Minus,
  DoorOpen,
  Route,
  Truck,
  Fuel,
  Flame,
  Square,
  Recycle,
  TreeDeciduous,
  TreePine,
  Trees,
  Wheat,
  Fence,
  AlertTriangle,
};

export interface BeToolItem {
  kind: string;
  label: string;
  Icon: LucideIcon;
}

/** Ordered Built Environment tool items. Registry order is preserved.
 *  Both Observe (`existing` state) and Plan (`proposed` state) want the
 *  full set of authoring affordances, so no state-based filter is applied:
 *  every kind in the registry surfaces in both rails. */
export const BE_TOOL_ITEMS: ReadonlyArray<BeToolItem> = Object.values(
  BUILT_ENVIRONMENT_KINDS,
)
  // `custom-glb` is armed via the floating CustomModelPalette (which stashes
  // the active model id) — never via a bare rail button, since placement
  // requires a selected uploaded model.
  .filter((spec) => spec.kind !== 'custom-glb')
  .map((spec) => ({
    kind: spec.kind,
    label: spec.label,
    Icon: BE_ICON_MAP[spec.icon] ?? Home,
  }));

/** Display labels for each `BuiltEnvironmentCategory`. Used by rail sub-
 *  groupings in `ObserveTools` and `PlanTools` to keep 31 kinds scannable. */
export const BE_CATEGORY_LABEL: Readonly<
  Record<BuiltEnvironmentCategory, string>
> = {
  building: 'Buildings',
  agricultural: 'Agricultural',
  utility: 'Utilities',
  infrastructure: 'Infrastructure',
  machinery: 'Machinery',
  amenity: 'Amenities',
  vegetation: 'Vegetation',
  earthworks: 'Earthworks',
  'zone-marker': 'Zone markers',
};

/** Category sub-grouping derived from the registry. Categories appear in
 *  the order they first surface in `BUILT_ENVIRONMENT_KINDS`, and items
 *  within each category preserve registry order — same precedent as the
 *  flat `BE_TOOL_ITEMS`. Consumed by both Observe and Plan rails so adding
 *  a kind to the registry auto-lands in its category sub-card. */
export interface BeToolGroup {
  category: BuiltEnvironmentCategory;
  label: string;
  items: BeToolItem[];
}

export const BE_TOOL_GROUPS: ReadonlyArray<BeToolGroup> = (() => {
  const byCategory = new Map<BuiltEnvironmentCategory, BeToolItem[]>();
  for (const spec of Object.values(BUILT_ENVIRONMENT_KINDS)) {
    if (spec.kind === 'custom-glb') continue;
    const item: BeToolItem = {
      kind: spec.kind,
      label: spec.label,
      Icon: BE_ICON_MAP[spec.icon] ?? Home,
    };
    const bucket = byCategory.get(spec.category);
    if (bucket) {
      bucket.push(item);
    } else {
      byCategory.set(spec.category, [item]);
    }
  }
  return Array.from(byCategory.entries()).map(([category, items]) => ({
    category,
    label: BE_CATEGORY_LABEL[category],
    items,
  }));
})();
