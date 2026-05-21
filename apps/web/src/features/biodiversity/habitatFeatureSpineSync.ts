/**
 * Habitat-feature → WorkItem spine write seam (Slice 5 of the
 * 2026-05-21 habitat-feature unification).
 *
 * Mirrors `coverCropSpineSync.pushCoverCropPlanToSpine` shape: a pure
 * `seedHabitatFeatureWorkItems` builder + a side-effecting
 * `pushHabitatFeaturesToSpine(projectId)` reader that calls
 * `replaceHabitatFeatureRows` on the WorkItem spine.
 *
 * Scope: emits one WorkItem per habitat-category DesignElement (the 7
 * first-class kinds added in Slice 1 — owl-box, raptor-perch, nest-box,
 * brush-pile, snag, insectary-strip, wetland-edge). Hedgerow / pond /
 * shrub remain in their existing design categories; B5 already counts
 * them and D0 covers them via whatever seeder owns those kinds — they
 * are NOT emitted by this seeder.
 *
 * Per-element WorkItem:
 *   id:          `hf__<designElement.id>` (stable, idempotent)
 *   source:      'habitat-feature'
 *   overridden:  false
 *   title:       Per-kind verb-led label ("Install owl box", …)
 *   designLayer: mapped from `DesignElement.phase`
 *                  (trees|soil → 'vegetation', water → 'water')
 *   phaseId:     null (no declared-phase auto-link — PhaseKey and
 *                BuildPhase are separate systems; steward can override)
 *
 * Covenant: strictly D0 work-tracking — no riba / gharar / CSRA /
 * salam / investor / financing / cost-of-capital semantics. D2
 * (resourcing) and D3 (costing) seeders are deferred — habitat
 * features ship with empty `materialsAuto` / no `costRangeAuto`.
 *
 * See `~/.claude/plans/habitat-features-need-a-lively-oasis.md` and the
 * forthcoming ADR `wiki/decisions/2026-05-21-atlas-habitat-features-unification.md`.
 */

import type { WorkItem } from '@ogden/shared';
import type { DesignElement } from '../../store/designElementsStore.js';
import { getDesignElementsForProject } from '../../store/builtEnvironmentSelectors.js';
import { useWorkItemStore } from '../../store/workItemStore.js';

/** Seven habitat-category kinds the seeder owns. */
export const HABITAT_FEATURE_KINDS = [
  'owl-box',
  'raptor-perch',
  'nest-box',
  'brush-pile',
  'snag',
  'insectary-strip',
  'wetland-edge',
] as const;

export type HabitatFeatureKind = (typeof HABITAT_FEATURE_KINDS)[number];

/** Verb-led title shown on the work-item card. */
const HABITAT_FEATURE_TITLES: Record<HabitatFeatureKind, string> = {
  'owl-box': 'Install owl box',
  'raptor-perch': 'Place raptor perch',
  'nest-box': 'Install nest box',
  'brush-pile': 'Build brush pile',
  snag: 'Designate snag',
  'insectary-strip': 'Establish insectary strip',
  'wetland-edge': 'Establish wetland edge',
};

/** Stable composite id: `hf__<designElement.id>`. */
export function habitatFeatureProvenanceId(designElementId: string): string {
  return `hf__${designElementId}`;
}

function isHabitatFeatureKind(kind: string): kind is HabitatFeatureKind {
  return (HABITAT_FEATURE_KINDS as readonly string[]).includes(kind);
}

/** Map the Yeomans `PhaseKey` carried on the DesignElement to the
 *  WorkItem `designLayer` taxonomy. The two enums overlap but aren't
 *  identical — PhaseKey has 8 levels (climate/landshape/water/access/
 *  trees/buildings/subdivision/soil) while `designLayer` has 4 buckets
 *  (earthworks/water/vegetation/structures). */
function phaseToDesignLayer(
  phase: DesignElement['phase'],
): WorkItem['designLayer'] | undefined {
  switch (phase) {
    case 'landshape':
      return 'earthworks';
    case 'water':
      return 'water';
    case 'trees':
    case 'soil':
      return 'vegetation';
    case 'buildings':
      return 'structures';
    default:
      return undefined;
  }
}

/**
 * Pure: build the WorkItem set a habitat-feature generation would emit
 * for a project. One WorkItem per habitat-category DesignElement.
 * Non-habitat kinds (hedgerow / pond / shrub / paddock / structure / …)
 * are silently filtered.
 */
export function seedHabitatFeatureWorkItems(args: {
  projectId: string;
  designElements: DesignElement[];
  now?: () => string;
}): WorkItem[] {
  const { projectId, designElements } = args;
  const nowFn = args.now ?? (() => new Date().toISOString());
  const created = nowFn();
  const out: WorkItem[] = [];
  for (const el of designElements) {
    if (!isHabitatFeatureKind(el.kind)) continue;
    const designLayer = phaseToDesignLayer(el.phase);
    const item: WorkItem = {
      id: habitatFeatureProvenanceId(el.id),
      projectId,
      source: 'habitat-feature',
      overridden: false,
      generatedFromHabitatElement: el.id,
      createdAt: created,
      updatedAt: created,
      title: HABITAT_FEATURE_TITLES[el.kind],
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
    if (designLayer) item.designLayer = designLayer;
    out.push(item);
  }
  return out;
}

/**
 * Push a fresh habitat-feature generation onto the spine. Preserves
 * steward-overridden + every non-habitat-feature row (cross-source
 * preservation gate). Mirrors `pushCoverCropPlanToSpine` shape.
 *
 * Reads through `getDesignElementsForProject` (the post-2026-05-12
 * V2-direct selector), so structure-class entities are projected from
 * `builtEnvironmentStoreV2` and land-design kinds come from
 * `landDesignStore`. Drafts are excluded by default (the steward must
 * commit a habitat element before it seeds work).
 */
export function pushHabitatFeaturesToSpine(projectId: string): void {
  const designElements = getDesignElementsForProject(projectId);
  const items = seedHabitatFeatureWorkItems({ projectId, designElements });
  useWorkItemStore.getState().replaceHabitatFeatureRows(projectId, items);
}
