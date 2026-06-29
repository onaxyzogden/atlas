/**
 * ReceptionCenter -- the Plan-stage Stratum-3 / Reception (Systems Reading) header
 * that sits ABOVE the existing 2-pane workbench grid (DecisionList +
 * DecisionWorkingPanel). It renders, from the supplied systems-reading mockup:
 *
 *   1. Mode header   -- "Mode 2 -- Reception" eyebrow + Stratum 3 + serif title +
 *                       framing paragraph.
 *   2. Reception rule -- the "still no decisions" Ear callout.
 *   3. Sequencing     -- the flat "3.1 | 3.2 | 3.3 | 3.4 | 3.5 -> Threshold 1"
 *                       survey strip, status driven; nodes select their survey
 *                       when an onSelectObjective handler is provided.
 *   4. Stratum 3 gate -- the "N / 5" Systems-Reading progress card.
 *   5. Threshold-1 gate -- the Reality-Check covenant gate (locked until Stratum 2
 *                       and Stratum 3 are both complete).
 *
 * Plan-only: it is mounted by ActTierZeroWorkbench solely when `mode ===
 * "reception"` is passed (the Act surface never sets it). All derivations come
 * from the pure receptionModel; this file owns presentation only. The cross-stratum
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
  receptionGatesCopy,
  receptionModeCopy,
  receptionRuleCopy,
  receptionThresholdDesc,
  type ReceptionProgressModel,
  type ReceptionSeqNode,
  type ReceptionTier,
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
   * Which reception tier this header renders (Stratum 2 Land Reading vs Stratum 3
   * Systems Reading). Defaults to 'tier2' so the existing S3 mount is unchanged.
   */
  tier?: ReceptionTier;
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
  tier = 'tier2',
  onSelectObjective,
}: ReceptionCenterProps): JSX.Element {
  const mode = receptionModeCopy(tier);
  const rule = receptionRuleCopy(tier);
  const gates = receptionGatesCopy(tier);
  const seq = deriveReceptionSequencing(objectives, objectiveStatuses, tier);
  // The first gate card tracks the CURRENT tier's completion (Stratum 2 reads "N / 6"
  // toward the Stratum 3 unlock; Stratum 3 reads "N / 5" toward closing Reception).
  const tierGateProgress = tier === 'tier1' ? progress.tierOne : progress.tierTwo;

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
          <span className={css.modePill}>{mode.pill}</span>
          <span className={css.modeTier}>{mode.tier}</span>
        </div>
        <div className={css.modeTitle}>
          {mode.titleLead}
          <em className={css.modeTitleEm}>{mode.titleEm}</em>
          {mode.titleTail}
        </div>
        <div className={css.modeDesc}>{mode.desc}</div>
      </div>

      {/* ---------- Reception rule ---------- */}
      <div className={css.rule} data-testid="reception-rule">
        <Ear size={14} className={css.ruleIcon} aria-hidden="true" />
        <div className={css.ruleText}>
          <strong className={css.ruleLead}>{rule.lead}</strong>{' '}
          {rule.body}
        </div>
      </div>

      {/* ---------- Survey sequencing ---------- */}
      <div className={css.seqBlock}>
        <div className={css.seqLabel}>{mode.sequencingLabel}</div>
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

      {/* ---------- Stratum progress gate (Stratum 3 unlock) ---------- */}
      <div className={css.tierGate} data-testid="reception-tier-gate">
        <div className={css.tierGateIcon}>
          <Waves size={16} aria-hidden="true" />
        </div>
        <div className={css.tierGateBody}>
          <div className={css.tierGateTitle}>{gates.tierTwo.title}</div>
          <div className={css.tierGateDesc}>{gates.tierTwo.desc}</div>
        </div>
        <div className={css.tierGateFrac}>
          <span className={css.tierGateFracDone}>{tierGateProgress.complete}</span>
          {' / '}
          {tierGateProgress.total}
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
            {gates.thresholdOne.eyebrow}
          </div>
          <div className={css.thGateTitle}>{gates.thresholdOne.title}</div>
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
            ? gates.thresholdOne.openLabel
            : gates.thresholdOne.lockedLabel}
        </div>
      </div>
    </div>
  );
}
