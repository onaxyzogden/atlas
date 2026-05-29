// useProjectObjectives.ts
//
// Per-project objective resolution for the Plan tier spine (OLOS Project-Type +
// Secondary-Layer Spec v1.2, Sub-slice D). Replaces the single static
// PLAN_TIER_OBJECTIVES skeleton that every Plan consumer used to read with a set
// resolved from the project's own type selection.
//
// Two entry points share one 4-tier fallback ladder:
//   - resolveObjectivesForProject(project)  pure; for non-React + loop callers
//     (useProjectUrgency loops over many projects, so it cannot call a hook
//     per project).
//   - useProjectObjectives(projectId)       React hook, memoized per project on
//     the two inputs resolution actually reads.
//
// Fallback ladder (first match wins):
//   1. metadata.projectTypeRecord                  -> resolveProjectObjectives(record)
//      (written on wizard completion, Sub-slice E)
//   2. bare project.projectType naming a valid      -> resolveProjectObjectives({primaryTypeId})
//      PRIMARY type (residential is secondary-only
//      and unknown strings fall through)
//   3. static PLAN_TIER_OBJECTIVES                  -> the legacy 16-objective skeleton
//      (MTC null-type projects + every project created before this slice)
//
// Tiers 1-2 reuse the universal skeleton ids the visionProfileToChecklist bridge
// targets, so persisted planTierStore progress carries over with no client
// migration (Plan, Risk row 4). Resolution is pure + deterministic, so the
// resolved set is reproduced from metadata.projectTypeRecord on every reload -
// no separate persisted objective store is required for this slice (the Plan's
// documented "on-the-fly useMemo" fallback; see the Sub-slice D gate note).

import { useMemo } from 'react';
import {
  PLAN_TIER_OBJECTIVES,
  findProjectType,
  resolveProjectObjectives,
  type DesignTension,
  type PlanTierObjective,
  type ProjectTypeRecord,
  type ResolveProvenance,
} from '@ogden/shared';
import { useProjectStore } from '../../../store/projectStore.js';

/** Which fallback tier produced a project's resolved objective set. */
export type ObjectiveResolutionSource = 'record' | 'projectType' | 'static';

export interface ProjectObjectiveResolution {
  /** The resolved, tier-sorted objective set this project's Plan spine renders. */
  objectives: readonly PlanTierObjective[];
  /** Active design tensions for the type pairing (always empty for static). */
  activeTensions: readonly DesignTension[];
  /** Resolver provenance (applied/skipped patches, dedup); null when static. */
  provenance: ResolveProvenance | null;
  /** Which fallback tier produced this set. */
  source: ObjectiveResolutionSource;
}

/**
 * The minimal project shape resolution reads. Structural (not the full
 * LocalProject) so imperative callers can pass a LocalProject directly and the
 * hook can pass the two raw fields it subscribes to.
 */
export interface ProjectTypeInputs {
  projectType?: string | null;
  metadata?: { projectTypeRecord?: ProjectTypeRecord | null } | null;
}

/** Shared static fallback - a stable reference so memo identity holds. */
const STATIC_RESOLUTION: ProjectObjectiveResolution = {
  objectives: PLAN_TIER_OBJECTIVES,
  activeTensions: [],
  provenance: null,
  source: 'static',
};

/** The core ladder, working off the two raw inputs resolution depends on. */
function resolveFromInputs(
  projectType: string | null | undefined,
  record: ProjectTypeRecord | null | undefined,
): ProjectObjectiveResolution {
  // Tier 1 - a completed wizard wrote a full type record (Sub-slice E).
  if (record) {
    const r = resolveProjectObjectives({
      primaryTypeId: record.primaryTypeId,
      secondaryTypeIds: record.secondaryTypeIds,
    });
    return {
      objectives: r.objectives,
      activeTensions: r.activeTensions,
      provenance: r.provenance,
      source: 'record',
    };
  }

  // Tier 2 - a bare projectType string naming a valid PRIMARY type.
  // residential is secondary-only (canBePrimary: false) and unknown strings
  // return undefined, so both fall through to the static skeleton.
  const def = projectType ? findProjectType(projectType) : undefined;
  if (def?.canBePrimary) {
    const r = resolveProjectObjectives({ primaryTypeId: def.id });
    return {
      objectives: r.objectives,
      activeTensions: r.activeTensions,
      provenance: r.provenance,
      source: 'projectType',
    };
  }

  // Tier 3 - null type (MTC) or a pre-slice project: the legacy static skeleton.
  return STATIC_RESOLUTION;
}

/**
 * Pure 4-tier resolution. Safe to call in loops and non-React code (the resolver
 * is pure). Always returns a set - the static skeleton for null/unknown types -
 * so every project has objectives to render.
 */
export function resolveObjectivesForProject(
  project: ProjectTypeInputs | null | undefined,
): ProjectObjectiveResolution {
  if (!project) return STATIC_RESOLUTION;
  return resolveFromInputs(
    project.projectType,
    project.metadata?.projectTypeRecord,
  );
}

/**
 * React hook: a project's resolved objective set, memoized on the type record
 * and the bare type string - the only two inputs resolution reads - so unrelated
 * project edits (notes, parcel, attachments) don't trigger a re-resolve.
 */
export function useProjectObjectives(
  projectId: string,
): ProjectObjectiveResolution {
  const record = useProjectStore(
    (s) =>
      s.projects.find((p) => p.id === projectId)?.metadata?.projectTypeRecord,
  );
  const projectType = useProjectStore(
    (s) => s.projects.find((p) => p.id === projectId)?.projectType ?? null,
  );
  return useMemo(
    () => resolveFromInputs(projectType, record),
    [projectType, record],
  );
}
