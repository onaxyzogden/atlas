// planToolCatalog.ts
//
// App-layer catalog for the Plan tier-shell categorized tools rail. It is a
// thin EXTENSION of the Act catalog (apps/web/src/v3/act/tier-shell/
// actToolCatalog.ts) rather than a fork: the per-objective tools are resolved
// straight out of ACT_TOOL_CATALOG (the objective→tool-id map in
// packages/shared/relationships/objectiveActTools.ts is keyed by REAL Plan
// objective ids and is stage-agnostic, so the same ids apply to Plan), and the
// Plan-only surface adds ONE extra category — `modules` — whose tools each open
// the matching PlanModuleSlideUp panel.
//
// Arm kinds (PlanToolArm = ActToolArm ∪ the Plan-only `module` arm):
//   - 'map'    → arms an editable Plan draw tool via useMapToolStore.setActiveTool
//                (picked up by the draw hosts mounted inside VisionLayoutCanvas).
//   - 'form'   → opens the VisionFormsTabsModal text/decision capture (reused
//                verbatim from Act; writes to actEvidenceStore + marks the
//                checklist item complete).
//   - 'flow' / 'zone-action' → inherited from the Act catalog (handled by the
//                shell's dispatcher exactly as Act does).
//   - 'module' → Plan-only: opens PlanModuleSlideUp for a given Plan module,
//                deep-linked to the module's first card section.
//
// Because ActTool.category ⊂ PlanToolCategoryId and ActTool.arm ⊂ PlanToolArm,
// an ActTool is structurally assignable to a PlanTool, so resolvePlanTools can
// return Act-resolved tools directly without copying the 1.8k-line catalog.

import {
  Compass,
  Sun,
  Droplets,
  Sprout,
  Leaf,
  Trees,
  Beef,
  Building2,
  Route,
  Wallet,
  ShieldCheck,
  Map as MapIcon,
  Mountain,
  Zap,
  Users,
  ClipboardList,
  Square,
  type LucideIcon,
} from 'lucide-react';
import {
  ACT_TOOL_CATALOG,
  ACT_TOOL_CATEGORIES,
  resolveActTools,
  type ActTool,
  type ActToolArm,
  type ActToolCategoryId,
} from '../../act/tier-shell/actToolCatalog.js';
import { PLAN_MODULES, PLAN_MODULE_FULL_LABEL, MODULE_CARDS } from '../types.js';
import type { PlanModule } from '../types.js';

// Re-export the shared form vocabulary so the Plan rail + modal import from one
// place (they are identical to Act's — no Plan-specific form fields yet).
export type { FormValue, FormFieldSpec } from '../../act/tier-shell/actToolCatalog.js';

/** Plan-only arm: open PlanModuleSlideUp for `module`, focused on `sectionId`. */
export interface PlanModuleArm {
  kind: 'module';
  module: PlanModule;
  /** First card section of the module; opens the slide-up on that section. */
  sectionId?: string;
}

export type PlanToolArm = ActToolArm | PlanModuleArm;

export type PlanToolCategoryId = ActToolCategoryId | 'modules' | 'site';

export interface PlanToolCategoryMeta {
  id: PlanToolCategoryId;
  label: string;
}

export interface PlanTool {
  id: string;
  label: string;
  icon: LucideIcon;
  category: PlanToolCategoryId;
  arm: PlanToolArm;
}

/**
 * Display order + labels for the Plan rail. The Act categories come first (so
 * the per-objective design/capture tools group exactly as they do in Act), then
 * the Plan-only `Modules` category — the always-present entry point into the
 * legacy module panels — and finally the `Site` category (parcel-level edits,
 * not objective-scoped). `Site` sorts LAST so the per-objective design/capture
 * tools keep first billing.
 */
export const PLAN_TOOL_CATEGORIES: readonly PlanToolCategoryMeta[] = [
  ...ACT_TOOL_CATEGORIES,
  { id: 'modules', label: 'Modules' },
  { id: 'site', label: 'Site' },
] as const;

/** One lucide glyph per Plan module (every UniversalDomain id). */
const MODULE_ICONS: Record<PlanModule, LucideIcon> = {
  'vision-intent': Compass,
  'land-base': MapIcon,
  'climate': Sun,
  'topography': Mountain,
  'hydrology': Droplets,
  'soil': Sprout,
  'ecology': Leaf,
  'plants-food': Trees,
  'animals-livestock': Beef,
  'built-infrastructure': Building2,
  'access-circulation': Route,
  'energy-resources': Zap,
  'people-governance': Users,
  'economics-capacity': Wallet,
  'risk-compliance': ShieldCheck,
  'monitoring-records': ClipboardList,
};

/**
 * The Modules-category tools. One tile per Plan module that actually carries
 * authored card content (`MODULE_CARDS[m].length > 0`) — opening a slide-up
 * with no cards would be a dead button, so empty domains (land-base,
 * topography, energy-resources, people-governance, monitoring-records) are
 * omitted. Each arm deep-links to the module's first card section. Unlike the
 * per-objective tools, this set is OBJECTIVE-INDEPENDENT: the Plan rail always
 * appends it, so the module panels stay reachable from every objective (parity
 * with the always-present legacy PlanModuleBar).
 */
export const PLAN_MODULE_TOOLS: readonly PlanTool[] = PLAN_MODULES.filter(
  (m) => MODULE_CARDS[m].length > 0,
).map((m) => ({
  id: `plan-module-${m}`,
  label: PLAN_MODULE_FULL_LABEL[m],
  icon: MODULE_ICONS[m],
  category: 'modules' as const,
  arm: { kind: 'module', module: m, sectionId: MODULE_CARDS[m][0]?.sectionId },
}));

/**
 * The Site-category tools — parcel-level edits that belong to the project, not
 * to any one objective. Today this is the single "Edit Property Boundary" tile:
 * its `{ kind: 'map', mapToolId: 'boundary' }` arm rides the existing
 * handleActivateTool 'map' branch → setActiveTool('boundary'), which mounts the
 * (already-present) MapToolbar/BoundaryTool reshape+redraw editor. Appended by
 * the rail UNCONDITIONALLY while planning and dropped once the plan is sealed
 * (the rail filters it on `planReadOnly`), mirroring how the dock's own boundary
 * affordances gate on the project-global seal.
 */
export const PLAN_PROPERTY_TOOLS: readonly PlanTool[] = [
  {
    id: 'plan-property-boundary',
    label: 'Edit Property Boundary',
    icon: Square,
    category: 'site' as const,
    arm: { kind: 'map', mapToolId: 'boundary' },
  },
];

/**
 * Resolve catalogue ids to PlanTool objects, dropping any unknown id. The ids
 * come from getObjectiveActTools(objective) and resolve against the shared Act
 * catalog; ActTool widens cleanly to PlanTool (category + arm are subtypes).
 */
export function resolvePlanTools(ids: readonly string[]): PlanTool[] {
  // resolveActTools returns ActTool[]; ActTool is assignable to PlanTool.
  // Drop 'log'-arm tools (harvest / water / livestock): those are field-log
  // captures armed against act.* log ids whose host (ActDrawHost) is NOT mounted
  // in the Plan center canvas (VisionLayoutCanvas), so they would render as dead
  // tiles on the Plan rail. Field logging is an Act-execution concern, not a
  // planning one — it stays on the Act rail. No objective is emptied by this:
  // every affected objective keeps its map/form tools and PLAN_MODULE_TOOLS is
  // always appended.
  return (resolveActTools(ids) as PlanTool[]).filter((t) => t.arm.kind !== 'log');
}

/** Direct catalog access for callers that already hold an id (parity helper). */
export const PLAN_TOOL_CATALOG: Record<string, ActTool> = ACT_TOOL_CATALOG;
