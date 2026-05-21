/**
 * §K.2 ZoneSomSparkline — single-series SOM-stock micro-trend.
 *
 * A tiny, dependency-free SVG sparkline for one zone's SOM (soil organic
 * matter) carbon-stock trajectory. Plots `som_stock_tc` against `year`
 * with no axes, labels, or chrome — it is meant to sit inside a sidebar
 * list row (K.3) as an at-a-glance comparison affordance, NOT to replace
 * the full `JCurveChart`.
 *
 * House-style choice: pure SVG (no chart library), mirroring
 * `JCurveChart`. Stroke uses `currentColor` so the parent list controls
 * colour via CSS `color` — keeps the DOM deterministic and the component
 * fully reusable.
 *
 * Covenant: appreciation of stewarded land value, not investor yield.
 * No ROI / yield framing; the series is a soil-carbon reading.
 * See [[fiqh-csra-erased-2026-05-04]].
 *
 * Pure render: no Zustand, no fetch, no effects → fully unit-testable and
 * deterministic (same input → identical DOM bytes).
 */

import { useMemo } from 'react';
import type { SomYearRow } from '../../features/financial/somAppreciation.js';

export interface ZoneSomSparklineProps {
  /** One zone's SOM trajectory rows, ordered by year ASC. */
  rows: SomYearRow[];
  /** Default 80. */
  width?: number;
  /** Default 24. */
  height?: number;
  /** Required a11y label, e.g. "North paddock SOM trajectory". */
  ariaLabel: string;
}

export default function ZoneSomSparkline({
  rows,
  width,
  height,
  ariaLabel,
}: ZoneSomSparklineProps) {
  const W = width ?? 80;
  const H = height ?? 24;
  const pad = 2;

  const geom = useMemo(() => {
    if (rows.length === 0) return null;

    const values = rows.map((r) => r.som_stock_tc);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const innerW = W - pad * 2;
    const innerH = H - pad * 2;

    const xFor = (i: number) =>
      rows.length === 1 ? pad + innerW / 2 : pad + (innerW * i) / (rows.length - 1);
    // Higher value sits higher on screen → smaller y.
    const yFor = (v: number) => pad + innerH - ((v - min) / range) * innerH;

    const points = rows.map((r, i) => ({ x: xFor(i), y: yFor(r.som_stock_tc) }));
    const path = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');
    const last = points[points.length - 1]!;

    return { points, path, last };
  }, [rows, W, H]);

  // Empty trajectory → an inert, aria-hidden cell so the list row keeps
  // its rhythm without announcing an empty graphic.
  if (!geom) {
    return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" />;
  }

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
    >
      {/* Single year → no line to draw; the endpoint dot below stands in. */}
      {geom.points.length > 1 && (
        <path
          d={geom.path}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {/* Endpoint marker — current SOM stock. */}
      <circle cx={geom.last.x} cy={geom.last.y} r={1.75} fill="currentColor" />
    </svg>
  );
}
