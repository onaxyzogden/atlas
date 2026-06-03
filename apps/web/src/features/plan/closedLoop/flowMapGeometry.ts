/**
 * flowMapGeometry - pure, render-free geometry helpers for the closed-loop flow
 * maps (ClosedLoopGraphCard spatial graph + WasteVectorDashboardView lane map).
 * Extracted (like flowStatusModel.ts / loopIntegrity.ts) so the width-by-volume
 * ramp + the source -> via... -> sink polyline assembly are unit-testable without
 * rendering any SVG, and so both surfaces share ONE source of truth.
 *
 * "Volume" here is a single comparable throughput scalar per flow (flowMagnitude):
 * the largest positive finite of mass / volume / energy. Cross-unit comparison is
 * inherently approximate, but for a relative edge-width ramp ON ONE MAP it is the
 * cheapest honest signal of "this flow moves more material than that one".
 */

import { dashForStatus, dashForFlow } from './flowStatusModel.js';
import type { MaterialFlow } from '../../../store/closedLoopStore.js';

export { dashForStatus, dashForFlow };

/** A projected point in SVG viewport coordinates. */
export interface FlowPoint {
  x: number;
  y: number;
}

/** Default clamped edge-width ramp endpoints (SVG strokeWidth units). */
export const MIN_EDGE_WIDTH = 1.4;
export const MAX_EDGE_WIDTH = 6;

/**
 * A single comparable throughput scalar for a flow: the largest positive finite
 * of mass / volume / energy per month. Returns 0 when the flow carries no
 * throughput data (so it ramps to the minimum width). Nutrient sub-totals are
 * excluded (they are not a transport magnitude).
 */
export function flowMagnitude(
  flow: Pick<
    MaterialFlow,
    'massKgPerMonth' | 'volumeLPerMonth' | 'energyKwhPerMonth'
  >,
): number {
  const candidates = [
    flow.massKgPerMonth,
    flow.volumeLPerMonth,
    flow.energyKwhPerMonth,
  ];
  let max = 0;
  for (const n of candidates) {
    if (typeof n === 'number' && Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

/**
 * Clamped linear ramp from min..max width by `volume` relative to `maxVolume`.
 * Degenerate inputs (non-finite, volume <= 0, or maxVolume <= 0) return `min`,
 * so a flow with no throughput renders as the thinnest line rather than vanishing.
 */
export function edgeWidth(
  volume: number,
  maxVolume: number,
  opts?: { min?: number; max?: number },
): number {
  const min = opts?.min ?? MIN_EDGE_WIDTH;
  const max = opts?.max ?? MAX_EDGE_WIDTH;
  if (
    !Number.isFinite(volume) ||
    volume <= 0 ||
    !Number.isFinite(maxVolume) ||
    maxVolume <= 0
  ) {
    return min;
  }
  const t = Math.min(volume / maxVolume, 1);
  return min + t * (max - min);
}

/**
 * Ordered polyline points for a flow: source -> via... -> sink. Via entries
 * without a known centroid (null/undefined) are skipped so the line degrades to
 * a straight source->sink segment (matching the card's existing fallback). A
 * null/undefined source or sink is omitted too; the caller should only render
 * when the result has >= 2 points.
 */
export function flowPolylinePoints(
  source: FlowPoint | null | undefined,
  via: ReadonlyArray<FlowPoint | null | undefined>,
  sink: FlowPoint | null | undefined,
): FlowPoint[] {
  const pts: FlowPoint[] = [];
  if (source) pts.push(source);
  for (const v of via) {
    if (v) pts.push(v);
  }
  if (sink) pts.push(sink);
  return pts;
}

/** SVG `points` attribute string ("x1,y1 x2,y2 ...") for a polyline/polygon. */
export function polylinePointsAttr(pts: ReadonlyArray<FlowPoint>): string {
  return pts.map((p) => `${p.x},${p.y}`).join(' ');
}
