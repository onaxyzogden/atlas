/**
 * ObserveCompassWheel — the central SVG donut for the Stage Compass.
 *
 * One annular wedge per Observe objective (count-driven from useCompassData, so
 * it stays in sync with OBSERVE_MODULES). Each wedge carries its icon, label,
 * verified %, and a radial node-path whose dots reflect the gating state
 * (locked / open / evidence-in / verified). Quiet biophilic register: fills are
 * accent-at-low-opacity, rings are 1px — no glow, no blur.
 */

import { useId } from 'react';
import type { ObserveModule } from '../observe/types.js';
import type { NodeState } from './compassGating.js';
import type { ObjectiveView } from './useCompassData.js';
import css from './ObserveCompassWheel.module.css';

const VIEW = 440;
const CENTER = VIEW / 2;
const INNER_R = 78;
const OUTER_R = 196;
const GAP_DEG = 2.4; // wedge separation
const ICON_R = (INNER_R + OUTER_R) / 2 - 12;
const LABEL_R = (INNER_R + OUTER_R) / 2 + 30;

function polar(angleDeg: number, radius: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(a), CENTER + radius * Math.sin(a)];
}

function annularSector(
  startDeg: number,
  endDeg: number,
  rInner: number,
  rOuter: number,
): string {
  const [x1, y1] = polar(startDeg, rOuter);
  const [x2, y2] = polar(endDeg, rOuter);
  const [x3, y3] = polar(endDeg, rInner);
  const [x4, y4] = polar(startDeg, rInner);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

interface WheelProps {
  views: ObjectiveView[];
  selected: ObserveModule;
  onSelect: (module: ObserveModule) => void;
}

export default function ObserveCompassWheel({
  views,
  selected,
  onSelect,
}: WheelProps) {
  const titleId = useId();
  const count = views.length;
  const sweep = 360 / count;

  return (
    <svg
      className={css.wheel}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="group"
      aria-labelledby={titleId}
    >
      <title id={titleId}>Observe compass — {count} objectives</title>

      {views.map((view, i) => {
        const start = i * sweep + GAP_DEG / 2;
        const end = (i + 1) * sweep - GAP_DEG / 2;
        const mid = (start + end) / 2;
        const isActive = view.objective.id === selected;
        const accent = view.objective.accent;
        const [iconX, iconY] = polar(mid, ICON_R);
        const [labelX, labelY] = polar(mid, LABEL_R);
        const Icon = view.objective.icon;

        return (
          <g key={view.objective.id} className={css.wedgeGroup}>
            <path
              className={css.wedge}
              d={annularSector(start, end, INNER_R, OUTER_R)}
              fill={accent}
              fillOpacity={isActive ? 0.22 : 0.08}
              stroke={accent}
              strokeOpacity={isActive ? 0.7 : 0.28}
              strokeWidth={isActive ? 1.5 : 1}
              data-active={isActive}
              onClick={() => onSelect(view.objective.id)}
              role="button"
              tabIndex={0}
              aria-label={`${view.objective.label}, ${view.progress.pct}% verified`}
              aria-pressed={isActive}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(view.objective.id);
                }
              }}
            />

            <NodePath
              states={view.states}
              mid={mid}
              accent={accent}
            />

            <foreignObject
              x={iconX - 14}
              y={iconY - 14}
              width={28}
              height={28}
              className={css.iconHost}
              pointerEvents="none"
            >
              <span
                className={css.iconWrap}
                style={{ color: accent, opacity: isActive ? 1 : 0.75 }}
              >
                <Icon size={18} strokeWidth={1.75} />
              </span>
            </foreignObject>

            <text
              className={css.wedgeLabel}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              data-active={isActive}
              pointerEvents="none"
            >
              <tspan x={labelX} dy="0">
                {view.objective.label}
              </tspan>
              <tspan className={css.wedgePct} x={labelX} dy="1.25em">
                {view.progress.pct}%
              </tspan>
            </text>
          </g>
        );
      })}

      {/* Hub */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={INNER_R - 8}
        className={css.hub}
      />
      <text
        className={css.hubEyebrow}
        x={CENTER}
        y={CENTER - 8}
        textAnchor="middle"
      >
        OBSERVE
      </text>
      <text
        className={css.hubLabel}
        x={CENTER}
        y={CENTER + 14}
        textAnchor="middle"
      >
        Compass
      </text>
    </svg>
  );
}

/** Radial run of node dots along a wedge's mid-line, inner → outer. */
function NodePath({
  states,
  mid,
  accent,
}: {
  states: NodeState[];
  mid: number;
  accent: string;
}) {
  const n = states.length;
  if (n === 0) return null;
  // Distribute dots between the inner band edge and just shy of the outer.
  const r0 = INNER_R + 16;
  const r1 = OUTER_R - 40;
  const step = n === 1 ? 0 : (r1 - r0) / (n - 1);

  return (
    <g pointerEvents="none">
      {/* connector spine */}
      {n > 1 && (
        <line
          {...spineCoords(mid, r0, r1)}
          className={css.nodeSpine}
          stroke={accent}
        />
      )}
      {states.map((state, i) => {
        const [cx, cy] = polar(mid, r0 + step * i);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={state === 'verified' ? 6 : 5}
            className={css.node}
            data-state={state}
            fill={dotFill(state, accent)}
            stroke={accent}
            strokeOpacity={state === 'locked' ? 0.3 : 0.8}
          />
        );
      })}
    </g>
  );
}

function spineCoords(mid: number, r0: number, r1: number) {
  const [x1, y1] = polar(mid, r0);
  const [x2, y2] = polar(mid, r1);
  return { x1, y1, x2, y2 };
}

function dotFill(state: NodeState, accent: string): string {
  switch (state) {
    case 'verified':
      return accent;
    case 'evidence-in':
      return `color-mix(in srgb, ${accent} 45%, transparent)`;
    case 'open':
      return `color-mix(in srgb, ${accent} 12%, transparent)`;
    case 'locked':
    default:
      return 'transparent';
  }
}
