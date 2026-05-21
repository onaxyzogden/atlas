// apps/web/src/lib/evidence/selectors/threeEthics.ts
//
// Phase E.2 — ThreeEthicsRollupCard evidence selector.
//
// Surfaces the per-ethic linked-feature roster, the met/partial/unmet
// distribution, and per-principle rationale references so the viewer
// can audit which design features and assessments the rollup is
// counting against each of the three permaculture ethics.

import type { EvidenceItem, EvidenceFragment } from '../types.js';

export type EthicKey = 'earth-care' | 'people-care' | 'fair-share';
export type EthicStatus = 'met' | 'partial' | 'unmet' | 'unknown';

export interface ThreeEthicsEvidenceInputs {
  /** Status per ethic, derived from the principle-check store. */
  perEthicStatus: Record<EthicKey, EthicStatus>;
  /** Count of design features linked per ethic (visible phase). */
  perEthicFeatureCount: Record<EthicKey, number>;
  /** Optional rationale snippet per ethic (≤ 80 chars each). */
  perEthicRationale?: Partial<Record<EthicKey, string>>;
  /** Total principle-check rows evaluated. */
  principleCheckCount: number;
}

const ETHIC_LABELS: Record<EthicKey, string> = {
  'earth-care': 'Earth Care',
  'people-care': 'People Care',
  'fair-share': 'Fair Share',
};

export function selectThreeEthicsEvidence(
  inputs: ThreeEthicsEvidenceInputs,
): EvidenceItem {
  const { perEthicStatus, perEthicFeatureCount, perEthicRationale, principleCheckCount } =
    inputs;

  const ethics: EthicKey[] = ['earth-care', 'people-care', 'fair-share'];
  const evidence: EvidenceFragment[] = [];

  for (const ethic of ethics) {
    evidence.push({
      label: ETHIC_LABELS[ethic],
      value: `${perEthicStatus[ethic]} — ${perEthicFeatureCount[ethic]} feature${
        perEthicFeatureCount[ethic] === 1 ? '' : 's'
      }`,
      source: {
        kind: 'computed',
        derivation: 'principleCheckStore + linkedFeatures',
        confidence:
          perEthicStatus[ethic] === 'met'
            ? 'high'
            : perEthicStatus[ethic] === 'partial'
              ? 'medium'
              : 'low',
      },
      methodologyHint: perEthicRationale?.[ethic],
    });
  }

  evidence.push({
    label: 'Principle checks evaluated',
    value: principleCheckCount,
    source: {
      kind: 'computed',
      derivation: 'principleCheckStore.rows.length',
      confidence: 'high',
    },
    methodologyHint: 'Total checklist rows scored across all three ethics.',
  });

  // Compute aggregate status for the summary.
  const counts = { met: 0, partial: 0, unmet: 0, unknown: 0 };
  for (const ethic of ethics) {
    counts[perEthicStatus[ethic]] += 1;
  }
  const summaryValue =
    counts.met === 3
      ? 'All three met'
      : counts.met + counts.partial === 3
        ? 'Partially met'
        : counts.unmet > 0
          ? `${counts.unmet} unmet`
          : 'In progress';

  return {
    panelKey: 'three-ethics',
    summary: { label: 'Three Ethics', value: summaryValue },
    evidence,
  };
}
