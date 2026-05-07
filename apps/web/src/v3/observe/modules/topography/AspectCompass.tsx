import { aspectDegrees } from './derivations.js';

interface Props {
  aspect: string | null | undefined;
  className?: string;
  size?: number;
}

const POINTS: Array<[string, number]> = [
  ['N', 0],
  ['NE', 45],
  ['E', 90],
  ['SE', 135],
  ['S', 180],
  ['SW', 225],
  ['W', 270],
  ['NW', 315],
];

export default function AspectCompass({ aspect, className, size = 56 }: Props) {
  const deg = aspectDegrees(aspect);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  const arrow = deg != null
    ? (() => {
        const rad = ((deg - 90) * Math.PI) / 180;
        const x = cx + Math.cos(rad) * (r - 4);
        const y = cy + Math.sin(rad) * (r - 4);
        return { x, y };
      })()
    : null;

  return (
    <svg
      className={`aspect-compass ${className ?? ''}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={aspect ? `Aspect ${aspect}` : 'Aspect unknown'}
    >
      <circle cx={cx} cy={cy} r={r} className="compass-ring" />
      {POINTS.map(([label, d]) => {
        const rad = ((d - 90) * Math.PI) / 180;
        const tx = cx + Math.cos(rad) * (r - 6);
        const ty = cy + Math.sin(rad) * (r - 6) + 2;
        return (
          <text
            key={label}
            x={tx}
            y={ty}
            textAnchor="middle"
            className={`compass-tick ${aspect && aspect.toUpperCase() === label ? 'is-active' : ''}`}
          >
            {label[0]}
          </text>
        );
      })}
      {arrow ? (
        <line
          x1={cx}
          y1={cy}
          x2={arrow.x}
          y2={arrow.y}
          className="compass-arrow"
        />
      ) : null}
      <circle cx={cx} cy={cy} r={2} className="compass-hub" />
    </svg>
  );
}
