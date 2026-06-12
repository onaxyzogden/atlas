/**
 * WorkBulkConfirmOverlay — confirmation modal for "Confirm all" on the
 * livestock work proposals (the operator bulk action behind
 * `livestockWorkPlanStore.confirmAll`).
 *
 * Modeled on ProtocolBulkConfirmOverlay: pure presentational (the caller
 * owns the store mutation), fixed backdrop, role="dialog", aria-modal,
 * backdrop-click → cancel. The Amanah review block lists every proposal
 * carrying protocol `scopeNotes` and shows each caution VERBATIM (nothing
 * reworded or truncated) before the operator commits the bulk confirm.
 */

import type { LivestockWorkProposal } from '../../../../store/livestockWorkPlanStore.js';
import { C, F, CA } from '../../../plan/spine/tokens.js';

interface Props {
  /** Every proposal the bulk confirm will write to the spine. */
  eligible: readonly LivestockWorkProposal[];
  /** Subset of `eligible` carrying an Amanah caution (scopeNotes truthy). */
  flagged: readonly LivestockWorkProposal[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function WorkBulkConfirmOverlay({
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
      aria-label="Confirm all proposed work"
      data-testid="work-bulk-confirm-overlay"
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
            Confirm {count} work item{count !== 1 ? 's' : ''}?
          </div>
          <div
            style={{
              fontSize: 13,
              color: C.textSecondary,
              fontFamily: F.sans,
              marginTop: 4,
            }}
          >
            Each proposed item becomes scheduled work on this project. You can
            still reschedule or cancel individual items afterwards.
          </div>
        </div>

        {/* Amanah review — verbatim scopeNotes for any flagged proposal. */}
        {flagged.length > 0 && (
          <div
            data-testid="work-bulk-amanah"
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
            {flagged.map((p) => (
              <div
                key={p.id}
                data-testid="work-bulk-amanah-row"
                data-proposal-id={p.id}
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
                  {p.instance.title}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: C.textSecondary,
                    fontFamily: F.sans,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {p.instance.scopeNotes}
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
            data-testid="work-bulk-cancel"
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
            data-testid="work-bulk-confirm"
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
            Confirm {count}
          </button>
        </div>
      </div>
    </div>
  );
}
