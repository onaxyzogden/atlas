/**
 * ObserveModuleBar — single bottom-anchored navigator that combines the
 * `LevelNavigatorSegments` progress bars with the legacy `ObserveBottomRail`
 * tiles. One row, six cards: progress bar + label.
 *
 * Click semantics on a card:
 *   - inactive card           → onSelectModule(mod) navigates only (no slide-up)
 *   - active + slide-up shut  → onOpenSlideUp() opens the slide-up (URL stays)
 *   - active + slide-up open  → onCloseSlideUp() closes the slide-up (URL stays)
 *
 * Sub-seg buttons swallow the click via stopPropagation and route to a
 * task-specific URL — no slide-up side-effect — mirroring the segment row.
 */

import { useNavigate } from '@tanstack/react-router';
import { useLevelNavigator } from '../../../components/LevelNavigator/index.js';
import type { PillarTask } from '../../../components/LevelNavigator/index.js';
import {
  OBSERVE_MODULES,
  OBSERVE_MODULE_LABEL,
  type ObserveModule,
} from '../types.js';
import css from './ObserveModuleBar.module.css';

function defaultTaskColor(task: PillarTask): string {
  if (task.completedAt || task.columnId?.endsWith('_done')) return '#22c55e';
  if (!task.columnId?.endsWith('_to_do') && !task.columnId?.endsWith('_todo'))
    return '#F59E0B';
  return 'var(--border2, rgba(255,255,255,0.12))';
}

interface Props {
  activeModule: ObserveModule | null;
  onSelectModule: (module: ObserveModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

export default function ObserveModuleBar({
  activeModule,
  onSelectModule,
  slideUpOpen,
  onOpenSlideUp,
  onCloseSlideUp,
}: Props) {
  const ctx = useLevelNavigator();
  const navigate = useNavigate();

  const pillarTasks = ctx?.pillarTasks ?? {};
  const taskColor = ctx?.taskColorFn || defaultTaskColor;

  const handleCardClick = (mod: ObserveModule) => {
    if (mod === activeModule) {
      if (slideUpOpen) {
        onCloseSlideUp();
      } else {
        onOpenSlideUp();
      }
      return;
    }
    onSelectModule(mod);
  };

  return (
    <div className={css.rail}>
      <div className={css.tiles} role="toolbar" aria-label="Observe modules">
        {OBSERVE_MODULES.map((mod) => {
            const isActive = activeModule === mod;
            const tasks = pillarTasks[mod] ?? [];
            return (
              <button
                key={mod}
                type="button"
                role="button"
                aria-pressed={isActive}
                className={`${css.tile} ${isActive ? css.tileActive : ''}`}
                onClick={() => handleCardClick(mod)}
              >
                <div className={css.cardProgress} aria-hidden="true">
                  {tasks.length > 0 ? (
                    tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        className={css.subseg}
                        style={{ background: taskColor(task) }}
                        title={task.title}
                        aria-label={`Task: ${task.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (ctx?.onSubsegClick) {
                            ctx.onSubsegClick(task.id, mod);
                            return;
                          }
                          const pillar = ctx?.pillars.find((p) => p.id === mod);
                          if (pillar?.route) {
                            navigate({ to: `${pillar.route}?task=${task.id}` });
                          }
                        }}
                      />
                    ))
                  ) : (
                    <div className={`${css.subseg} ${css.subsegEmpty}`} />
                  )}
                </div>
                <span className={css.tileLabel}>
                  {OBSERVE_MODULE_LABEL[mod]}
                </span>
              </button>
            );
        })}
      </div>
    </div>
  );
}
