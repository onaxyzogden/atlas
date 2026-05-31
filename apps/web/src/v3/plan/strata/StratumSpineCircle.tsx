// StratumSpineCircle.tsx — production adapter of the Plan Spine prototype's
// organic SVG stratum circle (spine/StratumCircle.tsx), consuming the REAL
// PlanStratum + PlanStratumState shapes instead of the prototype's SpineStratum
// mock. The SVG geometry (rx 18 / ry 19 organic ring + progress arc) and the
// gold "selected" treatment are reproduced verbatim from the prototype; only
// the data source and the click contract differ:
//   - PlanStratumState ('locked' | 'available' | 'active' | 'complete') maps
//     1:1 onto the prototype's status colours, so no enum translation is needed.
//   - Unlike the prototype (which ignores clicks on locked circles), the live
//     shell must receive the click for EVERY state — PlanStratumShell's
//     handleSelectStratum opens the locked-stratum popover on a locked tap. So
//     onSelect always fires and the cursor is always a pointer.
//   - isHighlighting drives the transient `?highlightIncomplete=s1` flash ring.

import { C, F, CA } from '../spine/tokens.js';
import type { PlanStratum, PlanStratumState } from '@ogden/shared';

interface Props {
  stratum: PlanStratum;
  state: PlanStratumState;
  objectiveCount: number;
  completeCount: number;
  isActive: boolean;
  /**
   * Slice 2.4 — transient gold flash ring while the `?highlightIncomplete`
   * deep link is being consumed by the shell. Skipped for complete strata
   * (the shell already guards this) but harmless if passed true.
   */
  isHighlighting?: boolean;
  onSelect: (stratum: PlanStratum) => void;
}

export default function StratumSpineCircle({
  stratum,
  state,
  objectiveCount,
  completeCount,
  isActive,
  isHighlighting = false,
  onSelect,
}: Props) {
  const n = stratum.ordinal;
  const total = objectiveCount;
  const done = completeCount;
  const status = state;
  const pct = total ? (done / total) * 100 : 0;

  const ring =
    status === 'complete'
      ? C.green
      : status === 'active'
        ? C.blue
        : status === 'available'
          ? C.amber
          : C.textTertiary;

  // Organic-ring interior fill — resolved through CA() because the status
  // colours are now `var()` strings (a hex-alpha suffix would be invalid CSS).
  const ellipseFill =
    status === 'complete'
      ? CA('green', 0.13)
      : isActive
        ? CA(status === 'available' ? 'amber' : 'blue', 0.09)
        : C.bg3;

  return (
    <div
      onClick={() => onSelect(stratum)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(stratum);
        }
      }}
      aria-current={isActive ? 'true' : undefined}
      data-stratum-id={stratum.id}
      data-stratum-state={status}
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        // Unified gold "selected" treatment — the active stratum and the
        // selected objective card share one distinctive gold-bordered surface.
        background: isActive ? CA('amber', 0.07) : 'transparent',
        borderRadius: 10,
        transition: 'background 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        border: isActive
          ? `1px solid ${C.gold}`
          : isHighlighting
            ? `1px solid ${CA('gold', 0.6)}`
            : '1px solid transparent',
        borderLeft: isActive ? `2px solid ${C.gold}` : '2px solid transparent',
        boxShadow: isHighlighting ? `0 0 0 3px ${CA('gold', 0.25)}` : 'none',
      }}
    >
      {/* Organic circle */}
      <div style={{ flexShrink: 0, position: 'relative', width: 56, height: 56 }}>
        <svg
          viewBox="0 0 56 56"
          width={56}
          height={56}
          style={{ position: 'absolute', inset: 0 }}
        >
          {/* Progress arc */}
          {status !== 'locked' && pct > 0 && (
            <circle
              cx={28}
              cy={28}
              r={23}
              fill="none"
              stroke={ring}
              strokeWidth={2}
              opacity={0.3}
              strokeDasharray={`${2 * Math.PI * 23}`}
            />
          )}
          {status !== 'locked' && pct > 0 && (
            <circle
              cx={28}
              cy={28}
              r={23}
              fill="none"
              stroke={ring}
              strokeWidth={2}
              strokeDasharray={`${(pct / 100) * 2 * Math.PI * 23} ${2 * Math.PI * 23}`}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
            />
          )}
          {/* Organic ring */}
          <ellipse
            cx={28}
            cy={28}
            rx={18}
            ry={19}
            fill={ellipseFill}
            stroke={ring}
            strokeWidth={status === 'active' ? 1.5 : 1}
            opacity={status === 'locked' ? 0.35 : 1}
          />
          {/* Icon/number — show the stratum slug "S{n}"; locked state is
              conveyed by ring colour + ellipse opacity, not a symbol.
              Completed strata show a check instead of the slug. */}
          {status === 'complete' ? (
            <text
              x={28}
              y={33}
              textAnchor="middle"
              fill={C.green}
              fontSize={14}
              fontFamily={F.sans}
              fontWeight="700"
            >
              ✓
            </text>
          ) : (
            <text
              x={28}
              y={33}
              textAnchor="middle"
              fill={ring}
              fontSize={13}
              fontFamily={F.mono}
              fontWeight="700"
            >
              S{n}
            </text>
          )}
        </svg>
      </div>

      {/* Label — the stratum title is the bold primary line (the ordinal now
          lives in the circle as "S{n}"), so no separate subtitle is shown. */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: status === 'locked' ? C.textTertiary : C.textPrimary,
            fontFamily: F.sans,
            marginBottom: 2,
            letterSpacing: '0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {stratum.title}
        </div>
        {status !== 'locked' && (
          <div
            style={{ fontSize: 10, color: ring, marginTop: 3, fontFamily: F.mono }}
          >
            {done}/{total}
          </div>
        )}
      </div>
    </div>
  );
}
