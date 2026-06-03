/**
 * flowStatusModel - pure, render-free helpers over a MaterialFlow's Plan->Act
 * design-intent fields (operationalStatus / cadence / activeMonths). Extracted
 * (like flowCreditStatus.ts / geometryDiff.ts) so the defaulting + lookup logic
 * is unit-testable without rendering any UI, and so both the Plan flow-map / score
 * surfaces and the Act half share ONE source of truth for these resolutions.
 *
 * The store owns the enums + config maps (FLOW_OPERATIONAL_STATUS_CONFIG /
 * FLOW_CADENCE_CONFIG); this module only resolves/labels them. A flow with
 * operationalStatus === undefined is treated as "active" (legacy back-compat).
 */

import {
  FLOW_OPERATIONAL_STATUS_CONFIG,
  FLOW_CADENCE_CONFIG,
  type FlowOperationalStatus,
  type FlowCadence,
  type MaterialFlow,
} from '../../../store/closedLoopStore.js';

/** A flow's effective lifecycle status; undefined defaults to "active". */
export function resolveOperationalStatus(
  flow: Pick<MaterialFlow, 'operationalStatus'>,
): FlowOperationalStatus {
  return flow.operationalStatus ?? 'active';
}

/** SVG strokeDasharray for a status (undefined === solid line). */
export function dashForStatus(status: FlowOperationalStatus): string | undefined {
  return FLOW_OPERATIONAL_STATUS_CONFIG[status].dash;
}

/** Convenience: dash for a flow, defaulting status to "active". */
export function dashForFlow(
  flow: Pick<MaterialFlow, 'operationalStatus'>,
): string | undefined {
  return dashForStatus(resolveOperationalStatus(flow));
}

/** Display label for a cadence; undefined/null returns "Not set". */
export function cadenceLabel(cadence: FlowCadence | undefined | null): string {
  if (!cadence) return 'Not set';
  return FLOW_CADENCE_CONFIG[cadence].label;
}

/**
 * Whether a flow is active in the given month (1..12). A flow with no
 * activeMonths (undefined or empty) is treated as active all year.
 */
export function flowIsActiveInMonth(
  flow: Pick<MaterialFlow, 'activeMonths'>,
  month: number,
): boolean {
  const months = flow.activeMonths;
  if (!months || months.length === 0) return true;
  return months.includes(month);
}
