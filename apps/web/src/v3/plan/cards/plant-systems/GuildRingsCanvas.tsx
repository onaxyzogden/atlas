/**
 * GuildRingsCanvas — concentric-rings visualisation of a polyculture guild.
 *
 * Anchor at centre; one ring per applicable canopy layer below the anchor
 * (sub_canopy → root). Members are placed at evenly-spaced angles along
 * their layer's ring; angles derive from member order in `members[]` so
 * no schema field for visual position is needed.
 *
 * Click on an empty ring → caller opens a layer-filtered species picker.
 * Click on an existing member dot → caller offers a Remove action.
 */

import { useMemo } from 'react';
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
const ANCHOR_R = 44;
const RING_SPACING = 34;
const FIRST_RING_R = ANCHOR_R + 26;
const MEMBER_DOT_R = 9;

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

  // Group members by their layer so we can space them evenly per ring.
  const membersByLayer = useMemo(() => {
    const map = new Map<GuildLayer, Array<{ member: GuildMember; index: number }>>();
    members.forEach((m, index) => {
      const list = map.get(m.layer) ?? [];
      list.push({ member: m, index });
      map.set(m.layer, list);
    });
    return map;
  }, [members]);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{
        width: '100%',
        height: 'auto',
        background: 'rgba(0,0,0,0.32)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
      }}
    >
      {/* Subtle ground line */}
      <line
        x1={20}
        y1={CY}
        x2={VB_W - 20}
        y2={CY}
        stroke="rgba(255,255,255,0.04)"
        strokeDasharray="2 6"
      />

      {/* Rings */}
      {rings.map((layer, ringIdx) => {
        const r = FIRST_RING_R + ringIdx * RING_SPACING;
        const isActive = activeRing === layer;
        const tint = LAYER_TINT[layer];
        return (
          <g key={layer}>
            {/* Click target: full ring stroke, fattened invisibly for hit area */}
            <circle
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke={isActive ? tint : 'rgba(255,255,255,0.08)'}
              strokeWidth={isActive ? 2 : 1}
              strokeDasharray={isActive ? '6 4' : '3 4'}
            />
            <circle
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke="transparent"
              strokeWidth={18}
              style={{ cursor: 'pointer' }}
              onClick={() => onPickRing(layer)}
            >
              <title>{`Add to ${LAYER_LABEL[layer]} layer`}</title>
            </circle>
            {/* Layer label sitting on the ring at the 10 o'clock position */}
            <text
              x={CX + Math.cos((-150 * Math.PI) / 180) * r}
              y={CY + Math.sin((-150 * Math.PI) / 180) * r - 6}
              fontSize={10}
              fill={isActive ? tint : 'rgba(232,220,200,0.55)'}
              style={{ pointerEvents: 'none' }}
            >
              {LAYER_LABEL[layer]}
            </text>
          </g>
        );
      })}

      {/* Member dots + labels per ring */}
      {rings.map((layer, ringIdx) => {
        const r = FIRST_RING_R + ringIdx * RING_SPACING;
        const list = membersByLayer.get(layer) ?? [];
        if (list.length === 0) return null;
        const tint = LAYER_TINT[layer];
        return (
          <g key={`members-${layer}`}>
            {list.map(({ member, index }, slotIdx) => {
              const sp = findSpecies(member.speciesId);
              // Offset each ring's start angle so single-member rings
              // don't all stack at the top.
              const ringPhase = (ringIdx * Math.PI * 2) / 7;
              const angle =
                (slotIdx / list.length) * Math.PI * 2 - Math.PI / 2 + ringPhase;
              const x = CX + Math.cos(angle) * r;
              const y = CY + Math.sin(angle) * r;
              const labelOffsetR = r + 22;
              const lx = CX + Math.cos(angle) * labelOffsetR;
              const ly = CY + Math.sin(angle) * labelOffsetR;
              const fn = sp ? primaryFunction(sp.ecologicalFunction) : null;
              // Anchor text horizontally based on which side of the canvas.
              const textAnchor =
                Math.cos(angle) < -0.3 ? 'end' : Math.cos(angle) > 0.3 ? 'start' : 'middle';
              return (
                <g
                  key={`${member.speciesId}-${index}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onClickMember(index)}
                >
                  {/* leader line */}
                  <line
                    x1={x}
                    y1={y}
                    x2={lx}
                    y2={ly}
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={1}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={MEMBER_DOT_R}
                    fill={tint}
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth={1.5}
                  />
                  <text
                    x={lx}
                    y={ly}
                    fontSize={11}
                    fill="rgba(232,220,200,0.95)"
                    textAnchor={textAnchor}
                    style={{ pointerEvents: 'none' }}
                  >
                    {sp?.commonName ?? member.speciesId}
                  </text>
                  {fn && (
                    <text
                      x={lx}
                      y={ly + 12}
                      fontSize={9}
                      fill={tint}
                      textAnchor={textAnchor}
                      style={{ pointerEvents: 'none' }}
                    >
                      {FUNCTION_SHORT[fn]}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Anchor disc — drawn last so it sits above ring strokes */}
      {anchor ? (
        <g style={{ cursor: 'pointer' }} onClick={onPickAnchor}>
          <circle
            cx={CX}
            cy={CY}
            r={ANCHOR_R}
            fill={LAYER_TINT[anchor.layer]}
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={2}
          />
          <text
            x={CX}
            y={CY - 4}
            fontSize={13}
            fill="rgba(0,0,0,0.85)"
            textAnchor="middle"
            fontWeight={600}
            style={{ pointerEvents: 'none' }}
          >
            {anchor.commonName}
          </text>
          <text
            x={CX}
            y={CY + 12}
            fontSize={9}
            fill="rgba(0,0,0,0.65)"
            textAnchor="middle"
            style={{ pointerEvents: 'none' }}
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
