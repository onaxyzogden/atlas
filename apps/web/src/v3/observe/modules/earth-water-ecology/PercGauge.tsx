import { percRating } from './derivations.js';

interface Props {
  inPerHr?: number | null;
  className?: string;
}

const ZONES = [
  { label: 'Very slow', max: 0.2, cls: 'zone-very-slow' },
  { label: 'Slow', max: 1.0, cls: 'zone-slow' },
  { label: 'Ideal', max: 3.0, cls: 'zone-ideal' },
  { label: 'Fast', max: 6.0, cls: 'zone-fast' },
] as const;

const MAX_RATE = 6;

export default function PercGauge({ inPerHr, className }: Props) {
  const W = 280;
  const H = 80;
  const trackX = 24;
  const trackW = W - 48;
  const trackY = 32;
  const trackH = 16;

  if (inPerHr == null) {
    return (
      <div className={`perc-gauge is-empty ${className ?? ''}`}>
        <span>No percolation test — dig a 12-inch hole, fill with water twice, then time the drain rate.</span>
      </div>
    );
  }

  const band = percRating(inPerHr);
  const needleX = trackX + Math.min(1, inPerHr / MAX_RATE) * trackW;

  let zoneStart = trackX;
  const zoneEls = ZONES.map(({ label, max, cls }) => {
    const w = (Math.min(max, MAX_RATE) / MAX_RATE) * trackW;
    const x = trackX;
    const el = (
      <rect
        key={cls}
        x={zoneStart}
        y={trackY}
        width={Math.max(0, trackX + (Math.min(max, MAX_RATE) / MAX_RATE) * trackW - zoneStart)}
        height={trackH}
        className={`perc-zone ${cls}`}
      />
    );
    zoneStart = trackX + (Math.min(max, MAX_RATE) / MAX_RATE) * trackW;
    return el;
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`perc-gauge ${className ?? ''}`}
      role="img"
      aria-label={`Percolation rate ${inPerHr} in/hr — ${band.label}`}
    >
      {zoneEls}
      <rect x={trackX} y={trackY} width={trackW} height={trackH} className="perc-track-border" fill="none" />
      {/* needle */}
      <line x1={needleX} x2={needleX} y1={trackY - 6} y2={trackY + trackH + 6} className="perc-needle" />
      <circle cx={needleX} cy={trackY - 6} r={4} className="perc-needle-dot" />
      {/* value label */}
      <text x={needleX} y={trackY - 12} textAnchor="middle" className="perc-value">
        {inPerHr} in/hr
      </text>
      {/* zone axis labels */}
      <text x={trackX} y={trackY + trackH + 14} className="perc-axis-tick">0</text>
      <text x={trackX + (1 / MAX_RATE) * trackW} y={trackY + trackH + 14} textAnchor="middle" className="perc-axis-tick">1</text>
      <text x={trackX + (3 / MAX_RATE) * trackW} y={trackY + trackH + 14} textAnchor="middle" className="perc-axis-tick">3</text>
      <text x={trackX + trackW} y={trackY + trackH + 14} textAnchor="end" className="perc-axis-tick">6+</text>
      <text x={W / 2} y={H - 2} textAnchor="middle" className="perc-rating-label">
        {band.label}
      </text>
    </svg>
  );
}
