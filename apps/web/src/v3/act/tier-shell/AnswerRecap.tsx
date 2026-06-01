// AnswerRecap.tsx
//
// Read-only, typed recap of a checklist item's answer that was already captured
// upstream (project-creation wizard / Stage Zero Vision Builder / team step).
// Rendered in the Act tier shell's Checklist in place of the bare checkbox for
// any item carrying an `answerSpec` that resolves as answered, so the steward
// sees the prior answer IN ITS ORIGINAL CONTROL STYLE (a select as a chip,
// multi as chips, a band as pills) instead of being re-asked for free text.
//
// Editing is intentionally NOT done here: a small "Edit in Plan" link deep-links
// to where that answer is authored (the wizard vision/team step, or the Plan
// header's project-type modals). The item auto-satisfies from the source data
// via computeEffectiveProgress, so no checkbox is needed.

import { Check, Pencil } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import type {
  AnswerOptionSetId,
  PlanDecisionChecklistItem,
  ProjectMetadata,
} from '@ogden/shared';
import { resolveAnswerSpec, type ResolvedAnswer } from '../../strata/resolveAnswerSpec.js';
import { labelForOption } from '../../strata/answerOptionLabels.js';
import styles from './AnswerRecap.module.css';

interface Props {
  projectId: string;
  item: PlanDecisionChecklistItem;
  metadata: ProjectMetadata | null | undefined;
}

export default function AnswerRecap({ projectId, item, metadata }: Props) {
  const navigate = useNavigate();
  const spec = item.answerSpec;
  // Guard: only render when there is a spec AND it resolves as answered. The
  // caller already checks this, but keep the component self-safe.
  if (!spec) return null;
  const resolved = resolveAnswerSpec(metadata, spec);
  if (!resolved.isAnswered) return null;

  const onEdit = () => {
    if (spec.editRoute.kind === 'wizard-step') {
      void navigate({
        to: '/v3/project/$projectId/wizard/$step',
        params: { projectId, step: spec.editRoute.step },
      });
    } else {
      void navigate({
        to: '/v3/project/$projectId/plan',
        params: { projectId },
      });
    }
  };

  return (
    <div className={styles.recap}>
      <div className={styles.recapHead}>
        <span className={styles.recapCheck} aria-hidden="true">
          <Check size={13} strokeWidth={3} />
        </span>
        <span className={styles.recapLabel}>{item.label}</span>
        <button type="button" className={styles.editLink} onClick={onEdit}>
          <Pencil size={11} strokeWidth={2.5} />
          Edit in Plan
        </button>
      </div>
      <div className={styles.recapValue}>{renderValue(resolved, spec.optionSetId)}</div>
    </div>
  );
}

function renderValue(
  resolved: ResolvedAnswer,
  optionSetId: AnswerOptionSetId | undefined,
) {
  const { fieldType, values } = resolved;

  if (fieldType === 'single_select') {
    return (
      <span className={`${styles.chip} ${styles.chipSelected}`}>
        {labelForOption(optionSetId, values[0] ?? '')}
      </span>
    );
  }

  if (fieldType === 'multi_select') {
    return (
      <span className={styles.chipRow}>
        {values.map((v) => (
          <span key={v} className={styles.chip}>
            {labelForOption(optionSetId, v)}
          </span>
        ))}
      </span>
    );
  }

  if (fieldType === 'band') {
    return (
      <span className={styles.bandRow}>
        {values.map((v, i) => (
          <span key={`${v}-${i}`} className={styles.bandPill}>
            {labelForOption(optionSetId, v)}
          </span>
        ))}
      </span>
    );
  }

  if (fieldType === 'steward') {
    return (
      <span className={styles.stewardList}>
        {values.map((v) => (
          <span key={v} className={styles.stewardLine}>
            {v}
          </span>
        ))}
      </span>
    );
  }

  // text — show the captured prose verbatim.
  return <span className={styles.text}>{values.join(' · ')}</span>;
}
