/**
 * SectorCompassDiagram — pure-SVG compass rose.
 *
 * Renders three layers:
 *   1. Wind rose petals (computeWindSectors, frequency-scaled, Beaufort-colored)
 *   2. Solar arcs (computeSolarSectors, three key dates) — only when lat is known
 *   3. Manual sector arrows (SectorArrow[] from externalForcesStore) as wedge overlays
 *
 * `compact` prop renders a smaller version without labels for tool-card previews.
 */

import { useMemo } from 'react';
import { computeWindSectors } from '../../../../lib/sectors/wind.js';
import { computeSolarSectors } from '../../../../lib/sectors/solar.js';
import type { SectorWedge } from '../../../../lib/sectors/types.js';
import type { SectorArrow } from '../../../../store/externalForcesStore.js';
import styles from './SectorCompassDiagram.module.css';

const CX = 150;
const CY = 150;
const R_OUTER = 128;
const R_LABEL = 142;
const VIEW = '0 0 300 300';

const COMPASS_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

const MANUAL_COLORS: Record<string, string> = {
  wind_prevailing: '#5b7a8a',
  wind_storm:      '#3a5a6a',
  sun_summer:      '#c4a265',
  sun_winter:      '#b87a3f',
  fire:            '#c45a3a',
  noise:           '#7a6a9a',
  wildlife:        '#6a9a6a',
  view:            '#4a8a7a',
};

/** Manual sector types that read as solar — rendered as an edge rim band
 *  (matching the auto-computed solar arcs) rather than an interior wedge. */
const SOLAR_SECTOR_TYPES = new Set<string>(['sun_summer', 'sun_winter']);

function bearingToXY(bearingDeg: number, r: number): [number, number] {
  const rad = ((bearingDeg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

/** SVG arc path (large-arc flag handles > 180° spans). */
function wedgePath(
  startDeg: number,
  endDeg: number,
  rInner: number,
  rOuter: number,
): string {
  // Normalize to sweep clockwise; allow ≤ 360°
  let sweep = ((endDeg - startDeg) % 360 + 360) % 360;
  if (sweep === 0) sweep = 359.99;
  const large = sweep > 180 ? 1 : 0;
  const [x1, y1] = bearingToXY(startDeg, rOuter);
  const [x2, y2] = bearingToXY(startDeg + sweep, rOuter);
  const [x3, y3] = bearingToXY(startDeg + sweep, rInner);
  const [x4, y4] = bearingToXY(startDeg, rInner);
  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

/** Render a SectorWedge as an SVG <path>. */
function WedgePath({
  wedge,
  rOuter,
  rInner = 0,
  opacity = 0.55,
}: {
  wedge: SectorWedge;
  rOuter: number;
  rInner?: number;
  opacity?: number;
}) {
  const d = wedgePath(wedge.startBearingDeg, wedge.endBearingDeg, rInner, rOuter);
  return <path d={d} fill={wedge.color} opacity={opacity} />;
}

/** Convert a SectorArrow (bearing + arc) into a SectorWedge shape. */
function arrowToWedge(a: SectorArrow): SectorWedge {
  const halfArc = (a.arcDeg ?? 45) / 2;
  return {
    id: a.id,
    kind: 'wind-prevailing',
    label: a.type,
    startBearingDeg: a.bearingDeg - halfArc,
    endBearingDeg: a.bearingDeg + halfArc,
    reachMeters: 400,
    color: MANUAL_COLORS[a.type] ?? '#888',
  };
}

interface Props {
  /** Project centroid [lng, lat] for solar/wind computation. */
  centroid?: [number, number] | null;
  /** Manual sector arrows from externalForcesStore. */
  sectors?: SectorArrow[];
  /** Smaller SVG with no labels — for tool-card previews. */
  compact?: boolean;
  className?: string;
}

export default function SectorCompassDiagram({
  centroid,
  sectors = [],
  compact = false,
  className,
}: Props) {
  const windSectors = useMemo(() => {
    if (!centroid) return null;
    return computeWindSectors(centroid);
  }, [centroid]);

  const solarSectors = useMemo(() => {
    if (!centroid) return null;
    const lat = centroid[1];
    if (lat == null || lat < -90 || lat > 90) return null;
    return computeSolarSectors(centroid);
  }, [centroid]);

  const size = compact ? 180 : 300;

  return (
    <svg
      viewBox={VIEW}
      width={size}
      height={size}
      className={className}
      aria-label="Sector compass diagram"
      role="img"
    >
      {/* Background circle */}
      <circle className={styles.disc} cx={CX} cy={CY} r={R_OUTER} opacity={0.3} />
      <circle className={styles.grid} cx={CX} cy={CY} r={R_OUTER} fill="none" strokeWidth={1} />

      {/* Grid rings */}
      {[0.33, 0.66].map((f) => (
        <circle
          key={f}
          className={styles.grid}
          cx={CX}
          cy={CY}
          r={R_OUTER * f}
          fill="none"
          strokeWidth={0.5}
          opacity={0.4}
        />
      ))}

      {/* Cardinal spokes */}
      {COMPASS_DIRS.map((_, i) => {
        const bearing = i * 45;
        const [x2, y2] = bearingToXY(bearing, R_OUTER);
        return (
          <line
            key={bearing}
            className={styles.grid}
            x1={CX}
            y1={CY}
            x2={x2}
            y2={y2}
            strokeWidth={0.5}
            opacity={0.5}
          />
        );
      })}

      {/* Layer 1 — Wind rose petals */}
      {windSectors?.wedges.map((w) => {
        const scale = w.reachMeters / 600;
        return (
          <WedgePath
            key={w.id}
            wedge={w}
            rOuter={R_OUTER * Math.max(0.15, scale)}
            rInner={8}
            opacity={0.5}
          />
        );
      })}

      {/* Layer 2 — Solar arcs (ring-band style) */}
      {solarSectors?.wedges.map((w) => (
        <WedgePath
          key={w.id}
          wedge={w}
          rOuter={R_OUTER}
          rInner={R_OUTER * 0.82}
          opacity={0.45}
        />
      ))}

      {/* Layer 3 — Manual sector arrows. Solar types hug the outer rim as a
          thin band (like the auto-computed solar arcs); all others stay
          interior wedges. */}
      {sectors.map((a) => {
        const w = arrowToWedge(a);
        return SOLAR_SECTOR_TYPES.has(a.type) ? (
          <WedgePath key={w.id} wedge={w} rOuter={R_OUTER} rInner={R_OUTER * 0.82} opacity={0.7} />
        ) : (
          <WedgePath key={w.id} wedge={w} rOuter={R_OUTER * 0.78} rInner={12} opacity={0.7} />
        );
      })}

      {/* Centre dot */}
      <circle className={styles.centre} cx={CX} cy={CY} r={5} />

      {/* North indicator — gold triangle just outside the outer ring,
          drawn last so it sits above wind/solar/manual wedges. Visible
          in both compact and full modes so the compass orientation is
          always legible. */}
      <polygon
        className={styles.north}
        points={`${CX},${CY - R_OUTER - 8} ${CX - 7},${CY - R_OUTER + 6} ${CX + 7},${CY - R_OUTER + 6}`}
        strokeWidth={0.75}
        strokeLinejoin="round"
      />
      {compact && (
        <text
          className={styles.northLabel}
          x={CX}
          y={CY - R_OUTER - 12}
          textAnchor="middle"
          dominantBaseline="alphabetic"
          fontSize={11}
          fontWeight={700}
          fontFamily="system-ui, sans-serif"
        >
          N
        </text>
      )}

      {/* Cardinal labels (hidden in compact mode) */}
      {!compact &&
        COMPASS_DIRS.map((label, i) => {
          const [lx, ly] = bearingToXY(i * 45, R_LABEL);
          return (
            <text
              key={label}
              className={styles.label}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fontFamily="system-ui, sans-serif"
            >
              {label}
            </text>
          );
        })}

      {/* Empty state overlay when no centroid and no manual sectors */}
      {!centroid && sectors.length === 0 && (
        <text
          className={styles.empty}
          x={CX}
          y={CY + 20}
          textAnchor="middle"
          fontSize={9}
          fontFamily="system-ui, sans-serif"
        >
          {compact ? '' : 'Add sectors from the toolbar'}
        </text>
      )}
    </svg>
  );
}
