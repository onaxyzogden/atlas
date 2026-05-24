/**
 * StageSpine — top 3-stage strip (Observe / Plan / Act) for the Stage Compass.
 *
 * Stage-agnostic: the page passes the `activeStage`, that stage's aggregate
 * `progress`, and an `onNavigateStage` callback (so route literals stay in the
 * typed page wrapper). The active stage is highlighted; the others show 0% and
 * navigate via the callback.
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
  activeStage: Stage;
  /** Aggregate progress for the active stage (others render 0%). */
  progress: ObjectiveProgress;
  onNavigateStage: (stage: Stage) => void;
}

export default function StageSpine({
  activeStage,
  progress,
  onNavigateStage,
}: SpineProps) {
  return (
    <nav className={css.spine} aria-label="Lifecycle stages">
      {STAGES.map((stage, i) => {
        const active = stage.id === activeStage;
        const Icon = stage.icon;
        const pct = active ? progress.pct : 0;
        return (
          <div key={stage.id} className={css.segment}>
            <button
              type="button"
              className={css.stage}
              data-active={active}
              onClick={() => onNavigateStage(stage.id)}
              aria-current={active ? 'step' : undefined}
            >
              <span className={css.stageIcon}>
                <Icon size={16} strokeWidth={1.75} />
              </span>
              <span className={css.stageLabel}>{stage.label}</span>
              <span className={css.stagePct}>{pct}%</span>
            </button>
            {i < STAGES.length - 1 && <span className={css.connector} />}
          </div>
        );
      })}
    </nav>
  );
}
