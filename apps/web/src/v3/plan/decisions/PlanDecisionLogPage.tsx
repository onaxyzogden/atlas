/**
 * PlanDecisionLogPage — the Plan-side Decision Log (Phase 2). The durable record
 * behind the operational verbs a steward records on Plan Reviews: each decision
 * carries a verb + headline + rationale + assumptions + trade-offs + the source
 * observations + a status. Decisions arrive two ways: promoted from a reviewed
 * Plan Review ("Log decision →") or authored from scratch here.
 *
 * Phase 2 scope: a decision RECORDS INTENT only — accepting one does not yet
 * generate Act Work Packages or mutate a Plan module (Phase 3). Shelled child
 * route (renders inside the project shell with the sidebar, like `/plan/review`).
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { OBSERVE_MODULE_LABEL } from '../../observe/types.js';
import { PLAN_MODULES, PLAN_MODULE_LABEL } from '../types.js';
import {
  PLAN_REVIEW_DECISIONS,
  PLAN_REVIEW_DECISION_LABEL,
} from '../impact/planImpactFlag.js';
import { usePlanDecisions } from './usePlanDecisions.js';
import { usePlanDecisionStore } from '../../../store/planDecisionStore.js';
import { usePlanWorkPackageStore } from '../../../store/planWorkPackageStore.js';
import { useWorkPackageForDecision } from '../work-packages/usePlanWorkPackages.js';
import { buildWorkPackageFromDecision } from '../work-packages/planWorkPackage.js';
import {
  emptyPlanDecision,
  PLAN_DECISION_STATUSES,
  type PlanDecision,
  type PlanDecisionStatus,
} from './planDecision.js';
import css from './PlanDecisionLogPage.module.css';

const SECTION_TITLE: Record<PlanDecisionStatus, string> = {
  draft: 'Drafts',
  accepted: 'Accepted',
  superseded: 'Superseded',
  rejected: 'Rejected',
};

function formatStamp(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface DecisionCardProps {
  projectId: string;
  decision: PlanDecision;
}

function SourceChips({
  projectId,
  decision,
}: DecisionCardProps) {
  if (decision.sources.length === 0) return null;
  return (
    <div className={css.sourceChips}>
      {decision.sources.map((s) => (
        <Link
          key={s.observationId}
          to="/v3/project/$projectId/observe/$module"
          params={{ projectId, module: s.module }}
          className={css.sourceChip}
          title={`${OBSERVE_MODULE_LABEL[s.module]} · View in Observe`}
        >
          {s.title}
        </Link>
      ))}
    </div>
  );
}

function DraftCard({ projectId, decision }: DecisionCardProps) {
  const update = usePlanDecisionStore((s) => s.update);
  const setStatus = usePlanDecisionStore((s) => s.setStatus);
  const remove = usePlanDecisionStore((s) => s.remove);

  return (
    <li className={css.card} data-status="draft">
      <div className={css.verbRow}>
        {PLAN_REVIEW_DECISIONS.map((v) => (
          <button
            key={v}
            type="button"
            className={css.verbBtn}
            data-selected={decision.verb === v ? 'true' : 'false'}
            onClick={() => update(projectId, decision.id, { verb: v })}
          >
            {PLAN_REVIEW_DECISION_LABEL[v]}
          </button>
        ))}
      </div>

      <input
        className={css.headline}
        placeholder="Decision headline (e.g. Add a swale above the eroded bank)"
        value={decision.headline}
        onChange={(e) =>
          update(projectId, decision.id, { headline: e.target.value })
        }
      />

      <label className={css.field}>
        <span className={css.fieldLabel}>Rationale</span>
        <textarea
          className={css.textarea}
          placeholder="Why this decision — the reasoning you stand behind."
          value={decision.rationale}
          onChange={(e) =>
            update(projectId, decision.id, { rationale: e.target.value })
          }
          rows={2}
        />
      </label>

      <label className={css.field}>
        <span className={css.fieldLabel}>Assumptions</span>
        <textarea
          className={css.textarea}
          placeholder="What this decision takes as given."
          value={decision.assumptions}
          onChange={(e) =>
            update(projectId, decision.id, { assumptions: e.target.value })
          }
          rows={2}
        />
      </label>

      <label className={css.field}>
        <span className={css.fieldLabel}>Trade-offs</span>
        <textarea
          className={css.textarea}
          placeholder="What this decision gives up, and the alternatives weighed."
          value={decision.tradeoffs}
          onChange={(e) =>
            update(projectId, decision.id, { tradeoffs: e.target.value })
          }
          rows={2}
        />
      </label>

      <label className={css.field}>
        <span className={css.fieldLabel}>Affected module (optional)</span>
        <select
          className={css.select}
          value={decision.affectedModule ?? ''}
          onChange={(e) =>
            update(projectId, decision.id, {
              affectedModule: e.target.value
                ? (e.target.value as PlanDecision['affectedModule'])
                : undefined,
            })
          }
        >
          <option value="">— none —</option>
          {PLAN_MODULES.map((m) => (
            <option key={m} value={m}>
              {PLAN_MODULE_LABEL[m]}
            </option>
          ))}
        </select>
      </label>

      <SourceChips projectId={projectId} decision={decision} />

      <div className={css.actions}>
        <button
          type="button"
          className={css.acceptBtn}
          onClick={() => setStatus(projectId, decision.id, 'accepted')}
        >
          Accept
        </button>
        <button
          type="button"
          className={css.rejectBtn}
          onClick={() => setStatus(projectId, decision.id, 'rejected')}
        >
          Reject
        </button>
        <Link
          to="/v3/project/$projectId/plan/workspace/$decisionId"
          params={{ projectId, decisionId: decision.id }}
          className={css.supersedeBtn}
        >
          Open workspace →
        </Link>
        <button
          type="button"
          className={css.deleteBtn}
          onClick={() => remove(projectId, decision.id)}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

interface RecordedCardProps extends DecisionCardProps {
  onSupersede: (id: string) => void;
}

function RecordedCard({ projectId, decision, onSupersede }: RecordedCardProps) {
  const decidedAt = formatStamp(decision.decidedAt ?? decision.updatedAt);
  const navigate = useNavigate();
  const createPackage = usePlanWorkPackageStore((s) => s.create);
  const existingPackage = useWorkPackageForDecision(projectId, decision.id);
  const canHandoff =
    decision.status === 'accepted' && decision.verb === 'create-act-task';

  const handleGenerate = () => {
    createPackage(projectId, buildWorkPackageFromDecision(decision));
    navigate({
      to: '/v3/project/$projectId/plan/work-packages',
      params: { projectId },
    });
  };

  return (
    <li className={css.card} data-status={decision.status} id={`decision-${decision.id}`}>
      <div className={css.cardHead}>
        <span className={css.verbTag}>
          {PLAN_REVIEW_DECISION_LABEL[decision.verb]}
        </span>
        <span className={css.statusBadge} data-status={decision.status}>
          {SECTION_TITLE[decision.status]}
        </span>
      </div>

      <h3 className={css.cardTitle}>
        {decision.headline.trim() || 'Untitled decision'}
      </h3>

      {decision.rationale.trim() ? (
        <p className={css.recordedField}>
          <span className={css.recordedLabel}>Rationale</span>
          {decision.rationale}
        </p>
      ) : null}
      {decision.assumptions.trim() ? (
        <p className={css.recordedField}>
          <span className={css.recordedLabel}>Assumptions</span>
          {decision.assumptions}
        </p>
      ) : null}
      {decision.tradeoffs.trim() ? (
        <p className={css.recordedField}>
          <span className={css.recordedLabel}>Trade-offs</span>
          {decision.tradeoffs}
        </p>
      ) : null}

      {decision.affectedModule ? (
        <p className={css.recordedField}>
          <span className={css.recordedLabel}>Affects</span>
          {PLAN_MODULE_LABEL[decision.affectedModule]}
        </p>
      ) : null}

      <SourceChips projectId={projectId} decision={decision} />

      <div className={css.cardFoot}>
        {decidedAt ? (
          <span className={css.stamp}>
            {decision.status === 'accepted' ? 'Accepted' : 'Updated'} {decidedAt}
          </span>
        ) : null}
        <div className={css.footActions}>
          <Link
            to="/v3/project/$projectId/plan/workspace/$decisionId"
            params={{ projectId, decisionId: decision.id }}
            className={css.supersedeBtn}
          >
            Open workspace →
          </Link>
          {canHandoff ? (
            existingPackage ? (
              <Link
                to="/v3/project/$projectId/plan/work-packages"
                params={{ projectId }}
                className={css.supersedeBtn}
              >
                Work package created ✓ → view
              </Link>
            ) : (
              <button
                type="button"
                className={css.supersedeBtn}
                onClick={handleGenerate}
              >
                Generate work package →
              </button>
            )
          ) : null}
          {decision.status === 'accepted' ? (
            <button
              type="button"
              className={css.supersedeBtn}
              onClick={() => onSupersede(decision.id)}
            >
              Supersede →
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function PlanDecisionLogPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? 'mtc';
  const decisions = usePlanDecisions(projectId);
  const create = usePlanDecisionStore((s) => s.create);
  const supersede = usePlanDecisionStore((s) => s.supersede);
  const [scrollTo, setScrollTo] = useState<string | null>(null);

  useEffect(() => {
    if (!scrollTo) return;
    const el = document.getElementById(`decision-${scrollTo}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setScrollTo(null);
  }, [scrollTo, decisions]);

  const handleNew = () => {
    const draft = emptyPlanDecision(projectId);
    create(projectId, draft);
    setScrollTo(draft.id);
  };

  const handleSupersede = (id: string) => {
    const newId = supersede(projectId, id);
    if (newId) setScrollTo(newId);
  };

  return (
    <div className={css.page}>
      <header className={css.header}>
        <div className={css.headerText}>
          <span className={css.eyebrow}>Plan</span>
          <h1 className={css.title}>Decision Log</h1>
          <p className={css.lede}>
            Decisions recorded against the plan — rationale, trade-offs, status.
          </p>
        </div>
        <button type="button" className={css.newBtn} onClick={handleNew}>
          New decision
        </button>
      </header>

      {decisions.length === 0 ? (
        <p className={css.empty}>
          No decisions yet — promote a Plan Review or start one here.
        </p>
      ) : (
        PLAN_DECISION_STATUSES.map((status) => {
          const group = decisions.filter((d) => d.status === status);
          if (group.length === 0) return null;
          return (
            <section key={status} className={css.section} data-status={status}>
              <h2 className={css.sectionTitle}>
                {SECTION_TITLE[status]}{' '}
                <span className={css.count}>{group.length}</span>
              </h2>
              <ul className={css.cardList}>
                {group.map((decision) =>
                  decision.status === 'draft' ? (
                    <DraftCard
                      key={decision.id}
                      projectId={projectId}
                      decision={decision}
                    />
                  ) : (
                    <RecordedCard
                      key={decision.id}
                      projectId={projectId}
                      decision={decision}
                      onSupersede={handleSupersede}
                    />
                  ),
                )}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
