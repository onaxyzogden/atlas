/**
 * useEffectivePlanProjectType — shared selector for the project-type lens.
 *
 * Two stages (Plan + Act) need to know "what project-type template should I
 * apply to this project?" with the same precedence rule:
 *
 *   effectiveType = hasInteracted ? storedType : wizardSeed
 *
 * `hasInteracted` is `byProject[projectId] !== undefined` in
 * `planProjectTypeChecklistStore` — presence-of-entry is the single source
 * of truth for "the steward has touched the picker," independent of whether
 * the stored selection is a key or `null` (an explicit clear back to
 * placeholder).
 *
 * Plan's `PlanProjectTypeCard` consumes `hasInteracted` directly for its
 * first-toggle lock-in. Act's Operations Hub panels only need
 * `effectiveType` for ranking. Both come through this hook to keep the
 * precedence rule single-sourced.
 */

import { useProjectStore } from '../../../store/projectStore.js';
import { usePlanProjectTypeChecklistStore } from '../../../store/planProjectTypeChecklistStore.js';
import {
  PLAN_PROJECT_TYPE_KEYS,
  type PlanProjectTypeKey,
} from '../data/planProjectTypeTemplates.js';

export function asPlanProjectTypeKey(
  value: string | null | undefined,
): PlanProjectTypeKey | null {
  if (!value) return null;
  return (PLAN_PROJECT_TYPE_KEYS as readonly string[]).includes(value)
    ? (value as PlanProjectTypeKey)
    : null;
}

export interface EffectivePlanProjectType {
  effectiveType: PlanProjectTypeKey | null;
  hasInteracted: boolean;
  wizardSeed: PlanProjectTypeKey | null;
}

export function useEffectivePlanProjectType(
  projectId: string | null,
): EffectivePlanProjectType {
  const wizardType = useProjectStore((s) =>
    projectId
      ? (s.projects.find((p) => p.id === projectId)?.projectType ?? null)
      : null,
  );
  const wizardSeed = asPlanProjectTypeKey(wizardType);

  const hasInteracted = usePlanProjectTypeChecklistStore((s) =>
    projectId ? s.byProject[projectId] !== undefined : false,
  );
  const storedType = usePlanProjectTypeChecklistStore(
    (s) => (projectId ? s.byProject[projectId]?.selectedType : null) ?? null,
  );

  const effectiveType: PlanProjectTypeKey | null = hasInteracted
    ? storedType
    : wizardSeed;

  return { effectiveType, hasInteracted, wizardSeed };
}
