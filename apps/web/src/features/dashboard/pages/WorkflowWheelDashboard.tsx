/**
 * WorkflowWheelDashboard — dedicated page for the Observe → Plan → Act radial.
 *
 * Hosts two complementary primitives:
 *   - `OPAComparisonWheel` (top): radial completion view across the three
 *     stages, sourced from project store presence.
 *   - `StageNavigator` (bottom): list-style 3-stage carousel that opens any
 *     module's existing dashboard page in a slide-up pane without leaving
 *     this surface.
 *
 * Both surface the same Observe → Plan → Act IA from the canonical taxonomy.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import OPAComparisonWheel from '../../../components/opa-wheel/OPAComparisonWheel.js';
import StageNavigator from '../../../components/stage-navigator/StageNavigator.js';
import css from './WorkflowWheelDashboard.module.css';

interface WorkflowWheelDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

export default function WorkflowWheelDashboard({ project, onSwitchToMap }: WorkflowWheelDashboardProps) {
  return (
    <div className={css.page}>
      <header className={css.header}>
        <h1 className={css.title}>Workflow</h1>
        <p className={css.subtitle}>
          Observe → Plan → Act. Each segment shows how much of that stage's
          taxonomy you have data for; click a segment to jump to its hub.
        </p>
      </header>
      <OPAComparisonWheel project={project} levelColor="#8b7355" />
      <StageNavigator project={project} onSwitchToMap={onSwitchToMap} />
    </div>
  );
}
