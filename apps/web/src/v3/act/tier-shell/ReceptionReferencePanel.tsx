/**
 * ReceptionReferencePanel -- the Plan-stage Tier-2 RIGHT rail for a selected
 * systems-reading survey. It is the reception sibling of the dashboard/objective
 * toggle: a read-only reference surface (no capture; the capture is the center
 * working panel). Transcribed from the olos_tier2_systems mockup right column:
 *
 *   1. Header        -- "Objective 2.x - <status>" eyebrow + survey title +
 *                       "Mode 2 -- Reception - Tier 2" subtitle.
 *   2. Reception mode -- the "Still listening" sky callout (record evidence here,
 *                       defer solutions to Mode 4 Design).
 *   3. Intent lens    -- the per-project-type "what to look for" rows (same
 *                       `intentLens` data the center accordion shows, expanded).
 *   4. Where this feeds -- the dual outputs: Observe Output (teal, -> Threshold 1
 *                       evidence base) + Act Handoff (amber).
 *   5. Both-tier progress -- Tier 1 (Land Reading) + Tier 2 (Systems Reading)
 *                       bars + the "NN survey records" caption.
 *
 * Plan-only: mounted by PlanTierShell solely for a selected reception objective.
 * No Act analog. Pure display -- every value is read from the objective + the
 * derived reception progress model; nothing is persisted. Theming uses the
 * project --color-* tokens (sky reception accent / teal observe / amber act),
 * ASCII-only with lucide glyphs.
 */

import { ArrowRight, ChartScatter, Ear } from 'lucide-react';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { findProjectType } from '@ogden/shared';
import {
  readBuildsOn,
  readIntentLens,
  readObserveOutput,
  receptionDisplayFor,
  receptionRecordsCaption,
  receptionReferenceSubtitle,
  receptionStatusLabel,
  receptionStillListeningCopy,
  RECEPTION_REFERENCE,
  type ReceptionProgressModel,
  type ReceptionTier,
  type TierProgress,
} from './receptionModel.js';
import css from './ReceptionReferencePanel.module.css';

export interface ReceptionReferencePanelProps {
  /** The selected reception survey objective (carries lens/output/builds-on). */
  objective: PlanStratumObjective;
  /** Its live LOCKING status (drives the eyebrow status word). */
  status: PlanStratumObjectiveStatus;
  /** Cross-tier progress, derived by the parent from the FULL objective list. */
  progress: ReceptionProgressModel;
  /**
   * Which reception tier the selected survey is in (Tier 1 Land Reading vs Tier 2
   * Systems Reading). Defaults to 'tier2' so the existing S3 mount is unchanged.
   */
  tier?: ReceptionTier;
}

/** Percent-complete (0..100) for a tier, guarded against a zero total. */
function pct(p: TierProgress): number {
  return p.total > 0 ? Math.round((p.complete / p.total) * 100) : 0;
}

export default function ReceptionReferencePanel({
  objective,
  status,
  progress,
  tier = 'tier2',
}: ReceptionReferencePanelProps): JSX.Element {
  const display = receptionDisplayFor(objective.id)?.display ?? '';
  const lens = readIntentLens(objective);
  const observe = readObserveOutput(objective);
  const buildsOn = readBuildsOn(objective);
  const stillListening = receptionStillListeningCopy(tier);
  const title = objective.shortTitle || objective.title;

  return (
    <div className={css.root} data-testid="reception-reference">
      {/* ---------- Header ---------- */}
      <div className={css.head}>
        <div className={css.eyebrow}>
          {display ? `Objective ${display}` : 'Objective'}
          {' - '}
          {receptionStatusLabel(status)}
        </div>
        <div className={css.title}>{title}</div>
        <div className={css.subtitle}>{receptionReferenceSubtitle(tier)}</div>
      </div>

      {/* ---------- Reception mode callout ---------- */}
      <section className={css.section}>
        <div className={css.sectionLabel}>
          {RECEPTION_REFERENCE.receptionModeLabel}
        </div>
        <div className={css.callout} data-testid="reception-still-listening">
          <div className={css.calloutTitle}>
            <Ear size={13} className={css.calloutIcon} aria-hidden="true" />
            {stillListening.title}
          </div>
          <div className={css.calloutBody}>{stillListening.body}</div>
        </div>
      </section>

      {/* ---------- Intent lens ---------- */}
      {lens.length > 0 ? (
        <section className={css.section}>
          <div className={css.sectionLabel}>
            {RECEPTION_REFERENCE.intentLensLabel}
          </div>
          {lens.map((row, i) => {
            const label = findProjectType(row.typeId)?.label ?? row.typeId;
            return (
              <div
                className={css.lensRow}
                key={`${row.typeId}-${i}`}
                data-testid={`reference-lens-${row.typeId}`}
              >
                <span className={css.lensTag}>{label}</span>
                <span className={css.lensText}>{row.text}</span>
              </div>
            );
          })}
        </section>
      ) : null}

      {/* ---------- Where this survey feeds ---------- */}
      {observe || objective.actHandoff ? (
        <section className={css.section}>
          <div className={css.sectionLabel}>{RECEPTION_REFERENCE.feedsLabel}</div>
          {observe ? (
            <div
              className={`${css.feed} ${css.feedObserve}`}
              data-testid="reference-feed-observe"
            >
              <ChartScatter
                size={13}
                className={css.feedIcon}
                aria-hidden="true"
              />
              <div className={css.feedBody}>
                <div className={css.feedLbl}>{RECEPTION_REFERENCE.observeFeed}</div>
                <div className={css.feedTxt}>{observe}</div>
              </div>
            </div>
          ) : null}
          {objective.actHandoff ? (
            <div
              className={`${css.feed} ${css.feedAct}`}
              data-testid="reference-feed-act"
            >
              <ArrowRight size={13} className={css.feedIcon} aria-hidden="true" />
              <div className={css.feedBody}>
                <div className={css.feedLbl}>{RECEPTION_REFERENCE.actFeed}</div>
                <div className={css.feedTxt}>{objective.actHandoff}</div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ---------- Builds-on (display-only dependency line) ---------- */}
      {buildsOn ? (
        <section className={css.section}>
          <div className={css.sectionLabel}>Builds on</div>
          <div className={css.buildsOn} data-testid="reference-builds-on">
            {buildsOn}
          </div>
        </section>
      ) : null}

      {/* ---------- Both-tier progress ---------- */}
      <section className={css.section}>
        <div className={css.sectionLabel}>
          {RECEPTION_REFERENCE.progressLabel}
        </div>
        <div className={css.progress}>
          <div className={css.progRow} data-testid="reference-prog-tier1">
            <span className={css.progLabel}>{RECEPTION_REFERENCE.tierOneRow}</span>
            <span className={css.progBar}>
              <span
                className={`${css.progFill} ${css.progFillDone}`}
                style={{ width: `${pct(progress.tierOne)}%` }}
              />
            </span>
            <span className={css.progFrac}>
              {progress.tierOne.complete}/{progress.tierOne.total}
            </span>
          </div>
          <div className={css.progRow} data-testid="reference-prog-tier2">
            <span className={css.progLabel}>{RECEPTION_REFERENCE.tierTwoRow}</span>
            <span className={css.progBar}>
              <span
                className={`${css.progFill} ${css.progFillActive}`}
                style={{ width: `${pct(progress.tierTwo)}%` }}
              />
            </span>
            <span className={css.progFrac}>
              {progress.tierTwo.complete}/{progress.tierTwo.total}
            </span>
          </div>
        </div>
        <div className={css.recordsCaption} data-testid="reference-records">
          {receptionRecordsCaption(progress.totalRecords)}
        </div>
      </section>
    </div>
  );
}
