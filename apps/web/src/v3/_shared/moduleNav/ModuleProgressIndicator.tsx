/**
 * ModuleProgressIndicator — task-status subsegment row for a shared ModuleBar
 * tile. Mirrors the `.cardProgress` block from Observe's bespoke
 * `ObserveModuleBar`, but renders **non-interactive** `<div>` subsegments
 * (never `<button>`s): the shared `ModuleBar` tile is itself a `<button>`, and
 * nesting buttons is invalid HTML. Tile clicks therefore select the module;
 * the colored subsegments are a passive progress read-out.
 *
 * Data-derived: reads `pillarTasks[module]` + `taskColorFn` straight from the
 * `LevelNavigator` context, so it lights up the moment real progress flows in
 * (e.g. from `usePlanProgress` via `V3LevelNavBridge`). When the context has no
 * tasks for the module it renders a single empty placeholder, matching the
 * default `.tileBar`.
 */

import { useLevelNavigator } from '../../../components/LevelNavigator/index.js';
import type { PillarTask } from '../../../components/LevelNavigator/index.js';
import css from './ModuleBar.module.css';

function defaultTaskColor(task: PillarTask): string {
  if (task.completedAt || task.columnId?.endsWith('_done')) return '#22c55e';
  if (!task.columnId?.endsWith('_to_do') && !task.columnId?.endsWith('_todo'))
    return '#F59E0B';
  return 'var(--border2, rgba(255,255,255,0.12))';
}

export default function ModuleProgressIndicator({
  module,
}: {
  module: string;
}) {
  const ctx = useLevelNavigator();
  const tasks = ctx?.pillarTasks?.[module] ?? [];
  const taskColor = ctx?.taskColorFn || defaultTaskColor;

  return (
    <div className={css.cardProgress} aria-hidden="true">
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <div
            key={task.id}
            className={css.subseg}
            style={{ background: taskColor(task) }}
            title={task.title}
          />
        ))
      ) : (
        <div className={`${css.subseg} ${css.subsegEmpty}`} />
      )}
    </div>
  );
}
