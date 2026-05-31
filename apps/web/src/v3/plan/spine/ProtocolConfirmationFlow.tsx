// ProtocolConfirmationFlow.tsx
//
// The §4.1 / §11.2 protocol auto-instantiation confirmation surface, rendered as
// a CARD STACK (operator decision): when the steward approves the Stratum-6
// "Integration" objective (§10.1), OLOS generates a pre-filled confirmation
// request for every enterprise-eligible standard template. Each proposal is one
// scrollable card the steward acts on independently — Activate / Edit First /
// Skip — with a running tally and per-card Undo. "Edit First" opens an inline
// form to adjust the auto-filled threshold values before activating (§4.1).
//
// Scope (everything else deferred): no persistence, no evaluation engine. Edits
// live as local React state in PlanSpinePrototype (editedValues). AUTO-FILLED
// IF→THEN segments are substituted from the web-side mock APPROVED_TIER_OUTPUTS
// via the pure renderConditionSegments helper — no eval.

import { useState } from 'react';
import { C, F, CA } from './tokens.js';
import { TYPE_STYLE, TypeBadge } from './protocolTypeStyle.js';
import AutoFilledCondition from './AutoFilledCondition.js';
import { renderConditionSegments } from './autoFill.js';
import type { ProposalDecision } from './types.js';
import type { StandardProtocolTemplate } from '@ogden/shared';

function ConfirmationCard({
  template,
  decision,
  outputs,
  isEdited,
  onActivate,
  onSkip,
  onUndo,
  onEditCommit,
}: {
  template: StandardProtocolTemplate;
  decision: ProposalDecision;
  /** Effective outputs for this card: defaults merged with this card's edits. */
  outputs: Record<string, string>;
  /** True when this card's values diverge from the pre-filled defaults. */
  isEdited: boolean;
  onActivate: () => void;
  onSkip: () => void;
  onUndo: () => void;
  onEditCommit: (values: Record<string, string>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  // The condition's distinct auto-fill tokens (e.g. 'approved threshold'). Edit
  // First is only meaningful when there is at least one.
  const tokens = [
    ...new Set(
      renderConditionSegments(template.condition.replace(/^IF\s+/, ''), outputs)
        .map((s) => s.token)
        .filter((t): t is string => !!t),
    ),
  ];
  const canEdit = tokens.length > 0;

  const startEdit = () => {
    setDraft(Object.fromEntries(tokens.map((tk) => [tk, outputs[tk] ?? ''])));
    setEditing(true);
  };
  const saveEdit = () => {
    onEditCommit(draft);
    setEditing(false);
  };

  const acted = decision !== 'pending';
  const accent =
    decision === 'activated' ? C.green : decision === 'skipped' ? C.textTertiary : TYPE_STYLE[template.type].color;

  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${decision === 'activated' ? CA('green', 0.33) : C.border}`,
        background: C.bg2,
        marginBottom: 10,
        overflow: 'hidden',
        opacity: decision === 'skipped' ? 0.6 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Header: name + type badge */}
      <div style={{ padding: '13px 16px 11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontFamily: F.serif, fontWeight: 500, color: C.textPrimary, lineHeight: 1.3 }}>
            {template.name}
          </span>
          <TypeBadge type={template.type} />
        </div>

        {/* IF → THEN with AUTO-FILLED highlights */}
        <div
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.amber, fontFamily: F.mono, letterSpacing: '0.08em', flexShrink: 0 }}>
              IF
            </span>
            <AutoFilledCondition condition={template.condition} outputs={outputs} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.green, fontFamily: F.mono, letterSpacing: '0.08em', flexShrink: 0 }}>
              THEN
            </span>
            <span style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.sans, lineHeight: 1.5 }}>
              {template.response}
            </span>
          </div>
        </div>

        {/* Rationale */}
        <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.sans, fontStyle: 'italic', lineHeight: 1.5, marginTop: 10 }}>
          {template.rationale}
        </div>

        {/* Expand: full schema */}
        <button
          onClick={() => setExpanded((p) => !p)}
          style={{
            marginTop: 10,
            background: 'transparent',
            border: 'none',
            color: C.textTertiary,
            fontSize: 10,
            fontFamily: F.sans,
            fontWeight: 600,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {expanded ? '▲' : '▼'} Review full schema
        </button>
        {expanded && (
          <div
            style={{
              marginTop: 8,
              padding: '10px 12px',
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {[
              ['Type', TYPE_STYLE[template.type].label],
              ['Enterprise scope', template.enterpriseScope.join(', ')],
              ['Feeds', template.feeds.join(', ') || '—'],
              ['Authored by', template.tierAuthored ?? '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 10, fontSize: 10, fontFamily: F.sans }}>
                <span style={{ color: C.textTertiary, width: 110, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  {k}
                </span>
                <span style={{ color: C.textSecondary }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action footer */}
      <div
        style={{
          background: C.bg3,
          borderTop: `1px solid ${C.border}`,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            {tokens.map((tk) => (
              <div key={tk} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  style={{
                    fontSize: 9,
                    color: C.textTertiary,
                    fontFamily: F.sans,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {tk}
                </label>
                <input
                  value={draft[tk] ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [tk]: e.target.value }))}
                  style={{
                    background: C.bg,
                    border: `1px solid ${CA('amber', 0.33)}`,
                    borderRadius: 7,
                    color: C.textPrimary,
                    fontSize: 12,
                    fontFamily: F.mono,
                    padding: '6px 10px',
                    outline: 'none',
                  }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button
                onClick={saveEdit}
                style={{
                  background: C.green,
                  border: 'none',
                  borderRadius: 7,
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: F.sans,
                  padding: '6px 14px',
                  cursor: 'pointer',
                }}
              >
                Save &amp; activate
              </button>
              <button
                onClick={() => setEditing(false)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  color: C.textSecondary,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: F.sans,
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : acted ? (
          <>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: accent,
                fontFamily: F.sans,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {decision === 'activated' ? '✓ Activated' : '⊘ Skipped'}
              {decision === 'activated' && isEdited && (
                <span
                  style={{
                    fontSize: 8,
                    background: C.amberDim,
                    color: C.amber,
                    border: `1px solid ${CA('amber', 0.33)}`,
                    borderRadius: 6,
                    padding: '1px 5px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Edited
                </span>
              )}
            </span>
            <button
              onClick={onUndo}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                color: C.textSecondary,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: F.sans,
                padding: '5px 12px',
                cursor: 'pointer',
              }}
            >
              Undo
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onActivate}
              style={{
                background: C.blue,
                border: 'none',
                borderRadius: 7,
                color: 'white',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: F.sans,
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              Activate
            </button>
            <button
              onClick={startEdit}
              disabled={!canEdit}
              title={canEdit ? 'Adjust the auto-filled values before activating' : 'No auto-filled values to edit'}
              style={{
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                color: canEdit ? C.textSecondary : C.textTertiary,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: F.sans,
                padding: '6px 12px',
                cursor: canEdit ? 'pointer' : 'not-allowed',
                opacity: canEdit ? 1 : 0.6,
              }}
            >
              Edit First
            </button>
            <button
              onClick={onSkip}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                color: C.textSecondary,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: F.sans,
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProtocolConfirmationFlow({
  templates,
  decisions,
  outputs,
  editedValues,
  isEdited,
  onActivate,
  onSkip,
  onUndo,
  onEditCommit,
  onClose,
}: {
  /** Already enterprise-filtered (spec §4.3) standard templates to confirm. */
  templates: readonly StandardProtocolTemplate[];
  /** Per-template decision state, keyed by template id. */
  decisions: Record<string, ProposalDecision>;
  /** Mock approved tier outputs (defaults) for AUTO-FILLED bracket substitution. */
  outputs: Record<string, string>;
  /** Per-template Edit-First overrides, keyed by template id then token. */
  editedValues: Record<string, Record<string, string>>;
  /** Whether a template's values diverge from defaults (drives the "Edited" tag). */
  isEdited: (id: string) => boolean;
  onActivate: (id: string) => void;
  onSkip: (id: string) => void;
  onUndo: (id: string) => void;
  onEditCommit: (id: string, values: Record<string, string>) => void;
  onClose: () => void;
}) {
  const activated = templates.filter((t) => decisions[t.id] === 'activated').length;
  const skipped = templates.filter((t) => decisions[t.id] === 'skipped').length;
  const remaining = templates.length - activated - skipped;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      {/* Header */}
      <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.sans, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Confirm standing protocols
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              color: C.textSecondary,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: F.sans,
              padding: '5px 12px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
        <div style={{ fontSize: 19, fontFamily: F.serif, fontWeight: 400, color: C.textPrimary, lineHeight: 1.3, marginBottom: 8 }}>
          Standing operational logic
        </div>
        <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: F.sans, lineHeight: 1.5, fontStyle: 'italic', marginBottom: 12 }}>
          Derived from Stratum 6 ▸ Integration · pre-filled from approved decisions. Confirm each as a standing protocol.
        </div>

        {/* Running tally */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            ['Activated', activated, C.green],
            ['Skipped', skipped, C.textSecondary],
            ['Remaining', remaining, C.blue],
          ].map(([label, count, color]) => (
            <div key={label as string} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: color as string, fontFamily: F.mono }}>
                {count as number}
              </span>
              <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.sans, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label as string}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Card stack */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 40px' }}>
        {templates.map((t) => (
          <ConfirmationCard
            key={t.id}
            template={t}
            decision={decisions[t.id] ?? 'pending'}
            outputs={{ ...outputs, ...(editedValues[t.id] ?? {}) }}
            isEdited={isEdited(t.id)}
            onActivate={() => onActivate(t.id)}
            onSkip={() => onSkip(t.id)}
            onUndo={() => onUndo(t.id)}
            onEditCommit={(values) => onEditCommit(t.id, values)}
          />
        ))}

        {/* AUTO-FILLED legend */}
        <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.sans, fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 }}>
          <span
            style={{
              background: C.amberDim,
              border: `1px solid ${CA('amber', 0.33)}`,
              color: C.amber,
              borderRadius: 5,
              padding: '1px 6px',
              fontFamily: F.mono,
              fontWeight: 600,
            }}
          >
            highlighted
          </span>{' '}
          values are auto-filled from approved Stratum-6 outputs · use &ldquo;Edit First&rdquo; to adjust a threshold before activating
        </div>
      </div>
    </div>
  );
}
