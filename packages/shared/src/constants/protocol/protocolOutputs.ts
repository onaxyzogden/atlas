// protocolOutputs.ts
//
// Pure derivation of the protocol token-substitution map from a Plan
// objective's steward-entered parameter values (§10.1 Integration). The
// resulting `Record<token, value>` is fed to the spine `renderConditionSegments`
// / ProtocolConfirmationFlow so a protocol condition like
// "IF pasture cover < [approved threshold] kg DM/ha" renders the entered value.
//
// NO FABRICATION: the output contains ONLY values the steward actually entered.
// A parameter left blank (or whitespace-only) is omitted, so its token renders
// its `[bracket]` placeholder verbatim downstream.

import type { ParameterGroup } from '../../schemas/plan/planStratumObjective.schema.js';

/**
 * Map each filled parameter item to `token -> trimmed value`. Items with no
 * value (undefined / empty / whitespace-only) are omitted. An undefined group
 * yields an empty map.
 */
export function buildProtocolOutputs(
  parameterGroup: ParameterGroup | undefined,
  valuesById: Readonly<Record<string, string>>,
): Record<string, string> {
  const outputs: Record<string, string> = {};
  if (!parameterGroup) return outputs;
  for (const item of parameterGroup.items) {
    const raw = valuesById[item.id];
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value) outputs[item.token] = value;
  }
  return outputs;
}
