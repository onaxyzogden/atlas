// PortfolioStageRail.tsx
//
// Portfolio Home bottom rail (OLOS Portfolio Home Spec §2.5). Three
// always-enabled Plan / Act / Observe buttons for the selected project, each
// with a live sublabel and a colour state bound to the High-Tech Earth stage
// tokens. The button matching the project's current stage is filled; the
// others are outlined. Tapping a button navigates into that stage's route for
// the selected project. Strictly navigation — no project data is mutated here.

import { useNavigate } from '@tanstack/react-router';
import { Layers, Sprout, Telescope } from 'lucide-react';
import type { PortfolioBriefing } from './usePortfolioBriefing.js';
import css from './PortfolioStageRail.module.css';

export interface PortfolioStageRailProps {
  briefing: PortfolioBriefing | null;
}

type StageKey = 'plan' | 'act' | 'observe';

export default function PortfolioStageRail({
  briefing,
}: PortfolioStageRailProps) {
  const navigate = useNavigate();

  if (!briefing) {
    return (
      <div className={css.rail} aria-hidden>
        <span className={css.idleHint}>Select a project to jump into a stage.</span>
      </div>
    );
  }

  const { project, plan, act, observe } = briefing;

  // The "current" stage drives which button is filled. setup/archived map to
  // no highlight — the operator chooses where to go next.
  const activeStage: StageKey | null =
    briefing.stage === 'plan' ||
    briefing.stage === 'act' ||
    briefing.stage === 'observe'
      ? briefing.stage
      : null;

  const planSub = plan.activeStratum
    ? `S${plan.activeStratum.ordinal} · ${plan.objectivesComplete}/${plan.objectivesTotal}`
    : plan.allComplete
      ? `${plan.objectivesComplete}/${plan.objectivesTotal} complete`
      : 'Not started';

  const actSub =
    act.outstanding > 0
      ? `${act.outstanding} outstanding`
      : act.openDivergences > 0
        ? `${act.openDivergences} divergence${act.openDivergences === 1 ? '' : 's'}`
        : '✓ All clear';

  const observeSub = observe.hasData ? observe.cycleLabel : 'No data yet';

  const goPlan = () =>
    navigate({
      to: '/v3/project/$projectId/plan/stratum/$stratumId',
      params: { projectId: project.id, stratumId: plan.navStratumId },
    } as never);

  const goAct = () =>
    navigate({
      to: '/v3/project/$projectId/act/field-action',
      params: { projectId: project.id },
    } as never);

  const goObserve = () =>
    navigate({
      to: '/v3/project/$projectId/observe/dashboard',
      params: { projectId: project.id },
    } as never);

  return (
    <div className={css.rail} aria-label={`Jump into a stage for ${project.name}`}>
      <span className={css.projectLabel} title={project.name}>
        {project.name}
      </span>
      <div className={css.buttons}>
        <button
          type="button"
          className={`${css.stageBtn} ${css.plan} ${activeStage === 'plan' ? css.active : ''}`}
          onClick={goPlan}
        >
          <Layers size={15} aria-hidden />
          <span className={css.stageBtnText}>
            <span className={css.stageBtnLabel}>Plan</span>
            <span className={css.stageBtnSub}>{planSub}</span>
          </span>
        </button>

        <button
          type="button"
          className={`${css.stageBtn} ${css.act} ${activeStage === 'act' ? css.active : ''}`}
          onClick={goAct}
        >
          <Sprout size={15} aria-hidden />
          <span className={css.stageBtnText}>
            <span className={css.stageBtnLabel}>Act</span>
            <span className={css.stageBtnSub}>{actSub}</span>
          </span>
        </button>

        <button
          type="button"
          className={`${css.stageBtn} ${css.observe} ${activeStage === 'observe' ? css.active : ''}`}
          onClick={goObserve}
        >
          <Telescope size={15} aria-hidden />
          <span className={css.stageBtnText}>
            <span className={css.stageBtnLabel}>Observe</span>
            <span className={css.stageBtnSub}>{observeSub}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
