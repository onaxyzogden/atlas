/**
 * StratumSequencingRail -- the reusable Plan-stage objective-sequencing stepper
 * for ANY stratum. Renders the vertical "N.1 -> [N.2 | N.3] -> ... -> <next
 * stratum>" diagram, status driven, with its nodes selecting their objective
 * when an onSelectObjective handler is given.
 *
 * Hosted in the right rail of PlanTierShell on every stratum: Stratum 1 mounts it
 * via DeclarationOrientationRail (beneath the Intent / Steward-Team canonical
 * cards); Strata 2-7 mount it directly. Plan-only -- the Act surface never mounts
 * it. All derivations come from the pure declarationModel; this file owns
 * presentation only. The heading reads "Stratum N -- Objective Sequencing" and
 * the terminal node reads the NEXT stratum's title (or "Plan complete" after the
 * last stratum).
 *
 * data-testids: root "stratum-sequencing-rail"; nodes "seq-node-${display}" and
 * the terminal "seq-node-next" (unchanged from the former DeclarationCenter
 * regions, so the behavior contract carries over).
 *
 * ASCII-only: every glyph is a lucide icon.
 */

import { Fragment } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  PLAN_STRATA,
  type PlanStratum,
  type PlanStratumObjective,
  type PlanStratumObjectiveStatus,
} from '@ogden/shared';
import {
  deriveStratumSequencing,
  type SequencingNode,
} from './declarationModel.js';
import css from './StratumSequencingRail.module.css';

export interface StratumSequencingRailProps {
  stratum: PlanStratum;
  objectives: readonly PlanStratumObjective[];
  objectiveStatuses: Readonly<Record<string, PlanStratumObjectiveStatus>>;
  /** Currently active objective id (marks the matching sequencing node). */
  activeObjectiveId?: string;
  /**
   * OPTIONAL. When provided, a non-locked sequencing node becomes a button that
   * selects its objective. Absent -> nodes render as static (no interaction).
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

/** The next stratum's title (by ordinal), or "Plan complete" after the last. */
function nextStratumLabel(ordinal: number): string {
  return (
    PLAN_STRATA.find((s) => s.ordinal === ordinal + 1)?.title ?? 'Plan complete'
  );
}

export default function StratumSequencingRail({
  stratum,
  objectives,
  objectiveStatuses,
  activeObjectiveId,
  onSelectObjective,
}: StratumSequencingRailProps): JSX.Element {
  const seq = deriveStratumSequencing(
    stratum,
    objectives,
    objectiveStatuses,
    nextStratumLabel(stratum.ordinal),
  );

  const renderNode = (node: SequencingNode) => {
    const locked = node.status === 'locked' || node.status === 'deferred';
    const interactive = Boolean(onSelectObjective) && !locked;
    const isActive = node.id === activeObjectiveId;
    const className = `${css.seqNode} ${seqNodeClass(node.status)}`;
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
          {node.display}
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
        {node.display}
      </span>
    );
  };

  return (
    <div className={css.seqBlock} data-testid="stratum-sequencing-rail">
      <div className={css.seqLabel}>
        Stratum {stratum.ordinal} -- Objective Sequencing
      </div>
      <div className={css.seqRow}>
        {seq.groups.map((group, gi) => (
          <Fragment key={gi}>
            {gi > 0 ? (
              <ArrowRight size={14} className={css.seqArr} aria-hidden="true" />
            ) : null}
            {group.kind === 'single' ? (
              group.nodes.map(renderNode)
            ) : (
              <div className={css.seqGroup}>
                <span className={css.seqGroupLbl}>parallel</span>
                <div className={css.seqGroupNodes}>
                  {group.nodes.map(renderNode)}
                </div>
              </div>
            )}
          </Fragment>
        ))}
        {seq.groups.length > 0 ? (
          <ArrowRight size={14} className={css.seqArr} aria-hidden="true" />
        ) : null}
        <span
          className={`${css.seqNode} ${
            seq.next.status === 'available' ? css.snAvail : css.snLocked
          }`}
          data-testid="seq-node-next"
          data-status={seq.next.status}
        >
          {seq.next.label}
        </span>
      </div>
    </div>
  );
}
