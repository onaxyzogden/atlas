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
  Truck,
  Warehouse,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { BUILT_ENVIRONMENT_KINDS } from '@ogden/shared';

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
).map((spec) => ({
  kind: spec.kind,
  label: spec.label,
  Icon: BE_ICON_MAP[spec.icon] ?? Home,
}));
