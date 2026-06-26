/**
 * calloutPosition -- pure placement math. Verifies the centred fallback (null
 * target / explicit 'center'), each directional placement, and that the result
 * is always clamped fully inside the viewport with the safety margin.
 */

import { describe, it, expect } from 'vitest';
import { computeCalloutPosition, type Rect, type Size } from '../calloutPosition.js';

const VIEWPORT: Size = { width: 1000, height: 800 };
const CALLOUT: Size = { width: 320, height: 200 };
const MARGIN = 12; // mirrors the module constant

// A comfortably central target so directional placements are not clamped.
const CENTER_TARGET: Rect = { top: 350, left: 400, width: 200, height: 100 };

describe('computeCalloutPosition centred fallback', () => {
  it('centres when the target is null', () => {
    const pos = computeCalloutPosition(null, 'bottom', VIEWPORT, CALLOUT);
    expect(pos.left).toBeCloseTo((VIEWPORT.width - CALLOUT.width) / 2);
    expect(pos.top).toBeCloseTo((VIEWPORT.height - CALLOUT.height) / 2);
  });

  it('centres on explicit "center" placement even with a target', () => {
    const pos = computeCalloutPosition(CENTER_TARGET, 'center', VIEWPORT, CALLOUT);
    expect(pos.left).toBeCloseTo((VIEWPORT.width - CALLOUT.width) / 2);
    expect(pos.top).toBeCloseTo((VIEWPORT.height - CALLOUT.height) / 2);
  });
});

describe('computeCalloutPosition directional placement', () => {
  it('places below the target for "bottom"', () => {
    const pos = computeCalloutPosition(CENTER_TARGET, 'bottom', VIEWPORT, CALLOUT);
    expect(pos.top).toBeGreaterThan(CENTER_TARGET.top + CENTER_TARGET.height);
    // Horizontally centred on the target.
    expect(pos.left).toBeCloseTo(
      CENTER_TARGET.left + CENTER_TARGET.width / 2 - CALLOUT.width / 2,
    );
  });

  it('places above the target for "top"', () => {
    const pos = computeCalloutPosition(CENTER_TARGET, 'top', VIEWPORT, CALLOUT);
    expect(pos.top).toBeLessThan(CENTER_TARGET.top);
  });

  it('places to the right for "right"', () => {
    const pos = computeCalloutPosition(CENTER_TARGET, 'right', VIEWPORT, CALLOUT);
    expect(pos.left).toBeGreaterThan(CENTER_TARGET.left + CENTER_TARGET.width);
  });

  it('places to the left for "left"', () => {
    const pos = computeCalloutPosition(CENTER_TARGET, 'left', VIEWPORT, CALLOUT);
    expect(pos.left).toBeLessThan(CENTER_TARGET.left);
  });
});

describe('computeCalloutPosition viewport clamping', () => {
  it('never escapes the right/bottom edges', () => {
    // Target hard against the bottom-right corner.
    const corner: Rect = { top: 760, left: 960, width: 40, height: 40 };
    const pos = computeCalloutPosition(corner, 'right', VIEWPORT, CALLOUT);
    expect(pos.left).toBeLessThanOrEqual(VIEWPORT.width - CALLOUT.width - MARGIN);
    expect(pos.top).toBeLessThanOrEqual(VIEWPORT.height - CALLOUT.height - MARGIN);
  });

  it('never escapes the top/left edges', () => {
    const corner: Rect = { top: 0, left: 0, width: 40, height: 40 };
    const pos = computeCalloutPosition(corner, 'left', VIEWPORT, CALLOUT);
    expect(pos.left).toBeGreaterThanOrEqual(MARGIN);
    expect(pos.top).toBeGreaterThanOrEqual(MARGIN);
  });

  it('pins to the margin when the callout is larger than the viewport', () => {
    const tiny: Size = { width: 200, height: 150 };
    const big: Size = { width: 400, height: 300 };
    const pos = computeCalloutPosition(CENTER_TARGET, 'bottom', tiny, big);
    expect(pos.left).toBe(MARGIN);
    expect(pos.top).toBe(MARGIN);
  });
});
