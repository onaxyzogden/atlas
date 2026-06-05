/**
 * flowCreditStatus - pure helper that turns the ActFlowConnectorPopover's current
 * From/To endpoint selections into a live "closed-loop credit" status, so the
 * popover can surface, at author time, whether the flow being recorded will count
 * toward the Act rail's "M closed-loop" tally (which requires BOTH endpoints pinned
 * to structured features, i.e. `sourceId && sinkId` non-null in closedLoopStore).
 *
 * Extracted (like `geometryDiff.ts` / `applyAsBuiltDiff.ts`) so the three-state
 * branch logic is unit-testable without rendering the Modal.
 *
 * States:
 *   - "earned"      : both endpoints are structured features -> closed-loop credit.
 *   - "no-features" : not both structured AND the project has no mapped features at
 *                     all, so pinning is impossible (only free text is available);
 *                     nagging the steward to "pin both" would be misleading.
 *   - "prompt"      : not both structured BUT mapped features DO exist, so the
 *                     steward can still pin endpoints to earn credit.
 *
 * Guidance only - this never blocks Save. Free-text flows are deliberately allowed;
 * they count toward "Material flows: N" but not "M closed-loop".
 */

export type FlowCreditState = 'earned' | 'prompt' | 'no-features';

export function flowCreditState(args: {
  /** From endpoint pinned to a real feature id (not "" and not the free-text sentinel). */
  sourceStructured: boolean;
  /** To endpoint pinned to a real feature id. */
  sinkStructured: boolean;
  /** useFlowEndpointOptions(...).length > 0 - whether any mapped feature exists to pin to. */
  hasFeatureOptions: boolean;
}): FlowCreditState {
  if (args.sourceStructured && args.sinkStructured) return 'earned';
  if (!args.hasFeatureOptions) return 'no-features';
  return 'prompt';
}

/** Steward-facing copy per state (ASCII; apostrophes avoided / double-quoted). */
export const FLOW_CREDIT_COPY: Record<FlowCreditState, string> = {
  earned: 'Closed-loop credit: both endpoints are mapped features.',
  prompt:
    'Pin BOTH endpoints to mapped features to earn closed-loop credit. Free-text endpoints still count toward the material-flow total.',
  'no-features':
    'No mapped features in this project yet. Draw zones, water systems, or crops in Plan to earn closed-loop credit; this flow still counts toward the material-flow total.',
};
