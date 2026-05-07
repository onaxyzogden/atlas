/**
 * LevelNavigatorContext — shared state for the split LevelNavigator.
 *
 * Owns level switching (activeIdx, slideDir, prev/next nav) and the segment
 * config (pillars, pillarTasks, currentPillarId, callbacks). Mounted high in
 * the tree so two consumers — LevelNavigatorBar (header center) and
 * LevelNavigatorSegments (in-page row) — render in lockstep.
 *
 * useLevelNavigator() returns null when no provider is mounted; consumers
 * must self-suppress in that case (e.g. AppShell header bar on /home).
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  GateIndicator,
  Level,
  Pillar,
  PillarTask,
} from './LevelNavigator.js';

export interface LevelNavigatorContextValue {
  levels: Level[];
  active: Level;
  prev: Level | null;
  next: Level | null;
  slideDir: 'left' | 'right' | null;
  goPrev: () => void;
  goNext: () => void;
  pillars: Pillar[];
  pillarTasks: Record<string, PillarTask[]>;
  currentPillarId?: string;
  onSegmentClick?: (pillarId: string, levelKey: string) => void;
  onSubsegClick?: (taskId: string, pillarId: string) => void;
  taskColorFn?: (task: PillarTask) => string;
  gateIndicators?: GateIndicator[];
  storageKey?: string;
}

const Ctx = createContext<LevelNavigatorContextValue | null>(null);

export function useLevelNavigator(): LevelNavigatorContextValue | null {
  return useContext(Ctx);
}

export interface LevelNavigatorProviderProps {
  levels: Level[];
  controlledLevel?: string;
  onLevelChange?: (key: string) => void;
  pillars?: Pillar[];
  pillarTasks?: Record<string, PillarTask[]>;
  currentPillarId?: string;
  onSegmentClick?: (pillarId: string, levelKey: string) => void;
  onSubsegClick?: (taskId: string, pillarId: string) => void;
  taskColorFn?: (task: PillarTask) => string;
  gateIndicators?: GateIndicator[];
  storageKey?: string;
  children: ReactNode;
}

export function LevelNavigatorProvider({
  levels,
  controlledLevel,
  onLevelChange,
  pillars = [],
  pillarTasks = {},
  currentPillarId,
  onSegmentClick,
  onSubsegClick,
  taskColorFn,
  gateIndicators,
  storageKey,
  children,
}: LevelNavigatorProviderProps) {
  const [internalIdx, setInternalIdx] = useState(0);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const slideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeIdx = controlledLevel
    ? Math.max(0, levels.findIndex((l) => l.key === controlledLevel))
    : internalIdx;

  const slide = useCallback((dir: 'left' | 'right') => {
    setSlideDir(dir);
    if (slideTimer.current) clearTimeout(slideTimer.current);
    slideTimer.current = setTimeout(() => setSlideDir(null), 300);
  }, []);

  const goPrev = useCallback(() => {
    const target = levels[activeIdx - 1];
    if (!target) return;
    slide('right');
    if (onLevelChange) onLevelChange(target.key);
    else setInternalIdx(activeIdx - 1);
  }, [activeIdx, levels, onLevelChange, slide]);

  const goNext = useCallback(() => {
    const target = levels[activeIdx + 1];
    if (!target) return;
    slide('left');
    if (onLevelChange) onLevelChange(target.key);
    else setInternalIdx(activeIdx + 1);
  }, [activeIdx, levels, onLevelChange, slide]);

  const active = levels[activeIdx];

  const value = useMemo<LevelNavigatorContextValue | null>(() => {
    if (!active) return null;
    return {
      levels,
      active,
      prev: levels[activeIdx - 1] ?? null,
      next: levels[activeIdx + 1] ?? null,
      slideDir,
      goPrev,
      goNext,
      pillars,
      pillarTasks,
      currentPillarId,
      onSegmentClick,
      onSubsegClick,
      taskColorFn,
      gateIndicators,
      storageKey,
    };
  }, [
    active,
    activeIdx,
    levels,
    slideDir,
    goPrev,
    goNext,
    pillars,
    pillarTasks,
    currentPillarId,
    onSegmentClick,
    onSubsegClick,
    taskColorFn,
    gateIndicators,
    storageKey,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
