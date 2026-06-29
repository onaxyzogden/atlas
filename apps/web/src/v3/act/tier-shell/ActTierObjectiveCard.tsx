// ActTierObjectiveCard.tsx
//
// Objective card for the left rail: category eyebrow, title, focused
// question, and a REAL checklist-progress chip ("3/5 done") derived from the
// objective's checklist + planStratumStore completion (the same signal the
// right-rail execution panel shows). Mirrors the role="button" keyboard
// pattern of the real ObjectiveCard. The prototype's mock priority +
// SEED-coordinate badges are dropped — progress is the live signal here.

import type { KeyboardEvent } from 'react';
import type { PlanStratumObjective } from '@ogden/shared';
import type { ObjectiveProgress } from './objectiveProgress.js';
import type { ScopeState } from '../../roles/railScope.js';
import type { SurfaceReason } from '../../roles/alwaysSurface.js';
import { getSourceTag } from '../../plan/strata/sourceTag.js';
import styles from './ActTierShell.module.css';

// Human label for each always-surface reason — the amber chip on a promoted
// out-of-focus card. ASCII-only copy; reasons arrive pre-ordered by priority.
const SURFACE_REASON_LABEL: Record<SurfaceReason, string> = {
  'carries-scope-note': 'Scope note',
  'open-review-flag': 'Open review flag',
  'cross-role-dependency': 'Feeds your work',
  'shared-resource-divergence': 'Shared resource changed',
};

// Status chip copy, keyed by the live objective-progress state. Mirrors the
// MILOS dashboard task card's status chip (Done / In progress / To do), mapped
// onto this rail's three progress states. ASCII-only.
const STATUS_CHIP_LABEL: Record<ObjectiveProgress['state'], string> = {
  complete: 'Done',
  active: 'In progress',
  available: 'To do',
};

interface Props {
  objective: PlanStratumObjective;
  // Optional context line above the title. The stratum objective rail omits it
  // (every card shares one stratum, already named in the rail header), so it
  // renders only when a caller supplies it — e.g. the search rail, where results
  // span strata and the eyebrow ("S2 · ...") disambiguates each match.
  eyebrow?: string;
  // 1-based position in the rendered list — drives the numbered badge
  // (01, 02, ...). The scoped rail numbers its in-focus and out-of-focus groups
  // independently, so this restarts per rendered sub-list. Omitted ⇒ no badge.
  index?: number;
  progress: ObjectiveProgress;
  isActive: boolean;
  onSelect: () => void;
  // ---- Operational Role Layer (additive; all undefined ⇒ byte-identical) ----
  // The viewer's scope classification for this card. Drives a `data-scope`
  // attribute the rail CSS dims on; absent ⇒ no attribute ⇒ unscoped rail.
  scopeState?: ScopeState;
  // Promotion reasons — rendered as an amber chip only when out-surfaced.
  surfaceReasons?: readonly SurfaceReason[];
  // Owning-role labels for out-of-focus context ("belongs to Livestock Lead").
  roleBadges?: readonly string[];
}

export default function ActTierObjectiveCard({
  objective,
  eyebrow,
  index,
  progress,
  isActive,
  onSelect,
  scopeState,
  surfaceReasons,
  roleBadges,
}: Props) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  }

  const progressLabel =
    progress.total === 0
      ? 'No tasks yet'
      : `${progress.verified}/${progress.total} done`;

  // Completion percentage for the mini progress bar (rounded; 0 when no tasks).
  const pct =
    progress.total === 0
      ? 0
      : Math.round((progress.verified / progress.total) * 100);

  // Source provenance (Universal / Primary / Secondary - <Type>). Universal is
  // the baseline and carries no badge to keep the rail uncluttered; primary and
  // secondary objectives get a labelled pill so a steward can see which of their
  // chosen project types (e.g. an Orchard / Food Forest or Silvopasture
  // secondary) contributed the objective - parity with the Plan ObjectiveColumn.
  const source = getSourceTag(objective);

  const hasRoleBadges = !!roleBadges && roleBadges.length > 0;
  const promotionReasons =
    scopeState === 'out-surfaced' && surfaceReasons && surfaceReasons.length > 0
      ? surfaceReasons
      : null;

  return (
    <div
      className={styles.objCard}
      role="button"
      tabIndex={0}
      // Selection is a toggle: clicking the active card deselects it (the shell
      // routes a re-select back to the stratum dashboard). aria-pressed exposes
      // that toggle state so assistive tech announces selected/not-selected
      // rather than a one-shot action.
      aria-pressed={isActive}
      data-status={progress.state}
      data-active={isActive}
      // Operational Role Layer: omitted when unscoped ⇒ no attribute ⇒ the rail
      // renders exactly as today. 'out'/'out-surfaced' dim the card via CSS;
      // the card stays fully interactive (never hide, only de-emphasize).
      data-scope={scopeState}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      {source.kind !== 'universal' && (
        <span className={styles.objSource} data-kind={source.kind}>
          {source.label}
        </span>
      )}
      {promotionReasons && (
        <span
          className={styles.surfaceChip}
          title="Outside your default focus — surfaced because it affects your work"
        >
          {promotionReasons.map((r) => SURFACE_REASON_LABEL[r]).join(' · ')}
        </span>
      )}
      <div className={styles.objHead}>
        {typeof index === 'number' ? (
          <span className={styles.objNum} aria-hidden="true">
            {String(index).padStart(2, '0')}
          </span>
        ) : null}
        <div className={styles.objHeadMain}>
          {eyebrow ? (
            <span className={styles.objEyebrow}>{eyebrow}</span>
          ) : null}
          <span className={styles.objTitle}>
            {objective.shortTitle ?? objective.title}
          </span>
          <span className={styles.objStatusChip} data-state={progress.state}>
            {STATUS_CHIP_LABEL[progress.state]}
          </span>
        </div>
      </div>
      <span className={styles.objDesc}>{objective.focusedQuestion}</span>
      {hasRoleBadges && (
        <div className={styles.roleBadgeRow}>
          {roleBadges!.map((label) => (
            <span key={label} className={styles.roleBadge}>
              {label}
            </span>
          ))}
        </div>
      )}
      <div className={styles.objFooter}>
        {progress.total === 0 ? (
          // No checklist yet — keep the original muted "No tasks yet" pill.
          <span className={styles.objProgress} data-state={progress.state}>
            {progressLabel}
          </span>
        ) : (
          // Live checklist progress as a mini bar ("3/5 ████░ 60%"), mirroring
          // the MILOS dashboard card's subtask bar. The fill reflects the
          // progress state (complete = green, in-flight/available = gold).
          <div
            className={styles.objBar}
            role="img"
            aria-label={`${progress.verified} of ${progress.total} decisions recorded`}
          >
            <span className={styles.objBarLabel}>
              {progress.verified}/{progress.total}
            </span>
            <span className={styles.objBarTrack}>
              <span
                className={styles.objBarFill}
                data-state={progress.state}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className={styles.objBarPct}>{pct}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
