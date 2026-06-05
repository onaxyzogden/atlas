/**
 * StageSpine — top 3-stage strip (Observe / Plan / Act) for the global header.
 *
 * Presentational + stage-agnostic. The header wrapper (HeaderStageSpine) passes
 * the current `activeStage` (null on the Report route — spine shown, none
 * highlighted), a per-stage `progressByStage` map, and an `onNavigateStage`
 * callback so route literals stay in the typed wrapper. Every segment shows its
 * stage's real verified % from its own compass aggregate.
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
  /** Each stage's aggregate progress — every segment shows its own %. */
  progressByStage: Record<Stage, ObjectiveProgress>;
  onNavigateStage: (stage: Stage) => void;
}

export default function StageSpine({
  activeStage,
  progressByStage,
  onNavigateStage,
}: SpineProps) {
  return (
    <nav className={css.spine} aria-label="Lifecycle stages">
      {STAGES.map((stage, i) => {
        const active = stage.id === activeStage;
        const Icon = stage.icon;
        // Completion still drives the segment's complete styling, but the
        // numeric % is no longer surfaced in the pill (kept quiet per design).
        const complete = progressByStage[stage.id].pct >= 100;
        return (
          <div key={stage.id} className={css.segment}>
            <button
              type="button"
              className={css.stage}
              data-active={active}
              data-stage={stage.id}
              data-complete={complete}
              onClick={() => onNavigateStage(stage.id)}
              aria-current={active ? 'step' : undefined}
            >
              <span className={css.stageIcon}>
                <Icon size={16} strokeWidth={1.75} />
              </span>
              <span className={css.stageLabel}>{stage.label}</span>
            </button>
            {i < STAGES.length - 1 && <span className={css.connector} />}
          </div>
        );
      })}
    </nav>
  );
}
