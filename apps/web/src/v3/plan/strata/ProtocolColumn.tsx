// ProtocolColumn — the CENTER column in Plan Protocol mode: a multi-select list
// of the project's standard protocol templates, grouped by tier (mirrors the
// ObjectiveColumn chrome it replaces in Protocol mode). Selecting rows drives the
// stacked detail in ProtocolDetailColumn on the right. Selection lives in the
// shell (local state this slice); this column is presentational.
//
// Rows are real <button role="checkbox"> toggles so the multi-select is keyboard-
// and screen-reader-addressable. Selected rows take the gold accent that the
// ObjectiveCard active state uses (C.gold border + translucent gold wash).

import { type ProtocolTierGroup } from './useProtocolLibrary.js';
import {
  type RecordStatus,
  statusMeta,
} from './ProtocolLibraryCard.js';
import { C, F, CA } from '../spine/tokens.js';
import { TypeBadge } from '../spine/protocolTypeStyle.js';

interface Props {
  /** Tier-grouped templates, in catalogue order (from useProtocolLibrary). */
  groups: readonly ProtocolTierGroup[];
  /** templateId → lifecycle status for the status dot/label. */
  statusByTemplate: Record<string, RecordStatus>;
  /** Currently-selected template ids (drives the gold accent + detail stack). */
  selectedIds: readonly string[];
  /** Toggle a template into / out of the selection. */
  onToggle: (templateId: string) => void;
}

export default function ProtocolColumn({
  groups,
  statusByTemplate,
  selectedIds,
  onToggle,
}: Props) {
  const templateCount = groups.reduce((n, g) => n + g.items.length, 0);
  const selected = new Set(selectedIds);

  return (
    <section
      data-testid="protocol-column"
      style={{
        width: 292,
        flexShrink: 0,
        minWidth: 0,
        minHeight: 0,
        overflowY: 'auto',
        background: C.bg,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '14px 12px',
      }}
    >
      {/* Eyebrow + count */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontSize: 12,
            color: C.textTertiary,
            fontFamily: F.sans,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Protocols
        </span>
        <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.mono }}>
          {templateCount} template{templateCount !== 1 ? 's' : ''}
        </span>
      </div>

      {templateCount === 0 ? (
        <div
          data-testid="protocol-column-empty"
          style={{
            fontSize: 12,
            color: C.textTertiary,
            fontFamily: F.sans,
            fontStyle: 'italic',
            padding: '24px 4px',
            lineHeight: 1.5,
          }}
        >
          No protocol templates for this project&apos;s enterprises.
        </div>
      ) : (
        groups.map((g) => (
          <div
            key={g.tier}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {/* Tier section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                data-testid="protocol-column-tier-heading"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.textSecondary,
                  fontFamily: F.sans,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  whiteSpace: 'nowrap',
                }}
              >
                {g.tier}
              </span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span
                style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.mono }}
              >
                {g.items.length}
              </span>
            </div>

            {g.items.map((t) => {
              const isSelected = selected.has(t.id);
              const meta = statusMeta(statusByTemplate[t.id]);
              return (
                <button
                  key={t.id}
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  data-testid="protocol-list-row"
                  data-template-id={t.id}
                  data-selected={isSelected}
                  onClick={() => onToggle(t.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: 8,
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${isSelected ? C.gold : C.border}`,
                    background: isSelected ? CA('gold', 0.1) : C.bg2,
                    color: C.textPrimary,
                    fontFamily: F.sans,
                    cursor: 'pointer',
                    transition:
                      'background 120ms ease, border-color 120ms ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        lineHeight: 1.3,
                        color: C.textPrimary,
                      }}
                    >
                      {t.name}
                    </span>
                    <TypeBadge type={t.type} />
                  </div>
                  {/* Lifecycle status dot + label */}
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 12,
                      color: meta.color,
                      fontFamily: F.sans,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
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
                </button>
              );
            })}
          </div>
        ))
      )}
    </section>
  );
}
