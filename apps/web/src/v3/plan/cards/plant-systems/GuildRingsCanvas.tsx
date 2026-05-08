/**
 * GuildRingsCanvas — concentric-rings visualisation of a polyculture guild.
 *
 * Anchor at centre; one ring per applicable canopy layer below the anchor.
 * Members placed at evenly-spaced angles along their layer's ring (angle
 * derives from member order, not stored). Aesthetic pass per Modern SaaS
 * Design Scholar consult: translucent ring bands, depth-cue opacity step,
 * curved leaders, leaf glyphs, anchor glow + tree icon, shimmer active.
 */

import { useMemo } from 'react';
import { Trees } from 'lucide-react';
import type { GuildLayer, GuildMember } from '../../../../store/site-annotations.js';
import {
  findSpecies,
  type PlantSpecies,
} from '../../../../data/plantDatabase.js';
import {
  LAYER_LABEL,
  LAYER_TINT,
  FUNCTION_SHORT,
  primaryFunction,
  ringsBelowAnchor,
} from './guildLayerOrder.js';

interface Props {
  anchor: PlantSpecies | null;
  members: GuildMember[];
  onPickRing: (layer: GuildLayer) => void;
  onClickMember: (memberIndex: number) => void;
  onPickAnchor: () => void;
  activeRing: GuildLayer | null;
}

const VB_W = 540;
const VB_H = 540;
const CX = VB_W / 2;
const CY = VB_H / 2;
const ANCHOR_R = 46;
const RING_SPACING = 36;
const FIRST_RING_R = ANCHOR_R + 28;
const RING_BAND_W = RING_SPACING - 4;
const LEAF_PATH = 'M 0 -12 Q 10 -4 0 13 Q -10 -4 0 -12 Z';

/** Innermost ring brightest; step opacity DOWN as we move outward (depth cue). */
function ringOpacity(ringIdx: number): number {
  return Math.max(0.025, 0.085 - ringIdx * 0.013);
}

/** Curved leader — quadratic bezier with control point pulled tangentially. */
function leaderPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  angle: number,
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const perp = 12;
  const cx = mx + Math.cos(angle + Math.PI / 2) * perp;
  const cy = my + Math.sin(angle + Math.PI / 2) * perp;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export default function GuildRingsCanvas({
  anchor,
  members,
  onPickRing,
  onClickMember,
  onPickAnchor,
  activeRing,
}: Props) {
  const rings = useMemo(
    () => ringsBelowAnchor(anchor?.layer ?? null),
    [anchor?.layer],
  );

  const membersByLayer = useMemo(() => {
    const map = new Map<GuildLayer, Array<{ member: GuildMember; index: number }>>();
    members.forEach((m, index) => {
      const list = map.get(m.layer) ?? [];
      list.push({ member: m, index });
      map.set(m.layer, list);
    });
    return map;
  }, [members]);

  const anchorTint = anchor ? LAYER_TINT[anchor.layer] : '#3d8a3d';

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{
        width: '100%',
        height: 'auto',
        background: 'radial-gradient(circle at 50% 45%, rgba(20,28,20,0.55) 0%, rgba(0,0,0,0.42) 70%)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14,
      }}
    >
      <defs>
        <filter id="grc-anchor-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <radialGradient id="grc-anchor-grad" cx="50%" cy="38%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <style>{`
        .grc-member { transition: filter 180ms ease; cursor: pointer; }
        .grc-member:hover { filter: brightness(1.22); }
        .grc-member:hover .grc-leader { stroke-opacity: 0.55 !important; }
        .grc-member:hover .grc-name { fill: rgba(255,255,255,1); }
        .grc-band { transition: stroke-opacity 180ms ease; cursor: pointer; }
        .grc-band:hover { stroke-opacity: 0.16 !important; }
        @keyframes grc-shimmer {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -120; }
        }
        .grc-shimmer { animation: grc-shimmer 3.5s linear infinite; }
      `}</style>

      {/* Subtle ground line */}
      <line
        x1={28}
        y1={CY}
        x2={VB_W - 28}
        y2={CY}
        stroke="rgba(255,255,255,0.05)"
        strokeDasharray="2 8"
      />

      {/* Ring bands — translucent, depth-cued */}
      {rings.map((layer, ringIdx) => {
        const r = FIRST_RING_R + ringIdx * RING_SPACING;
        const isActive = activeRing === layer;
        const tint = LAYER_TINT[layer];
        const baseOpacity = ringOpacity(ringIdx);
        return (
          <g key={`band-${layer}`}>
            <circle
              className="grc-band"
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke={isActive ? tint : '#ffffff'}
              strokeWidth={RING_BAND_W}
              strokeOpacity={isActive ? 0.13 : baseOpacity}
              onClick={() => onPickRing(layer)}
            >
              <title>{`Add to ${LAYER_LABEL[layer]} layer`}</title>
            </circle>
            {/* hairline edges to crisp up the band */}
            <circle
              cx={CX}
              cy={CY}
              r={r - RING_BAND_W / 2}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={0.75}
              style={{ pointerEvents: 'none' }}
            />
            <circle
              cx={CX}
              cy={CY}
              r={r + RING_BAND_W / 2}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={0.75}
              style={{ pointerEvents: 'none' }}
            />
            {/* Active-state shimmer overlay */}
            {isActive && (
              <circle
                className="grc-shimmer"
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                stroke={tint}
                strokeWidth={1.5}
                strokeOpacity={0.75}
                strokeDasharray="6 30"
                style={{ pointerEvents: 'none' }}
              />
            )}
            {/* Layer label at 10 o'clock */}
            <text
              x={CX + Math.cos((-150 * Math.PI) / 180) * r}
              y={CY + Math.sin((-150 * Math.PI) / 180) * r - 8}
              fontSize={10}
              fontWeight={500}
              letterSpacing={0.4}
              fill={isActive ? tint : 'rgba(232,220,200,0.55)'}
              style={{ pointerEvents: 'none', textTransform: 'uppercase' }}
            >
              {LAYER_LABEL[layer]}
            </text>
          </g>
        );
      })}

      {/* Empty-ring drop zones — faint + at 6 o'clock for unfilled rings */}
      {rings.map((layer, ringIdx) => {
        const list = membersByLayer.get(layer) ?? [];
        if (list.length > 0) return null;
        const r = FIRST_RING_R + ringIdx * RING_SPACING;
        const dx = CX;
        const dy = CY + r;
        return (
          <g key={`empty-${layer}`} style={{ pointerEvents: 'none' }}>
            <circle
              cx={dx}
              cy={dy}
              r={11}
              fill="rgba(0,0,0,0.35)"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <text
              x={dx}
              y={dy + 4}
              fontSize={14}
              fontWeight={300}
              fill="rgba(255,255,255,0.55)"
              textAnchor="middle"
            >
              +
            </text>
          </g>
        );
      })}

      {/* Members */}
      {rings.map((layer, ringIdx) => {
        const r = FIRST_RING_R + ringIdx * RING_SPACING;
        const list = membersByLayer.get(layer) ?? [];
        if (list.length === 0) return null;
        const tint = LAYER_TINT[layer];
        return (
          <g key={`members-${layer}`}>
            {list.map(({ member, index }, slotIdx) => {
              const sp = findSpecies(member.speciesId);
              const ringPhase = (ringIdx * Math.PI * 2) / 7;
              const angle =
                (slotIdx / list.length) * Math.PI * 2 - Math.PI / 2 + ringPhase;
              const x = CX + Math.cos(angle) * r;
              const y = CY + Math.sin(angle) * r;
              const labelOffsetR = r + 28;
              const lx = CX + Math.cos(angle) * labelOffsetR;
              const ly = CY + Math.sin(angle) * labelOffsetR;
              const fn = sp ? primaryFunction(sp.ecologicalFunction) : null;
              const textAnchor: 'start' | 'middle' | 'end' =
                Math.cos(angle) < -0.3 ? 'end' : Math.cos(angle) > 0.3 ? 'start' : 'middle';
              const leafRotation = (angle * 180) / Math.PI + 90;
              const chipText = fn ? FUNCTION_SHORT[fn] : '';
              const chipW = chipText.length * 6.5 + 12;
              const chipX =
                textAnchor === 'end'
                  ? lx - chipW
                  : textAnchor === 'middle'
                    ? lx - chipW / 2
                    : lx;
              return (
                <g
                  key={`${member.speciesId}-${index}`}
                  className="grc-member"
                  onClick={() => onClickMember(index)}
                >
                  <path
                    className="grc-leader"
                    d={leaderPath(x, y, lx, ly - 4, angle)}
                    fill="none"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={1}
                  />
                  {/* Leaf glyph rotated to point outward */}
                  <g transform={`translate(${x} ${y}) rotate(${leafRotation})`}>
                    <path
                      d={LEAF_PATH}
                      fill={tint}
                      stroke="rgba(255,255,255,0.88)"
                      strokeWidth={1.25}
                      strokeLinejoin="round"
                    />
                    {/* leaf vein */}
                    <line
                      x1={0}
                      y1={-10}
                      x2={0}
                      y2={11}
                      stroke="rgba(0,0,0,0.25)"
                      strokeWidth={0.75}
                    />
                  </g>
                  <text
                    className="grc-name"
                    x={lx}
                    y={ly}
                    fontSize={12}
                    fontWeight={500}
                    fill="rgba(232,220,200,0.85)"
                    textAnchor={textAnchor}
                    style={{ pointerEvents: 'none' }}
                  >
                    {sp?.commonName ?? member.speciesId}
                  </text>
                  {fn && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect
                        x={chipX}
                        y={ly + 5}
                        width={chipW}
                        height={14}
                        rx={4}
                        fill="rgba(255,255,255,0.08)"
                        stroke={`${tint}`}
                        strokeOpacity={0.35}
                        strokeWidth={0.75}
                      />
                      <text
                        x={lx}
                        y={ly + 15}
                        fontSize={10}
                        fontWeight={700}
                        letterSpacing={0.3}
                        fill="rgba(255,255,255,0.72)"
                        textAnchor={textAnchor}
                        style={{ textTransform: 'uppercase' }}
                      >
                        {chipText}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Anchor — drawn last so it sits above ring strokes */}
      {anchor ? (
        <g style={{ cursor: 'pointer' }} onClick={onPickAnchor}>
          {/* glow halo */}
          <circle
            cx={CX}
            cy={CY}
            r={ANCHOR_R + 14}
            fill={anchorTint}
            opacity={0.55}
            filter="url(#grc-anchor-glow)"
            style={{ pointerEvents: 'none' }}
          />
          {/* main disc */}
          <circle
            cx={CX}
            cy={CY}
            r={ANCHOR_R}
            fill={anchorTint}
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={2}
          />
          {/* radial gradient highlight */}
          <circle
            cx={CX}
            cy={CY}
            r={ANCHOR_R}
            fill="url(#grc-anchor-grad)"
            style={{ pointerEvents: 'none' }}
          />
          {/* tree icon */}
          <g
            transform={`translate(${CX - 11} ${CY - 22})`}
            style={{ pointerEvents: 'none' }}
          >
            <Trees size={22} color="rgba(255,255,255,0.92)" strokeWidth={1.6} />
          </g>
          <text
            x={CX}
            y={CY + 8}
            fontSize={11}
            fill="rgba(255,255,255,0.95)"
            textAnchor="middle"
            fontWeight={600}
            style={{ pointerEvents: 'none' }}
          >
            {anchor.commonName}
          </text>
          <text
            x={CX}
            y={CY + 22}
            fontSize={8}
            fontWeight={500}
            letterSpacing={0.5}
            fill="rgba(255,255,255,0.65)"
            textAnchor="middle"
            style={{ pointerEvents: 'none', textTransform: 'uppercase' }}
          >
            {LAYER_LABEL[anchor.layer]} anchor
          </text>
        </g>
      ) : (
        <g style={{ cursor: 'pointer' }} onClick={onPickAnchor}>
          <circle
            cx={CX}
            cy={CY}
            r={ANCHOR_R}
            fill="rgba(0,0,0,0.4)"
            stroke="rgba(232,220,200,0.5)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <text
            x={CX}
            y={CY + 4}
            fontSize={11}
            fill="rgba(232,220,200,0.7)"
            textAnchor="middle"
          >
            Pick anchor
          </text>
        </g>
      )}
    </svg>
  );
}
