/**
 * SiteIntelligenceDashboard — dashboard-page wrapper around SiteIntelligencePanel.
 *
 * The underlying panel is fully project-scoped and has no map coupling, so it
 * renders identically inside the dashboard content column as it does in the
 * MapView right rail. This file only exists to match the dashboard-page
 * contract (`{ project, onSwitchToMap }`) and to be lazy-imported by
 * DashboardRouter.
 */

import type { LocalProject } from '../../../store/projectStore.js';
import SiteIntelligencePanel from '../../../components/panels/SiteIntelligencePanel.js';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void; // contract-compliance; unused by this page
}

export default function SiteIntelligenceDashboard({ project }: Props) {
  return <SiteIntelligencePanel project={project} />;
}
