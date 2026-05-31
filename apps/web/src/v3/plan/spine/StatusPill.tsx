// StatusPill.tsx — extracted 1:1 from olos_plan_spine.jsx (verbatim styling).

import { C, F } from './tokens.js';
import type { SpineObjectiveStatus } from './types.js';

export default function StatusPill({ status }: { status: SpineObjectiveStatus }) {
  const cfg = {
    complete: { bg: C.greenDim, color: C.green, label: 'Complete' },
    in_progress: { bg: C.blueDim, color: C.blue, label: 'In Progress' },
    available: { bg: C.bg4, color: C.textSecondary, label: 'Ready' },
    locked: { bg: C.bg3, color: C.textTertiary, label: 'Locked' },
  }[status];
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        borderRadius: 12,
        padding: '2px 9px',
        fontSize: 10,
        fontWeight: 600,
        fontFamily: F.sans,
      }}
    >
      {cfg.label}
    </span>
  );
}
