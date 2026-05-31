// ModeToggle.tsx — Design ▸ Protocol segmented control for the Plan Spine
// prototype. Mirrors the radiogroup pattern of PlanNavToggle.tsx but is styled
// inline to the prototype's dark palette (no tokens.css). The Plan stage has
// two navigable modes (Protocol Layer Spec 2): Design Mode (the tier spine)
// and Protocol Mode (the standing-rule library). State is local to the slice —
// persisting the mode to a project field is deferred.

import { C, F } from './tokens.js';

export type SpinePlanMode = 'design' | 'protocol';

const OPTIONS: ReadonlyArray<{ mode: SpinePlanMode; label: string }> = [
  { mode: 'design', label: 'Design' },
  { mode: 'protocol', label: 'Protocol' },
];

export default function ModeToggle({
  mode,
  onChange,
}: {
  mode: SpinePlanMode;
  onChange: (mode: SpinePlanMode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Plan mode"
      style={{
        display: 'flex',
        gap: 3,
        padding: 3,
        borderRadius: 9,
        background: C.bg3,
        border: `1px solid ${C.border}`,
      }}
    >
      {OPTIONS.map(({ mode: optMode, label }) => {
        const isActive = mode === optMode;
        return (
          <button
            key={optMode}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(optMode)}
            style={{
              flex: 1,
              padding: '5px 12px',
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.02em',
              fontFamily: F.sans,
              background: isActive ? C.blueDim : 'transparent',
              color: isActive ? C.blue : C.textTertiary,
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
