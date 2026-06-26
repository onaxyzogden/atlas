/**
 * calloutPosition -- pure geometry for placing the tour callout relative to the
 * spotlighted target. No DOM, no React: takes rects in, returns a {top,left} in
 * px. Kept separate from TourCallout so the placement math is unit-testable in
 * isolation (calloutPosition.test.ts).
 *
 * Contract:
 *  - target === null  -> centre the callout in the viewport (the degraded
 *    "could not resolve the anchor" path; see waitForTarget timeout).
 *  - otherwise place the callout on the requested side of the target, then
 *    clamp fully inside the viewport with a small margin so it is never cut off
 *    on small screens.
 */

import type { StepPlacement } from './onboardingSteps.js';

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CalloutPosition {
  top: number;
  left: number;
}

/** Gap between the target edge and the callout, and the viewport safety margin. */
const GAP = 14;
const MARGIN = 12;

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min; // viewport smaller than callout -> pin to margin
  return Math.min(Math.max(value, min), max);
}

export function computeCalloutPosition(
  target: Rect | null,
  placement: StepPlacement,
  viewport: Size,
  callout: Size,
): CalloutPosition {
  // No anchor (or explicit centre) -> dead-centre the card.
  if (target === null || placement === 'center') {
    return {
      top: Math.max(MARGIN, (viewport.height - callout.height) / 2),
      left: Math.max(MARGIN, (viewport.width - callout.width) / 2),
    };
  }

  let top: number;
  let left: number;

  switch (placement) {
    case 'top':
      top = target.top - callout.height - GAP;
      left = target.left + target.width / 2 - callout.width / 2;
      break;
    case 'bottom':
      top = target.top + target.height + GAP;
      left = target.left + target.width / 2 - callout.width / 2;
      break;
    case 'left':
      top = target.top + target.height / 2 - callout.height / 2;
      left = target.left - callout.width - GAP;
      break;
    case 'right':
    default:
      top = target.top + target.height / 2 - callout.height / 2;
      left = target.left + target.width + GAP;
      break;
  }

  // Clamp fully inside the viewport so the card is never clipped.
  top = clamp(top, MARGIN, viewport.height - callout.height - MARGIN);
  left = clamp(left, MARGIN, viewport.width - callout.width - MARGIN);

  return { top, left };
}
