// DecisionProgressBar — a sticky progress bar pinned to the top of the
// objective detail panel, mirroring the Plan Spine prototype's "ACT PROGRESS"
// bar (spine/DesignDetailPanel.tsx:86-144). On the live page it is labeled
// "Decision progress" (not "Act progress"): it reflects this objective's
// decision-checklist completion and sits above the SEPARATE, real
// field-verification bar (ActProgressBar), so reusing "Act" would clash.
//
// Read-only and presentational — the figure comes from deriveChecklistProgress,
// which replicates DecisionChecklist's required-done/required-total count.
// Renders nothing when the objective has no required checklist items.

import type { PlanStratumObjective } from '@ogden/shared';
import type { VisionDerivedMap } from '../../strata/visionProfileToChecklist.js';
import { C, F } from '../spine/tokens.js';
import { deriveChecklistProgress } from './checklistProgress.js';

interface Props {
  objective: PlanStratumObjective;
  completedItemIds: readonly string[];
  /** Items pre-satisfied by the Stage Zero Vision bridge. */
  derivedEvidence?: VisionDerivedMap;
}

export default function DecisionProgressBar({
  objective,
  completedItemIds,
  derivedEvidence,
}: Props) {
  const { done, total } = deriveChecklistProgress(
    objective.checklist,
    completedItemIds,
    derivedEvidence,
  );

  // Objectives with no required decisions get no bar (nothing to track).
  if (total === 0) return null;

  const pct = (done / total) * 100;
  const isComplete = done === total;

  return (
    <div
      data-testid="plan-decision-progress"
      style={{
        padding: '16px 22px 12px',
        borderBottom: `1px solid ${C.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 2,
        background: C.bg, // opaque so scrolled content doesn't bleed through
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: C.textTertiary,
            fontFamily: F.sans,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Decision progress
        </span>
        <span
          style={{
            fontSize: 11,
            color: isComplete ? C.green : C.textSecondary,
            fontFamily: F.mono,
            fontWeight: 600,
          }}
        >
          {done} / {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Decision progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        style={{ height: 3, background: C.bg4, borderRadius: 2 }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 2,
            width: `${pct}%`,
            background: isComplete ? C.green : C.blue,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      {done === 0 && (
        <div
          style={{
            fontSize: 10,
            color: C.textTertiary,
            marginTop: 6,
            fontFamily: F.sans,
            fontStyle: 'italic',
          }}
        >
          Not yet started — work through this objective's decisions.
        </div>
      )}
    </div>
  );
}
