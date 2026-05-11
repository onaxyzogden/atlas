/**
 * PlanViewBadge — header chip for Plan module slide-ups. Tells the
 * steward at a glance which view the dashboard is scoped to.
 *
 * Two display modes:
 *
 * - **Phased module** — shows the active view's year label
 *   (e.g. "Year 1 · capped at water phase"). Year colours match the
 *   PlanPhaseTabs strip palette.
 *
 * - **Time-invariant module** — overrides to a muted
 *   "All years · time-invariant" chip regardless of view, since the
 *   underlying store has no `proposed.phase` axis.
 */

import { usePlanView } from './PlanViewContext.js';
import { PLAN_MODULE_SCOPE } from './PlanViewContext.js';
import type { PlanModule } from './types.js';
import css from './PlanViewBadge.module.css';

interface Props {
  module: PlanModule;
}

const LABEL: Record<
  ReturnType<typeof usePlanView>,
  { text: string; className: string | undefined }
> = {
  current:   { text: 'Current land',                 className: css.current },
  vision:    { text: 'Vision · final state',         className: css.vision },
  'phase-1': { text: 'Year 1 · capped at water',     className: css.phase1 },
  'phase-2': { text: 'Year 5 · capped at buildings', className: css.phase2 },
  terrain3d: { text: '3D Terrain',                   className: css.terrain },
};

export default function PlanViewBadge({ module }: Props) {
  const view = usePlanView();
  const scope = PLAN_MODULE_SCOPE[module];

  if (scope === 'time-invariant') {
    return (
      <span
        className={`${css.badge} ${css.muted}`}
        title="This module's data is not phased by Yeomans scale — it shows the same content on every view."
      >
        <span className={css.dot} aria-hidden="true" />
        All years · time-invariant
      </span>
    );
  }

  const entry = LABEL[view];
  return (
    <span
      className={`${css.badge} ${entry.className ?? ''}`}
      title="Data on this view is scoped by Yeomans Scale of Permanence."
    >
      <span className={css.dot} aria-hidden="true" />
      {entry.text}
    </span>
  );
}
