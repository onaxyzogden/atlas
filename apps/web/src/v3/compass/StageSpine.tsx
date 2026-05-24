/**
 * StageSpine — top 3-stage strip (Observe / Plan / Act) for the global header.
 *
 * Presentational + stage-agnostic. The header wrapper (HeaderStageSpine) passes
 * the current `activeStage` (null on the Report route — spine shown, none
 * highlighted), Observe's aggregate `observeProgress`, and an `onNavigateStage`
 * callback so route literals stay in the typed wrapper. Observe shows its real
 * verified %; Plan and Act read an em dash until their own header progress
 * source is wired in.
 */

import { Telescope, PencilRuler, Hammer, type LucideIcon } from 'lucide-react';
import type { ObjectiveProgress } from './compassGating.js';
import type { Stage } from './compassTypes.js';
import css from './StageSpine.module.css';

const STAGES: { id: Stage; label: string; icon: LucideIcon }[] = [
  { id: 'observe', label: 'Observe', icon: Telescope },
  { id: 'plan', label: 'Plan', icon: PencilRuler },
  { id: 'act', label: 'Act', icon: Hammer },
];

interface SpineProps {
  /** The active lifecycle stage, or null (e.g. Report route) for none. */
  activeStage: Stage | null;
  /** Observe's aggregate progress — only the Observe segment shows a %. */
  observeProgress: ObjectiveProgress;
  onNavigateStage: (stage: Stage) => void;
}

export default function StageSpine({
  activeStage,
  observeProgress,
  onNavigateStage,
}: SpineProps) {
  return (
    <nav className={css.spine} aria-label="Lifecycle stages">
      {STAGES.map((stage, i) => {
        const active = stage.id === activeStage;
        const Icon = stage.icon;
        // Observe shows its real verified %; Plan/Act have no header progress
        // source yet, so they read an em dash.
        const readout =
          stage.id === 'observe' ? `${observeProgress.pct}%` : '—';
        return (
          <div key={stage.id} className={css.segment}>
            <button
              type="button"
              className={css.stage}
              data-active={active}
              data-stage={stage.id}
              onClick={() => onNavigateStage(stage.id)}
              aria-current={active ? 'step' : undefined}
            >
              <span className={css.stageIcon}>
                <Icon size={16} strokeWidth={1.75} />
              </span>
              <span className={css.stageLabel}>{stage.label}</span>
              <span className={css.stagePct}>{readout}</span>
            </button>
            {i < STAGES.length - 1 && <span className={css.connector} />}
          </div>
        );
      })}
    </nav>
  );
}
