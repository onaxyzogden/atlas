/**
 * GuildRingsCanvas drag-math — pure-helper tests for the
 * SVG↔metric conversion and the click-vs-drag threshold.
 *
 * The SVG render and pointer-event wiring stay visually
 * verified; this file pins the math the drag handlers depend
 * on so a future refactor of `PX_PER_METRE` or the y-flip
 * surfaces as a test failure rather than a silent UI drift.
 */

import { describe, expect, it } from 'vitest';
import {
  DRAG_THRESHOLD_PX,
  PX_PER_METRE,
  isDrag,
  metresToSvg,
  svgToMetres,
} from '../GuildRingsCanvas.js';

const CX = 270;
const CY = 270;

describe('svgToMetres / metresToSvg', () => {
  it('maps the SVG centre to [0, 0] metres', () => {
    expect(svgToMetres(CX, CY)).toEqual([0, 0]);
  });

  it('one PX_PER_METRE step east + one step north (SVG y up) = [1, 1] m', () => {
    expect(svgToMetres(CX + PX_PER_METRE, CY - PX_PER_METRE)).toEqual([1, 1]);
  });

  it('flips y: SVG y growing down → metric north growing up', () => {
    const [, north] = svgToMetres(CX, CY - PX_PER_METRE * 3);
    expect(north).toBeCloseTo(3, 10);
  });

  it('metresToSvg is the inverse of svgToMetres', () => {
    const samples: Array<[number, number]> = [
      [0, 0],
      [1, 1],
      [-2.5, 3.75],
      [10, -10],
      [0.001, -0.001],
    ];
    for (const [east, north] of samples) {
      const [x, y] = metresToSvg(east, north);
      const [e2, n2] = svgToMetres(x, y);
      expect(e2).toBeCloseTo(east, 10);
      expect(n2).toBeCloseTo(north, 10);
    }
  });

  it('round-trips SVG-space pixel coordinates through metres', () => {
    const samples: Array<[number, number]> = [
      [CX, CY],
      [CX + 54, CY - 36],
      [CX - 100, CY + 200],
    ];
    for (const [x, y] of samples) {
      const [east, north] = svgToMetres(x, y);
      const [x2, y2] = metresToSvg(east, north);
      expect(x2).toBeCloseTo(x, 10);
      expect(y2).toBeCloseTo(y, 10);
    }
  });
});

describe('isDrag (click-vs-drag threshold)', () => {
  it('returns false at the origin (no movement)', () => {
    expect(isDrag(0, 0)).toBe(false);
  });

  it('returns false at exactly the threshold (≤ is click)', () => {
    expect(isDrag(DRAG_THRESHOLD_PX, 0)).toBe(false);
  });

  it('returns true just past the threshold (any axis)', () => {
    expect(isDrag(DRAG_THRESHOLD_PX + 0.001, 0)).toBe(true);
    expect(isDrag(0, DRAG_THRESHOLD_PX + 0.001)).toBe(true);
  });

  it('uses euclidean distance, not max-axis', () => {
    // 3-4-5 triangle: hypot = 5, beats the 4 px threshold.
    expect(isDrag(3, 4)).toBe(true);
    // 2-2: hypot ≈ 2.83, below threshold.
    expect(isDrag(2, 2)).toBe(false);
  });
});
