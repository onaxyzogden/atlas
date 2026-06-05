// AutoFilledCondition.tsx
//
// Renders a protocol IF-condition with its AUTO-FILLED bracket substitutions
// highlighted as amber chips (Protocol Layer Spec §4.1). Shared by the
// confirmation card stack (ProtocolConfirmationFlow) and the read-only Protocol
// Mode library (ProtocolModePanel) so both render the (possibly steward-edited)
// values identically. Pure presentation over the pure renderConditionSegments
// helper — no eval, no state.

import { C, F, CA } from './tokens.js';
import { renderConditionSegments } from './autoFill.js';

export default function AutoFilledCondition({
  condition,
  outputs,
}: {
  condition: string;
  /** Effective outputs for this protocol: defaults merged with any steward edits. */
  outputs: Record<string, string>;
}) {
  const segments = renderConditionSegments(condition.replace(/^IF\s+/, ''), outputs);
  return (
    <span style={{ fontSize: 11, color: C.textPrimary, fontFamily: F.sans, lineHeight: 1.6 }}>
      {segments.map((seg, i) =>
        seg.autoFilled ? (
          <span
            key={i}
            style={{
              background: C.amberDim,
              border: `1px solid ${CA('amber', 0.33)}`,
              color: C.amber,
              borderRadius: 5,
              padding: '1px 6px',
              margin: '0 1px',
              fontFamily: F.mono,
              fontWeight: 600,
              fontSize: 10,
              whiteSpace: 'nowrap',
            }}
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
}
