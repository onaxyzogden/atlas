// protocolTypeStyle.tsx
//
// Shared type-badge palette + component for the Protocol Layer surfaces
// (ProtocolModePanel library + ProtocolConfirmationFlow card stack). One accent
// per protocol type (spec §3), drawn from the prototype's token set so the
// badges sit naturally beside the Design-Mode pills. Extracted here so the two
// panels render identical badges.

import { C, F, CA } from './tokens.js';
import type { ProtocolType } from '@ogden/shared';

export const TYPE_STYLE: Record<ProtocolType, { bg: string; color: string; borderColor: string; label: string }> = {
  threshold: { bg: C.blueDim,  color: C.blue,  borderColor: CA('blue',  0.33), label: 'Threshold' },
  judgment:  { bg: C.amberDim, color: C.amber, borderColor: CA('amber', 0.33), label: 'Judgment'  },
  cyclical:  { bg: C.tealDim,  color: C.teal,  borderColor: CA('teal',  0.33), label: 'Cyclical'  },
  freeform:  { bg: C.goldDim,  color: C.gold,  borderColor: CA('gold',  0.33), label: 'Freeform'  },
};

export function TypeBadge({ type }: { type: ProtocolType }) {
  const s = TYPE_STYLE[type];
  return (
    <span
      style={{
        background: s.bg,
        border: `1px solid ${s.borderColor}`,
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
