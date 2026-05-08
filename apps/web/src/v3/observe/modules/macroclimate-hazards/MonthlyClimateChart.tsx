import type { MockLayerResult } from '@ogden/shared/scoring';
import { monthlyClimateSeries } from './derivations.js';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

interface Props {
  layers: MockLayerResult[] | undefined;
  className?: string;
}

export default function MonthlyClimateChart({ layers, className }: Props) {
  const series = monthlyClimateSeries(layers);
  if (series.length === 0) {
    return (
      <div className={`monthly-climate-chart empty ${className ?? ''}`}>
        <span>Climate data pending</span>
      </div>
    );
  }

  const W = 320;
  const H = 160;
  const padX = 24;
  const padY = 18;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const precip = series.map((s) => s.precipMm ?? 0);
  const maxC = series.map((s) => s.meanMaxC ?? 0);
  const minC = series.map((s) => s.meanMinC ?? 0);
  const pMax = Math.max(1, ...precip);
  const tMax = Math.max(...maxC, 0);
  const tMin = Math.min(...minC, 0);
  const tRange = Math.max(1, tMax - tMin);

  const barW = innerW / 12;
  const xFor = (i: number) => padX + i * barW + barW * 0.15;
  const yT = (v: number) => padY + (1 - (v - tMin) / tRange) * innerH;

  const maxPath = series
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${xFor(i) + barW * 0.35} ${yT(s.meanMaxC ?? 0)}`)
    .join(' ');
  const minPath = series
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${xFor(i) + barW * 0.35} ${yT(s.meanMinC ?? 0)}`)
    .join(' ');

  return (
    <svg
      className={`monthly-climate-chart ${className ?? ''}`}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Monthly climate chart"
    >
      {series.map((s, i) => {
        const v = s.precipMm ?? 0;
        const h = (v / pMax) * innerH;
        return (
          <rect
            key={s.month}
            x={xFor(i)}
            y={padY + innerH - h}
            width={barW * 0.7}
            height={h}
            className="precip-bar"
          />
        );
      })}
      <path d={maxPath} className="temp-line max" fill="none" />
      <path d={minPath} className="temp-line min" fill="none" />
      {MONTHS.map((m, i) => (
        <text
          key={`${m}-${i}`}
          x={xFor(i) + barW * 0.35}
          y={H - 4}
          textAnchor="middle"
          className="month-tick"
        >
          {m}
        </text>
      ))}
    </svg>
  );
}
