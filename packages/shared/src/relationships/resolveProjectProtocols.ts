// relationships/resolveProjectProtocols.ts
//
// The pure resolution engine for the per-type STANDING-PROTOCOL model, the
// protocol-layer twin of resolveProjectObjectives.ts. Given a primary type and
// zero or more secondary types it returns the fully resolved protocol set:
//
//   universal protocols (all 7 strata)
//   + primary-type protocols
//   + each COMPATIBLE secondary's additive protocols (deduped by id)
//   + each compatible secondary's patches applied to their target protocols
//
// plus a provenance record. Pure and deterministic (no Date.now / randomness /
// I/O) so the same inputs always yield the same output and the result can be
// persisted per project.
//
// Invariants (mirroring the objective resolver):
//   - Patches apply AFTER all additive protocols are placed, so a patch may
//     target a universal, primary, OR additive protocol regardless of order.
//   - A patch whose target id is absent is SKIPPED and recorded - never thrown.
//   - Condition / response / scopeNote amendments CONCATENATE onto the target,
//     never replace.
//   - Additive protocols are de-duplicated by id, first occurrence wins.
//   - Sort is stratum ordinal, then source layer (universal < primary <
//     secondary), then authored order.
//
// Compatibility + tension lookups reuse the objective layer's relationship
// matrix (one source of truth for which secondaries layer onto which primary).
// Dependencies are injectable purely so tests can substitute synthetic
// catalogues; production callers pass nothing.

import type {
  ProtocolPatchRecord,
  ProtocolSource,
  StandardProtocolTemplate,
} from '../schemas/protocol/protocol.schema.js';
import type { PlanStratumId } from '../schemas/plan/planStratumObjective.schema.js';
import type { ProjectTypeId } from '../schemas/plan/projectTypeTaxonomy.schema.js';
import {
  getPrimaryProtocolCatalogue as defaultGetPrimaryProtocolCatalogue,
  getSecondaryProtocolCatalogue as defaultGetSecondaryProtocolCatalogue,
  type PrimaryProtocolCatalogue,
  type SecondaryProtocolCatalogue,
} from '../constants/protocol/catalogues/index.js';
import {
  getPairRelation as defaultGetPairRelation,
  isCompatibleSecondary as defaultIsCompatibleSecondary,
  getActiveTensions as defaultGetActiveTensions,
  type DesignTension,
  type RelationCell,
} from '../constants/plan/relationshipMatrix.js';

/** Stratum ids in ordinal order (drives the resolved-set sort). */
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
const SOURCE_RANK: Record<ProtocolSource, number> = {
  universal: 0,
  primary: 1,
  secondary: 2,
};

function stratumOrdinal(stratumId: PlanStratumId | undefined): number {
  if (!stratumId) return STRATUM_ORDER.length;
  const i = STRATUM_ORDER.indexOf(stratumId);
  return i === -1 ? STRATUM_ORDER.length : i;
}

function sourceRank(source: ProtocolSource | undefined): number {
  return source ? SOURCE_RANK[source] : 0;
}

/** Deep-copy a protocol so patch concatenation never bleeds into the catalogue. */
function cloneProtocol(p: StandardProtocolTemplate): StandardProtocolTemplate {
  return {
    ...p,
    feeds: [...p.feeds],
    ...(p.enterpriseScope ? { enterpriseScope: [...p.enterpriseScope] } : {}),
  };
}

function concatText(
  existing: string | undefined,
  addition: string | undefined,
): string | undefined {
  const parts = [existing, addition].filter(
    (s): s is string => Boolean(s && s.trim()),
  );
  return parts.length ? parts.join(' ') : undefined;
}

export interface ResolveProjectProtocolsInput {
  primaryTypeId: ProjectTypeId;
  secondaryTypeIds?: readonly ProjectTypeId[];
}

/** Injectable dependencies; all default to the real catalogues + matrix. */
export interface ResolveProjectProtocolsDeps {
  getPrimaryProtocolCatalogue?: (id: ProjectTypeId) => PrimaryProtocolCatalogue;
  getSecondaryProtocolCatalogue?: (
    id: ProjectTypeId,
  ) => SecondaryProtocolCatalogue | undefined;
  getPairRelation?: (
    secondary: ProjectTypeId,
    primary: ProjectTypeId,
  ) => RelationCell;
  isCompatibleSecondary?: (
    secondary: ProjectTypeId,
    primary: ProjectTypeId,
  ) => boolean;
  getActiveTensions?: (
    primary: ProjectTypeId,
    secondaries: readonly ProjectTypeId[],
  ) => DesignTension[];
}

/** A patch that could not be applied because its target protocol was absent. */
export interface SkippedProtocolPatch {
  secondaryTypeId: ProjectTypeId;
  targetTemplateId: string;
  ref?: string;
  reason: 'missing-target';
}

/** Per-secondary outcome record. */
export interface SecondaryProtocolFlag {
  secondaryTypeId: ProjectTypeId;
  relation: RelationCell;
  /** True when the pair is compatible (relation !== 'NA') and was layered. */
  loaded: boolean;
  /** True when an encoded protocol catalogue exists for this secondary. */
  encoded: boolean;
  /** Additive protocols actually added (after dedup). */
  additiveCount: number;
  /** Patches actually applied (excludes skipped). */
  patchCount: number;
}

export interface ResolveProtocolProvenance {
  appliedPatchRefs: string[];
  skippedPatches: SkippedProtocolPatch[];
  dedupedProtocolIds: string[];
  secondaryFlags: SecondaryProtocolFlag[];
}

export interface ResolvedProjectProtocols {
  primaryTypeId: ProjectTypeId;
  secondaryTypeIds: ProjectTypeId[];
  protocols: StandardProtocolTemplate[];
  activeTensions: DesignTension[];
  provenance: ResolveProtocolProvenance;
}

/**
 * Resolve the full standing-protocol set for a project from its primary +
 * secondary types. Pure and deterministic. See file header for the algorithm.
 */
export function resolveProjectProtocols(
  input: ResolveProjectProtocolsInput,
  deps: ResolveProjectProtocolsDeps = {},
): ResolvedProjectProtocols {
  const getPrimaryProtocolCatalogue =
    deps.getPrimaryProtocolCatalogue ?? defaultGetPrimaryProtocolCatalogue;
  const getSecondaryProtocolCatalogue =
    deps.getSecondaryProtocolCatalogue ?? defaultGetSecondaryProtocolCatalogue;
  const getPairRelation = deps.getPairRelation ?? defaultGetPairRelation;
  const isCompatibleSecondary =
    deps.isCompatibleSecondary ?? defaultIsCompatibleSecondary;
  const getActiveTensions = deps.getActiveTensions ?? defaultGetActiveTensions;

  const { primaryTypeId } = input;

  // Normalise the secondary list: drop dupes and any equal to the primary.
  const secondaryTypeIds: ProjectTypeId[] = [];
  for (const id of input.secondaryTypeIds ?? []) {
    if (id !== primaryTypeId && !secondaryTypeIds.includes(id)) {
      secondaryTypeIds.push(id);
    }
  }

  const provenance: ResolveProtocolProvenance = {
    appliedPatchRefs: [],
    skippedPatches: [],
    dedupedProtocolIds: [],
    secondaryFlags: [],
  };

  interface Entry {
    protocol: StandardProtocolTemplate;
    order: number;
  }
  const entries: Entry[] = [];
  const byId = new Map<string, StandardProtocolTemplate>();
  let order = 0;

  const addProtocol = (source: StandardProtocolTemplate): boolean => {
    if (byId.has(source.id)) {
      provenance.dedupedProtocolIds.push(source.id);
      return false;
    }
    const clone = cloneProtocol(source);
    entries.push({ protocol: clone, order: order++ });
    byId.set(clone.id, clone);
    return true;
  };

  // --- Base set: universal + primary --------------------------------------
  const primaryCatalogue = getPrimaryProtocolCatalogue(primaryTypeId);
  for (const p of primaryCatalogue.universal) addProtocol(p);
  for (const p of primaryCatalogue.primary) addProtocol(p);

  // --- Pass 1: additive protocols per compatible secondary; collect patches
  const flagBySecondary = new Map<ProjectTypeId, SecondaryProtocolFlag>();
  const pendingPatches: ProtocolPatchRecord[] = [];

  for (const secondaryTypeId of secondaryTypeIds) {
    const relation = getPairRelation(secondaryTypeId, primaryTypeId);
    const compatible = isCompatibleSecondary(secondaryTypeId, primaryTypeId);
    const flag: SecondaryProtocolFlag = {
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

    const catalogue = getSecondaryProtocolCatalogue(secondaryTypeId);
    if (!catalogue) continue; // compatible but not yet encoded
    flag.encoded = true;

    for (const p of catalogue.additive) {
      if (addProtocol(p)) flag.additiveCount += 1;
    }
    for (const patch of catalogue.patches) pendingPatches.push(patch);
  }

  // --- Pass 2: apply collected patches ------------------------------------
  for (const patch of pendingPatches) {
    const target = byId.get(patch.targetTemplateId);
    const flag = flagBySecondary.get(patch.secondaryTypeId);
    if (!target) {
      provenance.skippedPatches.push({
        secondaryTypeId: patch.secondaryTypeId,
        targetTemplateId: patch.targetTemplateId,
        ...(patch.ref ? { ref: patch.ref } : {}),
        reason: 'missing-target',
      });
      continue;
    }
    target.condition =
      concatText(target.condition, patch.conditionAmendment) ?? target.condition;
    target.response =
      concatText(target.response, patch.responseAmendment) ?? target.response;
    const amendedScope = concatText(target.scopeNotes, patch.scopeNote);
    if (amendedScope) target.scopeNotes = amendedScope;

    if (patch.ref) provenance.appliedPatchRefs.push(patch.ref);
    if (flag) flag.patchCount += 1;
  }

  // --- Sort: stratum ordinal, then source layer, then authored order ------
  entries.sort((a, b) => {
    const ta = stratumOrdinal(a.protocol.stratumId);
    const tb = stratumOrdinal(b.protocol.stratumId);
    if (ta !== tb) return ta - tb;
    const sa = sourceRank(a.protocol.source);
    const sb = sourceRank(b.protocol.source);
    if (sa !== sb) return sa - sb;
    return a.order - b.order;
  });

  const activeTensions = getActiveTensions(primaryTypeId, secondaryTypeIds);

  return {
    primaryTypeId,
    secondaryTypeIds,
    protocols: entries.map((e) => e.protocol),
    activeTensions,
    provenance,
  };
}

/** Find a protocol by id within an already-resolved set. */
export function findProtocolIn(
  protocols: readonly StandardProtocolTemplate[],
  id: string,
): StandardProtocolTemplate | undefined {
  return protocols.find((p) => p.id === id);
}
