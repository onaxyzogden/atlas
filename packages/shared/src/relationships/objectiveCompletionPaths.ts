// objectiveCompletionPaths.ts
//
// Item-level completion-path classifier: for every checklist item on every
// encoded catalogue objective, answer "how can a steward COMPLETE this item
// inside OLOS, and is that completion evidence-backed?".
//
// Classification taxonomy (priority order — first match wins):
//
//   auto-answer     item carries an `answerSpec`; the answer was captured
//                   upstream (wizard / vision / team) and auto-satisfies via
//                   computeEffectiveProgress. Per-item, evidence-backed.
//   auto-formula    item carries `formulaBinding.satisfiesWhenComputed`; a
//                   usable computed result auto-satisfies it. Per-item,
//                   evidence-backed.
//   form-capture    a resolved bottom-rail tool has a form arm whose `formId`
//                   equals this item's id; saving the form ticks the box
//                   (ActTierShell handleFormSave -> setItemComplete). Per-item,
//                   evidence-backed.
//   objective-map   the objective's rail resolves at least one map arm (incl.
//   objective-log   zone-action, which operates on the map) / log arm / flow
//   objective-flow  arm, but NOTHING ties to this specific item — the
//                   instrument captures at objective level and the item itself
//                   is a manual tick. In-app, but NOT per-item evidence-backed.
//   no-path         nothing resolves at all: bare manual tick only. These are
//                   the items the audit ratchet pins (the gap backlog).
//
// HONESTY NOTE: only `auto-answer` / `auto-formula` / `form-capture` are
// per-item evidence-backed. The `objective-*` classes mean "the steward works
// in-app on this objective but ticks this item by hand"; they are tracked as
// the second-tier gap set (`objectiveSpatialOnly`).
//
// SCOPE NOTE (Phase 1): the sweep covers every STANDALONE catalogue objective
// (`allCatalogueObjectives()` — universal + all primaries + all secondary
// additive). Patch-injected items (secondary PatchRecords) are intentionally
// out of scope this phase: they only exist inside a resolved per-project set,
// not as standalone objectives. Documented for the follow-up sessions.
//
// LAYERING: the tool-arm SHAPES live in the app layer (actToolCatalog.ts pulls
// lucide-react + the MapToolId union), so this module takes an injected
// `ActToolArmIndex` (catalogue-tool-id -> {kind, formId?}) — the same
// dependency-injection seam the existing cross-package conformance tests use.
// Tool RESOLUTION (which catalogue ids an objective's rail shows) is shared
// (`getObjectiveActTools`), so it is the default resolver here; tests may
// inject a synthetic resolver to stay hermetic.

import type {
  PlanDecisionChecklistItem,
  PlanStratumId,
  PlanStratumObjective,
} from '../schemas/plan/planStratumObjective.schema.js';
import { getObjectiveActTools } from './objectiveActTools.js';
import { allCatalogueObjectives } from '../constants/plan/catalogues/index.js';

/** The arm kinds an Act catalogue tool can carry (mirrors app-layer ActToolArm). */
export type ActToolArmKind = 'map' | 'log' | 'form' | 'flow' | 'zone-action';

/** App-layer-provided shape of one catalogue tool's arm (icon/label omitted). */
export interface ActToolArmDescriptor {
  kind: ActToolArmKind;
  /** Present when kind === 'form': the checklist-item id the form saves into. */
  formId?: string;
}

/** Catalogue tool id -> arm descriptor, built by the caller from ACT_TOOL_CATALOG. */
export type ActToolArmIndex = Readonly<Record<string, ActToolArmDescriptor>>;

export type ItemCompletionClass =
  | 'auto-answer'
  | 'auto-formula'
  | 'form-capture'
  | 'objective-map'
  | 'objective-log'
  | 'objective-flow'
  | 'no-path';

/** The classes that complete THIS item with recorded evidence (not a hand tick). */
export const EVIDENCE_BACKED_CLASSES: readonly ItemCompletionClass[] = [
  'auto-answer',
  'auto-formula',
  'form-capture',
];

/** The objective-level-instrument classes (in-app work, manual per-item tick). */
export const OBJECTIVE_LEVEL_CLASSES: readonly ItemCompletionClass[] = [
  'objective-map',
  'objective-log',
  'objective-flow',
];

export interface ItemClassification {
  classification: ItemCompletionClass;
  /** Catalogue tool id providing the path (form-capture / objective-* only). */
  viaToolId?: string;
}

/** One classified checklist item, flattened for reports and baselines. */
export interface ItemCompletionPath extends ItemClassification {
  objectiveId: string;
  objectiveRef?: string;
  stratumId: PlanStratumId;
  itemId: string;
  itemLabel: string;
  optional: boolean;
}

/**
 * A resolved form arm whose `formId` matches NO checklist item on the
 * objective it is wired to — formId/item-id drift (the form saves but ticks
 * nothing). Known intentional legacy: `s1-vision-labour`.
 */
export interface UnmatchedFormArm {
  objectiveId: string;
  toolId: string;
  formId: string;
}

export interface ClassifyOptions {
  /**
   * Override how an objective's bottom-rail catalogue-tool ids are resolved.
   * Defaults to the live resolver (`getObjectiveActTools`: override -> stratum
   * default -> []). Test seam for hermetic synthetic fixtures.
   */
  resolveTools?: (objective: PlanStratumObjective) => readonly string[];
}

const defaultResolveTools = (
  objective: PlanStratumObjective,
): readonly string[] => getObjectiveActTools(objective);

function classifyAgainstArms(
  item: PlanDecisionChecklistItem,
  resolvedArms: readonly { toolId: string; arm: ActToolArmDescriptor }[],
): ItemClassification {
  if (item.answerSpec) return { classification: 'auto-answer' };
  if (item.formulaBinding?.satisfiesWhenComputed) {
    return { classification: 'auto-formula' };
  }
  const formArm = resolvedArms.find(
    (r) => r.arm.kind === 'form' && r.arm.formId === item.id,
  );
  if (formArm) {
    return { classification: 'form-capture', viaToolId: formArm.toolId };
  }
  // Objective-level instruments, best-first: map (incl. zone-action) > log > flow.
  const mapArm = resolvedArms.find(
    (r) => r.arm.kind === 'map' || r.arm.kind === 'zone-action',
  );
  if (mapArm) return { classification: 'objective-map', viaToolId: mapArm.toolId };
  const logArm = resolvedArms.find((r) => r.arm.kind === 'log');
  if (logArm) return { classification: 'objective-log', viaToolId: logArm.toolId };
  const flowArm = resolvedArms.find((r) => r.arm.kind === 'flow');
  if (flowArm) return { classification: 'objective-flow', viaToolId: flowArm.toolId };
  return { classification: 'no-path' };
}

function resolveArms(
  objective: PlanStratumObjective,
  armIndex: ActToolArmIndex,
  options?: ClassifyOptions,
): readonly { toolId: string; arm: ActToolArmDescriptor }[] {
  const resolve = options?.resolveTools ?? defaultResolveTools;
  // Ids absent from the index are skipped here; the existing actToolCoverage
  // conformance test is the guard that every emitted id resolves in the
  // catalogue, so this module does not double-report them.
  return resolve(objective).flatMap((toolId) => {
    const arm = armIndex[toolId];
    return arm ? [{ toolId, arm }] : [];
  });
}

/** Classify a single checklist item against its objective's resolved rail. */
export function classifyChecklistItem(
  objective: PlanStratumObjective,
  item: PlanDecisionChecklistItem,
  armIndex: ActToolArmIndex,
  options?: ClassifyOptions,
): ItemClassification {
  return classifyAgainstArms(item, resolveArms(objective, armIndex, options));
}

export interface ObjectiveCompletionAudit {
  objectiveId: string;
  objectiveRef?: string;
  stratumId: PlanStratumId;
  items: ItemCompletionPath[];
  unmatchedFormArms: UnmatchedFormArm[];
}

/** Classify every checklist item of one objective (in checklist order). */
export function auditObjectiveCompletionPaths(
  objective: PlanStratumObjective,
  armIndex: ActToolArmIndex,
  options?: ClassifyOptions,
): ObjectiveCompletionAudit {
  const resolvedArms = resolveArms(objective, armIndex, options);
  const itemIds = new Set(objective.checklist.map((i) => i.id));
  const items: ItemCompletionPath[] = objective.checklist.map((item) => ({
    objectiveId: objective.id,
    objectiveRef: objective.ref,
    stratumId: objective.stratumId,
    itemId: item.id,
    itemLabel: item.label,
    optional: item.optional,
    ...classifyAgainstArms(item, resolvedArms),
  }));
  const unmatchedFormArms: UnmatchedFormArm[] = resolvedArms
    .filter((r) => r.arm.kind === 'form' && !itemIds.has(r.arm.formId ?? ''))
    .map((r) => ({
      objectiveId: objective.id,
      toolId: r.toolId,
      formId: r.arm.formId ?? '',
    }));
  return {
    objectiveId: objective.id,
    objectiveRef: objective.ref,
    stratumId: objective.stratumId,
    items,
    unmatchedFormArms,
  };
}

/**
 * Gap maps keyed by objective id -> offending checklist-item ids, in checklist
 * order. This is the exact shape the app-layer ratchet baseline pins
 * (completionPathGaps.baseline.json), so baseline and report can never
 * disagree structurally.
 */
export interface CompletionPathAuditSummary {
  /** Every classified item across every standalone catalogue objective. */
  items: ItemCompletionPath[];
  /** Items with NO in-app path at all (bare manual ticks). The ratchet set. */
  noPath: Record<string, string[]>;
  /**
   * Items whose only path is an objective-level instrument (map / log / flow)
   * with a manual per-item tick. The second-tier ratchet set.
   */
  objectiveSpatialOnly: Record<string, string[]>;
  /** Resolved form arms whose formId matches no item on their objective. */
  unmatchedFormArms: UnmatchedFormArm[];
  countsByClassification: Record<ItemCompletionClass, number>;
}

/**
 * Sweep every standalone catalogue objective (universal + all primaries + all
 * secondary additive — includes the 31 ev-* ecovillage objectives) and fold
 * the per-item classifications into the ratchet gap maps. Deterministic order:
 * objectives sorted by stratum then id; items kept in checklist order.
 */
export function auditAllCompletionPaths(
  armIndex: ActToolArmIndex,
  options?: ClassifyOptions,
): CompletionPathAuditSummary {
  const objectives = [...allCatalogueObjectives()].sort(
    (a, b) =>
      a.stratumId.localeCompare(b.stratumId) || a.id.localeCompare(b.id),
  );
  const items: ItemCompletionPath[] = [];
  const noPath: Record<string, string[]> = {};
  const objectiveSpatialOnly: Record<string, string[]> = {};
  const unmatchedFormArms: UnmatchedFormArm[] = [];
  const countsByClassification: Record<ItemCompletionClass, number> = {
    'auto-answer': 0,
    'auto-formula': 0,
    'form-capture': 0,
    'objective-map': 0,
    'objective-log': 0,
    'objective-flow': 0,
    'no-path': 0,
  };
  for (const objective of objectives) {
    const audit = auditObjectiveCompletionPaths(objective, armIndex, options);
    unmatchedFormArms.push(...audit.unmatchedFormArms);
    for (const item of audit.items) {
      items.push(item);
      countsByClassification[item.classification] += 1;
      if (item.classification === 'no-path') {
        (noPath[item.objectiveId] ??= []).push(item.itemId);
      } else if (
        OBJECTIVE_LEVEL_CLASSES.includes(item.classification)
      ) {
        (objectiveSpatialOnly[item.objectiveId] ??= []).push(item.itemId);
      }
    }
  }
  return {
    items,
    noPath,
    objectiveSpatialOnly,
    unmatchedFormArms,
    countsByClassification,
  };
}
