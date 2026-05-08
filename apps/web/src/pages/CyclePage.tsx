/**
 * CyclePage — top-level Cycle surface.
 * Renders a 3-segment Observe / Plan / Act wheel with CYCLE in the center.
 * Each segment links into the active project's stage page.
 */

import { useNavigate } from '@tanstack/react-router';
import { Eye, Compass, Zap } from 'lucide-react';
import CycleWheel, { type CycleSegment } from '../components/CycleWheel/index.js';
import { useProjectStore } from '../store/projectStore.js';
import styles from './CyclePage.module.css';

export default function CyclePage() {
  const navigate = useNavigate();
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

  const goStage = (stage: 'observe' | 'plan' | 'act') => {
    if (!activeProjectId) {
      navigate({ to: '/v3/project' });
      return;
    }
    navigate({
      to: `/v3/project/$projectId/${stage}`,
      params: { projectId: activeProjectId },
    });
  };

  const segments: CycleSegment[] = [
    {
      id: 'observe',
      label: 'Observe',
      Icon: Eye,
      description: 'Capture site conditions — soil, water, ecology, human context, climate, infrastructure.',
      onClick: () => goStage('observe'),
      disabled: !activeProjectId,
    },
    {
      id: 'plan',
      label: 'Plan',
      Icon: Compass,
      description: 'Design zones, paddocks, water systems, structures, and crops from observations.',
      onClick: () => goStage('plan'),
      disabled: !activeProjectId,
    },
    {
      id: 'act',
      label: 'Act',
      Icon: Zap,
      description: 'Execute the plan — implementation, construction, monitoring, and stewardship.',
      onClick: () => goStage('act'),
      disabled: !activeProjectId,
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Cycle</h1>
        <p className={styles.subtitle}>Observe → Plan → Act</p>
        <CycleWheel className={styles.wheel} segments={segments} />
        {!activeProjectId && (
          <p className={styles.hint}>
            No active project. Hovering shows what each stage covers — choose a project from
            All Projects to enable navigation.
          </p>
        )}
      </div>
    </div>
  );
}
