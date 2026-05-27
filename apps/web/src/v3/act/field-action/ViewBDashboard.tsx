/**
 * ViewBDashboard — All Tasks Dashboard (OLOS Act Command Center §4).
 *
 * Layout per spec §4.2: NextUpCard at the top, filter strip below, then
 * Active / Ready to Start / Blocked + Diverged / Completed Today
 * sections. Reads from `useFieldActions` so all priority + grouping
 * logic stays out of the component.
 *
 * Empty-state behaviour: when the project has zero field actions at all
 * (filter cleared and nothing exists), an inline "Nothing here yet"
 * card replaces the section stack so the dashboard doesn't render as a
 * row of empty headers. Demo seeding via `seedDemoActionsIfEmpty` keeps
 * fresh projects out of this state.
 */

import { useEffect, useMemo } from 'react';
import {
  selectFieldActionsForProject,
  useFieldActionStore,
} from '../../../store/fieldActionStore.js';
import { seedDemoActionsIfEmpty } from './seedDemoActions.js';
import { useFieldActions } from './useFieldActions.js';
import NextUpCard from './NextUpCard.js';
import FieldActionFilter from './FieldActionFilter.js';
import ActiveTasksSection from './ActiveTasksSection.js';
import ReadyToStartSection from './ReadyToStartSection.js';
import BlockedDivergedSection from './BlockedDivergedSection.js';
import CompletedTodaySection from './CompletedTodaySection.js';
import css from './ViewBDashboard.module.css';

interface Props {
  projectId: string;
}

export default function ViewBDashboard({ projectId }: Props) {
  // Idempotent first-load seed so the dashboard is non-empty for
  // verification. Real authoring lands in Slice 3.3.
  useEffect(() => {
    if (!projectId) return;
    seedDemoActionsIfEmpty(projectId);
  }, [projectId]);

  const allTasks = useFieldActionStore((s) =>
    selectFieldActionsForProject(s, projectId),
  );
  const {
    nextUp,
    active,
    readyToStart,
    blockedDiverged,
    completedToday,
    filter,
    setFilter,
    clearFilter,
    hasFilter,
  } = useFieldActions(projectId);

  const totalCount = useMemo(
    () => active.reduce((n, g) => n + g.tasks.length, 0)
      + readyToStart.reduce((n, g) => n + g.tasks.length, 0)
      + blockedDiverged.length
      + completedToday.length,
    [active, readyToStart, blockedDiverged, completedToday],
  );

  return (
    <div className={css.scroll}>
      <div className={css.column}>
        <NextUpCard projectId={projectId} action={nextUp} />
        <FieldActionFilter
          allTasks={allTasks}
          filter={filter}
          onChange={setFilter}
          onClear={clearFilter}
          hasFilter={hasFilter}
        />
        {totalCount === 0 && hasFilter && (
          <div className={css.emptyFiltered}>
            No field actions match this filter. <button type="button" onClick={clearFilter} className={css.inlineClear}>Clear filters</button>
          </div>
        )}
        <ActiveTasksSection projectId={projectId} groups={active} />
        <ReadyToStartSection projectId={projectId} groups={readyToStart} />
        <BlockedDivergedSection projectId={projectId} tasks={blockedDiverged} />
        <CompletedTodaySection projectId={projectId} tasks={completedToday} />
      </div>
    </div>
  );
}
