/**
 * DeclarationCenter -- the Plan-stage Tier-0 / Declaration header that sits ABOVE
 * the existing 2-pane workbench grid (DecisionList + DecisionWorkingPanel). It
 * renders three regions from the supplied declaration mockup:
 *
 *   1. Mode header  -- "Mode 1 -- Declaration" eyebrow + Tier-0 + serif title +
 *                      framing paragraph.
 *   2. Canonical-object cards -- the Intent Object + Steward/Team Object, status
 *                      driven (Established / In Progress / Not started).
 *   3. Objective sequencing -- the "0.1 -> [0.2 | 0.3 | 0.4] -> [0.5 | 0.6] ->
 *                      Tier 1" diagram, status driven; nodes select their
 *                      objective when an onSelectObjective handler is provided.
 *
 * Plan-only: it is mounted by ActTierZeroWorkbench solely when `mode ===
 * "declaration"` is passed (the Act surface never sets it). All derivations come
 * from the pure declarationModel; this file owns presentation only.
 *
 * Theming: uses the project --color-* tokens (NOT the mockup's raw dark hex) so
 * it stays visually coherent with its sibling DecisionList / ActTierSpine, which
 * is the whole point of "evolve the existing workbench". The mockup governs
 * layout, structure, and copy; the token theme is shared with the workbench.
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
import css from './DeclarationCenter.module.css';

export interface DeclarationCenterProps {
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

export default function DeclarationCenter({
  objectives,
  objectiveStatuses,
  activeObjectiveId,
  onSelectObjective,
}: DeclarationCenterProps): JSX.Element {
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
    <div className={css.root} data-testid="declaration-center">
      {/* ---------- Mode header ---------- */}
      <div className={css.modeHd}>
        <div className={css.modeEyebrow}>
          <span className={css.modePill}>{DECLARATION_MODE.pill}</span>
          <span className={css.modeTier}>{DECLARATION_MODE.tier}</span>
        </div>
        <div className={css.modeTitle}>
          {DECLARATION_MODE.titleLead}
          <em className={css.modeTitleEm}>{DECLARATION_MODE.titleEm}</em>
          {DECLARATION_MODE.titleTail}
        </div>
        <div className={css.modeDesc}>{DECLARATION_MODE.desc}</div>
      </div>

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
