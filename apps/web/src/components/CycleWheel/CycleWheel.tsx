/**
 * CycleWheel — OLOS port of the MILOS MaqasidComparisonWheel.
 *
 * Source reference: onaxyzogden/ogden-ui-components @ main
 *   src/components/MaqasidComparisonWheel/MaqasidComparisonWheel.jsx
 *
 * Stripped of MILOS-only state (mithaq stores, milestone watcher, wisdom
 * tooltips, next-action card, dormant/converged/igniting states, navigation,
 * progress fills, needle). Kept: annular-sector geometry, OKLCH palette
 * derivation, mount entry choreography, breathing hub, label band.
 *
 * Each segment renders fully filled (decorative cycle diagram, not a
 * progress meter).
 */

import { useEffect, useMemo, useState } from 'react';
import { Eye, Compass, Zap, type LucideIcon } from 'lucide-react';
import { deriveWheelPalette } from './wheelColor.js';
import './CycleWheel.css';

const CX = 200;
const CY = 200;
const HUB_R = 56;
const LABEL_INNER_R = 142;
const LABEL_OUTER_R = 184;
const PROGRESS_MAX_R = LABEL_INNER_R;
const LABEL_R = (LABEL_INNER_R + LABEL_OUTER_R) / 2;

export type CycleSegment = {
  id: string;
  label: string;
  color?: string;
  Icon?: LucideIcon;
};

type Props = {
  centerLabel?: string;
  levelColor?: string;
  levelPattern?: 'dots' | 'stripes' | 'crosshatch';
  segments?: CycleSegment[];
  className?: string;
};

function polar(r: number, angleDeg: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function annularSector(rInner: number, rOuter: number, startDeg: number, endDeg: number): string {
  const [x1o, y1o] = polar(rOuter, startDeg);
  const [x2o, y2o] = polar(rOuter, endDeg);
  const [x1i, y1i] = polar(rInner, startDeg);
  const [x2i, y2i] = polar(rInner, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${x1i} ${y1i}`,
    `L ${x1o} ${y1o}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2o} ${y2o}`,
    `L ${x2i} ${y2i}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x1i} ${y1i}`,
    'Z',
  ].join(' ');
}

const DEFAULT_SEGMENTS: CycleSegment[] = [
  { id: 'observe', label: 'Observe', Icon: Eye },
  { id: 'plan',    label: 'Plan',    Icon: Compass },
  { id: 'act',     label: 'Act',     Icon: Zap },
];

export default function CycleWheel({
  centerLabel = 'CYCLE',
  levelColor = '#5a8a5a',
  levelPattern = 'dots',
  segments = DEFAULT_SEGMENTS,
  className,
}: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const palette = useMemo(() => deriveWheelPalette(levelColor), [levelColor]);

  const n = segments.length || 1;
  const arcSize = 360 / n;
  const startOffset = -90 - arcSize / 2;
  const patternId = `cw-pat-${levelPattern}`;

  return (
    <div className={`cw-wrap${className ? ` ${className}` : ''}`}>
      <svg
        viewBox="0 0 400 400"
        className="cw-svg"
        role="img"
        aria-label={`${centerLabel} cycle wheel`}
        style={
          {
            '--cw-level-color': palette.base,
            '--cw-level-stroke': palette.stroke,
            '--cw-level-shimmer': palette.shimmer,
            '--cw-level-hub-tint': palette.hubTint,
            '--cw-level-aura': palette.brightAura,
          } as React.CSSProperties
        }
      >
        <defs>
          <radialGradient
            id="cw-progress-grad"
            gradientUnits="userSpaceOnUse"
            cx={CX}
            cy={CY}
            r={PROGRESS_MAX_R}
            fx={CX}
            fy={CY}
          >
            <stop offset="0%" stopColor={palette.base} stopOpacity="0.35" />
            <stop offset="40%" stopColor={palette.base} stopOpacity="0.6" />
            <stop offset="80%" stopColor={palette.base} stopOpacity="0.9" />
            <stop offset="100%" stopColor={palette.base} stopOpacity="1" />
          </radialGradient>
          <radialGradient id="cw-progress-grad-dim" gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={PROGRESS_MAX_R}>
            <stop offset="0%" stopColor="#1a4a4e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0a2326" stopOpacity="0.55" />
          </radialGradient>
          <linearGradient id="cw-band-level" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.base} stopOpacity="0.95" />
            <stop offset="100%" stopColor={palette.base} stopOpacity="0.65" />
          </linearGradient>
          <pattern id="cw-pat-dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="rgba(255,255,255,0.55)" />
          </pattern>
          <pattern
            id="cw-pat-stripes"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect x="0" y="0" width="2" height="8" fill="rgba(255,255,255,0.45)" />
          </pattern>
          <pattern id="cw-pat-crosshatch" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 10 10 M 10 0 L 0 10" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
          </pattern>
        </defs>

        {segments.map((seg, i) => {
          const startDeg = startOffset + i * arcSize;
          const endDeg = startOffset + (i + 1) * arcSize;
          const isHovered = hovered === seg.id;
          const hov = isHovered ? ' is-hovered' : '';
          return (
            <g
              key={`inner-${seg.id}`}
              role="img"
              aria-label={seg.label}
              className={`cw-sector${isMounted ? ' is-mounted' : ''}${hov}`}
              style={{ animationDelay: `${i * 90}ms` }}
              onMouseEnter={() => setHovered(seg.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <path
                d={annularSector(HUB_R, PROGRESS_MAX_R, startDeg, endDeg)}
                fill="url(#cw-progress-grad-dim)"
                className={`cw-seg-bg${hov}`}
              />
              <path
                d={annularSector(HUB_R, PROGRESS_MAX_R, startDeg, endDeg)}
                fill={seg.color || 'url(#cw-progress-grad)'}
                className={`cw-seg-current${hov}`}
                style={{ animationDelay: `${i * 80}ms`, opacity: seg.color ? 0.85 : undefined }}
              />
              <path
                d={annularSector(HUB_R, PROGRESS_MAX_R, startDeg, endDeg)}
                fill={`url(#${patternId})`}
                className={`cw-seg-pattern${hov}`}
                pointerEvents="none"
              />
            </g>
          );
        })}

        {segments.map((seg, i) => {
          const startDeg = startOffset + i * arcSize;
          const endDeg = startDeg + arcSize;
          const isHovered = hovered === seg.id;
          const hov = isHovered ? ' is-hovered' : '';
          return (
            <path
              key={`band-${seg.id}`}
              d={annularSector(LABEL_INNER_R, LABEL_OUTER_R, startDeg, endDeg)}
              fill={seg.color || 'url(#cw-band-level)'}
              stroke="rgba(10, 20, 24, 0.85)"
              strokeWidth="1.5"
              className={`cw-band${hov}`}
              role="img"
              aria-label={seg.label}
              onMouseEnter={() => setHovered(seg.id)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}

        <circle cx={CX} cy={CY} r={LABEL_OUTER_R} className="cw-outer-stroke" />
        <circle cx={CX} cy={CY} r={LABEL_INNER_R} className="cw-outer-stroke" />

        {segments.map((seg, i) => {
          const Icon = seg.Icon;
          if (!Icon) return null;
          const midDeg = startOffset + i * arcSize + arcSize / 2;
          const [lx, ly] = polar(LABEL_R, midDeg);
          const ICON_SIZE = 26;
          return (
            <g
              key={`label-${seg.id}`}
              transform={`translate(${lx - ICON_SIZE / 2} ${ly - ICON_SIZE / 2})`}
              className="cw-band-icon"
              aria-label={seg.label}
              pointerEvents="none"
            >
              <Icon size={ICON_SIZE} strokeWidth={1.8} />
            </g>
          );
        })}

        <g className="cw-hub-group" pointerEvents="none">
          <circle cx={CX} cy={CY} r={HUB_R} className="cw-hub" />
          <circle cx={CX} cy={CY} r={HUB_R - 4} className="cw-hub-inner" />
          <text
            x={CX}
            y={CY}
            className="cw-hub-label"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {centerLabel}
          </text>
        </g>
      </svg>
    </div>
  );
}
