/**
 * StageSpine — top 3-stage strip (Observe / Plan / Act) for the Stage Compass.
 *
 * Observe is the active stage (this compass). Plan and Act are reachable but
 * route to their existing layouts — no compass exists for them yet.
 */

import { useNavigate } from '@tanstack/react-router';
import { Telescope, PencilRuler, Hammer, type LucideIcon } from 'lucide-react';
import type { ObjectiveProgress } from './compassGating.js';
import css from './StageSpine.module.css';

type Stage = 'observe' | 'plan' | 'act';

const STAGES: { id: Stage; label: string; icon: LucideIcon }[] = [
  { id: 'observe', label: 'Observe', icon: Telescope },
  { id: 'plan', label: 'Plan', icon: PencilRuler },
  { id: 'act', label: 'Act', icon: Hammer },
];

interface SpineProps {
  projectId: string;
  observeProgress: ObjectiveProgress;
}

export default function StageSpine({ projectId, observeProgress }: SpineProps) {
  const navigate = useNavigate();

  const go = (stage: Stage) => {
    if (stage === 'observe') return;
    navigate({
      to: `/v3/project/$projectId/${stage}`,
      params: { projectId },
    });
  };

  return (
    <nav className={css.spine} aria-label="Lifecycle stages">
      {STAGES.map((stage, i) => {
        const active = stage.id === 'observe';
        const Icon = stage.icon;
        const pct = active ? observeProgress.pct : 0;
        return (
          <div key={stage.id} className={css.segment}>
            <button
              type="button"
              className={css.stage}
              data-active={active}
              onClick={() => go(stage.id)}
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
