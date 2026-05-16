/**
 * PlanViewBadge — header chip for Plan module slide-ups. Tells the
 * steward at a glance which view + Yeomans cap the dashboard is
 * scoped to.
 *
 * Two display modes:
 *
 * - **Phased module** — shows the active view label combined with
 *   the year scrubber's derived Yeomans cap
 *   (e.g. "Vision · Year 5 · capped at buildings").
 *
 * - **Time-invariant module** — overrides to a muted
 *   "All years · time-invariant" chip regardless of view, since the
 *   underlying store has no `proposed.phase` axis.
 */

import { usePlanView } from './PlanViewContext.js';
import { PLAN_MODULE_SCOPE } from './PlanViewContext.js';
import { useTemporalScrubStore } from './canvas/temporalScrubStore.js';
import { yeomansCapForYear, type PlanModule, type PlanView } from './types.js';
import css from './PlanViewBadge.module.css';

interface Props {
  module: PlanModule;
}

const BASE_LABEL: Record<PlanView, { text: string; className: string | undefined }> = {
  current:   { text: 'Current land',         className: css.current },
  vision:    { text: 'Vision · final state', className: css.vision },
  terrain3d: { text: '3D Terrain',           className: css.terrain },
};

export default function PlanViewBadge({ module }: Props) {
  const view = usePlanView();
  const currentYear = useTemporalScrubStore((s) => s.currentYear);
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

  const entry = BASE_LABEL[view];
  const capKey = yeomansCapForYear(currentYear);
  const yearSuffix = capKey
    ? ` · Year ${currentYear} · capped at ${capKey}`
    : ` · Year ${currentYear}`;
  return (
    <span
      className={`${css.badge} ${entry.className ?? ''}`}
      title="Data on this view is scoped by Yeomans Scale of Permanence (year-scrubber driven)."
    >
      <span className={css.dot} aria-hidden="true" />
      {entry.text}
      {yearSuffix}
    </span>
  );
}
