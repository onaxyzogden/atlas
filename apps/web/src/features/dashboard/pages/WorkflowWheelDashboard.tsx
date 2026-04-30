/**
 * WorkflowWheelDashboard — dedicated page for the Observe → Plan → Act radial.
 *
 * Hosts `OPAComparisonWheel` on its own dashboard surface so the wheel is
 * reachable via the sidebar at any time, not only from the Site Intelligence
 * verdict hero. The wheel itself is unchanged — it still derives per-stage
 * progress from project state and routes the user to the matching stage hub
 * on segment click.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import OPAComparisonWheel from '../../../components/opa-wheel/OPAComparisonWheel.js';
import css from './WorkflowWheelDashboard.module.css';

interface WorkflowWheelDashboardProps {
  project: LocalProject;
}

export default function WorkflowWheelDashboard({ project }: WorkflowWheelDashboardProps) {
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
    </div>
  );
}
