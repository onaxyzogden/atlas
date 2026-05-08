import type { MockLayerResult } from '@ogden/shared/scoring';
import { getElevationLayer } from './derivations.js';

interface Props {
  layers: MockLayerResult[] | undefined;
  className?: string;
  bins?: number;
}

/**
 * Synthetic gaussian distribution between min/max elevation. Labelled
 * "Synthetic distribution" because we do not yet ingest a real DEM
 * histogram — the mean elevation just centres the curve.
 */
export default function ElevationHistogram({ layers, className, bins = 12 }: Props) {
  const e = getElevationLayer(layers)?.summary;
  const min = e?.min_elevation_m ?? null;
  const max = e?.max_elevation_m ?? null;
  const mean = e?.mean_elevation_m ?? null;

  if (min == null || max == null || max <= min) {
    return (
      <div className={`elevation-histogram empty ${className ?? ''}`}>
        <span>Elevation distribution pending</span>
      </div>
    );
  }

  const W = 240;
  const H = 120;
  const padX = 12;
  const padY = 14;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const centre = mean ?? (min + max) / 2;
  const sigma = (max - min) / 4;

  const heights: number[] = [];
  for (let i = 0; i < bins; i++) {
    const t = (i + 0.5) / bins;
    const x = min + t * (max - min);
    const z = (x - centre) / sigma;
    heights.push(Math.exp(-0.5 * z * z));
  }
  const peak = Math.max(...heights);
  const barW = innerW / bins;

  return (
    <svg
      className={`elevation-histogram ${className ?? ''}`}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Elevation distribution"
    >
      {heights.map((h, i) => {
        const barH = (h / peak) * innerH;
        return (
          <rect
            key={i}
            x={padX + i * barW + barW * 0.1}
            y={padY + innerH - barH}
            width={barW * 0.8}
            height={barH}
            className="hist-bar"
          />
        );
      })}
      <line
        x1={padX}
        x2={W - padX}
        y1={padY + innerH}
        y2={padY + innerH}
        className="hist-axis"
      />
      <text x={padX} y={H - 2} className="hist-tick">
        {Math.round(min)} m
      </text>
      <text x={W - padX} y={H - 2} textAnchor="end" className="hist-tick">
        {Math.round(max)} m
      </text>
      <text x={W / 2} y={padY - 2} textAnchor="middle" className="hist-tick">
        Synthetic distribution
      </text>
    </svg>
  );
}
