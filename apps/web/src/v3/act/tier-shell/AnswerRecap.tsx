// AnswerRecap.tsx
//
// Read-only, typed recap of a checklist item's answer that was already captured
// upstream (project-creation wizard / Stage Zero Vision Builder / team step).
// Rendered in the Act tier shell's Checklist in place of the bare checkbox for
// any item carrying an `answerSpec` that resolves as answered, so the steward
// sees the prior answer IN ITS ORIGINAL CONTROL STYLE (a select as a chip,
// multi as chips, a band as pills) instead of being re-asked for free text.
//
// Editing is NOT offered here: the "Edit in Plan" affordance now lives in the
// Vision forms modal tab (EditInPlanButton), so the sidebar recap shows the
// value only. The item auto-satisfies from source data via
// computeEffectiveProgress, so no checkbox is needed.

import { Check } from 'lucide-react';
import type { PlanDecisionChecklistItem, ProjectMetadata } from '@ogden/shared';
import { resolveAnswerSpec } from '../../strata/resolveAnswerSpec.js';
import AnswerValue from './AnswerValue.js';
import styles from './AnswerRecap.module.css';

interface Props {
  item: PlanDecisionChecklistItem;
  metadata: ProjectMetadata | null | undefined;
}

export default function AnswerRecap({ item, metadata }: Props) {
  const spec = item.answerSpec;
  // Guard: only render when there is a spec AND it resolves as answered. The
  // caller already checks this, but keep the component self-safe.
  if (!spec) return null;
  const resolved = resolveAnswerSpec(metadata, spec);
  if (!resolved.isAnswered) return null;

  return (
    <div className={styles.recap}>
      <div className={styles.recapHead}>
        <span className={styles.recapCheck} aria-hidden="true">
          <Check size={13} strokeWidth={3} />
        </span>
        <span className={styles.recapLabel}>{item.label}</span>
      </div>
      <div className={styles.recapValue}>
        <AnswerValue resolved={resolved} optionSetId={spec.optionSetId} />
      </div>
    </div>
  );
}
