/**
 * HostUnionContextMenu — small floating context menu opened by
 * right-click (desktop) or long-press (touch) on a host-canopy-union
 * polygon. Slice M of the B4 tooltip remaining-deferrals roadmap.
 *
 * One menu item for v1: "Open detail" — opens the
 * `HostUnionDrilldownCard` at the same anchor. The item is the only
 * affordance so the menu lifts the steward from a "right-click does
 * nothing" dead-end to a discoverable drill-down path.
 *
 * Lifecycle is parent-owned: PlanDataLayers maintains the
 * `contextMenu` state, mounts the portal while it is non-null, and
 * fires `onClose` when the steward dismisses (ESC, click-outside, or
 * after committing the "Open detail" action). The component itself
 * is strictly presentational + emits one event.
 *
 * The Slice K tooltip invariant (`pointer-events: none`) is preserved
 * because this surface is a sibling portal, NOT a tooltip
 * modification. The menu IS `pointer-events: auto` — its only
 * purpose is to capture the steward's click.
 */

import { useLayoutEffect, useState } from 'react';
import styles from './HostUnionContextMenu.module.css';
import { drilldownStrings } from './drilldownStrings.js';

export interface HostUnionContextMenuProps {
  /** Canvas-pixel anchor (the right-click / long-press point). */
  point: { x: number; y: number };
  /** Steward-visible host label, included for ARIA labelling only. */
  hostName: string;
  /** Fires when the steward picks "Open detail" — caller transitions
   *  to the drilldown card surface. */
  onOpenDetail: () => void;
  /** Fires when ESC pressed, click-outside, or after "Open detail"
   *  commits. Caller clears its `contextMenu` state. */
  onClose: () => void;
}

const ESTIMATED_W = 170;
const ESTIMATED_H = 40;
const CURSOR_GAP = 4;
const EDGE_PADDING = 8;

export function HostUnionContextMenu({
  point,
  hostName,
  onOpenDetail,
  onClose,
}: HostUnionContextMenuProps): React.JSX.Element {
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

  // Mount flip: enter-fade from opacity:0 → 1 on first paint.
  const [visible, setVisible] = useState(false);
  useLayoutEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div
      className={styles.menu}
      data-testid="host-union-context-menu"
      role="menu"
      aria-label={`${hostName} — context menu`}
      {...(visible ? { 'data-visible': 'true' } : {})}
      style={{ left, top }}
      // Stop the pointerdown from bubbling to the document-level
      // click-outside dismiss handler that PlanDataLayers installs.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={styles.item}
        role="menuitem"
        data-testid="host-union-context-menu-open-detail"
        onClick={() => {
          onOpenDetail();
          onClose();
        }}
      >
        {drilldownStrings.openDetail}
      </button>
    </div>
  );
}
