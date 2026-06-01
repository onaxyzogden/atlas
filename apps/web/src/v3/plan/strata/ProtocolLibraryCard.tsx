// ProtocolLibraryCard — one standard-protocol template rendered as a detail
// card (name + type badge, IF/THEN with token substitution, rationale, feeds +
// lifecycle-status footer). Extracted verbatim from ProtocolLayerPanel (Plan
// Spine re-skin Phase 2) so both the Act-rail panel and the new Plan Protocol
// detail column render identical cards from one source.
//
// Markup is byte-for-byte the prior inlined card; only its home changed.

import {
  type StandardProtocolTemplate,
} from '@ogden/shared';
import { type ActivatedProtocolRecord } from '../../../store/protocolStore.js';
import { C, F, CA } from '../spine/tokens.js';
import { TypeBadge } from '../spine/protocolTypeStyle.js';
import AutoFilledCondition from '../spine/AutoFilledCondition.js';

export type RecordStatus = ActivatedProtocolRecord['status'];

/** Lifecycle label + accent for a template, from its protocolStore record (if any). */
export function statusMeta(status: RecordStatus | undefined): {
  label: string;
  color: string;
  dot: boolean;
} {
  switch (status) {
    case 'active':
      return { label: 'Active', color: C.green, dot: true };
    case 'triggered':
      return { label: 'Triggered', color: C.amber, dot: true };
    case 'suspended':
      return { label: 'Suspended', color: C.textTertiary, dot: false };
    default:
      return { label: 'Standard template', color: C.textTertiary, dot: false };
  }
}

export default function ProtocolLibraryCard({
  template,
  status,
  outputs,
}: {
  template: StandardProtocolTemplate;
  status: RecordStatus | undefined;
  /** Derived parameter outputs for token substitution (filled or verbatim bracket). */
  outputs: Record<string, string>;
}) {
  const meta = statusMeta(status);
  return (
    <div
      data-testid="protocol-template-card"
      data-template-id={template.id}
      data-protocol-status={status ?? 'none'}
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontFamily: F.sans,
              fontWeight: 500,
              color: C.textPrimary,
              lineHeight: 1.3,
            }}
          >
            {template.name}
          </span>
          <TypeBadge type={template.type} />
        </div>

        {/* IF → THEN. Tokens substituted from steward-entered S6 parameter values
            (outputs prop); unfilled tokens render their [bracket] verbatim. */}
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
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: C.amber,
                fontFamily: F.mono,
                letterSpacing: '0.08em',
                flexShrink: 0,
              }}
            >
              IF
            </span>
            <AutoFilledCondition condition={template.condition} outputs={outputs} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: C.green,
                fontFamily: F.mono,
                letterSpacing: '0.08em',
                flexShrink: 0,
              }}
            >
              THEN
            </span>
            <span
              style={{
                fontSize: 12,
                color: C.textSecondary,
                fontFamily: F.sans,
                lineHeight: 1.5,
              }}
            >
              {template.response}
            </span>
          </div>
        </div>

        {/* Rationale */}
        <div
          style={{
            fontSize: 12,
            color: C.textSecondary,
            fontFamily: F.sans,
            fontStyle: 'italic',
            lineHeight: 1.5,
            marginTop: 10,
          }}
        >
          {template.rationale}
        </div>
      </div>

      {/* Feeds + lifecycle-status footer */}
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
                fontSize: 12,
                color: C.teal,
                fontFamily: F.sans,
                fontWeight: 500,
              }}
            >
              {f}
            </span>
          ))}
        </div>
        <span
          style={{
            fontSize: 12,
            color: meta.color,
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
          {meta.dot && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: meta.color,
                display: 'inline-block',
              }}
            />
          )}
          {meta.label}
        </span>
      </div>
    </div>
  );
}
