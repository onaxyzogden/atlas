/**
 * HostCanopyUnionTooltip — cursor-anchored, read-only floating tooltip
 * shown while the steward hovers the `guild-host-canopy-union-fill`
 * map layer (minzoom 17). Surfaces the same three m² numbers the
 * `SilvopastureIntegrationCard` measures geometrically: union
 * footprint, raw π·r² sum, and saved overlap (rawSumM2 - unionAreaM2).
 *
 * The component is positioned absolutely relative to the map canvas's
 * wrapping container; `point` is the MapLibre canvas-pixel anchor
 * (the cursor). When the cursor approaches the right/bottom edge of
 * the viewport, the anchor flips so the tooltip stays on-screen.
 *
 * `pointer-events: none` is non-negotiable — if the tooltip captured
 * the cursor, it would steal the underlying layer's mouseleave event
 * and the tooltip could never close.
 */
import styles from './HostCanopyUnionTooltip.module.css';

export interface HostCanopyUnionTooltipProps {
  point: { x: number; y: number };
  hostName: string;
  unionAreaM2: number;
  rawSumM2: number;
  guildCount: number;
  memberCount: number;
}

// Approximate dimensions used only for the edge-clamp decision —
// exact pixel-perfection is not required; under-shooting just means
// the flip happens a few pixels later, which is harmless.
const ESTIMATED_W = 240;
const ESTIMATED_H = 120;
const CURSOR_GAP = 12;
const EDGE_PADDING = 8;

function formatM2(n: number): string {
  return `${Math.round(n)} m²`;
}

export function HostCanopyUnionTooltip({
  point,
  hostName,
  unionAreaM2,
  rawSumM2,
  guildCount,
  memberCount,
}: HostCanopyUnionTooltipProps): React.JSX.Element {
  const viewportW =
    typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportH =
    typeof window === 'undefined' ? 768 : window.innerHeight;

  const anchorRight =
    point.x + ESTIMATED_W + CURSOR_GAP > viewportW - EDGE_PADDING;
  const anchorBottom =
    point.y + ESTIMATED_H + CURSOR_GAP > viewportH - EDGE_PADDING;

  const left = anchorRight
    ? Math.max(EDGE_PADDING, point.x - ESTIMATED_W - CURSOR_GAP)
    : point.x + CURSOR_GAP;
  const top = anchorBottom
    ? Math.max(EDGE_PADDING, point.y - ESTIMATED_H - CURSOR_GAP)
    : point.y + CURSOR_GAP;

  const savedOverlapM2 = Math.max(0, rawSumM2 - unionAreaM2);

  return (
    <div
      className={styles.tooltip}
      data-testid="host-canopy-union-tooltip"
      data-anchor-x={anchorRight ? 'left' : 'right'}
      data-anchor-y={anchorBottom ? 'top' : 'bottom'}
      style={{ left, top }}
    >
      <div className={styles.hostName}>{hostName}</div>
      <div className={styles.counts}>
        {guildCount} {guildCount === 1 ? 'guild' : 'guilds'} ·{' '}
        {memberCount} canopy-bearing{' '}
        {memberCount === 1 ? 'member' : 'members'}
      </div>
      <div className={styles.rows}>
        <div className={styles.label}>Union footprint</div>
        <div className={styles.value}>{formatM2(unionAreaM2)}</div>
        <div className={styles.label}>Raw π·r² sum</div>
        <div className={styles.value}>{formatM2(rawSumM2)}</div>
        <div className={`${styles.label} ${styles.saved}`}>
          Saved overlap
        </div>
        <div className={`${styles.value} ${styles.saved}`}>
          {formatM2(savedOverlapM2)}
        </div>
      </div>
    </div>
  );
}
