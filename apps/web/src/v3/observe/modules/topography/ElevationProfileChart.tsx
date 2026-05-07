import type { Transect } from '../../../../store/topographyStore.js';
import { transectStats } from './derivations.js';

interface Props {
  transect?: Transect;
  className?: string;
  showVerticalRefs?: boolean;
  compact?: boolean;
}

export default function ElevationProfileChart({
  transect,
  className,
  showVerticalRefs,
  compact,
}: Props) {
  const stats = transectStats(transect);
  const profile = transect?.elevationProfileM;

  if (!profile || profile.length < 2 || !stats) {
    return (
      <div className={`elevation-profile-chart empty ${className ?? ''}`}>
        <span>{transect ? 'Profile not yet sampled' : 'No transect selected'}</span>
      </div>
    );
  }

  const W = compact ? 240 : 480;
  const H = compact ? 120 : 180;
  const padX = 16;
  const padY = 14;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const range = Math.max(1, stats.maxM - stats.minM);
  const xFor = (i: number) =>
    padX + (i / Math.max(1, profile.length - 1)) * innerW;
  const yFor = (m: number) =>
    padY + innerH - ((m - stats.minM) / range) * innerH;

  const linePath = profile
    .map((m, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)} ${yFor(m).toFixed(1)}`)
    .join(' ');
  const fillPath = `${linePath} L${xFor(profile.length - 1).toFixed(1)} ${(padY + innerH).toFixed(1)} L${padX.toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;

  const verticalRefs = showVerticalRefs ? transect?.verticalRefs ?? [] : [];
  const totalDistance = transect?.totalDistanceM ?? 0;

  return (
    <svg
      className={`elevation-profile-chart ${className ?? ''}`}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Elevation profile"
    >
      <path d={fillPath} className="profile-fill" />
      <path d={linePath} className="profile-line" fill="none" />
      <line
        x1={padX}
        x2={W - padX}
        y1={padY + innerH}
        y2={padY + innerH}
        className="profile-axis"
      />
      <text x={padX} y={padY - 4} className="profile-tick">
        {Math.round(stats.maxM)} m
      </text>
      <text x={padX} y={H - 2} className="profile-tick">
        {Math.round(stats.minM)} m
      </text>
      <text x={W - padX} y={H - 2} textAnchor="end" className="profile-tick">
        {totalDistance ? `${Math.round(totalDistance)} m` : `${profile.length} samples`}
      </text>
      {verticalRefs.map((r) => {
        if (!totalDistance) return null;
        const x = padX + (r.distanceAlongTransectM / totalDistance) * innerW;
        return (
          <line
            key={r.id}
            x1={x}
            x2={x}
            y1={padY}
            y2={padY + innerH}
            className={`vertical-ref kind-${r.kind}`}
          />
        );
      })}
    </svg>
  );
}
