/**
 * ActTaskWalkthrough — the right-anchored execution drawer of the Operations
 * Hub. Opens when a pin or category routes to act/ops/$objectiveId; the hub
 * (map + grid) stays visible behind a scrim for spatial context.
 *
 * PHASE 3a (this file) is the de-risking step from the plan: it mounts the
 * WHOLE existing ActTierExecutionPanel — the tier-shell's production right-rail
 * panel that already composes progress + checklist + persisted evidence +
 * monitoring + amendments + formal proof — with ZERO re-implementation. Every
 * load-bearing write path (planStratumStore.toggleItem, actEvidenceStore,
 * the ObserveDataPoint monitoring write + its CSA guard) therefore works in the
 * new home exactly as it does in the tier shell. Phase 3b layers the
 * RecipeProcedure stepper (resolveTaskRecipe) on top of this same panel.
 *
 * Objective / tier / status are resolved the SAME way ActTierShell resolves its
 * selected objective (useProjectObjectives → PLAN_STRATA tier → effective
 * checklist progress → computeAllObjectiveStatuses), so the panel sees an
 * identical contract. The route's beforeLoad already redirected locked
 * objectives away, so anything that reaches here is openable.
 */

import { useMemo } from 'react';
import { X } from 'lucide-react';
import {
  PLAN_STRATA,
  computeAllObjectiveStatuses,
  type PlanStratum,
  type PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { useProjectObjectives } from '../../plan/strata/useProjectObjectives.js';
import { useEffectiveChecklistProgress } from '../../strata/useEffectiveChecklistProgress.js';
import ActTierExecutionPanel from '../tier-shell/ActTierExecutionPanel.js';
import ActRecipeWalkthrough from './ActRecipeWalkthrough.js';
import css from './ActTaskWalkthrough.module.css';

interface Props {
  projectId: string;
  objectiveId: string;
  onClose: () => void;
}

export default function ActTaskWalkthrough({
  projectId,
  objectiveId,
  onClose,
}: Props) {
  const { objectives } = useProjectObjectives(projectId);

  const objective = useMemo(
    () => objectives.find((o) => o.id === objectiveId) ?? null,
    [objectives, objectiveId],
  );

  const tier = useMemo<PlanStratum | undefined>(
    () =>
      objective
        ? PLAN_STRATA.find((t) => t.id === objective.stratumId)
        : undefined,
    [objective],
  );

  // Effective checklist progress (stored ∪ wizard-derived S1) → canonical
  // prereq-aware objective statuses, mirroring ActTierShell so the panel's
  // gating matches the tier shell exactly.
  const effectiveProgress = useEffectiveChecklistProgress(projectId, objectives);
  const status = useMemo<PlanStratumObjectiveStatus>(() => {
    if (!objective) return 'locked';
    const statuses = computeAllObjectiveStatuses(
      objectives,
      effectiveProgress.flatMap,
    );
    return statuses[objective.id] ?? 'locked';
  }, [objective, objectives, effectiveProgress]);

  // Unknown / not-yet-hydrated objective: no drawer (the hub stays interactive).
  if (!objective) return null;

  return (
    <div className={css.root} role="dialog" aria-modal="true" aria-label="Task walkthrough">
      <button
        type="button"
        className={css.scrim}
        aria-label="Close walkthrough"
        onClick={onClose}
      />
      <aside className={css.drawer}>
        <header className={css.head}>
          <div className={css.headText}>
            <span className={css.eyebrow}>Walkthrough</span>
            <h2 className={css.title}>{objective.title}</h2>
          </div>
          <button
            type="button"
            className={css.close}
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </header>
        <div className={css.body}>
          {/* Phase 3b — the authored, ordered recipe: NARRATES the how-to.
              Keyed by objective id so the step index resets per task. */}
          <ActRecipeWalkthrough
            key={objective.id}
            projectId={projectId}
            objective={objective}
          />
          {/* Phase 3a — the proven WRITE surface, reused verbatim from the tier
              shell: checklist + evidence + monitoring + amendments + proof. */}
          <div className={css.recordDivider}>
            <span className={css.recordLabel}>Record your work</span>
          </div>
          <ActTierExecutionPanel
            projectId={projectId}
            tier={tier}
            objective={objective}
            status={status}
          />
        </div>
      </aside>
    </div>
  );
}
