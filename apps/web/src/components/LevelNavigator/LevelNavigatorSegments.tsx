/**
 * LevelNavigatorSegments — pillar segment row only.
 *
 * Reads state from LevelNavigatorContext. Renders nothing when no provider
 * is mounted, or when the active level has no pillars. Mounted inside the
 * page content (e.g. ObserveLayout's `.top` band) so the title card and the
 * segments stay visually decoupled but state-coupled.
 *
 * Visual: identical markup to the legacy LevelNavigator's `fln__segments`
 * block — reuses the existing `LevelNavigator.css` stylesheet.
 */

import { Fragment } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useLevelNavigator } from './LevelNavigatorContext.js';
import type { PillarTask } from './LevelNavigator.js';
import './LevelNavigator.css';

const safeSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* swallow quota / availability */
  }
};

function defaultTaskColor(task: PillarTask): string {
  if (task.completedAt || task.columnId?.endsWith('_done')) return '#22c55e';
  if (!task.columnId?.endsWith('_to_do') && !task.columnId?.endsWith('_todo')) return '#F59E0B';
  return 'var(--border2, rgba(255,255,255,0.12))';
}

export default function LevelNavigatorSegments() {
  const ctx = useLevelNavigator();
  const navigate = useNavigate();
  if (!ctx) return null;
  const {
    active,
    pillars,
    pillarTasks,
    currentPillarId,
    onSegmentClick,
    onSubsegClick,
    taskColorFn,
    gateIndicators,
    storageKey,
  } = ctx;
  if (pillars.length === 0) return null;

  const resolveTaskColor = taskColorFn || defaultTaskColor;

  return (
    <div className="fln-segments-only">
      <div className="fln__segments">
        {pillars.map(({ id, label, route }) => {
          const tasks = pillarTasks[id] || [];
          const isCurrent = currentPillarId === id;
          const handleSegClick = () => {
            if (onSegmentClick) {
              onSegmentClick(id, active.key);
            } else {
              if (storageKey) safeSet(storageKey, active.key);
              if (route) navigate({ to: route });
            }
          };
          const gate = gateIndicators?.find((g) => g.afterSegmentId === id);
          return (
            <Fragment key={id}>
              <div
                className={`fln__segment-col${isCurrent ? ' fln__segment-col--current' : ''}`}
                style={{ ['--seg-color' as string]: active.color } as React.CSSProperties}
                data-pillar-id={id}
                onClick={handleSegClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSegClick()}
              >
                <div className="fln__segment-bar">
                  {tasks.length > 0 ? (
                    tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        className="fln__subseg"
                        style={{ background: resolveTaskColor(task) }}
                        title={task.title}
                        aria-label={`Task: ${task.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSubsegClick) {
                            onSubsegClick(task.id, id);
                          } else {
                            if (storageKey) safeSet(storageKey, active.key);
                            if (route) navigate({ to: `${route}?task=${task.id}` });
                          }
                        }}
                      />
                    ))
                  ) : (
                    <div className="fln__subseg fln__subseg--empty" />
                  )}
                </div>
                <button
                  type="button"
                  className="fln__segment-nav"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSegClick();
                  }}
                >
                  {label}
                </button>
              </div>
              {gate && (
                <button
                  type="button"
                  className={`fln__gate-indicator fln__gate-indicator--${gate.status}`}
                  title={`${gate.label} (${gate.status})`}
                  aria-label={`Gate: ${gate.label} — ${gate.status}`}
                  onClick={() => {
                    if (onSegmentClick) onSegmentClick(gate.afterSegmentId, active.key);
                  }}
                >
                  <span className="fln__gate-diamond">&#x25C6;</span>
                </button>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
