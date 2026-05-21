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
 * Fade machinery is CSS-transition-based (2026-05-30 refactor of the
 * 2026-05-29 keyframe ship). Transitions interpolate from the current
 * computed value, so reverse-in-flight is automatic: when `exiting`
 * flips from true back to false mid-fade, opacity transitions from
 * its current value back to 1 with no snap. The same machinery powers
 * per-block fades: each `HostBlock` carries its own `entry.phase` and
 * `data-exiting` — when one host drops out of the active set while
 * others remain, only that block fades.
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
import { useLayoutEffect, useRef, useState } from 'react';
import styles from './HostCanopyUnionTooltip.module.css';

export interface HostBlockProps {
  hostName: string;
  unionAreaM2: number;
  rawSumM2: number;
  guildCount: number;
  memberCount: number;
}

// Per-entry phase + hostId carried on each block in the multi-host
// stack. PlanDataLayers' `displayedUnion` mirror writes this — kept
// hosts get phase='entering', dropped hosts get phase='exiting' and
// stay in the array until their per-block transitionend fires
// `onEntryExited`.
export interface HostBlockEntry extends HostBlockProps {
  hostId: string;
  phase: 'entering' | 'exiting';
}

export interface HostCanopyUnionTooltipProps {
  point: { x: number; y: number };
  // All overlapping host unions currently in the displayed stack —
  // both newly-entered (phase='entering') and dropped-but-still-fading
  // (phase='exiting'). Topmost first.
  entries: HostBlockEntry[];
  // True when the tooltip is shown via click-to-pin (not hover).
  // Forwarded as `data-pinned` so CSS can swap the border accent.
  pinned?: boolean;
  // True while the container itself is playing its exit-fade (full
  // dismiss — activeUnion went null). PlanDataLayers holds the portal
  // mounted past activeUnion → null until onExited fires. When
  // `exiting` flips back to false mid-fade (re-enter), the CSS
  // transition naturally reverses from current opacity.
  exiting?: boolean;
  onExited?: () => void;
  // Fires when an individual host block (phase='exiting') finishes its
  // own opacity transition — PlanDataLayers removes that hostId from
  // the entries array.
  onEntryExited?: (hostId: string) => void;
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
  entry,
  onEntryExited,
}: {
  entry: HostBlockEntry;
  onEntryExited?: (hostId: string) => void;
}): React.JSX.Element {
  const { hostName, unionAreaM2, rawSumM2, guildCount, memberCount, phase, hostId } = entry;
  const savedOverlapM2 = Math.max(0, rawSumM2 - unionAreaM2);
  const exiting = phase === 'exiting';
  return (
    <div
      className={styles.hostBlock}
      data-testid={`host-block-${hostId}`}
      {...(exiting ? { 'data-exiting': 'true' } : {})}
      onTransitionEnd={(ev) => {
        // Only the block's own opacity transition fires onEntryExited.
        // Bubbled transitions from descendants (none today, but
        // future-proof) and transform-property fires are filtered out.
        if (
          exiting &&
          ev.target === ev.currentTarget &&
          ev.propertyName === 'opacity'
        ) {
          onEntryExited?.(hostId);
        }
      }}
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

export function HostCanopyUnionTooltip({
  point,
  entries,
  pinned,
  exiting,
  onExited,
  onEntryExited,
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

  // Mount flip: on first paint the container has opacity:0 (CSS base
  // value); useLayoutEffect flips `visible` to true on the next tick,
  // triggering the enter transition from opacity:0 → 1. Without this
  // two-step the element would mount already at the final state and
  // skip the enter fade.
  const [visible, setVisible] = useState(false);
  useLayoutEffect(() => {
    setVisible(true);
  }, []);

  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rootRef}
      className={styles.tooltip}
      data-testid="host-canopy-union-tooltip"
      data-anchor-x={anchorRight ? 'left' : 'right'}
      data-anchor-y={anchorBottom ? 'top' : 'bottom'}
      {...(visible && !exiting ? { 'data-visible': 'true' } : {})}
      {...(pinned ? { 'data-pinned': 'true' } : {})}
      {...(exiting ? { 'data-exiting': 'true' } : {})}
      onTransitionEnd={(ev) => {
        // Container-level transitionend on opacity fires onExited only
        // when we're actively exiting. currentTarget===target filters
        // out bubbled transitions from per-block fades (those have
        // their own onEntryExited).
        if (
          exiting &&
          ev.target === ev.currentTarget &&
          ev.propertyName === 'opacity'
        ) {
          onExited?.();
        }
      }}
      style={{ left, top }}
    >
      {entries.map((entry, i) => (
        <div key={entry.hostId}>
          {i > 0 && (
            <hr className={styles.separator} role="separator" />
          )}
          <HostBlock entry={entry} onEntryExited={onEntryExited} />
        </div>
      ))}
    </div>
  );
}
