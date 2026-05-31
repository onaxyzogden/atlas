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
// Terminology note: "protocol" here is the spec's CONDITIONAL RULE (IF → THEN),
// distinct from the prototype ProtocolCard's read-only survey-method grouping.
// The collision is flagged for a follow-up naming decision; both labels are
// kept as-is in this slice.

import {
  templatesForEnterprises,
  type EnterpriseId,
  type ProtocolType,
  type StandardProtocolTemplate,
} from '@ogden/shared';
import { C, F } from './tokens.js';

// Type badge palette — one accent per protocol type, drawn from the prototype's
// token set so the badges sit naturally beside the Design-Mode pills.
const TYPE_STYLE: Record<ProtocolType, { bg: string; color: string; label: string }> = {
  threshold: { bg: C.blueDim, color: C.blue, label: 'Threshold' },
  judgment: { bg: C.amberDim, color: C.amber, label: 'Judgment' },
  cyclical: { bg: C.tealDim, color: C.teal, label: 'Cyclical' },
  freeform: { bg: C.goldDim, color: C.gold, label: 'Freeform' },
};

function TypeBadge({ type }: { type: ProtocolType }) {
  const s = TYPE_STYLE[type];
  return (
    <span
      style={{
        background: s.bg,
        border: `1px solid ${s.color}55`,
        color: s.color,
        borderRadius: 12,
        padding: '2px 9px',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        fontFamily: F.sans,
      }}
    >
      {s.label}
    </span>
  );
}

function ProtocolLibraryCard({ template }: { template: StandardProtocolTemplate }) {
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
          <span style={{ fontSize: 14, fontFamily: F.serif, fontWeight: 500, color: C.textPrimary, lineHeight: 1.3 }}>
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
            <span style={{ fontSize: 11, color: C.textPrimary, fontFamily: F.sans, lineHeight: 1.5 }}>
              {template.condition.replace(/^IF\s+/, '')}
            </span>
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
                border: `1px solid ${C.teal}55`,
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
        {/* Lifecycle status — standard templates are not-yet-activated proposals */}
        <span style={{ fontSize: 9, color: C.textTertiary, fontFamily: F.sans, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Standard template
        </span>
      </div>
    </div>
  );
}

export default function ProtocolModePanel({
  enterprises = ['sheep_beef'],
}: {
  /**
   * The project's active animal enterprises (spec 4.3). Defaults to the
   * Homestead + Silvopasture slice: livestock present, no poultry — so the
   * Silvopasture Pest Diversion template is correctly hidden.
   */
  enterprises?: readonly EnterpriseId[];
}) {
  const templates = templatesForEnterprises(enterprises);
  const hasPoultry = enterprises.includes('poultry');

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
        <div style={{ fontSize: 19, fontFamily: F.serif, fontWeight: 400, color: C.textPrimary, lineHeight: 1.3, marginBottom: 8 }}>
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
        {templates.length === 0 ? (
          <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.sans, fontStyle: 'italic', padding: '24px 0', textAlign: 'center' }}>
            No animal protocol templates — this property has no livestock enterprise.
          </div>
        ) : (
          templates.map((t) => <ProtocolLibraryCard key={t.id} template={t} />)
        )}

        {/* Back-reference stub — later phases link to the Tier 5 objective */}
        {templates.length > 0 && (
          <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.sans, fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 }}>
            ⌒ Derived from Tier 5 ▸ Integration decisions · auto-instantiated on objective approval (deferred)
          </div>
        )}
      </div>
    </div>
  );
}
