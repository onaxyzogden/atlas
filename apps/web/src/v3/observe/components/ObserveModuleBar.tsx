/**
 * ObserveModuleBar — single bottom-anchored navigator that combines the
 * `LevelNavigatorSegments` progress bars with the legacy `ObserveBottomRail`
 * tiles. One row, six cards: progress bar + label.
 *
 * Click semantics on a card:
 *   - inactive card           → onSelectModule(mod) + onOpenSlideUp() (first-click open)
 *   - active + slide-up shut  → onOpenSlideUp() opens the slide-up (URL stays)
 *   - active + slide-up open  → onCloseSlideUp() closes the slide-up (URL stays)
 *
 * Sub-seg buttons swallow the click via stopPropagation and route to a
 * task-specific URL — no slide-up side-effect — mirroring the segment row.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { UniversalDomain } from '@ogden/shared';
import { useLevelNavigator } from '../../../components/LevelNavigator/index.js';
import type { PillarTask } from '../../../components/LevelNavigator/index.js';
import { partitionByScope } from '../../roles/viewScope.js';
import ViewFocusToggle from '../../roles/ViewFocusToggle.js';
import type { ViewFocusMode } from '../../../store/uiStore.js';
import {
  OBSERVE_MODULES,
  OBSERVE_MODULE_LABEL,
  type ObserveModule,
} from '../types.js';
import css from './ObserveModuleBar.module.css';

// monitoring-records is the custodian-of-one domain: it sits in the
// ecology_soils operational scope only. A viewer without that role sees it
// out of focus, so the bar names its owner rather than leaving it unexplained.
const MONITORING_RECORDS: UniversalDomain = 'monitoring-records';
const MONITORING_CUSTODIAN_NOTE = 'Owned by Ecology & Soils';

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
  /**
   * Operational Role Layer scope (additive). When present + non-empty, in-scope
   * domain tiles lead and out-of-scope tiles collapse behind a "+N more"
   * expander -- never hidden, only de-emphasized (still one click away). Absent
   * or empty ⇒ all 16 tiles render in their canonical order exactly as before.
   */
  scopedDomains?: ReadonlySet<UniversalDomain>;
  /** Render the My-focus / Full-view toggle above the tiles (layer active). */
  showFocusToggle?: boolean;
  focusMode?: ViewFocusMode;
  onFocusModeChange?: (mode: ViewFocusMode) => void;
}

export default function ObserveModuleBar({
  activeModule,
  onSelectModule,
  slideUpOpen,
  onOpenSlideUp,
  onCloseSlideUp,
  scopedDomains,
  showFocusToggle = false,
  focusMode,
  onFocusModeChange,
}: Props) {
  const ctx = useLevelNavigator();
  const navigate = useNavigate();
  const [outOpen, setOutOpen] = useState(false);

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
    // First-click slide-up open (parity with Plan + Act). URL nav +
    // open in a single batched render.
    onSelectModule(mod);
    onOpenSlideUp();
  };

  // Scope engaged only when a non-empty domain set is supplied. Full view and
  // unscoped callers leave scopedDomains undefined ⇒ every tile renders inline.
  const scoped = scopedDomains !== undefined && scopedDomains.size > 0;
  const { inScope, outScope } = scoped
    ? partitionByScope(OBSERVE_MODULES, (m) => [m], scopedDomains)
    : { inScope: [...OBSERVE_MODULES], outScope: [] as ObserveModule[] };

  const renderTile = (mod: ObserveModule, dimmed: boolean) => {
    const isActive = activeModule === mod;
    const tasks = pillarTasks[mod] ?? [];
    // Name the custodian of the one out-of-focus domain no single non-ecology
    // role owns, so its de-emphasis reads as "someone else's" not "missing".
    const showCustodian =
      scoped && mod === MONITORING_RECORDS && !scopedDomains.has(mod);
    return (
      <div
        key={mod}
        className={`${css.tile} ${isActive ? css.tileActive : ''}`}
        data-scope={dimmed ? 'out' : 'in'}
      >
        <button
          type="button"
          aria-pressed={isActive}
          aria-label={OBSERVE_MODULE_LABEL[mod]}
          className={css.tileHit}
          onClick={() => handleCardClick(mod)}
        />
        <div className={css.cardProgress}>
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
        <span className={css.tileLabel}>{OBSERVE_MODULE_LABEL[mod]}</span>
        {showCustodian && (
          <span className={css.custodianNote}>{MONITORING_CUSTODIAN_NOTE}</span>
        )}
      </div>
    );
  };

  return (
    <div className={css.rail}>
      {showFocusToggle && focusMode && onFocusModeChange && (
        <div className={css.railHeader}>
          <ViewFocusToggle
            focusMode={focusMode}
            onChange={onFocusModeChange}
            inFocusCount={scoped ? inScope.length : undefined}
            totalCount={scoped ? OBSERVE_MODULES.length : undefined}
          />
        </div>
      )}
      <div className={css.tiles} role="toolbar" aria-label="Observe modules">
        {inScope.map((mod) => renderTile(mod, false))}
        {scoped && outScope.length > 0 && (
          <button
            type="button"
            className={css.moreTile}
            aria-expanded={outOpen}
            onClick={() => setOutOpen((open) => !open)}
            data-testid="observe-outside-focus-toggle"
          >
            {outOpen ? `Hide ${outScope.length}` : `+${outScope.length} more`}
          </button>
        )}
        {scoped && outOpen && outScope.map((mod) => renderTile(mod, true))}
      </div>
    </div>
  );
}
