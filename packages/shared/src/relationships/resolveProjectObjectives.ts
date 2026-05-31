// relationships/resolveProjectObjectives.ts
//
// The pure resolution engine for the per-type objective model (OLOS Project-
// Type + Secondary-Layer Spec v1.2). Given a primary type and zero or more
// secondary types it returns the fully resolved objective set:
//
//   universal-19 (deep-copied)
//   + primary-type objectives
//   + each COMPATIBLE secondary's additive objectives (deduped by id)
//   + each compatible secondary's modifying patches applied to their targets
//
// plus the active design tensions and a provenance record. The function is
// pure and deterministic (no Date.now / no randomness / no I/O) so the same
// inputs always yield the same output and the result can be persisted per
// project.
//
// Key invariants (from the spec + plan):
//   - Patches are applied AFTER all additive objectives are placed, so a patch
//     may target a universal, primary, OR additive objective regardless of
//     secondary ordering.
//   - A patch whose target id is absent from the resolved set is SKIPPED and
//     recorded in provenance - never thrown (spec section 7).
//   - Gate amendments CONCATENATE onto the target's completionGate, never
//     replace it (spec section 7).
//   - Additive objectives are de-duplicated by objective id, first occurrence
//     wins (spec section 9.3).
//   - Every injected item is stamped expandedBySecondaryId so the UI can render
//     "Expanded by: <Type>".
//   - All checklist item ids stay globally unique (planTierStore.toProgressMap
//     flatten invariant) - enforced by the catalogue conformance test.
//
// Dependencies are injectable (the `deps` param) purely so tests can substitute
// synthetic catalogues for the dedup / missing-target paths; production callers
// pass nothing and get the real catalogues + matrix.

import type {
  DecisionGroup,
  PatchRecord,
  PlanDecisionChecklistItem,
  PlanObjectiveSource,
  PlanStratumId,
  PlanStratumObjective,
} from '../schemas/plan/planStratumObjective.schema.js';
import type { ProjectTypeId } from '../schemas/plan/projectTypeTaxonomy.schema.js';
import {
  getPrimaryCatalogue as defaultGetPrimaryCatalogue,
  getSecondaryCatalogue as defaultGetSecondaryCatalogue,
  type PrimaryCatalogue,
  type SecondaryCatalogue,
} from '../constants/plan/catalogues/index.js';
import {
  getPairRelation as defaultGetPairRelation,
  isCompatibleSecondary as defaultIsCompatibleSecondary,
  getActiveTensions as defaultGetActiveTensions,
  type DesignTension,
  type RelationCell,
} from '../constants/plan/relationshipMatrix.js';

/** Tier ids in ordinal order (drives the resolved-set sort). */
const STRATUM_ORDER: readonly PlanStratumId[] = [
  's1-project-foundation',
  's2-land-reading',
  's3-systems-reading',
  's4-foundation-decisions',
  's5-system-design',
  's6-integration-design',
  's7-phasing-resourcing',
];

/** Stable sort rank by source layer: universal < primary < secondary. */
const SOURCE_RANK: Record<PlanObjectiveSource, number> = {
  universal: 0,
  primary: 1,
  secondary: 2,
};

function stratumOrdinal(stratumId: PlanStratumId): number {
  const i = STRATUM_ORDER.indexOf(stratumId);
  return i === -1 ? STRATUM_ORDER.length : i;
}

function sourceRank(source: PlanObjectiveSource | undefined): number {
  return source ? SOURCE_RANK[source] : 0;
}

/**
 * Deep-copy an objective so patch mutations (checklist append, gate / scope
 * rewrite) never bleed into the shared catalogue constants. Only the mutated
 * branches need real copies; scalars are spread-copied.
 */
function cloneObjective(o: PlanStratumObjective): PlanStratumObjective {
  return {
    ...o,
    prerequisiteObjectiveIds: [...o.prerequisiteObjectiveIds],
    defaultOverlayBundle: [...o.defaultOverlayBundle],
    checklist: o.checklist.map((it) => ({ ...it, feedsInto: [...it.feedsInto] })),
    decisionGroups: o.decisionGroups.map((g) => ({
      ...g,
      itemIds: [...g.itemIds],
      observeFeeds: [...g.observeFeeds],
    })),
  };
}

function concatText(existing: string | undefined, addition: string | undefined): string | undefined {
  const parts = [existing, addition].filter((s): s is string => Boolean(s && s.trim()));
  return parts.length ? parts.join(' ') : undefined;
}

export interface ResolveProjectObjectivesInput {
  primaryTypeId: ProjectTypeId;
  secondaryTypeIds?: readonly ProjectTypeId[];
}

/** Injectable dependencies; all default to the real catalogues + matrix. */
export interface ResolveProjectObjectivesDeps {
  getPrimaryCatalogue?: (id: ProjectTypeId) => PrimaryCatalogue;
  getSecondaryCatalogue?: (id: ProjectTypeId) => SecondaryCatalogue | undefined;
  getPairRelation?: (secondary: ProjectTypeId, primary: ProjectTypeId) => RelationCell;
  isCompatibleSecondary?: (secondary: ProjectTypeId, primary: ProjectTypeId) => boolean;
  getActiveTensions?: (
    primary: ProjectTypeId,
    secondaries: readonly ProjectTypeId[],
  ) => DesignTension[];
}

/** A patch that could not be applied because its target was absent. */
export interface SkippedPatch {
  secondaryTypeId: ProjectTypeId;
  targetObjectiveId: string;
  ref?: string;
  reason: 'missing-target';
}

/** Per-secondary outcome record. */
export interface SecondaryResolutionFlag {
  secondaryTypeId: ProjectTypeId;
  relation: RelationCell;
  /** True when the pair is compatible (relation !== 'NA') and was layered. */
  loaded: boolean;
  /** True when an encoded catalogue exists for this secondary. */
  encoded: boolean;
  /** Additive objectives actually added (after dedup). */
  additiveCount: number;
  /** Patches actually applied (excludes skipped). */
  patchCount: number;
}

export interface ResolveProvenance {
  /** Refs of every patch that was applied (in application order). */
  appliedPatchRefs: string[];
  /** Patches skipped because their target objective was absent. */
  skippedPatches: SkippedPatch[];
  /** Ids of additive objectives dropped as duplicates (first occurrence won). */
  dedupedObjectiveIds: string[];
  /** One entry per unique selected secondary. */
  secondaryFlags: SecondaryResolutionFlag[];
}

export interface ResolvedProjectObjectives {
  primaryTypeId: ProjectTypeId;
  secondaryTypeIds: ProjectTypeId[];
  objectives: PlanStratumObjective[];
  activeTensions: DesignTension[];
  provenance: ResolveProvenance;
}

/**
 * Resolve the full objective set for a project from its primary + secondary
 * types. Pure and deterministic. See file header for the algorithm + invariants.
 */
export function resolveProjectObjectives(
  input: ResolveProjectObjectivesInput,
  deps: ResolveProjectObjectivesDeps = {},
): ResolvedProjectObjectives {
  const getPrimaryCatalogue = deps.getPrimaryCatalogue ?? defaultGetPrimaryCatalogue;
  const getSecondaryCatalogue = deps.getSecondaryCatalogue ?? defaultGetSecondaryCatalogue;
  const getPairRelation = deps.getPairRelation ?? defaultGetPairRelation;
  const isCompatibleSecondary = deps.isCompatibleSecondary ?? defaultIsCompatibleSecondary;
  const getActiveTensions = deps.getActiveTensions ?? defaultGetActiveTensions;

  const { primaryTypeId } = input;

  // Normalise the secondary list: drop dupes and any that equal the primary,
  // preserving first-seen order.
  const secondaryTypeIds: ProjectTypeId[] = [];
  for (const id of input.secondaryTypeIds ?? []) {
    if (id !== primaryTypeId && !secondaryTypeIds.includes(id)) {
      secondaryTypeIds.push(id);
    }
  }

  const provenance: ResolveProvenance = {
    appliedPatchRefs: [],
    skippedPatches: [],
    dedupedObjectiveIds: [],
    secondaryFlags: [],
  };

  // --- Base set: universal + primary, deep-copied -------------------------
  interface Entry {
    objective: PlanStratumObjective;
    order: number;
  }
  const entries: Entry[] = [];
  const byId = new Map<string, PlanStratumObjective>();
  let order = 0;

  const addObjective = (source: PlanStratumObjective): boolean => {
    if (byId.has(source.id)) {
      provenance.dedupedObjectiveIds.push(source.id);
      return false;
    }
    const clone = cloneObjective(source);
    entries.push({ objective: clone, order: order++ });
    byId.set(clone.id, clone);
    return true;
  };

  const primaryCatalogue = getPrimaryCatalogue(primaryTypeId);
  for (const o of primaryCatalogue.universal) addObjective(o);
  for (const o of primaryCatalogue.primary) addObjective(o);

  // --- Pass 1: additive objectives per compatible secondary; collect patches
  const flagBySecondary = new Map<ProjectTypeId, SecondaryResolutionFlag>();
  const pendingPatches: PatchRecord[] = [];

  for (const secondaryTypeId of secondaryTypeIds) {
    const relation = getPairRelation(secondaryTypeId, primaryTypeId);
    const compatible = isCompatibleSecondary(secondaryTypeId, primaryTypeId);
    const flag: SecondaryResolutionFlag = {
      secondaryTypeId,
      relation,
      loaded: compatible,
      encoded: false,
      additiveCount: 0,
      patchCount: 0,
    };
    flagBySecondary.set(secondaryTypeId, flag);
    provenance.secondaryFlags.push(flag);

    if (!compatible) continue; // N/A - layer nothing

    const catalogue = getSecondaryCatalogue(secondaryTypeId);
    if (!catalogue) continue; // compatible but not yet encoded
    flag.encoded = true;

    for (const o of catalogue.additive) {
      if (addObjective(o)) flag.additiveCount += 1;
    }
    for (const p of catalogue.patches) pendingPatches.push(p);
  }

  // --- Pass 2: apply collected patches ------------------------------------
  for (const p of pendingPatches) {
    const target = byId.get(p.targetObjectiveId);
    const flag = flagBySecondary.get(p.secondaryTypeId);
    if (!target) {
      provenance.skippedPatches.push({
        secondaryTypeId: p.secondaryTypeId,
        targetObjectiveId: p.targetObjectiveId,
        ...(p.ref ? { ref: p.ref } : {}),
        reason: 'missing-target',
      });
      continue;
    }

    // Inject items, stamped with the responsible secondary.
    const injected: PlanDecisionChecklistItem[] = p.injectedItems.map((it) => ({
      ...it,
      feedsInto: [...it.feedsInto],
      expandedBySecondaryId: p.secondaryTypeId,
    }));
    target.checklist = [...target.checklist, ...injected];

    // Inject decision groups, stamped with the responsible secondary so the
    // Plan render can show the amber "Added by: <Type>" attribution.
    const injectedGroups: DecisionGroup[] = p.injectedGroups.map((g) => ({
      ...g,
      itemIds: [...g.itemIds],
      observeFeeds: [...g.observeFeeds],
      sourceSecondaryId: p.secondaryTypeId,
    }));
    target.decisionGroups = [...target.decisionGroups, ...injectedGroups];

    // Concatenate gate amendment + scope note onto the target (never replace).
    target.completionGate = concatText(target.completionGate, p.completionGateAmendment);
    target.scopeNotes = concatText(target.scopeNotes, p.scopeNote);

    if (p.ref) provenance.appliedPatchRefs.push(p.ref);
    if (flag) flag.patchCount += 1;
  }

  // --- Sort: tier ordinal, then source layer, then authored order ---------
  entries.sort((a, b) => {
    const ta = stratumOrdinal(a.objective.stratumId);
    const tb = stratumOrdinal(b.objective.stratumId);
    if (ta !== tb) return ta - tb;
    const sa = sourceRank(a.objective.source);
    const sb = sourceRank(b.objective.source);
    if (sa !== sb) return sa - sb;
    return a.order - b.order;
  });

  const activeTensions = getActiveTensions(primaryTypeId, secondaryTypeIds);

  return {
    primaryTypeId,
    secondaryTypeIds,
    objectives: entries.map((e) => e.objective),
    activeTensions,
    provenance,
  };
}

/** Find an objective by id within an already-resolved set. */
export function findPlanStratumObjectiveIn(
  objectives: readonly PlanStratumObjective[],
  id: string,
): PlanStratumObjective | undefined {
  return objectives.find((o) => o.id === id);
}
