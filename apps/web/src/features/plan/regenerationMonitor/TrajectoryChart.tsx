/**
 * Minimal dependency-free SVG line chart for one metric trajectory.
 *
 * Plots every zone's samples as its own polyline, overlays the
 * baseline→target pace line (when the metric is goal-scored), and marks
 * the deadline year. Pure presentational — all maths come pre-chewed
 * from `aggregate.ts`; this only maps values to pixels.
 */

import { useMemo } from 'react';
import type { MetricTrajectory } from './aggregate.js';

interface Props {
  traj: MetricTrajectory;
}

const W = 520;
const H = 180;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

const ZONE_COLORS = [
  '#7fd1ae',
  '#e3b04b',
  '#6fa8dc',
  '#c98bdb',
  '#d98b6f',
  '#9fd86f',
];

function parseLocalDate(isoDate: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(isoDate);
  return d.getTime();
}

export default function TrajectoryChart({ traj }: Props) {
  const geom = useMemo(() => {
    const allPoints = traj.series.flatMap((s) => s.points);
    if (allPoints.length === 0) return null;

    const times = allPoints.map((p) => parseLocalDate(p.date));
    let tMin = Math.min(...times);
    let tMax = Math.max(...times);

    const values = allPoints.map((p) => p.value);
    let vMin = Math.min(...values);
    let vMax = Math.max(...values);
    if (traj.target != null) {
      vMin = Math.min(vMin, traj.target);
      vMax = Math.max(vMax, traj.target);
    }
    if (vMin === vMax) {
      vMin -= 1;
      vMax += 1;
    }
    if (tMin === tMax) {
      tMin -= 86_400_000;
      tMax += 86_400_000;
    }
    const vPad = (vMax - vMin) * 0.08;
    vMin -= vPad;
    vMax += vPad;

    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const x = (t: number) =>
      PAD.left + ((t - tMin) / (tMax - tMin)) * plotW;
    const y = (v: number) =>
      PAD.top + plotH - ((v - vMin) / (vMax - vMin)) * plotH;

    const series = traj.series.map((s, i) => ({
      zoneRef: s.zoneRef,
      color: ZONE_COLORS[i % ZONE_COLORS.length]!,
      path: s.points
        .map(
          (p, j) =>
            `${j === 0 ? 'M' : 'L'} ${x(parseLocalDate(p.date)).toFixed(1)} ${y(
              p.value,
            ).toFixed(1)}`,
        )
        .join(' '),
      dots: s.points.map((p) => ({
        cx: x(parseLocalDate(p.date)),
        cy: y(p.value),
      })),
    }));

    // Pace line: baseline → target at the deadline year.
    let paceLine: { x1: number; y1: number; x2: number; y2: number } | null =
      null;
    let deadlineX: number | null = null;
    if (
      traj.baseline &&
      traj.target != null &&
      traj.deadlineYear != null &&
      traj.deadlineYear > 0
    ) {
      const t0 = parseLocalDate(traj.baseline.date);
      const tDue = t0 + traj.deadlineYear * 365.25 * 86_400_000;
      paceLine = {
        x1: x(t0),
        y1: y(traj.baseline.value),
        x2: x(tDue),
        y2: y(traj.target),
      };
      if (tDue >= tMin && tDue <= tMax) deadlineX = x(tDue);
    }

    return {
      series,
      paceLine,
      deadlineX,
      targetY: traj.target != null ? y(traj.target) : null,
      vMin,
      vMax,
      yOf: y,
    };
  }, [traj]);

  if (!geom) {
    return (
      <p style={{ fontSize: 12, color: 'rgba(232,220,200,0.5)', margin: 0 }}>
        No samples logged for this metric yet.
      </p>
    );
  }

  const yTicks = [geom.vMax, (geom.vMax + geom.vMin) / 2, geom.vMin];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${traj.label} trajectory`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {yTicks.map((v, i) => {
          const yy = geom.yOf(v);
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={yy}
                y2={yy}
                stroke="rgba(255,255,255,0.06)"
              />
              <text
                x={PAD.left - 6}
                y={yy + 3}
                textAnchor="end"
                fontSize="9"
                fill="rgba(232,220,200,0.45)"
              >
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}

        {geom.targetY != null && (
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={geom.targetY}
            y2={geom.targetY}
            stroke="#e3b04b"
            strokeWidth={1}
            strokeDasharray="5 4"
          />
        )}

        {geom.paceLine && (
          <line
            x1={geom.paceLine.x1}
            y1={geom.paceLine.y1}
            x2={geom.paceLine.x2}
            y2={geom.paceLine.y2}
            stroke="rgba(227,176,75,0.55)"
            strokeWidth={1.5}
            strokeDasharray="2 3"
          />
        )}

        {geom.deadlineX != null && (
          <line
            x1={geom.deadlineX}
            x2={geom.deadlineX}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="rgba(217,139,111,0.6)"
            strokeWidth={1}
          />
        )}

        {geom.series.map((s) => (
          <g key={s.zoneRef}>
            <path
              d={s.path}
              fill="none"
              stroke={s.color}
              strokeWidth={1.75}
            />
            {s.dots.map((d, i) => (
              <circle key={i} cx={d.cx} cy={d.cy} r={2.6} fill={s.color} />
            ))}
          </g>
        ))}
      </svg>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          marginTop: 6,
          fontSize: 11,
          color: 'rgba(232,220,200,0.6)',
        }}
      >
        {geom.series.map((s) => (
          <span
            key={s.zoneRef}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: s.color,
                display: 'inline-block',
              }}
            />
            {s.zoneRef}
          </span>
        ))}
        {traj.target != null && (
          <span style={{ color: '#e3b04b' }}>— — target {traj.target}{traj.unit}</span>
        )}
        {geom.deadlineX != null && (
          <span style={{ color: 'rgba(217,139,111,0.85)' }}>
            | deadline yr {traj.deadlineYear}
          </span>
        )}
      </div>
    </div>
  );
}
