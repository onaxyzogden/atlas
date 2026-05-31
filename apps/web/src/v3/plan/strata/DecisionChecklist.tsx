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
  DecisionGroup,
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
  // Part D (greyed gate history): when secondary patches amended the gate, the
  // resolver captured the pre-amendment base + an ordered, attributed amendment
  // trail. Render the base greyed ("Previously:") with each amendment credited
  // to its secondary, beneath the current concatenated gate. History shows only
  // when there is a real base to contrast against the current text.
  const gateAmendments = objective.completionGateAmendments ?? [];
  const gateBase = objective.completionGateBase;
  const hasGateHistory =
    gateAmendments.length > 0 && Boolean(gateBase && gateBase.trim());
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
      ) : objective.decisionGroups.length > 0 ? (
        // Decision Groups Reference v1.0 (OLOS spec 9.3-9.4): when the objective
        // carries decision groups, the checklist is rendered grouped under each
        // group's label, item count, and observe-feed chips. Item checkboxes stay
        // nested (the stratum-progress completion model is keyed on per-item ids;
        // a groups-only display with group-level completion is a later refinement
        // — disclosed divergence from the spec's "Plan shows only groups" intent).
        <GroupedChecklist
          groups={objective.decisionGroups}
          items={items}
          completed={completed}
          derivedEvidence={derivedEvidence}
          onToggleItem={onToggleItem}
        />
      ) : (
        <ol className={css.list}>
          {items.map((item) => (
            <li key={item.id} className={css.item}>
              <ItemRow
                item={item}
                completed={completed}
                derivedEvidence={derivedEvidence}
                onToggleItem={onToggleItem}
              />
            </li>
          ))}
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
          {hasGateHistory ? (
            <div
              className={css.gateHistory}
              data-testid="plan-gate-history"
            >
              <p className={css.gatePreviousLabel}>Previously</p>
              <p className={css.gatePrevious}>{gateBase}</p>
              <ul className={css.gateAmendments}>
                {gateAmendments.map((a, i) => (
                  <li
                    key={`${a.secondaryTypeId}-${i}`}
                    className={css.gateAmendment}
                  >
                    <span className={css.gateAmendmentSource}>
                      {findProjectType(a.secondaryTypeId)?.label ??
                        a.secondaryTypeId}
                    </span>{' '}
                    added: {a.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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

interface ItemRowProps {
  item: PlanDecisionChecklistItem;
  completed: Set<string>;
  derivedEvidence?: VisionDerivedMap;
  onToggleItem: (itemId: string) => void;
}

/**
 * One checklist <ChecklistRow>, resolving its derived/bridge state. Shared by
 * the flat list and the grouped render so both paths stay byte-identical per
 * item.
 */
function ItemRow({
  item,
  completed,
  derivedEvidence,
  onToggleItem,
}: ItemRowProps) {
  const derived = derivedEvidence?.[item.id];
  const fromBridge = derived?.isComplete === true;
  return (
    <ChecklistRow
      item={item}
      isComplete={completed.has(item.id) || fromBridge}
      derived={fromBridge ? derived : undefined}
      onToggle={() => onToggleItem(item.id)}
    />
  );
}

interface GroupedChecklistProps {
  groups: readonly DecisionGroup[];
  items: readonly PlanDecisionChecklistItem[];
  completed: Set<string>;
  derivedEvidence?: VisionDerivedMap;
  onToggleItem: (itemId: string) => void;
}

/**
 * Render the checklist grouped under each decision group's sub-header (label +
 * "N items" + observe-feed chips). A group injected by a secondary layer
 * (`sourceSecondaryId != null`, stamped by the resolver) reuses the amber
 * "Added by <Type>" treatment + injected left-border, matching the per-item
 * patch attribution. Items not claimed by any group fall through to a trailing
 * "Other decisions" block so the render stays lossless if a catalogue is only
 * partially grouped (the partition invariant is enforced in the shared tests).
 */
function GroupedChecklist({
  groups,
  items,
  completed,
  derivedEvidence,
  onToggleItem,
}: GroupedChecklistProps) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const claimed = new Set<string>();

  const rendered = groups.map((group) => {
    const groupItems = group.itemIds
      .map((id) => byId.get(id))
      .filter((i): i is PlanDecisionChecklistItem => Boolean(i));
    groupItems.forEach((i) => claimed.add(i.id));
    const injected = group.sourceSecondaryId != null;
    return (
      <li
        key={group.id}
        className={css.group}
        data-injected={injected ? 'true' : undefined}
        data-testid={`plan-decision-group-${group.id}`}
      >
        <div className={css.groupHeader}>
          <span className={css.groupLabel}>{group.label}</span>
          <span className={css.groupCount}>
            {groupItems.length}{' '}
            {groupItems.length === 1 ? 'item' : 'items'}
          </span>
          {injected && group.sourceSecondaryId ? (
            <span className={css.groupAddedBy}>
              Added by{' '}
              {findProjectType(group.sourceSecondaryId)?.label ??
                group.sourceSecondaryId}
            </span>
          ) : null}
        </div>
        {group.observeFeeds.length > 0 ? (
          <div className={css.groupFeeds}>
            {group.observeFeeds.map((feed) => (
              <span key={feed} className={css.groupFeed}>
                {feed}
              </span>
            ))}
          </div>
        ) : null}
        <ol className={css.list}>
          {groupItems.map((item) => (
            <li key={item.id} className={css.item}>
              <ItemRow
                item={item}
                completed={completed}
                derivedEvidence={derivedEvidence}
                onToggleItem={onToggleItem}
              />
            </li>
          ))}
        </ol>
      </li>
    );
  });

  const ungrouped = items.filter((i) => !claimed.has(i.id));

  return (
    <ol className={css.groups}>
      {rendered}
      {ungrouped.length > 0 ? (
        <li className={css.group} data-testid="plan-decision-group-ungrouped">
          <div className={css.groupHeader}>
            <span className={css.groupLabel}>Other decisions</span>
            <span className={css.groupCount}>
              {ungrouped.length}{' '}
              {ungrouped.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <ol className={css.list}>
            {ungrouped.map((item) => (
              <li key={item.id} className={css.item}>
                <ItemRow
                  item={item}
                  completed={completed}
                  derivedEvidence={derivedEvidence}
                  onToggleItem={onToggleItem}
                />
              </li>
            ))}
          </ol>
        </li>
      ) : null}
    </ol>
  );
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
