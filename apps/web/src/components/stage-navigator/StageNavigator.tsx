/**
 * StageNavigator — wraps `LevelNavigator` from @ogden/ui-components to drive
 * the Atlas Observe / Plan / Act workflow.
 *
 * Key behaviours:
 *   - Replaces the package's default Maqasid-tier labels (Daruriyyat /
 *     Hajiyyat / Tahsiniyyat) with STAGE 1 / STAGE 2 / STAGE 3, titled
 *     Observe / Plan / Act, sourced from STAGE3_META in the canonical
 *     navigation taxonomy.
 *   - Lists each stage's dashboard-only modules as the navigator's pillars,
 *     using the same denominator filter as `computeStageProgress`
 *     (excluding the workflow-wheel meta-page and per-stage hub items).
 *   - Clicking a module pops it open inside a SlideUpPanel by re-rendering
 *     the existing DashboardRouter with that section id — no routing,
 *     `activeDashboardSection` stays put, and dismissing the pane returns
 *     to the same workflow surface.
 *
 * Wrapped in MemoryRouter because LevelNavigator calls useNavigate() at
 * the top of its render (same constraint as MaqasidComparisonWheel).
 */

import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LevelNavigator } from '@ogden/ui-components';
import type { LocalProject } from '../../store/projectStore.js';
import {
  DASHBOARD_ITEMS,
  STAGE3_META,
  STAGE3_ORDER,
  type Stage3Key,
} from '../../features/navigation/taxonomy.js';
import SlideUpPanel from '../SlideUpPanel.js';
import DashboardRouter from '../../features/dashboard/DashboardRouter.js';
import styles from './StageNavigator.module.css';

interface StageNavigatorProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const STAGE_LABEL: Record<Stage3Key, string> = {
  observe: 'STAGE 1',
  plan: 'STAGE 2',
  act: 'STAGE 3',
};

/**
 * Modules per stage. Mirrors `computeStageProgress`'s filter so the navigator
 * shows the same items that count toward the wheel's per-stage denominator
 * (minus the per-stage hub which is a hybrid landing page, not a module).
 */
function modulesForStage(stage: Stage3Key) {
  return DASHBOARD_ITEMS.filter(
    (item) =>
      item.stage3 === stage &&
      item.dashboardOnly === true &&
      item.id !== 'workflow-wheel' &&
      !item.id.endsWith('-hub'),
  );
}

export default function StageNavigator({ project, onSwitchToMap }: StageNavigatorProps) {
  const [activeStage, setActiveStage] = useState<Stage3Key>('observe');
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openTitle, setOpenTitle] = useState<string>('');

  const levels = STAGE3_ORDER.map((key) => ({
    key,
    label: STAGE_LABEL[key],
    title: STAGE3_META[key].name,
    desc: STAGE3_META[key].desc,
    color: STAGE3_META[key].color,
  }));

  const stageModules = modulesForStage(activeStage);
  const pillars = stageModules.map((item) => ({
    id: item.dashboardRoute ?? item.id,
    label: item.label,
    // Intentionally no `route` — onSegmentClick handles activation so
    // the package's internal useNavigate is never invoked.
  }));

  const handleSegmentClick = (pillarId: string) => {
    const item = stageModules.find(
      (i) => (i.dashboardRoute ?? i.id) === pillarId,
    );
    setOpenSection(pillarId);
    setOpenTitle(item?.label ?? '');
  };

  return (
    <div className={styles.container}>
      <MemoryRouter>
        <LevelNavigator
          levels={levels}
          controlledLevel={activeStage}
          onLevelChange={(key) => setActiveStage(key as Stage3Key)}
          pillars={pillars}
          onSegmentClick={handleSegmentClick}
          showDiacritics={false}
        />
      </MemoryRouter>

      <SlideUpPanel
        isOpen={openSection !== null}
        onClose={() => setOpenSection(null)}
        title={openTitle}
      >
        {openSection && (
          <DashboardRouter
            section={openSection}
            project={project}
            onSwitchToMap={onSwitchToMap}
          />
        )}
      </SlideUpPanel>
    </div>
  );
}
