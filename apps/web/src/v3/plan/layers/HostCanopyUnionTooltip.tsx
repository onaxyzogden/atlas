/**
 * HostCanopyUnionTooltip — cursor-anchored, read-only floating tooltip
 * shown while the steward hovers (or has pinned) the
 * `guild-host-canopy-union-fill` map layer (minzoom 17). Surfaces the
 * same three m² numbers the `SilvopastureIntegrationCard` measures
 * geometrically: union footprint, raw π·r² sum, and saved overlap
 * (rawSumM2 - unionAreaM2).
 *
 * Multi-feature fan-out: when the cursor sits over two or more
 * overlapping host unions, every host gets its own `HostBlock` stacked
 * vertically in the same tooltip with a hairline separator between
 * blocks. The single-tooltip / single-pin / `pointer-events: none`
 * invariants from the 2026-05-25 and 2026-05-26 slices are preserved.
 *
 * The component is positioned absolutely relative to the map canvas's
 * wrapping container; `point` is the MapLibre canvas-pixel anchor (the
 * cursor). When the cursor approaches the right/bottom edge of the
 * viewport, the anchor flips so the tooltip stays on-screen — the
 * bottom-edge flip accounts for `entries.length` so a 3-block tooltip
 * doesn't overflow.
 *
 * `pointer-events: none` is non-negotiable — if the tooltip captured
 * the cursor, it would steal the underlying layer's mouseleave event
 * and the tooltip could never close.
 */
import styles from './HostCanopyUnionTooltip.module.css';

export interface HostBlockProps {
  hostName: string;
  unionAreaM2: number;
  rawSumM2: number;
  guildCount: number;
  memberCount: number;
}

export interface HostCanopyUnionTooltipProps {
  point: { x: number; y: number };
  // All overlapping host unions at the cursor / pinned point. Topmost
  // first (MapLibre's `e.features` render order). Single-host stacks
  // (length 1) render identically to the 2026-05-26 ship — no
  // separator. The hover/pin handler dedups by hostId before writing.
  entries: HostBlockProps[];
  // True when the tooltip is shown via click-to-pin (not hover).
  // Forwarded as `data-pinned` so CSS can swap the border accent.
  pinned?: boolean;
}

// Approximate dimensions used only for the edge-clamp decision —
// exact pixel-perfection is not required; under-shooting just means
// the flip happens a few pixels later, which is harmless.
const BASE_H = 16;
const PER_BLOCK_H = 108;
const ESTIMATED_W = 240;
const CURSOR_GAP = 12;
const EDGE_PADDING = 8;

function formatM2(n: number): string {
  return `${Math.round(n)} m²`;
}

function HostBlock({
  hostName,
  unionAreaM2,
  rawSumM2,
  guildCount,
  memberCount,
}: HostBlockProps): React.JSX.Element {
  const savedOverlapM2 = Math.max(0, rawSumM2 - unionAreaM2);
  return (
    <div>
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

export function HostCanopyUnionTooltip({
  point,
  entries,
  pinned,
}: HostCanopyUnionTooltipProps): React.JSX.Element {
  const viewportW =
    typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportH =
    typeof window === 'undefined' ? 768 : window.innerHeight;

  const estimatedH = BASE_H + entries.length * PER_BLOCK_H;

  const anchorRight =
    point.x + ESTIMATED_W + CURSOR_GAP > viewportW - EDGE_PADDING;
  const anchorBottom =
    point.y + estimatedH + CURSOR_GAP > viewportH - EDGE_PADDING;

  const left = anchorRight
    ? Math.max(EDGE_PADDING, point.x - ESTIMATED_W - CURSOR_GAP)
    : point.x + CURSOR_GAP;
  const top = anchorBottom
    ? Math.max(EDGE_PADDING, point.y - estimatedH - CURSOR_GAP)
    : point.y + CURSOR_GAP;

  return (
    <div
      className={styles.tooltip}
      data-testid="host-canopy-union-tooltip"
      data-anchor-x={anchorRight ? 'left' : 'right'}
      data-anchor-y={anchorBottom ? 'top' : 'bottom'}
      {...(pinned ? { 'data-pinned': 'true' } : {})}
      style={{ left, top }}
    >
      {entries.map((entry, i) => (
        <div key={i}>
          {i > 0 && (
            <hr className={styles.separator} role="separator" />
          )}
          <HostBlock {...entry} />
        </div>
      ))}
    </div>
  );
}
