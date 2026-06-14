// ProtocolMeaningPane — the MEANING half of the Plan Protocols-workspace center
// canvas, rendered beside the editor (PlanProtocolDetailPane in `mechanics`
// variant). Where the editor shows the live IF/THEN + threshold inputs, this
// pane shows WHY the protocol exists and the RESPONSE POSTURE it carries:
//   • severity tier + its canonical one-line gloss,
//   • the steward-facing rationale,
//   • the verbatim Amanah caution (scopeNotes), when present.
//
// Pure of any store: everything is read off the template. The mechanics-variant
// card deliberately omits rationale + Amanah, so this is their single home in
// Protocols mode (no duplication). Wiring + lifecycle state live in the
// right-rail ProtocolWiringPane.

import {
  resolveSeverityTier,
  type SeverityTier,
  type StandardProtocolTemplate,
} from '@ogden/shared';
import { C, F, CA } from '../spine/tokens.js';

/**
 * Severity tier → label + accent + the canonical response-posture gloss. The
 * gloss strings are transcribed verbatim from the Protocol System Object Model
 * & Architecture Spec v1.1 (mirrored in protocol.schema.ts SeverityTier docs);
 * accents match ProtocolLibraryCard's SEVERITY_META so the two surfaces agree.
 */
const SEVERITY_POSTURE: Record<
  SeverityTier,
  { label: string; color: string; gloss: string }
> = {
  stop: {
    label: 'Stop',
    color: C.red,
    gloss: 'halt project-wide; Plan approval to resume.',
  },
  respond: {
    label: 'Respond',
    color: C.amber,
    gloss: 'generate an assignable field action; affected area paused.',
  },
  watch: {
    label: 'Watch',
    color: C.textTertiary,
    gloss: 'log only; no action required.',
  },
  abundance: {
    label: 'Abundance',
    color: C.teal,
    gloss:
      'a positive condition was reached; begin an observation cycle before acting.',
  },
};

export default function ProtocolMeaningPane({
  template,
}: {
  template: StandardProtocolTemplate;
}) {
  const posture = SEVERITY_POSTURE[resolveSeverityTier(template)];

  return (
    <div
      data-testid="protocol-meaning-pane"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: C.bg,
        overflowY: 'auto',
        borderLeft: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          padding: '16px 22px 8px',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
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
          Why &amp; posture
        </span>
      </div>

      <div
        style={{
          padding: '16px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Severity posture — tier badge + canonical gloss */}
        <div
          data-testid="protocol-meaning-posture"
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          <span
            style={{
              alignSelf: 'flex-start',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: posture.color,
              background: C.bg2,
              border: `1px solid ${posture.color}`,
              borderRadius: 10,
              padding: '1px 8px',
              fontFamily: F.sans,
              whiteSpace: 'nowrap',
            }}
          >
            {posture.label}
          </span>
          <span
            style={{
              fontSize: 12,
              color: C.textSecondary,
              fontFamily: F.sans,
              lineHeight: 1.5,
            }}
          >
            {posture.gloss}
          </span>
        </div>

        {/* Rationale */}
        <div
          style={{
            fontSize: 12,
            color: C.textSecondary,
            fontFamily: F.sans,
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          {template.rationale}
        </div>

        {/* Amanah caution — verbatim scopeNotes, rendered exactly as authored;
            never truncated or reworded. */}
        {template.scopeNotes && (
          <div
            data-testid="protocol-amanah-caution"
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
      </div>
    </div>
  );
}
