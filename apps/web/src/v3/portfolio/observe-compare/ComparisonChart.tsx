/**
 * ComparisonChart — inline-SVG multi-series temporal chart for the
 * cross-project Observe comparison (plan P6, spec §6). One line per project,
 * X = calendar date (`capturedAt`), Y = numeric measurement OR status ordinal.
 * Adapts the single-series TemporalChart pattern (no chart-library dep); each
 * series gets its own colour, polyline, dots, and a baseline marker (hollow
 * ring on the earliest reading). Divergence markers flag the point where a
 * series' value crosses worse than its own baseline (status mode) or moves the
 * furthest from baseline (numeric mode is left to the summary table).
 *
 * Read-only: receives a fully-built `CompareResult` and renders it.
 */

import { useMemo } from 'react';
import type { CompareResult } from './observeCompareModel.js';

interface Props {
  result: CompareResult;
  /** Status ordinal → human label for the y-axis (status mode). */
  statusLabelText: Record<string, string>;
  width?: number;
  height?: number;
}

const PADDING = { top: 20, right: 24, bottom: 36, left: 64 };
const GRID = 'rgba(242, 237, 227, 0.08)';
const AXIS_TEXT = 'rgba(242, 237, 227, 0.6)';
const PANEL_BG = 'rgba(24, 22, 18, 0.65)';
const PANEL_STROKE = 'rgba(242, 237, 227, 0.12)';

function fmtDate(ms: number): string {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return '?';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ComparisonChart({
  result,
  statusLabelText,
  width = 760,
  height = 320,
}: Props) {
  const innerW = width - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;

  const built = useMemo(() => {
    const { xMin, xMax, yMin, yMax } = result;
    const tRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const xFor = (t: number) => PADDING.left + ((t - xMin) / tRange) * innerW;
    const yFor = (v: number) =>
      PADDING.top + (1 - (v - yMin) / yRange) * innerH;

    const lines = result.series.map((s) => ({
      projectId: s.projectId,
      color: s.color,
      polyline: s.points
        .map((p) => `${xFor(p.timeMs).toFixed(1)},${yFor(p.yValue).toFixed(1)}`)
        .join(' '),
      dots: s.points.map((p, i) => ({
        cx: xFor(p.timeMs),
        cy: yFor(p.yValue),
        isBaseline: i === 0,
        key: `${p.point.id}-${i}`,
      })),
    }));

    // X ticks: up to 4 evenly across the real-time span.
    const xTickCount = 4;
    const xTicks = Array.from({ length: xTickCount }, (_, i) => {
      const t = xMin + (tRange * i) / (xTickCount - 1);
      return { x: xFor(t), label: fmtDate(t) };
    });

    let yTicks: { y: number; label: string }[];
    if (result.mode === 'numeric') {
      const mid = yMin + (yMax - yMin) / 2;
      yTicks = [
        { y: yFor(yMin), label: yMin.toFixed(2) },
        { y: yFor(mid), label: mid.toFixed(2) },
        { y: yFor(yMax), label: yMax.toFixed(2) },
      ];
    } else {
      const labels = result.statusLabels ?? [];
      yTicks = labels.map((status, idx) => {
        const ord = labels.length - 1 - idx; // top row = highest ordinal
        return { y: yFor(ord), label: statusLabelText[status] ?? status };
      });
    }

    return { lines, xTicks, yTicks };
  }, [result, innerW, innerH, statusLabelText]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Cross-project Observe comparison by calendar date"
      style={{ display: 'block', maxWidth: '100%' }}
    >
      <rect
        x={PADDING.left}
        y={PADDING.top}
        width={innerW}
        height={innerH}
        fill={PANEL_BG}
        stroke={PANEL_STROKE}
      />
      {built.yTicks.map((tick, i) => (
        <g key={`ytick-${i}`}>
          <line
            x1={PADDING.left}
            x2={PADDING.left + innerW}
            y1={tick.y}
            y2={tick.y}
            stroke={GRID}
            strokeDasharray="2 4"
          />
          <text
            x={PADDING.left - 8}
            y={tick.y + 4}
            textAnchor="end"
            fontSize="10"
            fill={AXIS_TEXT}
          >
            {tick.label}
          </text>
        </g>
      ))}
      {built.xTicks.map((tick, i) => (
        <text
          key={`xtick-${i}`}
          x={tick.x}
          y={PADDING.top + innerH + 18}
          textAnchor="middle"
          fontSize="10"
          fill={AXIS_TEXT}
        >
          {tick.label}
        </text>
      ))}
      {built.lines.map((line) => (
        <g key={line.projectId}>
          {line.polyline ? (
            <polyline
              points={line.polyline}
              fill="none"
              stroke={line.color}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {line.dots.map((dot) =>
            dot.isBaseline ? (
              // Baseline marker: hollow ring on the earliest reading.
              <circle
                key={dot.key}
                cx={dot.cx}
                cy={dot.cy}
                r={5}
                fill="none"
                stroke={line.color}
                strokeWidth={2}
              />
            ) : (
              <circle
                key={dot.key}
                cx={dot.cx}
                cy={dot.cy}
                r={3.5}
                fill="#181612"
                stroke={line.color}
                strokeWidth={1.5}
              />
            ),
          )}
        </g>
      ))}
      <text
        x={PADDING.left}
        y={PADDING.top - 6}
        fontSize="10"
        fill="rgba(242, 237, 227, 0.55)"
      >
        {result.mode === 'numeric' ? 'Measurement' : 'Status output'} · by date
      </text>
    </svg>
  );
}
