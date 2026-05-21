/**
 * Tree-planting → WorkItem spine write seam (Slice 8-A of the
 * 2026-05-21 habitat-feature unification — D1 predecessor auto-edges).
 *
 * Mirrors `habitatFeatureSpineSync` 1:1 (swap source). One WorkItem
 * per vegetation-category point DesignElement of the four kinds
 * (`oak-tree`, `pine-tree`, `apple-tree`, `shrub`). Line / polygon
 * vegetation (hedgerow, orchard, silvopasture) is out of scope for
 * S8-A — those scale by length / area and are deferred to a future
 * S8-C; they ride the existing engine without auto-spine rows.
 *
 * Per-element WorkItem:
 *   id:          `tree__<designElement.id>` (stable, idempotent)
 *   source:      'tree-planting'
 *   overridden:  false
 *   title:       "Plant oak tree" / "Plant pine tree" / …
 *   designLayer: 'vegetation'
 *   phaseId:     null (steward override drives declared-phase linkage;
 *                PhaseKey and BuildPhase are separate systems)
 *
 * D2 (resourcing) + D3 (costing) for tree-planting WorkItems are
 * deferred — rows ship with empty `materialsAuto` + no `costRangeAuto`
 * / `laborHrs`. A future slice can author a tree-planting catalog
 * mirroring `habitatFeatureCatalog.ts`; this seeder closes the
 * work-item gap only so habitat-feature D1 dependency edges have a
 * concrete target id.
 *
 * Covenant: strictly D0 work-tracking. No riba / gharar / CSRA /
 * salam / investor / financing / cost-of-capital semantics.
 */

import type { WorkItem } from '@ogden/shared';
import type { DesignElement } from '../../store/designElementsStore.js';
import { getDesignElementsForProject } from '../../store/builtEnvironmentSelectors.js';
import { useWorkItemStore } from '../../store/workItemStore.js';

/** Four vegetation-category point kinds the seeder owns. */
export const TREE_PLANTING_KINDS = [
  'oak-tree',
  'pine-tree',
  'apple-tree',
  'shrub',
] as const;

export type TreePlantingKind = (typeof TREE_PLANTING_KINDS)[number];

/** Verb-led title shown on the work-item card. */
const TREE_PLANTING_TITLES: Record<TreePlantingKind, string> = {
  'oak-tree': 'Plant oak tree',
  'pine-tree': 'Plant pine tree',
  'apple-tree': 'Plant apple tree',
  shrub: 'Plant shrub',
};

/** Stable composite id: `tree__<designElement.id>`. */
export function treePlantingProvenanceId(designElementId: string): string {
  return `tree__${designElementId}`;
}

function isTreePlantingKind(kind: string): kind is TreePlantingKind {
  return (TREE_PLANTING_KINDS as readonly string[]).includes(kind);
}

/**
 * Pure: build the WorkItem set a tree-planting generation would emit
 * for a project. One WorkItem per vegetation-category point
 * DesignElement of the four `TREE_PLANTING_KINDS`. Hedgerow / orchard /
 * silvopasture and non-vegetation kinds are silently filtered.
 */
export function seedTreePlantingWorkItems(args: {
  projectId: string;
  designElements: DesignElement[];
  now?: () => string;
}): WorkItem[] {
  const { projectId, designElements } = args;
  const nowFn = args.now ?? (() => new Date().toISOString());
  const created = nowFn();
  const out: WorkItem[] = [];
  for (const el of designElements) {
    if (el.category !== 'vegetation') continue;
    if (!isTreePlantingKind(el.kind)) continue;
    // Point-only for S8-A; defensive guard against future hedgerow
    // misclassification.
    if (el.geometry.type !== 'Point') continue;
    const item: WorkItem = {
      id: treePlantingProvenanceId(el.id),
      projectId,
      source: 'tree-planting',
      overridden: false,
      generatedFromTreeElement: el.id,
      createdAt: created,
      updatedAt: created,
      title: TREE_PLANTING_TITLES[el.kind],
      designLayer: 'vegetation',
      phaseId: null,
      status: 'todo',
      doneAt: null,
      dependsOn: [],
      dependsOnAuto: [],
      precedesAuto: [],
      materialsAuto: [],
      equipmentRequiredAuto: [],
      linkedFeatureId: el.id,
      notes: '',
    };
    out.push(item);
  }
  return out;
}

/**
 * Push a fresh tree-planting generation onto the spine. Preserves
 * steward-overridden + every non-tree-planting row (cross-source
 * preservation gate). Mirrors `pushHabitatFeaturesToSpine` shape.
 */
export function pushTreePlantingsToSpine(projectId: string): void {
  const designElements = getDesignElementsForProject(projectId);
  const items = seedTreePlantingWorkItems({ projectId, designElements });
  useWorkItemStore.getState().replaceTreePlantingRows(projectId, items);
}
