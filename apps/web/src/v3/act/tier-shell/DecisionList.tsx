/**
 * DecisionList -- the center pane of the Tier-0 workbench ("Your Decisions").
 *
 * A presentational, CONTROLLED component: it lists the active objective's
 * checklist items as clickable rows and surfaces the completion gate. It owns
 * NO store and NO right-hand working panel -- selection is lifted to the parent
 * via `onSelectItem`, and effective per-item progress is passed in already
 * unioned upstream via `completedItemIds`.
 *
 * Structure (mockup center column):
 *   1. Center header (.ch): an "Active decision" eyebrow, the objective title in
 *      serif italic, and the objective's guiding question (focusedQuestion).
 *   2. A "Your Decisions" label row with a mono count chip reading
 *      "{done} / {total} decisions made".
 *   3. One decision row per checklist item: a completion circle (filled green +
 *      Check when complete), the label, an inline "optional" badge, and a feed
 *      annotation (feedsInto target ids resolved to titles). Selected and done
 *      states are reflected via data-selected / data-complete. The whole row is
 *      a keyboard-operable button.
 *   4. A completion-gate card (.cgate) when the objective carries a gate.
 *
 * Data-derivation mirrors DecisionChecklist: a completed-id Set drives per-item
 * completion, and `findObjectiveGlobally` resolves feed target ids to titles.
 */

import { ArrowRight, Check } from 'lucide-react';
import type { PlanStratumObjective } from '@ogden/shared';
import { findObjectiveGlobally } from '../../plan/objectiveCatalog.js';
import css from './DecisionList.module.css';

export interface DecisionListProps {
  /** The active objective: checklist, decisionGroups, completionGate, title. */
  objective: PlanStratumObjective;
  /** Effective per-item progress for THIS objective (already unioned upstream). */
  completedItemIds: readonly string[];
  /** Currently selected checklist item id, or null when nothing is selected. */
  selectedItemId: string | null;
  /** Lift selection to the parent (which owns the right working panel). */
  onSelectItem: (itemId: string) => void;
  /**
   * OPTIONAL capture-mode resolver. When provided AND it returns a non-null
   * RAW mode key for a row, a small mode badge renders on that row (next to the
   * label / optional badge). DecisionList maps the raw key to a human label
   * (see MODE_LABELS). When absent, NO badge renders -- existing behaviour.
   */
  modeFor?: (itemId: string) => string | null;
}

// Raw mode key -> human label. The keys cover three families: the LEGACY
// BoundaryCaptureLegacy modes ('doc' | 'map' | 'mapEntry' | 'decision', still
// returned by the unwired legacy component), StakeholderMode ('mapContact' |
// 'contact' | 'cultural' | 'annotate'), and the SP1 re-decomposed BoundaryMode
// ('boundaryRegister' | 'rowRegister' | 'tenancyRegister' |
// 'titleRestrictionChecker' | 'landHistoryRegister'); unknown keys fall back to
// the raw string so the badge still renders something legible.
const MODE_LABELS: Record<string, string> = {
  doc: 'Document',
  map: 'Map',
  mapEntry: 'Map + entry',
  decision: 'Decision',
  // Stakeholder modes.
  mapContact: 'Map + contact',
  contact: 'Contact entry',
  cultural: 'Cultural',
  annotate: 'Annotate register',
  // Boundary re-decompose modes (SP1). REVIEW: badge copy.
  boundaryRegister: 'Boundary register',
  rowRegister: 'Rights of way',
  tenancyRegister: 'Tenancy register',
  titleRestrictionChecker: 'Title conditions',
  landHistoryRegister: 'Land history',
};

export default function DecisionList({
  objective,
  completedItemIds,
  selectedItemId,
  onSelectItem,
  modeFor,
}: DecisionListProps): JSX.Element {
  const completed = new Set(completedItemIds);
  const items = objective.checklist;
  const total = items.length;
  const doneCount = items.filter((i) => completed.has(i.id)).length;

  return (
    <div className={css.root}>
      {/* ---------- Center header ---------- */}
      <div className={css.ch}>
        <div className={css.chEyebrow}>Active decision</div>
        <div className={css.chTitle}>{objective.title}</div>
        {objective.focusedQuestion ? (
          <div className={css.chQ}>{objective.focusedQuestion}</div>
        ) : null}
      </div>

      {/* ---------- Decisions label + count ---------- */}
      <div className={css.decLabel}>
        <span>Your Decisions</span>
        <span className={css.decCount}>
          {doneCount} / {total} decisions made
        </span>
      </div>

      {/* ---------- Decision rows ---------- */}
      <div className={css.rows}>
        {items.map((item) => {
          const complete = completed.has(item.id);
          const selected = item.id === selectedItemId;
          const feedNames = item.feedsInto.map(
            (targetId) => findObjectiveGlobally(targetId)?.title ?? targetId,
          );
          const rawMode = modeFor ? modeFor(item.id) : null;
          const modeLabel = rawMode ? (MODE_LABELS[rawMode] ?? rawMode) : null;
          return (
            <div
              key={item.id}
              className={css.ditem}
              data-testid="decision-item"
              data-item-id={item.id}
              data-complete={complete ? 'true' : 'false'}
              data-selected={selected ? 'true' : 'false'}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onClick={() => onSelectItem(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectItem(item.id);
                }
              }}
            >
              <span
                className={css.dCirc}
                data-complete={complete ? 'true' : 'false'}
                aria-hidden="true"
              >
                {complete ? <Check size={11} /> : null}
              </span>
              <div className={css.dBody}>
                <div className={css.dTxt}>
                  {item.label}
                  {item.optional ? (
                    <span className={css.dOptBadge}>optional</span>
                  ) : null}
                  {modeLabel ? (
                    <span
                      className={css.dModeBadge}
                      data-testid={`mode-badge-${item.id}`}
                    >
                      {modeLabel}
                    </span>
                  ) : null}
                </div>
                {feedNames.length > 0 ? (
                  <div className={css.dFeed}>
                    <ArrowRight size={11} className={css.dFeedIcon} />
                    <span>Feeds {feedNames.join(', ')}</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------- Completion gate ---------- */}
      {objective.completionGate ? (
        <div className={css.cgate}>
          <div className={css.cgateLbl}>Completion gate</div>
          <div className={css.cgateTxt}>{objective.completionGate}</div>
        </div>
      ) : null}
    </div>
  );
}
