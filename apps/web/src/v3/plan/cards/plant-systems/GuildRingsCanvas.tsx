/**
 * GuildRingsCanvas — concentric-rings visualisation of a polyculture guild.
 *
 * Anchor at centre; one ring per applicable canopy layer below the anchor.
 * Members placed at evenly-spaced angles along their layer's ring (angle
 * derives from member order, not stored). Aesthetic pass per Modern SaaS
 * Design Scholar consult: translucent ring bands, depth-cue opacity step,
 * curved leaders, leaf glyphs, anchor glow + tree icon, shimmer active.
 */

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Trees } from 'lucide-react';
import type { GuildLayer, GuildMember } from '../../../../store/site-annotations.js';
import {
  findSpecies,
  type PlantSpecies,
} from '../../../../data/plantCatalog.js';
import {
  assignRingPositions,
  ringRadiusForLayer,
} from '../../../../features/agroforestry/guildMemberPositions.js';
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
  /** Optional. When provided, members are draggable on the SVG and
   *  this callback fires on pointer-up with the new guild-local
   *  `[east, north]` offset in metres. */
  onMemberDrag?: (memberIndex: number, position: [number, number]) => void;
  /** Optional. When provided, members with an explicit `position`
   *  show a hover-revealed chevron that calls this on click to
   *  clear the field (snap back to ring layout). */
  onMemberSnap?: (memberIndex: number) => void;
}

const VB_W = 540;
const VB_H = 540;
const CX = VB_W / 2;
const CY = VB_H / 2;
const ANCHOR_R = 30;
/** Single source of truth for the px↔metre scale on this canvas.
 *  Drives both the ring-band radii (`ringRadiusForLayer(layer) *
 *  PX_PER_METRE`) and the drag delta-to-metres conversion, so the
 *  scale the steward sees is the scale the data model stores. */
export const PX_PER_METRE = 18;
const RING_BAND_W = 24;
/** Layer labels collide with the anchor for inner rings; pin to a
 *  minimum radius so the text stays legible. */
const MIN_LABEL_R = ANCHOR_R + 20;
const LEAF_PATH = 'M 0 -12 Q 10 -4 0 13 Q -10 -4 0 -12 Z';

/** Click-vs-drag threshold (px) in SVG-user space. Matches the
 *  house-style `DRAG_THRESHOLD_PX = 4` used by PlanDataLayers'
 *  guild-centroid drag. */
export const DRAG_THRESHOLD_PX = 4;

/** Convert SVG-user-space coordinates to guild-local metres
 *  `[east, north]`. SVG y grows downward, metric north grows
 *  upward, hence the y-flip. */
export function svgToMetres(svgX: number, svgY: number): [number, number] {
  return [(svgX - CX) / PX_PER_METRE, (CY - svgY) / PX_PER_METRE];
}

/** Inverse of `svgToMetres` — convert guild-local metres
 *  `[east, north]` to SVG-user-space `[x, y]`. */
export function metresToSvg(east: number, north: number): [number, number] {
  return [CX + east * PX_PER_METRE, CY - north * PX_PER_METRE];
}

/** True when the cursor has moved beyond `DRAG_THRESHOLD_PX` from
 *  its pointer-down origin (drag intent) rather than jittered in
 *  place (click intent). */
export function isDrag(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > DRAG_THRESHOLD_PX;
}

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
  onMemberDrag,
  onMemberSnap,
}: Props) {
  const rings = useMemo(
    () => ringsBelowAnchor(anchor?.layer ?? null),
    [anchor?.layer],
  );

  /** `[east, north]` in metres per member, derived from explicit
   *  `position` when set, ring layout otherwise. The same call
   *  feeds the canopy-union math, so the canvas now shows exactly
   *  what the integration score sees. */
  const memberPositionsM = useMemo(
    () => assignRingPositions(members),
    [members],
  );

  const [drag, setDrag] = useState<{
    index: number;
    startClientX: number;
    startClientY: number;
    /** Live cursor in SVG-user space; null before threshold crossed. */
    previewSvg: [number, number] | null;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  function clientToSvg(clientX: number, clientY: number): [number, number] | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm.inverse());
    return [local.x, local.y];
  }

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
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{
        width: '100%',
        height: 'auto',
        background: 'radial-gradient(circle at 50% 45%, rgba(20,28,20,0.55) 0%, rgba(0,0,0,0.42) 70%)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14,
        touchAction: drag ? 'none' : undefined,
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

      {/* Ring bands — translucent, depth-cued. Radii are now proportional
          to the canonical metric `ringRadiusForLayer`, so the canvas is
          honest in metres throughout. */}
      {rings.map((layer, ringIdx) => {
        const r = ringRadiusForLayer(layer) * PX_PER_METRE;
        if (r <= 0) return null;
        const isActive = activeRing === layer;
        const tint = LAYER_TINT[layer];
        const baseOpacity = ringOpacity(ringIdx);
        const labelR = Math.max(r, MIN_LABEL_R);
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
            {/* Layer label at 10 o'clock (clamped to MIN_LABEL_R so inner
                rings don't collide with the anchor). */}
            <text
              x={CX + Math.cos((-150 * Math.PI) / 180) * labelR}
              y={CY + Math.sin((-150 * Math.PI) / 180) * labelR - 8}
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
      {rings.map((layer) => {
        const list = membersByLayer.get(layer) ?? [];
        if (list.length > 0) return null;
        const r = ringRadiusForLayer(layer) * PX_PER_METRE;
        if (r <= 0) return null;
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

      {/* Anchor — drawn before members so inner-ring leaves (e.g. root
          layer at 9 px from centre with PX_PER_METRE=18) sit above
          the anchor disc instead of being occluded by it. */}
      {anchor ? (
        <g style={{ cursor: 'pointer' }} onClick={onPickAnchor}>
          <circle
            cx={CX}
            cy={CY}
            r={ANCHOR_R + 14}
            fill={anchorTint}
            opacity={0.55}
            filter="url(#grc-anchor-glow)"
            style={{ pointerEvents: 'none' }}
          />
          <circle
            cx={CX}
            cy={CY}
            r={ANCHOR_R}
            fill={anchorTint}
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={2}
          />
          <circle
            cx={CX}
            cy={CY}
            r={ANCHOR_R}
            fill="url(#grc-anchor-grad)"
            style={{ pointerEvents: 'none' }}
          />
          <g
            transform={`translate(${CX - 8} ${CY - 8})`}
            style={{ pointerEvents: 'none' }}
          >
            <Trees size={16} color="rgba(255,255,255,0.92)" strokeWidth={1.6} />
          </g>
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
            fontSize={10}
            fill="rgba(232,220,200,0.7)"
            textAnchor="middle"
            style={{ pointerEvents: 'none' }}
          >
            Pick
          </text>
        </g>
      )}

      {/* Members — placed at `memberPositionsM[index]` (explicit
          `position` or ring-derived `[east, north]` in metres) and
          projected via `metresToSvg`. Drag updates a transient
          preview; pointer-up commits via `onMemberDrag`. */}
      {rings.map((layer) => {
        const list = membersByLayer.get(layer) ?? [];
        if (list.length === 0) return null;
        const tint = LAYER_TINT[layer];
        return (
          <g key={`members-${layer}`}>
            {list.map(({ member, index }) => {
              const sp = findSpecies(member.speciesId);
              const [eastM, northM] = memberPositionsM[index] ?? [0, 0];
              const isDragging =
                drag?.index === index && drag.previewSvg !== null;
              const [x, y] = isDragging
                ? drag.previewSvg!
                : metresToSvg(eastM, northM);
              const radial = Math.hypot(x - CX, y - CY);
              const angle =
                radial > 0.5
                  ? Math.atan2(y - CY, x - CX)
                  : (index * Math.PI * 2) / Math.max(list.length, 1) -
                    Math.PI / 2;
              const labelOffsetR = radial + 28;
              const lx = CX + Math.cos(angle) * labelOffsetR;
              const ly = CY + Math.sin(angle) * labelOffsetR;
              const fn = sp ? primaryFunction(sp.ecologicalFunction) : null;
              const textAnchor: 'start' | 'middle' | 'end' =
                Math.cos(angle) < -0.3
                  ? 'end'
                  : Math.cos(angle) > 0.3
                    ? 'start'
                    : 'middle';
              const leafRotation = (angle * 180) / Math.PI + 90;
              const chipText = fn ? FUNCTION_SHORT[fn] : '';
              const chipW = chipText.length * 6.5 + 12;
              const chipX =
                textAnchor === 'end'
                  ? lx - chipW
                  : textAnchor === 'middle'
                    ? lx - chipW / 2
                    : lx;
              const hasPosition = member.position !== undefined;
              const draggable = Boolean(onMemberDrag);

              const handlePointerDown = (
                e: ReactPointerEvent<SVGGElement>,
              ) => {
                if (!draggable) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                setDrag({
                  index,
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  previewSvg: null,
                });
              };
              const handlePointerMove = (
                e: ReactPointerEvent<SVGGElement>,
              ) => {
                if (!drag || drag.index !== index) return;
                const dx = e.clientX - drag.startClientX;
                const dy = e.clientY - drag.startClientY;
                if (drag.previewSvg === null && !isDrag(dx, dy)) return;
                const svgPt = clientToSvg(e.clientX, e.clientY);
                if (!svgPt) return;
                setDrag({ ...drag, previewSvg: svgPt });
              };
              const handlePointerUp = () => {
                if (!drag || drag.index !== index) return;
                if (drag.previewSvg !== null && onMemberDrag) {
                  const [fx, fy] = drag.previewSvg;
                  onMemberDrag(index, svgToMetres(fx, fy));
                } else {
                  onClickMember(index);
                }
                setDrag(null);
              };

              return (
                <g
                  key={`${member.speciesId}-${index}`}
                  className="grc-member"
                  onPointerDown={draggable ? handlePointerDown : undefined}
                  onPointerMove={draggable ? handlePointerMove : undefined}
                  onPointerUp={draggable ? handlePointerUp : undefined}
                  onPointerCancel={draggable ? handlePointerUp : undefined}
                  onClick={
                    draggable ? undefined : () => onClickMember(index)
                  }
                >
                  <path
                    className="grc-leader"
                    d={leaderPath(x, y, lx, ly - 4, angle)}
                    fill="none"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={1}
                  />
                  <g
                    transform={`translate(${x} ${y}) rotate(${leafRotation})`}
                  >
                    <path
                      d={LEAF_PATH}
                      fill={tint}
                      stroke={
                        isDragging
                          ? 'rgba(255,255,255,1)'
                          : 'rgba(255,255,255,0.88)'
                      }
                      strokeWidth={isDragging ? 2 : 1.25}
                      strokeLinejoin="round"
                    />
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
                  {hasPosition && onMemberSnap && (
                    <g
                      transform={`translate(${x + 14} ${y - 14})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMemberSnap(index);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        r={8}
                        fill="rgba(0,0,0,0.55)"
                        stroke="rgba(255,255,255,0.6)"
                        strokeWidth={1}
                      />
                      <path
                        d="M -3 1 L 0 -2 L 3 1 M 0 -2 L 0 3"
                        fill="none"
                        stroke="rgba(255,255,255,0.85)"
                        strokeWidth={1.3}
                        strokeLinecap="round"
                      />
                      <title>Snap back to ring layout</title>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
