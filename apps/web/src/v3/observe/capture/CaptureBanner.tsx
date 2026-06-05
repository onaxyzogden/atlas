/**
 * CaptureBanner — slim overlay along the top of the canvas while an observation
 * need is in focus. Names the active need, shows its status, and offers the way
 * back to the Command Centre. The capture controls (checklist + evidence) live
 * in the right rail; this is only the "you are here" affordance.
 */

import { ArrowLeft } from 'lucide-react';
import { OBSERVE_MODULE_DOT } from '../moduleGuidance.js';
import { OBSERVE_MODULE_LABEL } from '../types.js';
import type { ObservationNeedStatus } from '../../observation-needs/observationNeed.js';
import type { ObservationNeedView } from '../../observation-needs/useObservationNeeds.js';
import css from './CaptureFocus.module.css';

const STATUS_LABEL: Record<ObservationNeedStatus, string> = {
  open: 'Open',
  'in-progress': 'In progress',
  recorded: 'Recorded',
  resolved: 'Resolved',
};

const STATUS_CLASS: Record<ObservationNeedStatus, string> = {
  open: '',
  'in-progress': css.status_in_progress ?? '',
  recorded: css.status_complete ?? '',
  resolved: css.status_complete ?? '',
};

interface Props {
  view: ObservationNeedView;
  onBack: () => void;
}

export default function CaptureBanner({ view, onBack }: Props) {
  const { objective, run } = view;
  return (
    <div className={css.banner} role="status" aria-label="Active observation need">
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
