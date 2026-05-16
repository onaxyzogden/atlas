/**
 * floaterStackRoot — singleton bottom-center container that the selection
 * floaters portal into. Both `SelectionFloater` (Observe) and
 * `PlanSelectionFloater` (Plan) render their pill here instead of positioning
 * themselves, so when more than one is visible at once they stack vertically
 * inside one shared flex column rather than colliding at identical
 * `position: absolute` coordinates.
 *
 * Lives on `document.body` so it works across every layout (Plan / Observe /
 * Act / Vision) with no per-layout mounting. Because it is viewport-fixed but
 * the stage's bottom module bar occupies the bottom strip of the viewport,
 * the stack offsets itself to sit just above that bar (StageShell tags it
 * with `data-stage-bottom`). When no bottom tray is present (e.g. Vision)
 * it falls back to the CSS `bottom: 16px`.
 */

import css from './SelectionFloater.module.css';

let node: HTMLDivElement | null = null;

/** Gap (px) between the floater stack and the bottom module bar. */
const STACK_GAP = 8;

/** Re-anchor the stack just above the stage's bottom tray, if one exists. */
function syncStackBottom(): void {
  if (!node) return;
  const tray = document.querySelector<HTMLElement>('[data-stage-bottom]');
  const rect = tray?.getBoundingClientRect();
  if (rect && rect.height > 0) {
    node.style.bottom = `${Math.round(
      window.innerHeight - rect.top + STACK_GAP,
    )}px`;
  } else {
    // No bottom tray on this stage — defer to the CSS default (16px).
    node.style.bottom = '';
  }
}

export function getFloaterStackRoot(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  if (node && node.isConnected) {
    // Selection just changed / a floater re-rendered — the active stage (and
    // thus the bottom-bar height) may differ from last time.
    syncStackBottom();
    return node;
  }
  node = document.createElement('div');
  node.className = css.stack ?? '';
  node.setAttribute('data-floater-stack', '');
  document.body.appendChild(node);
  window.addEventListener('resize', syncStackBottom);
  syncStackBottom();
  return node;
}
