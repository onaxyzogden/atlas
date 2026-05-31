// ProtocolModePanel.tsx
//
// The Protocol-Mode right pane: a READ-ONLY library of the standard protocol
// templates (Protocol Layer Spec 4.2), enterprise-filtered (4.3) and rendered
// in the prototype's dark aesthetic so Design Mode and Protocol Mode read as
// one Plan stage in two modes (spec 2).
//
// Scope of this slice (everything else in the spec is deferred): no evaluation
// engine, no custom authoring, no compound-logic builder, no lifecycle
// mutation. Templates are shown as not-yet-activated proposals; the
// "derived from Tier 5 ▸" back-reference and "Open in Act →" affordance are
// presentational stubs that later phases turn into real links.
//
// Terminology note: "protocol" here means ONLY the spec's CONDITIONAL RULE
// (IF → THEN). The prototype's read-only survey-method groupings were renamed to
// "decision groups" (matching the live `decisionGroups` schema), so the former
// naming collision is resolved — "Protocol/Protocol Layer" is now unambiguous.

import {
  templatesForEnterprises,
  type EnterpriseId,
  type StandardProtocolTemplate,
} from '@ogden/shared';
import { C, F, CA } from './tokens.js';
import { TypeBadge } from './protocolTypeStyle.js';
import AutoFilledCondition from './AutoFilledCondition.js';
import type { ProposalDecision } from './types.js';

function ProtocolLibraryCard({
  template,
  decision,
  integrationApproved,
  outputs,
  edited,
}: {
  template: StandardProtocolTemplate;
  /** Post-confirmation decision for this template; 'pending' pre-confirmation. */
  decision: ProposalDecision;
  /** True once the Stratum-6 Integration objective has been approved (§10.1). */
  integrationApproved: boolean;
  /** Effective outputs for this template: defaults merged with steward edits. */
  outputs: Record<string, string>;
  /** True when this template's values diverge from the pre-filled defaults. */
  edited: boolean;
}) {
  // Status label: before approval everything reads "Standard template"; after,
  // activated templates read "Active" (green). Skipped ones move to a separate
  // recoverable section, so they are not rendered by this card.
  const isActive = integrationApproved && decision === 'activated';
  const statusLabel = isActive ? 'Active' : 'Standard template';
  const statusColor = isActive ? C.green : C.textTertiary;
  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.bg2,
        marginBottom: 10,
        overflow: 'hidden',
      }}
    >
      {/* Header: name + type badge */}
      <div style={{ padding: '13px 16px 11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontFamily: F.sans, fontWeight: 500, color: C.textPrimary, lineHeight: 1.3 }}>
            {template.name}
          </span>
          <TypeBadge type={template.type} />
        </div>

        {/* IF → THEN */}
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
      </div>

      {/* Feeds + status footer */}
      <div
        style={{
          background: C.bg3,
          borderTop: `1px solid ${C.border}`,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {template.feeds.map((f) => (
            <span
              key={f}
              style={{
                background: C.tealDim,
                border: `1px solid ${CA('teal', 0.33)}`,
                borderRadius: 10,
                padding: '2px 9px',
                fontSize: 10,
                color: C.teal,
                fontFamily: F.sans,
                fontWeight: 500,
              }}
            >
              {f}
            </span>
          ))}
        </div>
        {/* Lifecycle status — pre-approval: not-yet-activated proposal; post: Active */}
        <span
          style={{
            fontSize: 9,
            color: statusColor,
            fontFamily: F.sans,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {isActive && (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
          )}
          {statusLabel}
          {isActive && edited && (
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
      </div>
    </div>
  );
}

export default function ProtocolModePanel({
  enterprises = ['sheep_beef'],
  decisions = {},
  integrationApproved = false,
  outputs = {},
  editedValues = {},
  onRestore,
  onNavigateToSource,
}: {
  /**
   * The project's active animal enterprises (spec 4.3). Defaults to the
   * Homestead + Silvopasture slice: livestock present, no poultry — so the
   * Silvopasture Pest Diversion template is correctly hidden.
   */
  enterprises?: readonly EnterpriseId[];
  /** Per-template confirmation decision (post §4.1 flow), keyed by template id. */
  decisions?: Record<string, ProposalDecision>;
  /** True once the Stratum-6 Integration objective has been approved (§10.1). */
  integrationApproved?: boolean;
  /** Mock approved tier outputs (defaults) for AUTO-FILLED substitution. */
  outputs?: Record<string, string>;
  /** Per-template Edit-First overrides, keyed by template id then token. */
  editedValues?: Record<string, Record<string, string>>;
  /** Restore a skipped template to active (§4.1 recoverable skipped list). */
  onRestore?: (id: string) => void;
  /** Navigate back to the originating Stratum-6 Integration objective. */
  onNavigateToSource?: () => void;
}) {
  const templates = templatesForEnterprises(enterprises);
  const hasPoultry = enterprises.includes('poultry');
  // Post-approval, split skipped templates out into the recoverable section.
  const skippedTemplates = integrationApproved
    ? templates.filter((t) => decisions[t.id] === 'skipped')
    : [];
  const visibleTemplates = integrationApproved
    ? templates.filter((t) => decisions[t.id] !== 'skipped')
    : templates;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      {/* Header */}
      <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.sans, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Protocol Layer
          </span>
          <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.mono }}>
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ fontSize: 19, fontFamily: F.sans, fontWeight: 400, color: C.textPrimary, lineHeight: 1.3, marginBottom: 8 }}>
          Standing operational logic
        </div>
        <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: F.sans, lineHeight: 1.5, fontStyle: 'italic' }}>
          Conditional rules the land responds to — derived from design decisions, executed as Act tasks. Read-only preview.
        </div>
      </div>

      {/* Enterprise-scope note */}
      <div
        style={{
          background: C.bg2,
          borderBottom: `1px solid ${C.border}`,
          padding: '10px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.amber, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.sans }}>
          Enterprise-filtered for Silvopasture
          {hasPoultry ? ' + poultry' : ' (no poultry — Pest Diversion hidden)'}
        </span>
      </div>

      {/* Scrollable library */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 80px' }}>
        {/* Pre-approval banner — templates are read-only proposals until the
            Stratum-6 Integration objective is approved (§10.1 trigger). */}
        {!integrationApproved && templates.length > 0 && (
          <div
            style={{
              background: C.blueDim,
              border: `1px solid ${CA('blue', 0.27)}`,
              borderRadius: 9,
              padding: '11px 14px',
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 11, color: C.textPrimary, fontFamily: F.sans, lineHeight: 1.5, marginBottom: 8 }}>
              Approve the{' '}
              <span style={{ fontWeight: 700 }}>Stratum 6 — Integration</span> objective to instantiate
              these as standing protocols.
            </div>
            {onNavigateToSource && (
              <button
                onClick={onNavigateToSource}
                style={{
                  background: 'transparent',
                  border: `1px solid ${CA('blue', 0.4)}`,
                  borderRadius: 7,
                  color: C.blue,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: F.sans,
                  padding: '5px 12px',
                  cursor: 'pointer',
                }}
              >
                Go to Integration objective →
              </button>
            )}
          </div>
        )}

        {templates.length === 0 ? (
          <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.sans, fontStyle: 'italic', padding: '24px 0', textAlign: 'center' }}>
            No animal protocol templates — this property has no livestock enterprise.
          </div>
        ) : (
          visibleTemplates.map((t) => (
            <ProtocolLibraryCard
              key={t.id}
              template={t}
              decision={decisions[t.id] ?? 'pending'}
              integrationApproved={integrationApproved}
              outputs={{ ...outputs, ...(editedValues[t.id] ?? {}) }}
              edited={Object.entries(editedValues[t.id] ?? {}).some(([k, v]) => v !== outputs[k])}
            />
          ))
        )}

        {/* Skipped — recoverable (§4.1). Skipped proposals are not lost; the
            steward can restore any of them to an active standing protocol. */}
        {skippedTemplates.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.textTertiary, fontFamily: F.sans, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Skipped — recoverable
              </span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.mono }}>{skippedTemplates.length}</span>
            </div>
            {skippedTemplates.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: C.bg2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 9,
                  marginBottom: 8,
                  opacity: 0.85,
                }}
              >
                <TypeBadge type={t.type} />
                <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F.sans, flex: 1, minWidth: 0 }}>
                  {t.name}
                </span>
                {onRestore && (
                  <button
                    onClick={() => onRestore(t.id)}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${CA('green', 0.4)}`,
                      borderRadius: 7,
                      color: C.green,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: F.sans,
                      padding: '5px 12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Restore
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Back-reference — a real cross-link to the originating Stratum-6 objective. */}
        {templates.length > 0 && onNavigateToSource && (
          <button
            onClick={onNavigateToSource}
            style={{
              background: 'transparent',
              border: 'none',
              color: C.textTertiary,
              fontSize: 10,
              fontFamily: F.sans,
              fontStyle: 'italic',
              marginTop: 14,
              lineHeight: 1.5,
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
            }}
          >
            ⌒ Derived from Stratum 6 ▸ Integration decisions
            {integrationApproved ? ' · instantiated on objective approval' : ' · auto-instantiated on objective approval'} →
          </button>
        )}
      </div>
    </div>
  );
}
