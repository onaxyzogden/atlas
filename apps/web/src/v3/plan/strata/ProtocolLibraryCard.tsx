// ProtocolLibraryCard — one standard-protocol template rendered as a detail
// card (name + type badge, IF/THEN with token substitution, rationale, feeds +
// lifecycle-status footer). Extracted verbatim from ProtocolLayerPanel (Plan
// Spine re-skin Phase 2) so both the Act-rail panel and the new Plan Protocol
// detail column render identical cards from one source.
//
// Markup is byte-for-byte the prior inlined card; only its home changed.

import type { CSSProperties } from 'react';
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

/** Card emphasis treatments. `normal` is byte-identical to the pre-emphasis card
 *  (1px border + bg2 wash) so Plan and the default Act/library render unchanged;
 *  `triggered` adds the amber frame + 3px left accent + translucent amber wash +
 *  soft elevation that floats a live protocol; `dimmed` fades non-triggered Act
 *  cards without hiding them ("emphasize, don't hide"). Object-literal key order
 *  matters for `triggered`: `borderLeft` follows `border` so it overrides the
 *  left edge. */
const EMPHASIS_STYLE: Record<'normal' | 'triggered' | 'dimmed', CSSProperties> = {
  normal: { border: `1px solid ${C.border}`, background: C.bg2 },
  triggered: {
    border: `1px solid ${C.amber}`,
    borderLeft: `3px solid ${C.amber}`,
    background: CA('amber', 0.08),
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.18)',
  },
  dimmed: { border: `1px solid ${C.border}`, background: C.bg2, opacity: 0.52 },
};

export default function ProtocolLibraryCard({
  template,
  status,
  outputs,
  emphasis = 'normal',
  collapsed = false,
}: {
  template: StandardProtocolTemplate;
  status: RecordStatus | undefined;
  /** Derived parameter outputs for token substitution (filled or verbatim bracket). */
  outputs: Record<string, string>;
  /** Visual treatment — Act dims non-triggered + amber-frames triggered; Plan stays `normal`. */
  emphasis?: 'normal' | 'triggered' | 'dimmed';
  /** Act collapses non-triggered cards to header + footer (omits IF/THEN + rationale). */
  collapsed?: boolean;
}) {
  const meta = statusMeta(status);
  return (
    <div
      data-testid="protocol-template-card"
      data-template-id={template.id}
      data-protocol-status={status ?? 'none'}
      data-emphasis={emphasis}
      style={{
        borderRadius: 10,
        marginBottom: 10,
        overflow: 'hidden',
        ...EMPHASIS_STYLE[emphasis],
      }}
    >
      {/* Header: name (+ triggered pill) + type badge */}
      <div style={{ padding: '13px 16px 11px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 6,
            marginBottom: collapsed ? 0 : 8,
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}
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
            {emphasis === 'triggered' && (
              <span
                data-testid="protocol-triggered-pill"
                style={{
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: C.amber,
                  background: CA('amber', 0.14),
                  border: `1px solid ${CA('amber', 0.4)}`,
                  borderRadius: 10,
                  padding: '1px 8px',
                  fontFamily: F.sans,
                  whiteSpace: 'nowrap',
                }}
              >
                Triggered
              </span>
            )}
          </div>
          <TypeBadge type={template.type} />
        </div>

        {/* Body — IF/THEN + rationale. Act collapses non-triggered cards to
            header + footer only, so the whole body is gated on !collapsed. */}
        {!collapsed && (
          <>
            {/* IF → THEN. Tokens substituted from steward-entered S6 parameter
                values (outputs); unfilled tokens render their [bracket] verbatim. */}
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
          </>
        )}
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
        {status && (
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
        )}
      </div>
    </div>
  );
}
