/**
 * ReceptionCenter -- the Plan-stage Tier-2 / Reception (Systems Reading) header
 * that sits ABOVE the existing 2-pane workbench grid (DecisionList +
 * DecisionWorkingPanel). It renders, from the supplied systems-reading mockup:
 *
 *   1. Mode header   -- "Mode 2 -- Reception" eyebrow + Tier-2 + serif title +
 *                       framing paragraph.
 *   2. Reception rule -- the "still no decisions" Ear callout.
 *   3. Sequencing     -- the flat "2.1 | 2.2 | 2.3 | 2.4 | 2.5 -> Threshold 1"
 *                       survey strip, status driven; nodes select their survey
 *                       when an onSelectObjective handler is provided.
 *   4. Tier-2 gate    -- the "N / 5" Systems-Reading progress card.
 *   5. Threshold-1 gate -- the Reality-Check covenant gate (locked until Tier 1
 *                       and Tier 2 are both complete).
 *
 * Plan-only: it is mounted by ActTierZeroWorkbench solely when `mode ===
 * "reception"` is passed (the Act surface never sets it). All derivations come
 * from the pure receptionModel; this file owns presentation only. The cross-tier
 * progress is derived by the parent (which holds the FULL objective list, not
 * just this stratum slice) and passed in as `progress`.
 *
 * Theming: uses the project --color-* tokens (NOT the mockup's raw dark hex);
 * Reception's accent is --color-info (sky), the sibling of the gold Declaration
 * chrome. ASCII-only: every glyph is a lucide icon.
 */

import { ArrowRight, Ear, Scale, Waves } from 'lucide-react';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import {
  deriveReceptionSequencing,
  receptionThresholdDesc,
  RECEPTION_GATES,
  RECEPTION_MODE,
  RECEPTION_RULE,
  type ReceptionProgressModel,
  type ReceptionSeqNode,
} from './receptionModel.js';
import css from './ReceptionCenter.module.css';

export interface ReceptionCenterProps {
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
  /** Cross-tier progress, derived by the parent from the FULL objective list. */
  progress: ReceptionProgressModel;
  /** Currently active objective id (marks the matching sequencing node). */
  activeObjectiveId?: string;
  /**
   * OPTIONAL. When provided, a non-locked sequencing node becomes a button that
   * selects its survey. Absent -> nodes render as static (no interaction).
   */
  onSelectObjective?: (objectiveId: string) => void;
}

/** Status -> sequencing-node style class. */
function seqNodeClass(status: PlanStratumObjectiveStatus): string {
  switch (status) {
    case 'complete':
      return css.snDone ?? '';
    case 'active':
      return css.snActive ?? '';
    case 'available':
      return css.snAvail ?? '';
    default:
      return css.snLocked ?? '';
  }
}

export default function ReceptionCenter({
  objectives,
  objectiveStatuses,
  progress,
  activeObjectiveId,
  onSelectObjective,
}: ReceptionCenterProps): JSX.Element {
  const seq = deriveReceptionSequencing(objectives, objectiveStatuses);

  const renderNode = (node: ReceptionSeqNode) => {
    const locked = node.status === 'locked' || node.status === 'deferred';
    const interactive = Boolean(onSelectObjective) && !locked;
    const isActive = node.id === activeObjectiveId;
    const className = `${css.seqNode} ${seqNodeClass(node.status)}`;
    const label = `${node.display} ${node.shortLabel}`;
    if (interactive) {
      return (
        <button
          key={node.id}
          type="button"
          className={className}
          data-testid={`seq-node-${node.display}`}
          data-status={node.status}
          data-active={isActive || undefined}
          onClick={() => onSelectObjective?.(node.id)}
        >
          {label}
        </button>
      );
    }
    return (
      <span
        key={node.id}
        className={className}
        data-testid={`seq-node-${node.display}`}
        data-status={node.status}
        data-active={isActive || undefined}
      >
        {label}
      </span>
    );
  };

  return (
    <div className={css.root} data-testid="reception-center">
      {/* ---------- Mode header ---------- */}
      <div className={css.modeHd}>
        <div className={css.modeEyebrow}>
          <span className={css.modePill}>{RECEPTION_MODE.pill}</span>
          <span className={css.modeTier}>{RECEPTION_MODE.tier}</span>
        </div>
        <div className={css.modeTitle}>
          {RECEPTION_MODE.titleLead}
          <em className={css.modeTitleEm}>{RECEPTION_MODE.titleEm}</em>
          {RECEPTION_MODE.titleTail}
        </div>
        <div className={css.modeDesc}>{RECEPTION_MODE.desc}</div>
      </div>

      {/* ---------- Reception rule ---------- */}
      <div className={css.rule} data-testid="reception-rule">
        <Ear size={14} className={css.ruleIcon} aria-hidden="true" />
        <div className={css.ruleText}>
          <strong className={css.ruleLead}>{RECEPTION_RULE.lead}</strong>{' '}
          {RECEPTION_RULE.body}
        </div>
      </div>

      {/* ---------- Survey sequencing ---------- */}
      <div className={css.seqBlock}>
        <div className={css.seqLabel}>{RECEPTION_MODE.sequencingLabel}</div>
        <div className={css.seqRow}>
          {seq.nodes.map(renderNode)}
          {seq.nodes.length > 0 ? (
            <ArrowRight size={14} className={css.seqArr} aria-hidden="true" />
          ) : null}
          <span
            className={`${css.seqNode} ${
              seq.threshold.status === 'available' ? css.snAvail : css.snLocked
            }`}
            data-testid="seq-node-threshold"
            data-status={seq.threshold.status}
            title={seq.threshold.name}
          >
            {seq.threshold.label}
          </span>
        </div>
        {seq.note ? <div className={css.seqNote}>{seq.note}</div> : null}
      </div>

      {/* ---------- Tier-2 progress gate ---------- */}
      <div className={css.tierGate} data-testid="reception-tier-gate">
        <div className={css.tierGateIcon}>
          <Waves size={16} aria-hidden="true" />
        </div>
        <div className={css.tierGateBody}>
          <div className={css.tierGateTitle}>{RECEPTION_GATES.tierTwo.title}</div>
          <div className={css.tierGateDesc}>{RECEPTION_GATES.tierTwo.desc}</div>
        </div>
        <div className={css.tierGateFrac}>
          <span className={css.tierGateFracDone}>{progress.tierTwo.complete}</span>
          {' / '}
          {progress.tierTwo.total}
        </div>
      </div>

      {/* ---------- Threshold-1 gate ---------- */}
      <div
        className={css.thGate}
        data-testid="reception-threshold-gate"
        data-open={progress.thresholdOpen || undefined}
      >
        <div className={css.thGateIcon}>
          <Scale size={16} aria-hidden="true" />
        </div>
        <div className={css.thGateBody}>
          <div className={css.thGateEyebrow}>
            {RECEPTION_GATES.thresholdOne.eyebrow}
          </div>
          <div className={css.thGateTitle}>{RECEPTION_GATES.thresholdOne.title}</div>
          <div className={css.thGateDesc}>
            {receptionThresholdDesc(
              progress.tierOne.total,
              progress.tierTwo.total,
            )}
          </div>
        </div>
        <div
          className={css.thGateStatus}
          data-open={progress.thresholdOpen || undefined}
        >
          {progress.thresholdOpen
            ? RECEPTION_GATES.thresholdOne.openLabel
            : RECEPTION_GATES.thresholdOne.lockedLabel}
        </div>
      </div>
    </div>
  );
}
