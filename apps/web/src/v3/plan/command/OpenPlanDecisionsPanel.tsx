/**
 * OpenPlanDecisionsPanel — the Plan stage's "Open Plan Decisions" launch surface,
 * rendered as the dashboard shell's bottom tray: a horizontal carousel of draft
 * decisions awaiting a steward's call. Modelled on `OpenObservationNeedsPanel`
 * (Observe) — each card is itself the launch button (whole-tile `role="button"`
 * + Enter/Space), deep-linking into the Planning Workspace for that decision.
 *
 * Decisions are often sparse, so the empty state is first-class: a prompt + a
 * "Record a decision" escape into the Decision Log rather than a blank tray. The
 * header hosts the live count, the active-module chip, and a "View all" escape
 * that clears the module lens.
 */

import { ArrowUpRight, Plus } from 'lucide-react';
import {
  type PlanDecision,
  PLAN_DECISION_STATUS_LABEL,
} from '../decisions/planDecision.js';
import { PLAN_REVIEW_DECISION_LABEL } from '../impact/planImpactFlag.js';
import { PLAN_MODULE_LABEL, type PlanModule } from '../types.js';
import { PLAN_MODULE_DOT } from '../data/planModulePalette.js';
import css from '../../command/ObserveCommandCentrePage.module.css';

interface Props {
  decisions: PlanDecision[];
  /** Currently highlighted decision (reserved for future map/timeline sync). */
  selectedId?: string | null;
  /** Active module lens — drives the header chip + "View all" escape. */
  activeModule: PlanModule | null;
  onClearFilter: () => void;
  onLaunch: (decisionId: string) => void;
  onRecordDecision: () => void;
}

export default function OpenPlanDecisionsPanel({
  decisions,
  selectedId,
  activeModule,
  onClearFilter,
  onLaunch,
  onRecordDecision,
}: Props) {
  return (
    <>
      <div className={css.trayHead}>
        <p className="eyebrow">Open Plan Decisions</p>
        {activeModule && (
          <span className={css.trayChip}>
            <span
              className={css.filterChipDot}
              style={{ background: PLAN_MODULE_DOT[activeModule] }}
            />
            {PLAN_MODULE_LABEL[activeModule]}
          </span>
        )}
        <span className={css.trayCount}>
          {decisions.length} {decisions.length === 1 ? 'decision' : 'decisions'}
        </span>
        <span className={css.traySpacer} />
        {activeModule && (
          <button type="button" className={css.clearFilterBtn} onClick={onClearFilter}>
            View all decisions
          </button>
        )}
        <button type="button" className={css.raiseBtn} onClick={onRecordDecision}>
          <Plus size={14} strokeWidth={2} /> Record a decision
        </button>
      </div>

      {decisions.length === 0 ? (
        <div className={css.emptyNote}>
          {activeModule
            ? `No open decisions for ${PLAN_MODULE_LABEL[activeModule]}. `
            : 'No open decisions yet. '}
          <button
            type="button"
            className={css.clearFilterBtn}
            onClick={onRecordDecision}
          >
            Record a decision →
          </button>
        </div>
      ) : (
        <div className={css.carousel} aria-label="Open plan decisions">
          {decisions.map((d) => {
            const isSelected = selectedId === d.id;
            const headline = d.headline.trim() || 'Untitled decision';
            return (
              <div
                key={d.id}
                role="button"
                tabIndex={0}
                aria-label={`Open decision: ${headline}`}
                className={`${css.objCard} ${isSelected ? css.objCardActive : ''}`}
                onClick={() => onLaunch(d.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onLaunch(d.id);
                  }
                }}
              >
                <span className={css.objCardTop}>
                  {d.affectedModule && (
                    <span
                      className={css.objCardDot}
                      style={{ background: PLAN_MODULE_DOT[d.affectedModule] }}
                    />
                  )}
                  <span className={css.objCardModule}>
                    {d.affectedModule
                      ? PLAN_MODULE_LABEL[d.affectedModule]
                      : 'No module'}
                  </span>
                  <span className={css.objStatus}>
                    {PLAN_DECISION_STATUS_LABEL[d.status]}
                  </span>
                </span>

                <span className={css.objCardTitle}>{headline}</span>

                {d.rationale.trim() && (
                  <span className={css.objCardDesc}>{d.rationale}</span>
                )}

                <span className={css.objCardMeta}>
                  <span className={css.objOrigin}>
                    {PLAN_REVIEW_DECISION_LABEL[d.verb]}
                  </span>
                  {d.sources.length > 0 && (
                    <span className={css.objMetaItem}>
                      {d.sources.length}{' '}
                      {d.sources.length === 1 ? 'source' : 'sources'}
                    </span>
                  )}
                  <span className={css.objMetaItem}>
                    Open workspace <ArrowUpRight size={13} strokeWidth={2} />
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
