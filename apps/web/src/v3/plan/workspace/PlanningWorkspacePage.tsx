/**
 * PlanningWorkspacePage — the focused, per-decision surface (Phase 4). Where a
 * steward reasons through a single decision: its source observations, affected
 * module, and downstream work-package status, plus side-by-side **response
 * options** weighed on qualitative axes (effort / reversibility / time-to-effect)
 * before one is *adopted* into the decision.
 *
 * Reached from the Decision Log only ("Open workspace →"); there is no standalone
 * sidebar entry because the workspace is always about a specific decision.
 *
 * Scope (Phase 4): scenario comparison is strictly qualitative — no riba/gharar/
 * CSRA/salam/investor/financing/cost-of-capital semantics (that comparison is the
 * financial cards' job). Scenario data lives on the existing PlanDecision record
 * via `planDecisionStore.update()`; there is no new store. Editing is gated on
 * `status === 'draft'`; once the decision is accepted/superseded/rejected the
 * workspace is read-only (monitor view). Shelled child route — renders inside the
 * project shell with the sidebar, like `/plan/decisions`.
 */

import { Link, useParams } from '@tanstack/react-router';
import { OBSERVE_MODULE_LABEL } from '../../observe/types.js';
import { PLAN_MODULE_LABEL } from '../types.js';
import { PLAN_REVIEW_DECISION_LABEL } from '../impact/planImpactFlag.js';
import { usePlanDecision } from '../decisions/usePlanDecisions.js';
import { usePlanDecisionStore } from '../../../store/planDecisionStore.js';
import {
  adoptScenarioIntoDecision,
  emptyScenarioOption,
  PLAN_DECISION_STATUS_LABEL,
  PLAN_SCENARIO_EFFORT_LABEL,
  PLAN_SCENARIO_EFFORTS,
  PLAN_SCENARIO_HORIZON_LABEL,
  PLAN_SCENARIO_HORIZONS,
  PLAN_SCENARIO_REVERSIBILITIES,
  PLAN_SCENARIO_REVERSIBILITY_LABEL,
  type PlanScenarioOption,
} from '../decisions/planDecision.js';
import { useWorkPackageForDecision } from '../work-packages/usePlanWorkPackages.js';
import { PLAN_WORK_PACKAGE_STATUS_LABEL } from '../work-packages/planWorkPackage.js';
import css from './PlanningWorkspacePage.module.css';

interface OptionCardProps {
  option: PlanScenarioOption;
  chosen: boolean;
  editable: boolean;
  onPatch: (patch: Partial<PlanScenarioOption>) => void;
  onRemove: () => void;
  onAdopt: () => void;
}

function OptionCard({
  option,
  chosen,
  editable,
  onPatch,
  onRemove,
  onAdopt,
}: OptionCardProps) {
  if (!editable) {
    return (
      <li className={css.option} data-chosen={chosen ? 'true' : 'false'}>
        <div className={css.optionHead}>
          <h4 className={css.optionTitle}>
            {option.label.trim() || 'Untitled option'}
          </h4>
          {chosen ? <span className={css.adoptedTag}>Adopted ✓</span> : null}
        </div>
        {option.summary.trim() ? (
          <p className={css.optionText}>{option.summary}</p>
        ) : null}
        {option.pros.trim() ? (
          <p className={css.optionText}>
            <span className={css.optionLabel}>Pros</span>
            {option.pros}
          </p>
        ) : null}
        {option.cons.trim() ? (
          <p className={css.optionText}>
            <span className={css.optionLabel}>Cons</span>
            {option.cons}
          </p>
        ) : null}
        <dl className={css.axes}>
          <div className={css.axis}>
            <dt className={css.axisLabel}>Effort</dt>
            <dd className={css.axisValue}>
              {PLAN_SCENARIO_EFFORT_LABEL[option.effort]}
            </dd>
          </div>
          <div className={css.axis}>
            <dt className={css.axisLabel}>Reversibility</dt>
            <dd className={css.axisValue}>
              {PLAN_SCENARIO_REVERSIBILITY_LABEL[option.reversibility]}
            </dd>
          </div>
          <div className={css.axis}>
            <dt className={css.axisLabel}>Time to effect</dt>
            <dd className={css.axisValue}>
              {PLAN_SCENARIO_HORIZON_LABEL[option.horizon]}
            </dd>
          </div>
        </dl>
      </li>
    );
  }

  return (
    <li className={css.option} data-chosen={chosen ? 'true' : 'false'}>
      <div className={css.optionHead}>
        <input
          className={css.optionInput}
          placeholder="Option label (e.g. Move livestock off the bank)"
          value={option.label}
          onChange={(e) => onPatch({ label: e.target.value })}
        />
        {chosen ? <span className={css.adoptedTag}>Adopted ✓</span> : null}
      </div>

      <label className={css.field}>
        <span className={css.fieldLabel}>Summary</span>
        <textarea
          className={css.textarea}
          placeholder="What this response does."
          value={option.summary}
          onChange={(e) => onPatch({ summary: e.target.value })}
          rows={2}
        />
      </label>

      <label className={css.field}>
        <span className={css.fieldLabel}>Pros</span>
        <textarea
          className={css.textarea}
          placeholder="What this option wins."
          value={option.pros}
          onChange={(e) => onPatch({ pros: e.target.value })}
          rows={2}
        />
      </label>

      <label className={css.field}>
        <span className={css.fieldLabel}>Cons</span>
        <textarea
          className={css.textarea}
          placeholder="What this option costs or risks."
          value={option.cons}
          onChange={(e) => onPatch({ cons: e.target.value })}
          rows={2}
        />
      </label>

      <div className={css.axisRow}>
        <label className={css.field}>
          <span className={css.fieldLabel}>Effort</span>
          <select
            className={css.select}
            value={option.effort}
            onChange={(e) =>
              onPatch({ effort: e.target.value as PlanScenarioOption['effort'] })
            }
          >
            {PLAN_SCENARIO_EFFORTS.map((v) => (
              <option key={v} value={v}>
                {PLAN_SCENARIO_EFFORT_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
        <label className={css.field}>
          <span className={css.fieldLabel}>Reversibility</span>
          <select
            className={css.select}
            value={option.reversibility}
            onChange={(e) =>
              onPatch({
                reversibility: e.target
                  .value as PlanScenarioOption['reversibility'],
              })
            }
          >
            {PLAN_SCENARIO_REVERSIBILITIES.map((v) => (
              <option key={v} value={v}>
                {PLAN_SCENARIO_REVERSIBILITY_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
        <label className={css.field}>
          <span className={css.fieldLabel}>Time to effect</span>
          <select
            className={css.select}
            value={option.horizon}
            onChange={(e) =>
              onPatch({
                horizon: e.target.value as PlanScenarioOption['horizon'],
              })
            }
          >
            {PLAN_SCENARIO_HORIZONS.map((v) => (
              <option key={v} value={v}>
                {PLAN_SCENARIO_HORIZON_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={css.optionActions}>
        <button type="button" className={css.adoptBtn} onClick={onAdopt}>
          Adopt into decision
        </button>
        <button type="button" className={css.removeBtn} onClick={onRemove}>
          Remove
        </button>
      </div>
    </li>
  );
}

export default function PlanningWorkspacePage() {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    decisionId?: string;
  };
  const projectId = params.projectId ?? 'mtc';
  const decisionId = params.decisionId ?? '';

  const decision = usePlanDecision(projectId, decisionId);
  const update = usePlanDecisionStore((s) => s.update);
  const workPackage = useWorkPackageForDecision(projectId, decisionId);

  if (!decision) {
    return (
      <div className={css.page}>
        <p className={css.empty}>
          That decision could not be found.{' '}
          <Link
            to="/v3/project/$projectId/plan/decisions"
            params={{ projectId }}
            className={css.backLink}
          >
            ← Back to Decision Log
          </Link>
        </p>
      </div>
    );
  }

  const editable = decision.status === 'draft';
  const options = decision.scenarioOptions ?? [];

  const setOptions = (next: PlanScenarioOption[]) =>
    update(projectId, decisionId, { scenarioOptions: next });

  const addOption = () => setOptions([...options, emptyScenarioOption()]);

  const patchOption = (id: string, patch: Partial<PlanScenarioOption>) =>
    setOptions(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const removeOption = (id: string) => {
    const next = options.filter((o) => o.id !== id);
    update(projectId, decisionId, {
      scenarioOptions: next,
      ...(decision.chosenScenarioId === id ? { chosenScenarioId: undefined } : {}),
    });
  };

  const adoptOption = (id: string) =>
    update(projectId, decisionId, adoptScenarioIntoDecision(decision, id));

  return (
    <div className={css.page}>
      <header className={css.header}>
        <div className={css.headerText}>
          <span className={css.eyebrow}>Planning Workspace</span>
          <h1 className={css.title}>
            {decision.headline.trim() || 'Untitled decision'}
          </h1>
          <p className={css.lede}>
            Weigh response options for this decision, then adopt the one you
            commit to.
          </p>
        </div>
        <div className={css.headerSide}>
          <span className={css.statusBadge} data-status={decision.status}>
            {PLAN_DECISION_STATUS_LABEL[decision.status]}
          </span>
          <Link
            to="/v3/project/$projectId/plan/decisions"
            params={{ projectId }}
            className={css.backLink}
          >
            ← Back to Decision Log
          </Link>
        </div>
      </header>

      <section className={css.section}>
        <h2 className={css.sectionTitle}>Decision context</h2>
        <div className={css.context}>
          <p className={css.contextField}>
            <span className={css.contextLabel}>Verb</span>
            {PLAN_REVIEW_DECISION_LABEL[decision.verb]}
          </p>
          {decision.rationale.trim() ? (
            <p className={css.contextField}>
              <span className={css.contextLabel}>Rationale</span>
              {decision.rationale}
            </p>
          ) : null}
          {decision.assumptions.trim() ? (
            <p className={css.contextField}>
              <span className={css.contextLabel}>Assumptions</span>
              {decision.assumptions}
            </p>
          ) : null}
          {decision.tradeoffs.trim() ? (
            <p className={css.contextField}>
              <span className={css.contextLabel}>Trade-offs</span>
              {decision.tradeoffs}
            </p>
          ) : null}
          {decision.affectedModule ? (
            <p className={css.contextField}>
              <span className={css.contextLabel}>Affects</span>
              {PLAN_MODULE_LABEL[decision.affectedModule]}
            </p>
          ) : null}
          {decision.sources.length > 0 ? (
            <div className={css.contextField}>
              <span className={css.contextLabel}>Source observations</span>
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
            </div>
          ) : null}
          {workPackage ? (
            <p className={css.contextField}>
              <span className={css.contextLabel}>Downstream</span>
              <Link
                to="/v3/project/$projectId/plan/work-packages"
                params={{ projectId }}
                className={css.wpChip}
              >
                Work package: {PLAN_WORK_PACKAGE_STATUS_LABEL[workPackage.status]}
              </Link>
            </p>
          ) : null}
        </div>
      </section>

      <section className={css.section}>
        <div className={css.compareHead}>
          <h2 className={css.sectionTitle}>
            Response options{' '}
            <span className={css.count}>{options.length}</span>
          </h2>
          {editable ? (
            <button type="button" className={css.addBtn} onClick={addOption}>
              Add option
            </button>
          ) : null}
        </div>

        {options.length === 0 ? (
          <p className={css.empty}>
            {editable
              ? 'No response options yet — add two or more to compare.'
              : 'No response options were recorded for this decision.'}
          </p>
        ) : (
          <ul className={css.optionGrid}>
            {options.map((option) => (
              <OptionCard
                key={option.id}
                option={option}
                chosen={decision.chosenScenarioId === option.id}
                editable={editable}
                onPatch={(patch) => patchOption(option.id, patch)}
                onRemove={() => removeOption(option.id)}
                onAdopt={() => adoptOption(option.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
