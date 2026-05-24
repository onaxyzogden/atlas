/**
 * ObjectiveBanner — slim overlay along the top of the canvas while an objective
 * is in focus. Names the active objective, shows its status, and offers the way
 * back to the Command Centre. The execution controls (checklist + evidence)
 * live in the right rail (Phase 4); this is only the "you are here" affordance.
 */

import { ArrowLeft } from 'lucide-react';
import { OBSERVE_MODULE_DOT } from '../moduleGuidance.js';
import { OBSERVE_MODULE_LABEL } from '../types.js';
import type { ObjectiveStatus } from '../../objectives/fieldObjective.js';
import type { FieldObjectiveView } from '../../objectives/useFieldObjectives.js';
import css from './ObjectiveFocus.module.css';

const STATUS_LABEL: Record<ObjectiveStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  'evidence-submitted': 'Evidence submitted',
  complete: 'Complete',
  'needs-review': 'Needs review',
};

const STATUS_CLASS: Record<ObjectiveStatus, string> = {
  'not-started': '',
  'in-progress': css.status_in_progress ?? '',
  'evidence-submitted': css.status_evidence_submitted ?? '',
  complete: css.status_complete ?? '',
  'needs-review': css.status_needs_review ?? '',
};

interface Props {
  view: FieldObjectiveView;
  onBack: () => void;
}

export default function ObjectiveBanner({ view, onBack }: Props) {
  const { objective, run } = view;
  return (
    <div className={css.banner} role="status" aria-label="Active objective">
      <button type="button" className={css.backBtn} onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={2} /> Command Centre
      </button>
      <span
        className={css.bannerDot}
        style={{ background: OBSERVE_MODULE_DOT[objective.module] }}
        aria-hidden="true"
      />
      <span className={css.bannerModule}>
        {OBSERVE_MODULE_LABEL[objective.module]}
      </span>
      <span className={css.bannerTitle}>{objective.title}</span>
      <span className={`${css.bannerStatus} ${STATUS_CLASS[run.status]}`}>
        {STATUS_LABEL[run.status]}
      </span>
    </div>
  );
}
