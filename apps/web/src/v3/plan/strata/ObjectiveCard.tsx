// ObjectiveCard — compact row for a single stratum objective inside
// ObjectiveColumn (Plan Navigation Spec v1, Slice 1.5). Surfaces the
// objective's focused question (one-line excerpt) and the current
// status pill. Click is owned by the parent so the same
// component can be used for navigation or selection.
//
// Slice 4.4 — outer is a div role="button" (instead of a real <button>)
// so the divergence pill can be a nested real <button> that deep-links
// to the Observe Domain Detail surface without HTML-validity warnings
// from a button-in-button structure. Keyboard handling (Enter/Space)
// preserves the prior accessibility contract.

import type { KeyboardEvent, MouseEvent } from 'react';
import { Clock, RefreshCcw, RotateCcw } from 'lucide-react';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import type { ScopeState } from '../../roles/railScope.js';
import type { SurfaceReason } from '../../roles/alwaysSurface.js';
import { getSourceTag } from './sourceTag.js';
import css from './ObjectiveCard.module.css';

// Human label for each always-surface reason — the amber chip on a promoted
// out-of-focus card. Mirrors ActTierObjectiveCard's map (shared visual
// contract); reasons arrive pre-ordered by priority. ASCII-only copy.
const SURFACE_REASON_LABEL: Record<SurfaceReason, string> = {
  'carries-scope-note': 'Scope note',
  'open-review-flag': 'Open review flag',
  'cross-role-dependency': 'Feeds your work',
  'shared-resource-divergence': 'Shared resource changed',
};

interface Props {
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
  isActive: boolean;
  /**
   * Slice 2.4 — true while this card is being flashed (3s animation
   * driven by `?highlightIncomplete=s1`).
   */
  isHighlighting?: boolean;
  /**
   * Slice 3.5 + 4.4 -- count of divergence flags filed against this
   * objective by Act (spec section 6.4 "the parent objective surfaces a
   * divergence indicator"). Slice 4.4 widens the count to include
   * diverged ObserveDataPoints projected to the objective's mapped
   * domains. Rendered as an amber pill when > 0.
   */
  divergenceCount?: number;
  /**
   * T1.7 -- count of OPEN downstream review flags raised by the T1.6
   * deviation evaluation engine for this objective. Rendered as a static
   * amber chip when > 0 (passive indicator; resolution happens in the
   * detail panel).
   */
  reviewFlagCount?: number;
  /**
   * Plan Nav v1.1 §7 — true when this objective's cyclical review is due
   * (90-day clock elapsed or a forced trigger). Surfaces a small blue
   * "Review" badge. Complete-only by predicate, so it never lights up a
   * locked/active/available card.
   */
  reviewSuggested?: boolean;
  /**
   * ADR 11 soft gate — true when this objective is `locked` by the status
   * engine BUT was previously completed and a review is active, so it should
   * render as an ACCESSIBLE amber review checkpoint instead of a hard lock.
   * Lifts the locked dimming, recolours the status pill amber, and surfaces a
   * "Review" badge. UI-only: the underlying status is unchanged and the card
   * was always clickable. Only ever set on a `locked` card.
   */
  reviewCheckpoint?: boolean;
  onSelect: (objective: PlanStratumObjective) => void;
  /**
   * Slice 4.4 — optional callback fired when the divergence pill is
   * clicked. Parents wire this to navigate to the matching Observe
   * Domain Detail surface. When omitted, the pill is purely visual.
   */
  onDivergenceClick?: (objective: PlanStratumObjective) => void;
  /**
   * Plan Nav v1.1 §8.3 — optional callback fired when the "Restore"
   * control on a `deferred` card is clicked. Parents wire this to
   * `undeferObjective`, returning the objective to the live status
   * engine. Only rendered when status is `deferred` and this is provided.
   */
  onRestore?: (objective: PlanStratumObjective) => void;
  /**
   * Tier-0 hold mirror — count of THIS objective's decisions that are
   * parked ("on hold") in the Tier-0 workbench and not yet recorded
   * (`actEvidenceStore.deferredDecisions`, with completed items excluded so
   * "complete wins" as in DecisionList). Rendered as a slate clock chip when
   * > 0. Display-only; the status engine is never touched. The shell omits
   * it on whole-objective `deferred` cards, so it never appears there.
   */
  onHoldDecisionCount?: number;
  // ---- Operational Role Layer (additive; all undefined ⇒ byte-identical) ----
  // The viewer's scope classification for this card. Drives a `data-scope`
  // attribute the CSS dims on; absent ⇒ no attribute ⇒ unscoped column. The
  // card stays fully interactive in every state (never hide, only de-emphasize).
  scopeState?: ScopeState;
  // Promotion reasons — rendered as an amber chip only when out-surfaced.
  surfaceReasons?: readonly SurfaceReason[];
  // Owning-role labels for out-of-focus context ("belongs to Livestock Lead").
  roleBadges?: readonly string[];
}

const STATUS_LABEL: Record<PlanStratumObjectiveStatus, string> = {
  locked: 'Locked',
  available: 'Ready',
  active: 'In progress',
  complete: 'Complete',
  deferred: 'Deferred',
};

export default function ObjectiveCard({
  objective,
  status,
  isActive,
  isHighlighting,
  divergenceCount = 0,
  reviewFlagCount = 0,
  reviewSuggested = false,
  reviewCheckpoint = false,
  onSelect,
  onDivergenceClick,
  onRestore,
  onHoldDecisionCount = 0,
  scopeState,
  surfaceReasons,
  roleBadges,
}: Props) {
  const hasDivergence = divergenceCount > 0;
  const promotionReasons =
    scopeState === 'out-surfaced' && surfaceReasons && surfaceReasons.length > 0
      ? surfaceReasons
      : null;
  const hasRoleBadges = !!roleBadges && roleBadges.length > 0;
  const decisionsOnHold = onHoldDecisionCount > 0;
  const isDeferred = status === 'deferred';
  const sourceTag = getSourceTag(objective);
  const baseLabel = `${objective.title}: ${STATUS_LABEL[status]}`;
  const ariaParts = [baseLabel];
  if (hasDivergence) {
    ariaParts.push(
      `${divergenceCount} divergence flag${divergenceCount === 1 ? '' : 's'}`,
    );
  }
  if (reviewSuggested) ariaParts.push('review suggested');
  // Soft gate only meaningfully applies to a locked card; guard so a stray
  // flag on a non-locked status can never recolour it.
  const isReviewCheckpoint = reviewCheckpoint && status === 'locked';
  if (isReviewCheckpoint) ariaParts.push('review checkpoint, accessible');
  const ariaLabel = ariaParts.join(' — ');
  const handleClick = () => onSelect(objective);
  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(objective);
    }
  };
  const handleDivergenceClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onDivergenceClick) onDivergenceClick(objective);
  };
  const handleRestoreClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onRestore) onRestore(objective);
  };
  return (
    <div
      className={css.card}
      role="button"
      tabIndex={0}
      data-status={status}
      data-active={isActive}
      data-highlighting={isHighlighting ? 'true' : undefined}
      data-has-divergence={hasDivergence ? 'true' : undefined}
      data-soft-review={isReviewCheckpoint ? 'true' : undefined}
      data-decisions-on-hold={decisionsOnHold ? 'true' : undefined}
      // Operational Role Layer: omitted when unscoped ⇒ no attribute ⇒ the
      // column renders exactly as today. 'out'/'out-surfaced' dim via CSS.
      data-scope={scopeState}
      onClick={handleClick}
      onKeyDown={handleKey}
      aria-label={ariaLabel}
    >
      <span className={css.body}>
        <span className={css.title}>
          {objective.shortTitle ?? objective.title}
        </span>
      </span>
      <span className={css.trail}>
        <span
          className={css.sourceTag}
          data-source={sourceTag.kind}
          title={sourceTag.label}
        >
          {sourceTag.label}
        </span>
        {promotionReasons && (
          <span
            className={css.surfaceChip}
            data-testid={`objective-surface-chip-${objective.id}`}
            title="Outside your default focus — surfaced because it affects your work"
          >
            {promotionReasons.map((r) => SURFACE_REASON_LABEL[r]).join(' · ')}
          </span>
        )}
        {hasRoleBadges &&
          roleBadges!.map((label) => (
            <span key={label} className={css.roleBadge}>
              {label}
            </span>
          ))}
        {hasDivergence && (
          <button
            type="button"
            className={css.divergencePill}
            data-testid={`objective-divergence-flag-${objective.id}`}
            title={
              onDivergenceClick
                ? `${divergenceCount} divergence flag${divergenceCount === 1 ? '' : 's'} — open Observe Domain Detail`
                : `${divergenceCount} divergence flag${divergenceCount === 1 ? '' : 's'} from Act`
            }
            onClick={handleDivergenceClick}
            disabled={!onDivergenceClick}
            aria-label={`Open Observe domain detail for ${divergenceCount} divergence${divergenceCount === 1 ? '' : 's'}`}
          >
            <RefreshCcw size={10} strokeWidth={2.5} aria-hidden="true" />
            {divergenceCount} divergence{divergenceCount === 1 ? '' : 's'}
          </button>
        )}
        {reviewFlagCount > 0 ? (
          <span
            className={css.reviewFlagChip}
            data-testid={`objective-review-flag-${objective.id}`}
            title={`${reviewFlagCount} downstream review flag${reviewFlagCount === 1 ? '' : 's'}`}
          >
            Review
          </span>
        ) : null}
        {reviewSuggested && (
          <span className={css.reviewBadge} title="Review suggested">
            <RefreshCcw size={10} strokeWidth={2.5} aria-hidden="true" />
            Review
          </span>
        )}
        {isReviewCheckpoint && (
          <span
            className={css.reviewBadgeAmber}
            data-testid={`objective-review-checkpoint-${objective.id}`}
            title="Previously completed — accessible to re-review while conditions are changing"
          >
            <RefreshCcw size={10} strokeWidth={2.5} aria-hidden="true" />
            Review
          </span>
        )}
        {decisionsOnHold && (
          <span
            className={css.onHoldChip}
            data-testid={`objective-on-hold-${objective.id}`}
            title={`${onHoldDecisionCount} decision${onHoldDecisionCount === 1 ? '' : 's'} on hold — parked for more observation`}
          >
            <Clock size={10} strokeWidth={2.5} aria-hidden="true" />
            {onHoldDecisionCount} on hold
          </span>
        )}
        {isDeferred && onRestore && (
          <button
            type="button"
            className={css.restoreBtn}
            onClick={handleRestoreClick}
            data-testid={`objective-restore-${objective.id}`}
            title="Restore this objective to active planning"
            aria-label={`Restore ${objective.title}`}
          >
            <RotateCcw size={10} strokeWidth={2.5} aria-hidden="true" />
            Restore
          </button>
        )}
        <span className={css.pill}>
          {isReviewCheckpoint ? 'Review' : STATUS_LABEL[status]}
        </span>
      </span>
    </div>
  );
}
