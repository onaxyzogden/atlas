/**
 * Mode5LaunchChrome -- the Plan-only launch-preparation chrome for a Mode-5
 * (Stratum 7 / "Launch Preparation") objective detail. Surfaces the two
 * display-only affordances the Tier-6 restructure adds to an objective:
 *
 *   1. Progress tracking -- the blue panel of `{ metric, cadence }` milestones
 *      (`progressTracking`), the execution bookkeeping the steward reads during
 *      launch (milestone-vs-plan, expenditure-vs-budget,
 *      capacity-deployment-vs-estimate).
 *   2. Act handoff -- the launch package this objective hands to Act
 *      (`actHandoff`).
 *
 * The chrome renders nothing unless the objective carries `progressTracking`
 * (every resolving Tier-6 objective does; nothing else does). `actHandoff` alone
 * never arms the chrome -- it predates the restructure and appears on many
 * non-Tier-6 objectives; it only shows as a chip once the chrome is already
 * armed by `progressTracking`. SEPARATE from `Mode4DesignChrome` so an objective
 * carrying BOTH fields shows accurate, non-overlapping eyebrows.
 *
 * ALL FIELDS ARE DISPLAY-ONLY and never gate. Plan-only by construction:
 * ObjectiveDetailPanel (its only mount) is rendered solely by PlanTierShell /
 * PlanStratumShell, so the Act stage is byte-identical.
 */

import type { PlanStratumObjective } from '@ogden/shared';
import { ArrowRight, Rocket } from 'lucide-react';
import LaunchProgressPanel from './LaunchProgressPanel.js';
import css from './Mode5LaunchChrome.module.css';

export interface Mode5LaunchChromeProps {
  objective: PlanStratumObjective;
}

export default function Mode5LaunchChrome({ objective }: Mode5LaunchChromeProps) {
  const { progressTracking, actHandoff } = objective;

  // Arm only on the genuinely Mode-5 display field. actHandoff is intentionally
  // excluded from this test (it predates the restructure and appears on many
  // non-Tier-6 objectives).
  if (progressTracking == null) return null;

  return (
    <section
      className={css.chrome}
      data-testid="mode5-launch-chrome"
      aria-label="Mode 5 launch preparation detail"
    >
      <div className={css.eyebrow}>
        <Rocket size={13} aria-hidden="true" className={css.eyebrowIcon} />
        <span>Mode 5 -- Launch Preparation</span>
      </div>

      <LaunchProgressPanel milestones={progressTracking.milestones} />

      {actHandoff != null && (
        <p className={css.handoff} data-testid="mode5-act-handoff">
          <ArrowRight size={13} aria-hidden="true" className={css.handoffIcon} />
          <span className={css.handoffLabel}>Act handoff</span>
          <span className={css.handoffValue}>{actHandoff}</span>
        </p>
      )}
    </section>
  );
}
