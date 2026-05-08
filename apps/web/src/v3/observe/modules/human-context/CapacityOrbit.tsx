/**
 * CapacityOrbit — pure-SVG replacement for the static capacity-orbit.png.
 *
 * Two concentric arcs whose lengths reflect the steward's initial vs ongoing
 * weekly hour commitment. Total in the centre. Renders an empty halo when
 * both values are unset.
 */

interface CapacityOrbitProps {
  initialHrs?: number;
  ongoingHrs?: number;
  /** Caps the arcs at this many hours/week so a 60+ hr value doesn't lap. */
  maxHrs?: number;
  size?: number;
  className?: string;
}

const TWO_PI = Math.PI * 2;

export function CapacityOrbit({
  initialHrs,
  ongoingHrs,
  maxHrs = 40,
  size = 160,
  className = 'capacity-orbit',
}: CapacityOrbitProps) {
  const initial = initialHrs ?? 0;
  const ongoing = ongoingHrs ?? 0;
  const total = initial + ongoing;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 10;
  const innerR = outerR - 16;

  const outerCirc = TWO_PI * outerR;
  const innerCirc = TWO_PI * innerR;

  const initialFrac = Math.min(1, initial / maxHrs);
  const ongoingFrac = Math.min(1, ongoing / maxHrs);

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Capacity overview: ${total} hours per week total`}
    >
      {/* outer track */}
      <circle
        cx={cx}
        cy={cy}
        r={outerR}
        fill="none"
        stroke="rgba(176, 138, 58, 0.18)"
        strokeWidth={6}
      />
      {/* outer arc — initial hours */}
      <circle
        cx={cx}
        cy={cy}
        r={outerR}
        fill="none"
        stroke="rgb(176, 138, 58)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${initialFrac * outerCirc} ${outerCirc}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* inner track */}
      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        fill="none"
        stroke="rgba(122, 163, 184, 0.18)"
        strokeWidth={6}
      />
      {/* inner arc — ongoing hours */}
      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        fill="none"
        stroke="rgb(122, 163, 184)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${ongoingFrac * innerCirc} ${innerCirc}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize={size / 6}
        fontWeight={700}
        fill="currentColor"
      >
        {total > 0 ? total : '—'}
      </text>
      <text
        x={cx}
        y={cy + size / 8}
        textAnchor="middle"
        fontSize={size / 14}
        fill="currentColor"
        opacity={0.7}
      >
        hrs / wk
      </text>
    </svg>
  );
}
