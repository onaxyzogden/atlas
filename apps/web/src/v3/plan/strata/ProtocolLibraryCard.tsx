// ProtocolLibraryCard — one standard-protocol template rendered as a detail
// card (name + type badge, IF/THEN with token substitution, rationale, feeds +
// lifecycle-status footer). Extracted verbatim from ProtocolLayerPanel (Plan
// Spine re-skin Phase 2) so both the Act-rail panel and the new Plan Protocol
// detail column render identical cards from one source.
//
// Markup is byte-for-byte the prior inlined card; only its home changed.

import type { CSSProperties } from 'react';
import {
  resolveSeverityTier,
  type SeverityTier,
  type StandardProtocolTemplate,
} from '@ogden/shared';
import { type ActivatedProtocolRecord } from '../../../store/protocolStore.js';
import { C, F, CA } from '../spine/tokens.js';
import { TypeBadge } from '../spine/protocolTypeStyle.js';
import AutoFilledCondition from '../spine/AutoFilledCondition.js';
import { getProtocolSourceTag, type SourceTagKind } from './sourceTag.js';

export type RecordStatus = ActivatedProtocolRecord['status'];

/** Source-attribution badge accent, mirroring ObjectiveCard.module.css `.sourceTag`:
 *  universal = blue (info), primary = green, secondary = amber. All three have an
 *  rgb triplet for CA(), so the translucent-fill treatment is available. */
const SOURCE_META: Record<SourceTagKind, string> = {
  universal: C.blue,
  primary: C.green,
  secondary: C.amber,
};

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
/** Severity-tier badge label + accent colour. The badge is rendered as
 *  coloured text + a 1px same-colour border over the card's bg2 wash — `stop`
 *  uses C.red, which has NO parallel rgb-triplet (so CA() / a translucent fill
 *  is unavailable); the solid-border treatment keeps every tier visually
 *  consistent. `respond` is the canonical "produces work" default. */
const SEVERITY_META: Record<SeverityTier, { label: string; color: string }> = {
  stop: { label: 'Stop', color: C.red },
  respond: { label: 'Respond', color: C.amber },
  watch: { label: 'Watch', color: C.textTertiary },
  abundance: { label: 'Abundance', color: C.teal },
};

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
  variant = 'full',
  onSelect,
  selected = false,
}: {
  template: StandardProtocolTemplate;
  status: RecordStatus | undefined;
  /** Derived parameter outputs for token substitution (filled or verbatim bracket). */
  outputs: Record<string, string>;
  /** Visual treatment — Act dims non-triggered + amber-frames triggered; Plan stays `normal`. */
  emphasis?: 'normal' | 'triggered' | 'dimmed';
  /** Act collapses non-triggered cards to header + footer (omits IF/THEN + rationale). */
  collapsed?: boolean;
  /**
   * `mechanics` strips the card to its editable essentials — header + live
   * IF/THEN box only — omitting the rationale + Amanah block AND the
   * feeds/status footer. The Plan Protocols-workspace editor pane uses it so
   * those move to the adjacent MEANING pane and the right-rail WIRING pane with
   * no duplication. `full` (default) is byte-identical to the prior card, so
   * Act + the library are unchanged.
   */
  variant?: 'full' | 'mechanics';
  /** When set, the card becomes a button (click + Enter/Space) firing this — used by
   *  the Act rail to drive the right-rail detail pane. Omitted = inert (Plan/library). */
  onSelect?: () => void;
  /** Selected treatment (blue accent border) — only meaningful with `onSelect`. */
  selected?: boolean;
}) {
  const meta = statusMeta(status);
  const severity = resolveSeverityTier(template);
  const severityMeta = SEVERITY_META[severity];
  const sourceTag = getProtocolSourceTag(template);
  const sourceColor = SOURCE_META[sourceTag.kind];
  const interactive = Boolean(onSelect);
  return (
    <div
      data-testid="protocol-template-card"
      data-template-id={template.id}
      data-protocol-status={status ?? 'none'}
      data-emphasis={emphasis}
      data-severity={severity}
      data-has-scope-notes={template.scopeNotes ? 'true' : 'false'}
      data-selected={interactive ? String(selected) : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      style={{
        borderRadius: 10,
        marginBottom: 10,
        overflow: 'hidden',
        ...EMPHASIS_STYLE[emphasis],
        ...(interactive ? { cursor: 'pointer' } : null),
        ...(interactive && selected
          ? { border: `1px solid ${C.blue}`, boxShadow: `0 0 0 1px ${C.blue}` }
          : null),
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <TypeBadge type={template.type} />
            <span
              data-testid="protocol-severity-badge"
              style={{
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: severityMeta.color,
                background: C.bg2,
                border: `1px solid ${severityMeta.color}`,
                borderRadius: 10,
                padding: '1px 8px',
                fontFamily: F.sans,
                whiteSpace: 'nowrap',
              }}
            >
              {severityMeta.label}
            </span>
            <span
              data-testid="protocol-source-badge"
              data-source={sourceTag.kind}
              style={{
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: sourceColor,
                background: CA(
                  sourceTag.kind === 'universal'
                    ? 'blue'
                    : sourceTag.kind === 'primary'
                      ? 'green'
                      : 'amber',
                  0.14,
                ),
                border: `1px solid ${sourceColor}`,
                borderRadius: 10,
                padding: '1px 8px',
                fontFamily: F.sans,
                whiteSpace: 'nowrap',
              }}
            >
              {sourceTag.label}
            </span>
          </div>
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

            {/* Rationale — omitted in the `mechanics` variant (moves to the
                Plan Protocols-workspace MEANING pane). */}
            {variant !== 'mechanics' && (
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
            )}

            {/* Amanah caution — verbatim scopeNotes (e.g. the bayʿ mā laysa
                ʿindak warning on sales-channel/advance-commitment protocols).
                Rendered exactly as authored; never truncated or reworded.
                Omitted in the `mechanics` variant (moves verbatim to the
                MEANING pane). */}
            {variant !== 'mechanics' && template.scopeNotes && (
              <div
                data-testid="protocol-amanah-caution"
                style={{
                  marginTop: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  background: CA('gold', 0.08),
                  border: `1px solid ${CA('gold', 0.4)}`,
                  borderLeft: `3px solid ${C.gold}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: C.gold,
                    fontFamily: F.sans,
                  }}
                >
                  Amanah
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: C.textSecondary,
                    fontFamily: F.sans,
                    lineHeight: 1.5,
                  }}
                >
                  {template.scopeNotes}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Feeds + lifecycle-status footer — omitted in the `mechanics` variant
          (feeds + status move to the right-rail WIRING pane). */}
      {variant !== 'mechanics' && (
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
      )}
    </div>
  );
}
