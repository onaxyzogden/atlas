/**
 * StageNavigator — wraps `LevelNavigator` from @ogden/ui-components to drive
 * the Atlas Observe / Plan / Act workflow.
 *
 * Structure (BBOS template, per @ogden/ui-components README):
 *   - Levels   = stages   → STAGE 1 / STAGE 2 / STAGE 3 (Observe / Plan / Act)
 *   - Pillars  = modules  → e.g. "Human Context", "Water Management"
 *                            (sourced from `stageModules.ts` which lifts the
 *                            module groupings out of taxonomy.ts comments)
 *   - Tasks    = pages    → individual dashboard surfaces inside the module
 *                            (e.g. Steward Survey + Indigenous & Regional
 *                            Context both live under "Human Context")
 *
 * Clicking a task sub-segment opens the matching dashboard page inside
 * SlideUpPanel by re-rendering DashboardRouter with that section id —
 * `activeDashboardSection` stays put. Clicking the pillar column itself
 * opens the first task in that module as a sensible default.
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
import { STAGE_MODULES } from './stageModules.js';
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
 * Resolve an item id (e.g. `observe-steward-survey`) to its NavItem so we
 * can read the canonical `label` for the task title and slide-up header.
 * Falls back to the raw id when an entry is missing — keeps the navigator
 * resilient against typos in `stageModules.ts`.
 */
function findItemLabel(itemId: string): string {
  const item = DASHBOARD_ITEMS.find((i) => i.id === itemId);
  return item?.label ?? itemId;
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

  const stageModules = STAGE_MODULES[activeStage];

  // Pillars = modules. Intentionally no `route` so onSegmentClick handles
  // activation and the package's internal useNavigate is never invoked.
  const pillars = stageModules.map((mod) => ({
    id: mod.id,
    label: mod.label,
  }));

  // pillarTasks[moduleId] = the dashboard pages within that module. We omit
  // `columnId` so each task renders with the package's default in-progress
  // amber fill. A future iteration can drive the colour from real
  // store-presence (`columnId: 'col_done' | 'col_to_do'`) to mirror the
  // wheel's per-stage progress signal.
  const pillarTasks: Record<string, { id: string; title: string }[]> = {};
  for (const mod of stageModules) {
    pillarTasks[mod.id] = mod.itemIds.map((itemId) => ({
      id: itemId,
      title: findItemLabel(itemId),
    }));
  }

  const openItem = (itemId: string) => {
    setOpenSection(itemId);
    setOpenTitle(findItemLabel(itemId));
  };

  const handleSegmentClick = (pillarId: string) => {
    // Default action: open the first page in the clicked module.
    const mod = stageModules.find((m) => m.id === pillarId);
    const firstItem = mod?.itemIds[0];
    if (firstItem) openItem(firstItem);
  };

  const handleSubsegClick = (taskId: string) => {
    openItem(taskId);
  };

  return (
    <div className={styles.container}>
      <MemoryRouter>
        <LevelNavigator
          levels={levels}
          controlledLevel={activeStage}
          onLevelChange={(key) => setActiveStage(key as Stage3Key)}
          pillars={pillars}
          pillarTasks={pillarTasks}
          onSegmentClick={handleSegmentClick}
          onSubsegClick={handleSubsegClick}
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
