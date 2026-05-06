/**
 * LevelNavigator — generic level-carousel switcher.
 *
 * Ported from `onaxyzogden/ogden-ui-components` MaqasidComparisonWheel sibling.
 * MILOS-only deps stripped:
 *   - react-router-dom useNavigate → @tanstack/react-router useNavigate
 *   - useWheelHoverStore (cross-pillar hover sync) → dropped
 *   - IslamicTerm glossary tooltip → plain label render
 *   - DEFAULT_LEVELS Maqasid framing → `levels` is a required prop
 */

import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './LevelNavigator.css';

const safeSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* swallow quota / availability */
  }
};

export interface Level {
  key: string;
  label: string;
  subtitle?: string;
  title: string;
  desc?: string;
  color?: string;
  routeSuffix?: string;
}

export interface Pillar {
  id: string;
  label: string;
  route?: string;
}

export interface PillarTask {
  id: string;
  title: string;
  columnId?: string;
  completedAt?: string | null;
  priority?: string;
}

export interface GateIndicator {
  afterSegmentId: string;
  label: string;
  status: 'pending' | 'in-progress' | 'complete';
}

export interface LevelNavigatorProps {
  pillars?: Pillar[];
  pillarTasks?: Record<string, PillarTask[]>;
  levels: Level[];
  storageKey?: string;
  controlledLevel?: string;
  onLevelChange?: (key: string) => void;
  currentPillarId?: string;
  compact?: boolean;
  levelDescriptions?: Record<string, Partial<Level>>;
  onSegmentClick?: (pillarId: string, levelKey: string) => void;
  onSubsegClick?: (taskId: string, pillarId: string) => void;
  taskColorFn?: (task: PillarTask) => string;
  gateIndicators?: GateIndicator[];
}

function defaultTaskColor(task: PillarTask): string {
  if (task.completedAt || task.columnId?.endsWith('_done')) return '#22c55e';
  if (!task.columnId?.endsWith('_to_do') && !task.columnId?.endsWith('_todo')) return '#F59E0B';
  return 'var(--border2, rgba(255,255,255,0.12))';
}

export default function LevelNavigator({
  pillars = [],
  pillarTasks = {},
  storageKey,
  controlledLevel,
  onLevelChange,
  currentPillarId,
  compact,
  levelDescriptions,
  levels: baseLevels,
  onSegmentClick,
  onSubsegClick,
  taskColorFn,
  gateIndicators,
}: LevelNavigatorProps) {
  const navigate = useNavigate();
  const [internalIdx, setInternalIdx] = useState(0);

  const activeIdx = controlledLevel
    ? Math.max(0, baseLevels.findIndex((l) => l.key === controlledLevel))
    : internalIdx;

  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);

  const handlePrev = () => {
    setSlideDir('right');
    setTimeout(() => setSlideDir(null), 300);
    const prev = baseLevels[activeIdx - 1];
    if (onLevelChange) {
      if (prev) onLevelChange(prev.key);
    } else setInternalIdx(activeIdx - 1);
  };
  const handleNext = () => {
    setSlideDir('left');
    setTimeout(() => setSlideDir(null), 300);
    const next = baseLevels[activeIdx + 1];
    if (onLevelChange) {
      if (next) onLevelChange(next.key);
    } else setInternalIdx(activeIdx + 1);
  };

  const flnRef = useRef<HTMLDivElement | null>(null);
  const segmentsRef = useRef<HTMLDivElement | null>(null);
  const [stacked, setStacked] = useState(false);

  const checkOverflow = useCallback(() => {
    const flnEl = flnRef.current;
    const segEl = segmentsRef.current;
    if (!flnEl || !segEl || !compact) return;

    const containerW = flnEl.offsetWidth;
    const flnGap = parseFloat(getComputedStyle(flnEl).gap) || 16;
    const available = containerW - flnGap * 2;
    const centerW = available * (2.8 / 4.8);

    const centerEl = flnEl.querySelector('.fln__center');
    if (!centerEl) return;
    const cs = getComputedStyle(centerEl);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const segGap = parseFloat(getComputedStyle(segEl).gap) || 8;
    const barW = (centerW - padX - segGap * (pillars.length - 1)) / Math.max(1, pillars.length);

    const navs = segEl.querySelectorAll('.fln__segment-nav');
    for (const nav of Array.from(navs)) {
      if ((nav as HTMLElement).scrollWidth >= barW * 0.9) {
        setStacked(true);
        return;
      }
    }
    setStacked(false);
  }, [compact, pillars.length]);

  useEffect(() => {
    const el = flnRef.current;
    if (!el || !compact) return;
    const ro = new ResizeObserver(checkOverflow);
    ro.observe(el);
    checkOverflow();
    return () => ro.disconnect();
  }, [compact, checkOverflow]);

  const levels: Level[] = levelDescriptions
    ? baseLevels.map((l) => ({ ...l, ...(levelDescriptions[l.key] ?? {}) }))
    : baseLevels;

  const active = levels[activeIdx];
  const prev = levels[activeIdx - 1] ?? null;
  const next = levels[activeIdx + 1] ?? null;

  const resolveTaskColor = taskColorFn || defaultTaskColor;

  if (!active) return null;

  return (
    <div
      ref={flnRef}
      className={`fln${compact ? ' fln--compact' : ''}${stacked ? ' fln--stacked' : ''}`}
    >
      <div
        className={`fln__side fln__side--left${prev ? ' fln__side--active' : ''}`}
        onClick={() => prev && handlePrev()}
        role={prev ? 'button' : undefined}
        tabIndex={prev ? 0 : undefined}
        aria-label={prev ? `Navigate to previous level: ${prev.title}` : undefined}
        onKeyDown={prev ? (e) => e.key === 'Enter' && handlePrev() : undefined}
      >
        {prev ? (
          <>
            <div className="fln__side-text">
              <span className="fln__side-label" style={{ color: prev.color }}>
                {prev.label}
              </span>
              {prev.subtitle && <span className="fln__side-subtitle">{prev.subtitle}</span>}
              <span className="fln__side-title">{prev.title}</span>
            </div>
            <ChevronLeft
              className="fln__chevron"
              style={{ color: prev.color }}
              size={36}
              strokeWidth={1.5}
            />
          </>
        ) : (
          <div className="fln__side-empty" />
        )}
      </div>

      <div className="fln__center" aria-live="polite">
        <div
          key={activeIdx}
          className={`fln__level-content${slideDir ? ` fln__level-content--${slideDir}` : ''}`}
        >
          <div className="fln__center-head">
            <span className="fln__center-label" style={{ color: active.color }}>
              {active.label}
            </span>
            {active.subtitle && (
              <span className="fln__center-subtitle">{active.subtitle}</span>
            )}
          </div>
          <h2 className="fln__center-title">{active.title}</h2>
          {active.desc && <p className="fln__center-desc">{active.desc}</p>}

          {pillars.length > 0 && (
            <div className="fln__segments" ref={segmentsRef}>
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
          )}
        </div>
      </div>

      <div
        className={`fln__side fln__side--right${next ? ' fln__side--active' : ''}`}
        onClick={() => next && handleNext()}
        role={next ? 'button' : undefined}
        tabIndex={next ? 0 : undefined}
        aria-label={next ? `Navigate to next level: ${next.title}` : undefined}
        onKeyDown={next ? (e) => e.key === 'Enter' && handleNext() : undefined}
      >
        {next ? (
          <>
            <ChevronRight
              className="fln__chevron"
              style={{ color: next.color }}
              size={36}
              strokeWidth={1.5}
            />
            <div className="fln__side-text fln__side-text--right">
              <span className="fln__side-label" style={{ color: next.color }}>
                {next.label}
              </span>
              {next.subtitle && <span className="fln__side-subtitle">{next.subtitle}</span>}
              <span className="fln__side-title">{next.title}</span>
            </div>
          </>
        ) : (
          <div className="fln__side-empty" />
        )}
      </div>
    </div>
  );
}
