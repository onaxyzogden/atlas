// EditInPlanButton.tsx
//
// Deep-links to where a prefilled checklist answer is authored, so editing is
// done in Plan (not re-asked in Act). Shared by the Vision forms modal recap
// tab (primary surface). The route is derived from the answerSpec's editRoute:
// `wizard-step` -> the wizard's vision/team step; `plan-type` -> the Plan view
// (project-type taxonomy modals live in the Plan header).

import { Pencil } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import type { PlanDecisionChecklistItem } from '@ogden/shared';
import styles from './EditInPlanButton.module.css';

type EditRoute = NonNullable<PlanDecisionChecklistItem['answerSpec']>['editRoute'];

interface Props {
  projectId: string;
  editRoute: EditRoute;
}

export default function EditInPlanButton({ projectId, editRoute }: Props) {
  const navigate = useNavigate();

  const onEdit = () => {
    if (editRoute.kind === 'wizard-step') {
      void navigate({
        to: '/v3/project/$projectId/wizard/$step',
        params: { projectId, step: editRoute.step },
      });
    } else {
      // plan-type: land in Plan and open the project-type change modal directly
      // (one-shot ?changeType=1, consumed + stripped by the Plan tier shell).
      void navigate({
        to: '/v3/project/$projectId/plan',
        params: { projectId },
        search: { changeType: '1' },
      });
    }
  };

  return (
    <button type="button" className={styles.editLink} onClick={onEdit}>
      <Pencil size={11} strokeWidth={2.5} />
      Edit in Plan
    </button>
  );
}
