// StratumCircle.tsx — organic SVG stratum circle, transcribed VERBATIM from
// olos_plan_spine.jsx. The slightly-off ellipse (rx 18 / ry 19) and the
// progress arc are reproduced exactly.

import { C, F } from './tokens.js';
import type { SpineStratum } from './types.js';

export default function StratumCircle({
  stratum,
  isActive,
  onClick,
}: {
  stratum: SpineStratum;
  isActive: boolean;
  onClick: (n: number) => void;
}) {
  const { n, name, status, done, total } = stratum;
  const pct = total ? (done / total) * 100 : 0;

  const ring =
    status === 'complete'
      ? C.green
      : status === 'active'
        ? C.blue
        : status === 'available'
          ? C.amber
          : C.textTertiary;

  const bgFill = isActive ? C.bg3 : 'transparent';

  return (
    <div
      onClick={() => status !== 'locked' && onClick(n)}
      style={{
        padding: '8px 12px',
        cursor: status === 'locked' ? 'default' : 'pointer',
        background: bgFill,
        borderRadius: 10,
        transition: 'background 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderLeft: isActive ? `2px solid ${ring}` : '2px solid transparent',
      }}
    >
      {/* Organic circle */}
      <div style={{ flexShrink: 0, position: 'relative', width: 56, height: 56 }}>
        <svg viewBox="0 0 56 56" width={56} height={56} style={{ position: 'absolute', inset: 0 }}>
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
            fill={status === 'complete' ? ring + '22' : isActive ? ring + '18' : C.bg3}
            stroke={ring}
            strokeWidth={status === 'active' ? 1.5 : 1}
            opacity={status === 'locked' ? 0.35 : 1}
          />
          {/* Icon/number */}
          {status === 'complete' ? (
            <text x={28} y={33} textAnchor="middle" fill={C.green} fontSize={14} fontFamily={F.sans} fontWeight="700">
              ✓
            </text>
          ) : status === 'locked' ? (
            <text x={28} y={33} textAnchor="middle" fill={C.textTertiary} fontSize={12}>
              ⌒
            </text>
          ) : (
            <text x={28} y={33} textAnchor="middle" fill={ring} fontSize={13} fontFamily={F.mono} fontWeight="700">
              {n}
            </text>
          )}
        </svg>
      </div>

      {/* Label */}
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
          Stratum {n}
        </div>
        <div
          style={{
            fontSize: 10,
            color: status === 'locked' ? C.textTertiary : C.textSecondary,
            fontFamily: F.sans,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
        {status !== 'locked' && (
          <div style={{ fontSize: 10, color: ring, marginTop: 3, fontFamily: F.mono }}>
            {done}/{total}
          </div>
        )}
      </div>
    </div>
  );
}
