// ProtocolBulkConfirmOverlay.tsx
//
// Confirmation modal for the Act tier-shell BULK protocol activation
// ("Activate all" / "Activate selected"). Per the operator decision
// (wiki/decisions/2026-06-04-...), bulk activation INCLUDES Amanah-flagged
// protocols (those carrying a `scopeNotes` caution — e.g. the bayʿ mā laysa
// ʿindak warning on advance-sale / sales-channel protocols) but surfaces each
// flagged protocol's scopeNotes VERBATIM here, requiring an explicit Confirm
// before committing. Nothing is reworded or truncated.
//
// Pure presentational: the caller owns the store mutation (onConfirm). The
// overlay reuses ProtocolApprovalOverlay's shell shape (fixed backdrop,
// role="dialog", aria-modal, backdrop-click → cancel).

import type { StandardProtocolTemplate } from '@ogden/shared';
import { C, F, CA } from '../spine/tokens.js';

interface Props {
  /** Every template that will be activated (eligible ∩ chosen). */
  eligible: readonly StandardProtocolTemplate[];
  /** Subset of `eligible` carrying an Amanah caution (scopeNotes truthy). */
  flagged: readonly StandardProtocolTemplate[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ProtocolBulkConfirmOverlay({
  eligible,
  flagged,
  onConfirm,
  onCancel,
}: Props) {
  const count = eligible.length;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm bulk protocol activation"
      data-testid="protocol-bulk-confirm-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          borderRadius: 14,
          overflow: 'hidden',
          background: C.bg,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: C.textPrimary,
              fontFamily: F.sans,
            }}
          >
            Activate {count} protocol{count !== 1 ? 's' : ''}?
          </div>
          <div
            style={{
              fontSize: 13,
              color: C.textSecondary,
              fontFamily: F.sans,
              marginTop: 4,
            }}
          >
            These standing protocols will be marked active for this project.
          </div>
        </div>

        {/* Amanah review — verbatim scopeNotes for any flagged protocol */}
        {flagged.length > 0 && (
          <div
            data-testid="protocol-bulk-amanah"
            style={{
              padding: '14px 20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: C.gold,
                fontFamily: F.sans,
              }}
            >
              Amanah review — {flagged.length} flagged
            </div>
            {flagged.map((t) => (
              <div
                key={t.id}
                data-testid="protocol-bulk-amanah-row"
                data-template-id={t.id}
                style={{
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
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.textPrimary,
                    fontFamily: F.sans,
                  }}
                >
                  {t.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: C.textSecondary,
                    fontFamily: F.sans,
                    lineHeight: 1.5,
                  }}
                >
                  {t.scopeNotes}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            data-testid="protocol-bulk-cancel"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: C.textSecondary,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: F.sans,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="protocol-bulk-confirm"
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: `1px solid ${C.green}`,
              background: CA('green', 0.16),
              color: C.green,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: F.sans,
              cursor: 'pointer',
            }}
          >
            Activate {count}
          </button>
        </div>
      </div>
    </div>
  );
}
