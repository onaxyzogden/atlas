// DecisionChecklist — the YOUR DECISIONS section of ObjectiveDetailPanel
// (Plan Navigation Spec v1, Slice 1.7). Renders the objective's checklist
// as a vertical list of checkboxes. Each item that `feedsInto` another
// objective surfaces those targets as small chips so the steward sees the
// causal chain at a glance.
//
// Slice 1.12 — items pre-satisfied by the Stage Zero Vision Builder
// bridge (visionProfileToChecklist.ts) render as checked + locked, with
// a "From Stage Zero Vision" badge and the captured evidence beneath.
// The source of truth is `project.metadata.visionProfile`; toggling here
// would be a no-op vs the store, so the checkbox is disabled.
//
// Pure presentational — store wiring lives one level up so the same list
// can drive cyclical-review revisions in Slice 1.11 without a refactor.

import type {
  PlanDecisionChecklistItem,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { findProjectType } from '@ogden/shared';
import { findObjectiveGlobally } from '../objectiveCatalog.js';
import type { VisionDerivedItem, VisionDerivedMap } from './visionProfileToChecklist.js';
import css from './DecisionChecklist.module.css';

interface Props {
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
  completedItemIds: readonly string[];
  onToggleItem: (itemId: string) => void;
  /** Slice 1.12 — items pre-satisfied by the Stage Zero Vision bridge. */
  derivedEvidence?: VisionDerivedMap;
}

export default function DecisionChecklist({
  objective,
  status,
  completedItemIds,
  onToggleItem,
  derivedEvidence,
}: Props) {
  const completed = new Set(completedItemIds);
  const items = objective.checklist;
  // Plan Nav v1.1 §5.6 — when a secondary layer's modifying patch injects
  // checklist items it also amends the completion gate (the resolver
  // concatenates, never replaces). The same patch stamps each injected item
  // with `expandedBySecondaryId`, so the most-common stamp is the amender we
  // attribute the gate change to. (Precise per-clause provenance is a later
  // seam; see plan "Out of scope".)
  const amenderTypeId = mostCommonAmender(items);
  const isDerived = (id: string) =>
    derivedEvidence?.[id]?.isComplete === true;
  const isItemComplete = (id: string) => completed.has(id) || isDerived(id);
  const requiredCount = items.filter((i) => !i.optional).length;
  const requiredDoneCount = items.filter(
    (i) => !i.optional && isItemComplete(i.id),
  ).length;

  return (
    <section className={css.section} aria-label="Your decisions">
      <header className={css.header}>
        <p className={css.eyebrow}>Your decisions</p>
        <span className={css.meta} data-status={status}>
          {requiredDoneCount} / {requiredCount} required
        </span>
      </header>

      {items.length === 0 ? (
        <p className={css.empty}>No checklist items for this objective yet.</p>
      ) : (
        <ol className={css.list}>
          {items.map((item) => {
            const derived = derivedEvidence?.[item.id];
            const fromBridge = derived?.isComplete === true;
            return (
              <li key={item.id} className={css.item}>
                <ChecklistRow
                  item={item}
                  isComplete={completed.has(item.id) || fromBridge}
                  derived={fromBridge ? derived : undefined}
                  onToggle={() => onToggleItem(item.id)}
                />
              </li>
            );
          })}
        </ol>
      )}

      {objective.completionGate ? (
        <div className={css.gate}>
          <div className={css.gateHeader}>
            <p className={css.gateEyebrow}>Completion gate</p>
            {amenderTypeId ? (
              <span className={css.amendedBy}>
                Amended by{' '}
                {findProjectType(amenderTypeId)?.label ?? amenderTypeId}
              </span>
            ) : null}
          </div>
          <p className={css.gateBody}>{objective.completionGate}</p>
        </div>
      ) : null}
    </section>
  );
}

/**
 * The secondary type credited with amending the completion gate: the
 * most-common `expandedBySecondaryId` across injected checklist items.
 * Returns undefined when no item was injected by a secondary layer.
 */
function mostCommonAmender(
  items: readonly PlanDecisionChecklistItem[],
): string | undefined {
  const counts = new Map<string, number>();
  for (const item of items) {
    const id = item.expandedBySecondaryId;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}

interface RowProps {
  item: PlanDecisionChecklistItem;
  isComplete: boolean;
  derived?: VisionDerivedItem;
  onToggle: () => void;
}

function ChecklistRow({ item, isComplete, derived, onToggle }: RowProps) {
  const isFromBridge = Boolean(derived);
  const isInjected = Boolean(item.expandedBySecondaryId);
  return (
    <label
      className={css.row}
      data-complete={isComplete}
      data-derived={isFromBridge}
      data-injected={isInjected ? 'true' : undefined}
    >
      <input
        type="checkbox"
        className={css.checkbox}
        checked={isComplete}
        onChange={onToggle}
        disabled={isFromBridge}
        aria-describedby={
          isFromBridge ? `${item.id}-evidence` : undefined
        }
      />
      <div className={css.body}>
        <span className={css.label}>{item.label}</span>
        <div className={css.tags}>
          {item.optional ? (
            <span className={css.optional}>optional</span>
          ) : null}
          {item.expandedBySecondaryId ? (
            <span className={css.expandedBy}>
              Added by{' '}
              {findProjectType(item.expandedBySecondaryId)?.label ??
                item.expandedBySecondaryId}
            </span>
          ) : null}
          {isFromBridge ? (
            <span className={css.derivedBadge}>From Stage Zero Vision</span>
          ) : null}
          {item.feedsInto.map((targetId) => {
            // Project-independent title lookup: a feedsInto target may be a
            // universal, primary, or secondary-additive objective, so resolve
            // across the catalogue union (Sub-slice D Group 2). The old static
            // findPlanStratumObjective could only title the 16-objective skeleton.
            const target = findObjectiveGlobally(targetId);
            return (
              <span key={targetId} className={css.feedsInto}>
                feeds {target?.title ?? targetId}
              </span>
            );
          })}
        </div>
        {isFromBridge && derived?.evidence ? (
          <p
            id={`${item.id}-evidence`}
            className={css.evidence}
            data-testid={`plan-decision-evidence-${item.id}`}
          >
            {derived.evidence}
          </p>
        ) : null}
      </div>
    </label>
  );
}
