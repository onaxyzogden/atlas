/**
 * DeclarationOrientationRail -- the Plan-stage Tier-0 / Declaration orientation
 * surface, hosted in the right rail of PlanTierShell. It carries the two
 * tier-level widgets relocated out of the DeclarationCenter header band (so the
 * center canvas is dominated by the decision list + working panel):
 *
 *   1. Canonical-object cards -- the Intent Object + Steward/Team Object, status
 *      driven (Established / In Progress / Not started), STACKED vertically for
 *      the narrow rail.
 *   2. Objective sequencing -- the "0.1 -> [0.2 | 0.3 | 0.4] -> [0.5 | 0.6] ->
 *      Tier 1" diagram, status driven, laid out top-to-bottom for the rail.
 *      Nodes select their objective when an onSelectObjective handler is given.
 *
 * Plan-only orientation: mounted by PlanTierShell across every Stratum-1
 * Project-Foundation objective -- both the non-spatial Declaration workbench
 * objectives AND the spatial/map ones (the orientation is tier-level, so it
 * stays put as the steward moves between foundation objectives). The Act surface
 * and Reception (Stratum 3) never mount it. All derivations come from the pure
 * declarationModel; this file owns presentation only. Same data-testids as the
 * former DeclarationCenter regions (canonical-*, seq-node-*) so the behavior
 * contract is unchanged.
 *
 * ASCII-only: every glyph is a lucide icon.
 */

import { Fragment } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import {
  DECLARATION_MODE,
  deriveCanonicalObjects,
  deriveSequencing,
  type SequencingNode,
} from './declarationModel.js';
import css from './DeclarationOrientationRail.module.css';

export interface DeclarationOrientationRailProps {
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

export default function DeclarationOrientationRail({
  objectives,
  objectiveStatuses,
  activeObjectiveId,
  onSelectObjective,
}: DeclarationOrientationRailProps): JSX.Element {
  const cards = deriveCanonicalObjects(objectives, objectiveStatuses);
  const seq = deriveSequencing(objectives, objectiveStatuses);

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
    <div className={css.root} data-testid="declaration-orientation-rail">
      <div className={css.railLabel}>Tier 0 -- Orientation</div>

      {/* ---------- Canonical-object cards ---------- */}
      {cards.length > 0 ? (
        <div className={css.coRow}>
          {cards.map((card) => (
            <div
              key={card.kind}
              className={`${css.coCard} ${
                card.tag === 'done'
                  ? css.coDone
                  : card.tag === 'wip'
                    ? css.coWip
                    : ''
              }`}
              data-testid={`canonical-${card.kind}`}
              data-tag={card.tag}
            >
              <div className={css.coEyebrow}>
                <span
                  className={`${css.coTag} ${
                    card.tag === 'done'
                      ? css.coTagDone
                      : card.tag === 'wip'
                        ? css.coTagWip
                        : css.coTagIdle
                  }`}
                >
                  {card.tag === 'done' ? (
                    <Check size={9} className={css.coTagIcon} aria-hidden="true" />
                  ) : null}
                  {card.tagLabel}
                </span>
              </div>
              <div className={css.coName}>{card.name}</div>
              <div className={css.coDesc}>{card.desc}</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ---------- Objective sequencing ---------- */}
      <div className={css.seqBlock}>
        <div className={css.seqLabel}>{DECLARATION_MODE.sequencingLabel}</div>
        <div className={css.seqRow}>
          {seq.groups.map((group, gi) => (
            <Fragment key={gi}>
              {gi > 0 ? (
                <ArrowRight
                  size={14}
                  className={css.seqArr}
                  aria-hidden="true"
                />
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
    </div>
  );
}
