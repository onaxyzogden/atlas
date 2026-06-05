// TriggerRecognitionSheet.tsx
//
// The bottom sheet shown AFTER evidence capture on the Act proof-capture
// surface, when a protocol's trigger is recognised (Trigger Recognition UX
// Spec v1.1, sections 2-4). Always-present elements per spec: a tier
// badge+glyph, the protocol name in a serif face, a <=12-word sub-line, the
// three-option action row (Confirm / Dismiss / Flag for review), a
// "Why this protocol?" expand revealing the IF/THEN recipe, and an evidence
// thumbnail.
//
// This slice wires the RESPOND tier end to end; WATCH's 30s auto-confirm
// countdown and the offline activation queue are deferred. Each action button
// resolves with a ConfirmationStatus; the parent writes the ProtocolActivation.

import { useState } from 'react';
import {
  type StandardProtocolTemplate,
  type SeverityTier,
  type ConfirmationStatus,
} from '@ogden/shared';
import { C, F } from '../../plan/spine/tokens.js';
import AutoFilledCondition from '../../plan/spine/AutoFilledCondition.js';
import TierBadge from '../../protocols/TierBadge.js';

export interface TriggerRecognitionSheetProps {
  projectId: string;
  template: StandardProtocolTemplate;
  tier: SeverityTier;
  /** Effective protocol outputs (defaults + steward edits) for IF/THEN render. */
  outputs: Record<string, string>;
  /** Optional captured-evidence image URL; a neutral placeholder if absent. */
  evidenceThumb?: string;
  onResolve: (status: ConfirmationStatus) => void;
  onClose: () => void;
}

/** Truncate prose to a <=maxWords sub-line, appending an ellipsis if cut. */
function toSubLine(text: string, maxWords = 12): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ') + '...';
}

const ACTIONS: ReadonlyArray<{ label: string; status: ConfirmationStatus }> = [
  { label: 'Confirm', status: 'confirmed' },
  { label: 'Dismiss', status: 'false_positive' },
  { label: 'Flag for review', status: 'pending_review' },
];

export default function TriggerRecognitionSheet({
  template,
  tier,
  outputs,
  evidenceThumb,
  onResolve,
  onClose,
}: TriggerRecognitionSheetProps) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <div
      data-testid="trigger-recognition-sheet"
      role="dialog"
      aria-label="Trigger recognition"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        background: C.bg2,
        borderTop: `1px solid ${C.border}`,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.28)',
        padding: 20,
        fontFamily: F.sans,
        transform: 'translateY(0)',
        transition: 'transform 220ms ease',
      }}
    >
      {/* Header row: evidence thumb + badge/name/sub-line + close */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            flex: '0 0 auto',
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: evidenceThumb
              ? `center / cover no-repeat url(${evidenceThumb})`
              : C.bg3,
          }}
        />
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <TierBadge tier={tier} />
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 18,
              fontWeight: 600,
              color: C.textPrimary,
              marginTop: 8,
            }}
          >
            {template.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: C.textSecondary,
              marginTop: 4,
            }}
          >
            {toSubLine(template.rationale)}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            flex: '0 0 auto',
            background: 'transparent',
            border: 'none',
            color: C.textTertiary,
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
            padding: 4,
          }}
        >
          {'\u00D7'}
        </button>
      </div>

      {/* Why this protocol? expand */}
      <button
        type="button"
        onClick={() => setShowWhy((v) => !v)}
        aria-expanded={showWhy}
        style={{
          marginTop: 14,
          background: 'transparent',
          border: 'none',
          color: C.blue,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        Why this protocol?
      </button>
      {showWhy && (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: 10,
            background: C.bg3,
            border: `1px solid ${C.borderLight}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.4,
                color: C.textTertiary,
              }}
            >
              IF
            </span>{' '}
            <AutoFilledCondition condition={template.condition} outputs={outputs} />
          </div>
          <div style={{ fontSize: 11, color: C.textPrimary, lineHeight: 1.6 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.4,
                color: C.textTertiary,
              }}
            >
              THEN
            </span>{' '}
            {template.response}
          </div>
        </div>
      )}

      {/* Three-option action row */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        {ACTIONS.map((a) => {
          const primary = a.status === 'confirmed';
          return (
            <button
              key={a.status}
              type="button"
              onClick={() => onResolve(a.status)}
              style={{
                flex: '1 1 0',
                padding: '10px 12px',
                borderRadius: 10,
                border: primary ? 'none' : `1px solid ${C.border}`,
                background: primary ? C.green : 'transparent',
                color: primary ? C.bg : C.textPrimary,
                fontFamily: F.sans,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
