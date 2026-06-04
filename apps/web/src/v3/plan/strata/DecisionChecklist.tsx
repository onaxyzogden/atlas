// DecisionChecklist — the YOUR DECISIONS section of ObjectiveDetailPanel.
//
// Phase B re-skin (2026-05-31): adopts the Plan Spine prototype's read-only
// `DecisionGroupCard` visual language (spine/DecisionGroupCard.tsx) faithfully.
// Each decision group renders as a coloured card with a tappable header (number
// bubble / ✓ when done), expand/collapse, a "decisions are worked through in
// Act" banner, striped item rows with a NON-INTERACTIVE 14px checkbox, and an
// "Open in Act →" CTA. Completion is now **display-only**: the Plan stage no
// longer toggles items — it reads the captured completion state (the store's
// per-item ids + the Stage Zero Vision bridge) and reflects it. "Plan decides,
// Act executes" — the actual working-through happens in the Act stage.
//
// Production signals are preserved as read-only adornments: per-item `feedsInto`
// chips, `optional`/`isMethodology` tags, item `expandedBySecondaryId`
// ("Expanded by") and group `sourceSecondaryId` ("Added by") attribution, and
// the Stage Zero "From Stage Zero Vision" derived badge + evidence.
//
// Styled with the spine tokens (C/F/CA) inline — the legacy
// DecisionChecklist.module.css is retired for this surface (left orphaned on
// disk per "no deletion in revamps").

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type {
  DecisionGroup,
  PlanDecisionChecklistItem,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { findProjectType } from '@ogden/shared';
import { findObjectiveGlobally } from '../objectiveCatalog.js';
import type { VisionDerivedItem, VisionDerivedMap } from '../../strata/visionProfileToChecklist.js';
import { C, F, CA } from '../spine/tokens.js';

interface Props {
  /** Owning project id — threaded to the per-card "Open in Act" deep link. */
  projectId: string;
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
  completedItemIds: readonly string[];
  /** Items pre-satisfied by the Stage Zero Vision bridge. */
  derivedEvidence?: VisionDerivedMap;
}

/** A flattened, render-ready decision group (real group or implicit fallback). */
interface RenderGroup {
  id: string;
  label: string;
  items: PlanDecisionChecklistItem[];
  observeFeeds: readonly string[];
  sourceSecondaryId: string | null;
  testId: string;
}

export default function DecisionChecklist({
  projectId,
  objective,
  status,
  completedItemIds,
  derivedEvidence,
}: Props) {
  const completed = new Set(completedItemIds);
  const items = objective.checklist;

  const isDerived = (id: string) => derivedEvidence?.[id]?.isComplete === true;
  const isItemComplete = (id: string) => completed.has(id) || isDerived(id);
  const requiredCount = items.filter((i) => !i.optional).length;
  const requiredDoneCount = items.filter(
    (i) => !i.optional && isItemComplete(i.id),
  ).length;

  const groups = buildRenderGroups(objective, items);

  // Expansion state is lifted here (was per-card local state) so a single
  // header control can open/close every group at once. Only groups with items
  // are expandable. Default: every group collapsed; reset on objective switch.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  useEffect(() => {
    setExpandedGroups(new Set());
  }, [objective.id]);

  const expandableIds = groups
    .filter((g) => g.items.length > 0)
    .map((g) => g.id);
  const allExpanded =
    expandableIds.length > 0 &&
    expandableIds.every((id) => expandedGroups.has(id));

  const toggleGroup = (id: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setExpandedGroups(allExpanded ? new Set() : new Set(expandableIds));

  return (
    <section
      aria-label="Your decisions"
      style={{ padding: '16px 18px 8px', display: 'flex', flexDirection: 'column' }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: C.textTertiary,
            fontFamily: F.sans,
          }}
        >
          Your decisions
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          {expandableIds.length > 0 ? (
            <button
              type="button"
              onClick={toggleAll}
              aria-label={
                allExpanded
                  ? 'Collapse all decision groups'
                  : 'Expand all decision groups'
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                fontSize: 10,
                fontWeight: 600,
                color: C.textSecondary,
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: 5,
                cursor: 'pointer',
                fontFamily: F.sans,
                alignSelf: 'center',
              }}
            >
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
          ) : null}
          <span
            data-status={status}
            style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.mono }}
          >
            {requiredDoneCount} / {requiredCount} required
          </span>
        </div>
      </header>

      {items.length === 0 ? (
        <p
          style={{
            margin: '4px 0 12px',
            fontSize: 12,
            color: C.textTertiary,
            fontFamily: F.sans,
            fontStyle: 'italic',
          }}
        >
          No checklist items for this objective yet.
        </p>
      ) : (
        groups.map((group, i) => (
          <ReadOnlyDecisionGroupCard
            key={group.id}
            projectId={projectId}
            objectiveId={objective.id}
            group={group}
            index={i}
            isItemComplete={isItemComplete}
            derivedEvidence={derivedEvidence}
            expanded={expandedGroups.has(group.id)}
            onToggle={() => toggleGroup(group.id)}
          />
        ))
      )}

      {objective.completionGate ? (
        <CompletionGate objective={objective} />
      ) : null}
    </section>
  );
}

/**
 * Partition the objective's checklist into render groups. When the objective
 * carries `decisionGroups`, each becomes a card and any item left unclaimed by
 * a partial grouping falls through to a trailing "Other decisions" card (the
 * render stays lossless). When there are no groups, all items collapse into a
 * single implicit "Decisions" card so every objective renders in one format.
 */
function buildRenderGroups(
  objective: PlanStratumObjective,
  items: readonly PlanDecisionChecklistItem[],
): RenderGroup[] {
  if (objective.decisionGroups.length === 0) {
    return [
      {
        id: `${objective.id}-all`,
        label: 'Decisions',
        items: [...items],
        observeFeeds: [],
        sourceSecondaryId: null,
        testId: `plan-decision-group-${objective.id}-all`,
      },
    ];
  }

  const byId = new Map(items.map((i) => [i.id, i]));
  const claimed = new Set<string>();

  const groups: RenderGroup[] = objective.decisionGroups.map(
    (group: DecisionGroup) => {
      const groupItems = group.itemIds
        .map((id) => byId.get(id))
        .filter((i): i is PlanDecisionChecklistItem => Boolean(i));
      groupItems.forEach((i) => claimed.add(i.id));
      return {
        id: group.id,
        label: group.label,
        items: groupItems,
        observeFeeds: group.observeFeeds,
        sourceSecondaryId: group.sourceSecondaryId ?? null,
        testId: `plan-decision-group-${group.id}`,
      };
    },
  );

  const ungrouped = items.filter((i) => !claimed.has(i.id));
  if (ungrouped.length > 0) {
    groups.push({
      id: 'ungrouped',
      label: 'Other decisions',
      items: ungrouped,
      observeFeeds: [],
      sourceSecondaryId: null,
      testId: 'plan-decision-group-ungrouped',
    });
  }

  return groups;
}

interface CardProps {
  projectId: string;
  objectiveId: string;
  group: RenderGroup;
  index: number;
  isItemComplete: (id: string) => boolean;
  derivedEvidence?: VisionDerivedMap;
  /** Controlled expansion — lifted to DecisionChecklist for expand/collapse-all. */
  expanded: boolean;
  onToggle: () => void;
}

/**
 * One read-only decision-group card, transcribing the prototype's
 * DecisionGroupCard visuals against the real PlanStratumObjective data. The
 * header colour follows injected (amber) → done (green) → default (blue). The
 * card is purely presentational: no toggling, completion is read from props.
 */
function ReadOnlyDecisionGroupCard({
  projectId,
  objectiveId,
  group,
  index,
  isItemComplete,
  derivedEvidence,
  expanded,
  onToggle,
}: CardProps) {
  const navigate = useNavigate();
  const hasItems = group.items.length > 0;
  const isDone = hasItems && group.items.every((i) => isItemComplete(i.id));
  const injected = group.sourceSecondaryId != null;

  const accentColor = injected ? C.amber : isDone ? C.green : C.blue;
  const bgColor = injected ? C.amberDim : isDone ? C.greenDim : C.blueDim;
  const borderColor = injected
    ? CA('amber', 0.33)
    : isDone
      ? CA('green', 0.27)
      : C.border;

  return (
    <div
      data-testid={group.testId}
      data-injected={injected ? 'true' : undefined}
      style={{
        borderRadius: 8,
        overflow: 'hidden',
        border: `1px solid ${borderColor}`,
        marginBottom: 8,
      }}
    >
      {/* Group header — tappable if it has items */}
      <div
        onClick={() => hasItems && onToggle()}
        role={hasItems ? 'button' : undefined}
        tabIndex={hasItems ? 0 : undefined}
        onKeyDown={(e) => {
          if (hasItems && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onToggle();
          }
        }}
        style={{
          background: bgColor,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: expanded ? `1px solid ${borderColor}` : 'none',
          cursor: hasItems ? 'pointer' : 'default',
        }}
      >
        {/* Number bubble */}
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: isDone ? C.green : injected ? C.amber : C.blue,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: isDone ? C.greenDim : injected ? C.amberDim : C.blueDim,
              fontFamily: F.mono,
            }}
          >
            {isDone ? '✓' : index + 1}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              fontFamily: F.sans,
              letterSpacing: '0.01em',
              color: isDone ? C.textSecondary : C.textPrimary,
              textDecoration: isDone ? 'line-through' : 'none',
            }}
          >
            {group.label}
          </div>
        </div>
        {injected && group.sourceSecondaryId ? (
          <span
            style={{
              fontSize: 9,
              color: C.amber,
              fontFamily: F.sans,
              fontWeight: 600,
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}
          >
            Added by{' '}
            {findProjectType(group.sourceSecondaryId)?.label ??
              group.sourceSecondaryId}
          </span>
        ) : null}
        {hasItems ? (
          <span
            style={{
              fontSize: 10,
              color: accentColor,
              opacity: 0.7,
              flexShrink: 0,
              fontFamily: F.sans,
            }}
          >
            {expanded ? '▲' : '▼'}
          </span>
        ) : null}
      </div>

      {/* Expanded — read-only item preview, worked through in Act */}
      {expanded && hasItems ? (
        <div style={{ background: C.bg }}>
          <div
            style={{
              padding: '6px 14px',
              background: C.bg3,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: C.textTertiary,
                fontFamily: F.sans,
                fontStyle: 'italic',
              }}
            >
              ⌒ Read-only preview — decisions are worked through in Act
            </span>
          </div>

          {group.items.map((item, i) => (
            <ReadOnlyItemRow
              key={item.id}
              item={item}
              striped={i % 2 === 1}
              isLast={i === group.items.length - 1}
              complete={isItemComplete(item.id)}
              derived={
                derivedEvidence?.[item.id]?.isComplete === true
                  ? derivedEvidence[item.id]
                  : undefined
              }
            />
          ))}

          <div
            style={{
              padding: '10px 14px',
              background: C.bg3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: C.textTertiary,
                fontFamily: F.sans,
                fontStyle: 'italic',
              }}
            >
              Full methodology available in Act
            </span>
            <button
              type="button"
              data-testid="open-in-act-trigger"
              onClick={() =>
                navigate({
                  to: '/v3/project/$projectId/act/field-action/$objectiveId',
                  params: { projectId, objectiveId },
                })
              }
              style={{
                margin: 0,
                padding: 0,
                border: 'none',
                background: 'transparent',
                font: 'inherit',
                fontSize: 10,
                color: C.blue,
                fontFamily: F.sans,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Open in Act →
            </button>
          </div>
        </div>
      ) : null}

      {/* Collapsed footer — observe feeds + item count */}
      {!expanded ? (
        <div
          style={{
            background: C.bg3,
            padding: '7px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
              minWidth: 0,
            }}
          >
            {group.observeFeeds.length > 0 ? (
              <>
                <span
                  style={{ fontSize: 10, color: C.teal, fontFamily: F.sans }}
                >
                  → feeds
                </span>
                {group.observeFeeds.map((feed) => (
                  <span
                    key={feed}
                    style={{
                      fontSize: 10,
                      color: C.teal,
                      fontFamily: F.sans,
                      background: CA('teal', 0.12),
                      borderRadius: 8,
                      padding: '1px 7px',
                    }}
                  >
                    {feed}
                  </span>
                ))}
              </>
            ) : (
              <span />
            )}
          </div>
          <span
            style={{
              fontSize: 10,
              color: C.textTertiary,
              fontFamily: F.mono,
              background: C.bg4,
              borderRadius: 8,
              padding: '1px 7px',
              flexShrink: 0,
            }}
          >
            {group.items.length} item{group.items.length !== 1 ? 's' : ''}
          </span>
        </div>
      ) : null}
    </div>
  );
}

interface ItemRowProps {
  item: PlanDecisionChecklistItem;
  striped: boolean;
  isLast: boolean;
  complete: boolean;
  derived?: VisionDerivedItem;
}

/**
 * A single expanded item: a NON-INTERACTIVE 14px checkbox (✓ when complete) +
 * the item label and its read-only adornments. No onChange — the Plan stage
 * does not toggle completion.
 */
function ReadOnlyItemRow({
  item,
  striped,
  isLast,
  complete,
  derived,
}: ItemRowProps) {
  const fromBridge = Boolean(derived);
  return (
    <div
      data-complete={complete}
      data-derived={fromBridge}
      data-injected={item.expandedBySecondaryId ? 'true' : undefined}
      style={{
        padding: '9px 14px 9px 38px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        borderBottom: isLast ? 'none' : `1px solid ${CA('border', 0.2)}`,
        background: striped ? C.bg2 : C.bg,
      }}
    >
      {/* Non-interactive checkbox */}
      <div
        aria-hidden="true"
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          flexShrink: 0,
          marginTop: 2,
          border: `1.5px solid ${complete ? C.green : C.textTertiary}`,
          background: complete ? C.green : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.7,
        }}
      >
        {complete ? (
          <span style={{ fontSize: 9, color: C.greenDim, fontFamily: F.sans }}>
            ✓
          </span>
        ) : null}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontSize: 11,
            color: complete ? C.textTertiary : C.textSecondary,
            fontFamily: F.sans,
            lineHeight: 1.5,
            textDecoration: complete ? 'line-through' : 'none',
          }}
        >
          {item.label}
        </span>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 5,
          }}
        >
          {item.optional ? <Tag color={C.textTertiary}>optional</Tag> : null}
          {item.isMethodology ? <Tag color={C.teal}>methodology</Tag> : null}
          {item.expandedBySecondaryId ? (
            <Tag color={C.amber}>
              Expanded by{' '}
              {findProjectType(item.expandedBySecondaryId)?.label ??
                item.expandedBySecondaryId}
            </Tag>
          ) : null}
          {fromBridge ? (
            <Tag color={C.green}>From Stage Zero Vision</Tag>
          ) : null}
          {item.feedsInto.map((targetId) => {
            const target = findObjectiveGlobally(targetId);
            return (
              <Tag key={targetId} color={C.blue}>
                feeds {target?.title ?? targetId}
              </Tag>
            );
          })}
        </div>

        {fromBridge && derived?.evidence ? (
          <p
            data-testid={`plan-decision-evidence-${item.id}`}
            style={{
              margin: '6px 0 0',
              fontSize: 10,
              color: C.textTertiary,
              fontFamily: F.sans,
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}
          >
            {derived.evidence}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Tag({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 9,
        color,
        fontFamily: F.sans,
        fontWeight: 600,
        letterSpacing: '0.02em',
        background: C.bg4,
        borderRadius: 6,
        padding: '1px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/**
 * The completion-gate block, preserved from the production checklist as a
 * read-only spine-styled panel (gate text + amendment history). Renders only
 * when the objective carries a gate.
 */
function CompletionGate({ objective }: { objective: PlanStratumObjective }) {
  const amenderTypeId = mostCommonAmender(objective.checklist);
  const gateAmendments = objective.completionGateAmendments ?? [];
  const gateBase = objective.completionGateBase;
  const hasGateHistory =
    gateAmendments.length > 0 && Boolean(gateBase && gateBase.trim());

  return (
    <div
      style={{
        marginTop: 4,
        marginBottom: 12,
        padding: '12px 14px',
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: C.bg2,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: C.textTertiary,
            fontFamily: F.sans,
          }}
        >
          Completion gate
        </p>
        {amenderTypeId ? (
          <span style={{ fontSize: 9, color: C.amber, fontFamily: F.sans }}>
            Amended by {findProjectType(amenderTypeId)?.label ?? amenderTypeId}
          </span>
        ) : null}
      </div>

      {hasGateHistory ? (
        <div data-testid="plan-gate-history" style={{ marginBottom: 8 }}>
          <p
            style={{
              margin: '0 0 2px',
              fontSize: 9,
              color: C.textTertiary,
              fontFamily: F.sans,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Previously
          </p>
          <p
            style={{
              margin: '0 0 6px',
              fontSize: 11,
              color: C.textTertiary,
              fontFamily: F.sans,
              textDecoration: 'line-through',
              lineHeight: 1.5,
            }}
          >
            {gateBase}
          </p>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {gateAmendments.map((a, i) => (
              <li
                key={`${a.secondaryTypeId}-${i}`}
                style={{
                  fontSize: 11,
                  color: C.textSecondary,
                  fontFamily: F.sans,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: C.amber, fontWeight: 600 }}>
                  {findProjectType(a.secondaryTypeId)?.label ??
                    a.secondaryTypeId}
                </span>{' '}
                added: {a.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: C.textSecondary,
          fontFamily: F.sans,
          lineHeight: 1.55,
        }}
      >
        {objective.completionGate}
      </p>
    </div>
  );
}

/**
 * The secondary type credited with amending the completion gate: the
 * most-common `expandedBySecondaryId` across injected checklist items.
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
