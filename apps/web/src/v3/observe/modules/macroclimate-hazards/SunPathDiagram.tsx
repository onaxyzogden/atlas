import { solsticeAltitudes } from './derivations.js';

interface Props {
  lat: number | null | undefined;
  className?: string;
}

export default function SunPathDiagram({ lat, className }: Props) {
  if (lat == null || Number.isNaN(lat)) {
    return (
      <div className={`sun-path-diagram empty ${className ?? ''}`}>
        <span>Latitude pending</span>
      </div>
    );
  }
  const { summer, equinox, winter } = solsticeAltitudes(lat);

  const W = 320;
  const H = 160;
  const cx = W / 2;
  const cy = H - 20;
  const rMax = Math.min(cx - 16, H - 28);

  function arc(altDeg: number, label: string, cls: string) {
    const r = (altDeg / 90) * rMax;
    const d = `M ${cx - rMax} ${cy} A ${rMax} ${r} 0 0 1 ${cx + rMax} ${cy}`;
    return (
      <g key={label}>
        <path d={d} className={`sun-arc ${cls}`} fill="none" />
        <text x={cx} y={cy - r - 4} textAnchor="middle" className="sun-label">
          {label} · {Math.round(altDeg)}°
        </text>
      </g>
    );
  }

  return (
    <svg
      className={`sun-path-diagram ${className ?? ''}`}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Sun path diagram for latitude ${lat.toFixed(1)}`}
    >
      <line x1={16} y1={cy} x2={W - 16} y2={cy} className="horizon-line" />
      {arc(summer, 'Jun', 'summer')}
      {arc(equinox, 'Mar/Sep', 'equinox')}
      {arc(winter, 'Dec', 'winter')}
      <text x={20} y={cy + 14} className="sun-axis">
        E
      </text>
      <text x={W - 26} y={cy + 14} className="sun-axis">
        W
      </text>
    </svg>
  );
}
