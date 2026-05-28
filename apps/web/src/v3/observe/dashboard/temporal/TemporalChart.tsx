/**
 * TemporalChart — Phase 4 Slice 4.5 inline-SVG temporal chart (Observe
 * Dashboard Spec §5.4). Reuses the sparkline polyline pattern from
 * observe/components/measure/sparkline.tsx — no chart-library dep, no
 * extra weight in the bundle.
 *
 * Two display modes via `buildSeries`:
 *
 *   - numeric: y-axis renders min/max of `measurementValue`.
 *   - status:  y-axis renders the 5 status-output ordinals
 *              (clear → potential_disqualifier).
 *
 * Cycle annotations (vertical lines at advance times) overlay the chart
 * in their own component so the cycle store can read/write without
 * touching the chart's render path.
 */

import { useMemo } from 'react';
import type { ObserveDataPoint, UniversalDomain } from '@ogden/shared';
import type { ObserveCycleEntry } from '@ogden/shared';
import { buildSeries, type TemporalChartMode } from './temporalSeries.js';
import CycleAnnotations from './CycleAnnotations.js';

interface Props {
  points: readonly ObserveDataPoint[];
  cycles: readonly ObserveCycleEntry[];
  domainId: UniversalDomain;
  width?: number;
  height?: number;
}

const PADDING = { top: 20, right: 24, bottom: 32, left: 56 };
const POINT_STROKE = '#c4a265';
const POINT_FILL = '#181612';
const STATUS_LABEL_TEXT: Record<string, string> = {
  clear: 'Clear',
  unknown: 'Unknown',
  needs_investigation: 'Needs investigation',
  major_constraint: 'Major constraint',
  potential_disqualifier: 'Potential disqualifier',
};

function fmtDate(ms: number): string {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return '?';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TemporalChart({
  points,
  cycles,
  domainId,
  width = 720,
  height = 280,
}: Props) {
  const series = useMemo(() => buildSeries(points), [points]);

  const innerW = width - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;

  const { polyline, dots, xTicks, yTicks, statusBadges, timeMin, timeMax } =
    useMemo(() => {
      if (series.points.length === 0) {
        return {
          polyline: '',
          dots: [] as { cx: number; cy: number; key: string }[],
          xTicks: [] as { x: number; label: string }[],
          yTicks: [] as { y: number; label: string }[],
          statusBadges: [] as {
            x: number;
            cy: number;
            label: string;
            key: string;
          }[],
          timeMin: 0,
          timeMax: 1,
        };
      }
      const minT = series.points[0]!.timeMs;
      const maxT = series.points[series.points.length - 1]!.timeMs;
      const tRange = maxT - minT || 1;
      const yRange = series.yMax - series.yMin || 1;
      const xFor = (timeMs: number) =>
        PADDING.left + ((timeMs - minT) / tRange) * innerW;
      const yFor = (value: number) =>
        PADDING.top + (1 - (value - series.yMin) / yRange) * innerH;

      const polylineStr = series.points
        .map((p) => `${xFor(p.timeMs).toFixed(1)},${yFor(p.yValue).toFixed(1)}`)
        .join(' ');

      const dotsBuilt = series.points.map((p, i) => ({
        cx: xFor(p.timeMs),
        cy: yFor(p.yValue),
        key: `${p.point.id}-${i}`,
      }));

      const xTickCount = Math.min(series.points.length, 4);
      const xTicksBuilt = Array.from({ length: xTickCount }, (_, i) => {
        const t = minT + (tRange * i) / Math.max(1, xTickCount - 1);
        return { x: xFor(t), label: fmtDate(t) };
      });

      let yTicksBuilt: { y: number; label: string }[] = [];
      let statusBadgesBuilt: {
        x: number;
        cy: number;
        label: string;
        key: string;
      }[] = [];
      if (series.mode === 'numeric') {
        yTicksBuilt = [
          { y: yFor(series.yMin), label: series.yMin.toFixed(2) },
          {
            y: yFor(series.yMin + (series.yMax - series.yMin) / 2),
            label: ((series.yMin + series.yMax) / 2).toFixed(2),
          },
          { y: yFor(series.yMax), label: series.yMax.toFixed(2) },
        ];
      } else if (series.statusLabels) {
        // status mode — y ticks for each status label
        yTicksBuilt = series.statusLabels.map((status) => {
          const ord = 4 - series.statusLabels!.indexOf(status); // top -> high ord
          return {
            y: yFor(ord),
            label: STATUS_LABEL_TEXT[status] ?? status,
          };
        });
        statusBadgesBuilt = series.points.map((p, i) => ({
          x: xFor(p.timeMs),
          cy: yFor(p.yValue),
          label: STATUS_LABEL_TEXT[p.point.statusOutput] ?? p.point.statusOutput,
          key: `${p.point.id}-badge-${i}`,
        }));
      }

      return {
        polyline: polylineStr,
        dots: dotsBuilt,
        xTicks: xTicksBuilt,
        yTicks: yTicksBuilt,
        statusBadges: statusBadgesBuilt,
        timeMin: minT,
        timeMax: maxT,
      };
    }, [series, innerW, innerH]);

  if (series.points.length < 2) return null;

  const yAxisCaption: Record<TemporalChartMode, string> = {
    numeric: 'Measurement',
    status: 'Status output',
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Temporal observations for ${domainId}`}
      style={{ display: 'block', maxWidth: '100%' }}
    >
      <rect
        x={PADDING.left}
        y={PADDING.top}
        width={innerW}
        height={innerH}
        fill="rgba(24, 22, 18, 0.65)"
        stroke="rgba(242, 237, 227, 0.12)"
      />
      {yTicks.map((tick, i) => (
        <g key={`ytick-${i}`}>
          <line
            x1={PADDING.left}
            x2={PADDING.left + innerW}
            y1={tick.y}
            y2={tick.y}
            stroke="rgba(242, 237, 227, 0.08)"
            strokeDasharray="2 4"
          />
          <text
            x={PADDING.left - 8}
            y={tick.y + 4}
            textAnchor="end"
            fontSize="10"
            fill="rgba(242, 237, 227, 0.6)"
          >
            {tick.label}
          </text>
        </g>
      ))}
      {xTicks.map((tick, i) => (
        <text
          key={`xtick-${i}`}
          x={tick.x}
          y={PADDING.top + innerH + 16}
          textAnchor="middle"
          fontSize="10"
          fill="rgba(242, 237, 227, 0.6)"
        >
          {tick.label}
        </text>
      ))}
      <CycleAnnotations
        cycles={cycles}
        timeMin={timeMin}
        timeMax={timeMax}
        chartLeft={PADDING.left}
        chartRight={PADDING.left + innerW}
        chartTop={PADDING.top}
        chartBottom={PADDING.top + innerH}
      />
      <polyline
        points={polyline}
        fill="none"
        stroke={POINT_STROKE}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dots.map((dot) => (
        <circle
          key={dot.key}
          cx={dot.cx}
          cy={dot.cy}
          r={4}
          fill={POINT_FILL}
          stroke={POINT_STROKE}
          strokeWidth={1.5}
        />
      ))}
      {statusBadges.length > 0 && (
        <g>
          {statusBadges.map((b) => (
            <title key={b.key}>{b.label}</title>
          ))}
        </g>
      )}
      <text
        x={PADDING.left}
        y={PADDING.top - 6}
        fontSize="10"
        fill="rgba(242, 237, 227, 0.55)"
      >
        {yAxisCaption[series.mode]}
      </text>
    </svg>
  );
}
