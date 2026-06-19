/**
 * LaunchProgressPanel -- the display-only blue "progress tracking" panel of a
 * Mode-5 (Launch Preparation) objective detail. Renders the objective's
 * `progressTracking.milestones`: each a `{ metric, cadence }` pair -- WHAT the
 * steward tracks during launch execution (milestone-vs-plan,
 * expenditure-vs-budget, capacity-deployment-vs-estimate) and HOW OFTEN it is
 * reviewed.
 *
 * Pure presentational. Deliberately distinct from `MonitoringStreamPanel` (the
 * green ecological/operational Observe-design input): progress tracking is
 * execution bookkeeping with NO Observe-domain destination (no `feeds`), so it
 * carries no feeds line. DISPLAY-ONLY -- it never gates.
 */

import { ListChecks } from 'lucide-react';
import css from './LaunchProgressPanel.module.css';

export interface LaunchMilestone {
  metric: string;
  cadence: string;
}

export interface LaunchProgressPanelProps {
  milestones: readonly LaunchMilestone[];
}

export default function LaunchProgressPanel({ milestones }: LaunchProgressPanelProps) {
  return (
    <section
      className={css.panel}
      data-testid="launch-progress"
      aria-label="Launch progress tracking"
    >
      <div className={css.head}>
        <ListChecks size={14} aria-hidden="true" className={css.icon} />
        <p className={css.title}>Progress tracking</p>
      </div>

      <ul className={css.list}>
        {milestones.map(({ metric, cadence }) => (
          <li key={metric} className={css.item}>
            <span className={css.bullet} aria-hidden="true" />
            <span className={css.metric}>
              {metric}
              <span className={css.cadence} data-testid="launch-progress-cadence">
                {cadence}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
