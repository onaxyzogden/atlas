// SourcePill.tsx — extracted 1:1 from olos_plan_spine.jsx (verbatim styling).

import { C, F } from './tokens.js';
import type { SpineObjectiveSource } from './types.js';

export default function SourcePill({
  type,
  secondary,
}: {
  type: SpineObjectiveSource;
  secondary?: string;
}) {
  const cfg = {
    universal: { bg: C.tealDim, border: C.teal, color: C.teal, label: 'Universal' },
    primary: { bg: C.greenDim, border: C.green, color: C.green, label: 'Primary' },
    secondary: {
      bg: C.amberDim,
      border: C.amber,
      color: C.amber,
      label: `Secondary · ${secondary || 'Silvopasture'}`,
    },
  }[type];
  return (
    <span
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        borderRadius: 12,
        padding: '2px 9px',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        fontFamily: F.sans,
      }}
    >
      {cfg.label}
    </span>
  );
}
