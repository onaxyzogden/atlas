// ParallelCallout — banner that surfaces when two or more objectives in
// a tier share the same `parallelGroupId` and are simultaneously
// available with no prerequisite ordering between them (Plan Navigation
// Spec v1, Slice 1.5). Lets the steward know they can pick either to
// start.

import { Layers } from 'lucide-react';
import type { PlanStratumObjective } from '@ogden/shared';
import css from './ParallelCallout.module.css';

interface Props {
  objectives: readonly PlanStratumObjective[];
}

export default function ParallelCallout({ objectives }: Props) {
  if (objectives.length < 2) return null;
  return (
    <div className={css.callout} role="status">
      <span className={css.iconBadge} aria-hidden="true">
        <Layers size={14} strokeWidth={2.2} />
      </span>
      <div className={css.body}>
        <p className={css.title}>Work these in any order</p>
        <p className={css.detail}>
          {objectives.length} objectives are ready at the same time. Pick
          whichever you have the context for first.
        </p>
      </div>
    </div>
  );
}
