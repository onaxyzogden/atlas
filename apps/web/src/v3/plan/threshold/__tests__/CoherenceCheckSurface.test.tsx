/**
 * @vitest-environment happy-dom
 *
 * CoherenceCheckSurface -- the center-canvas takeover PlanTierShell mounts on the
 * `plan/threshold/$thresholdId` route when `thresholdId === 'threshold-2'`, in
 * place of the editable map. These tests pin the Stage-4 gate behaviour the
 * (WebGL-heavy, hard-to-mount) PlanTierShell route test cannot own:
 *   1. NO map / WebGL ever mounts on the threshold surface;
 *   2. all three audit sections render (A System Integration, B Closed Loops,
 *      C Monitoring Coverage);
 *   3. the designed B3 residential gap surfaces inline with an amendment field;
 *      submitting it records a steward amendment and flips the item to RESOLVED,
 *      recomputing the verdict to PASS;
 *   4. the seal affordance is disabled until the verdict is PASS;
 *   5. Amanah -- an advance-sale / CSA-like draft raises the advisory AND keeps
 *      submit disabled (nothing is recorded).
 *
 * Fixtures mirror the reference config (RegenFarm + Residential + Silvopasture):
 * 8 s4 + 7 s5 design objectives, each carrying a complete monitoring protocol.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, act, fireEvent, within } from '@testing-library/react';

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
});

import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import { useCoherenceCheckStore } from '../../../../store/coherenceCheckStore.js';
import {
  COHERENCE_COPY,
  deriveCoherenceProgress,
} from '../coherenceCheckModel.js';
import CoherenceCheckSurface from '../CoherenceCheckSurface.js';

const PID = 'project-coherence-1';

const COMPLETE_PROTOCOL = {
  indicators: [
    { metric: 'Indicator one', frequency: 'per season' },
    { metric: 'Indicator two', frequency: 'monthly' },
  ],
  triggers: ['If storage falls below 60% at season start -> review catchment'],
  feeds: 'hydrology',
} as const;

const obj = (id: string, stratumId: string): PlanStratumObjective =>
  ({
    id,
    stratumId,
    title: id,
    monitoringProtocol: COMPLETE_PROTOCOL,
  }) as unknown as PlanStratumObjective;

const S4_IDS = [
  's4-water-strategy',
  's4-zones',
  'rf-s4-fertility-strategy',
  'rf-s4-biodiversity-strategy',
  'res-s4-living-zone',
  'silv-sec-s4-grazing-design',
  'silv-sec-s4-stock-infrastructure',
  'silv-sec-s4-husbandry-framework',
];
const S5_IDS = [
  's5-access',
  's5-water-infrastructure',
  's5-soil-improvement',
  'rf-s5-fertility-system',
  'rf-s5-windbreaks',
  'res-s5-living-infrastructure',
  'silv-sec-s5-tree-establishment',
];

const referenceDesign: PlanStratumObjective[] = [
  ...S4_IDS.map((id) => obj(id, 's4-foundation-decisions')),
  ...S5_IDS.map((id) => obj(id, 's5-system-design')),
];

const allComplete: Record<string, 'complete'> = Object.fromEntries(
  referenceDesign.map((o) => [o.id, 'complete'] as const),
);

function renderSurface(
  statuses: Record<string, PlanStratumObjectiveStatus> = allComplete,
) {
  return render(
    <CoherenceCheckSurface
      projectId={PID}
      projectName="Hillside Farm"
      primaryTypeId="regenerative_farm"
      objectives={referenceDesign}
      objectiveStatuses={statuses}
      coherenceProgress={deriveCoherenceProgress(referenceDesign, statuses)}
    />,
  );
}

beforeEach(() => {
  useCoherenceCheckStore.setState({ byProject: {} });
});

describe('CoherenceCheckSurface', () => {
  it('renders the mauve Threshold-2 mode header', () => {
    renderSurface();
    expect(screen.getByText(COHERENCE_COPY.modeLabel)).toBeTruthy();
    expect(screen.getByText(COHERENCE_COPY.title)).toBeTruthy();
  });

  it('shows the honest readiness banner (with tally) when Tier 3/4 design is unfinished', () => {
    // 3 of the 15 design objectives are not yet complete -> threshold is still
    // reachable (op decision) but the surface must NOT claim the design is done.
    const mostlyComplete: Record<string, PlanStratumObjectiveStatus> = {
      ...allComplete,
      's4-water-strategy': 'active',
      's5-access': 'locked',
      'silv-sec-s5-tree-establishment': 'locked',
    };
    renderSurface(mostlyComplete);
    const banner = screen.getByTestId('coherence-readiness');
    expect(
      within(banner).getByText(COHERENCE_COPY.readiness.incompleteTitle),
    ).toBeTruthy();
    // Honest 12/15 tally -- not a "completed across Tiers 3 and 4" assertion.
    expect(banner.textContent).toContain(
      `12/15 ${COHERENCE_COPY.readiness.tallyLabel}`,
    );
  });

  it('hides the readiness banner once all Tier 3/4 design objectives are complete', () => {
    renderSurface(); // allComplete -> coherenceOpen
    expect(screen.queryByTestId('coherence-readiness')).toBeNull();
  });

  it('mounts NO map / canvas / WebGL on the threshold surface', () => {
    const { container } = renderSurface();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('.maplibregl-map')).toBeNull();
  });

  it('renders all three audit sections', () => {
    renderSurface();
    expect(screen.getByLabelText(/Section A --/)).toBeTruthy();
    expect(screen.getByLabelText(/Section B --/)).toBeTruthy();
    expect(screen.getByLabelText(/Section C --/)).toBeTruthy();
  });

  it('surfaces the designed B3 residential gap as the only open item, with an amendment field', () => {
    renderSurface();
    const surface = screen.getByTestId('coherence-check-surface');
    expect(surface.getAttribute('data-verdict')).toBe('forming');
    // Exactly one open amendment field (B3) in the reference config.
    const fields = screen.getAllByLabelText(COHERENCE_COPY.gap.amendmentLabel);
    expect(fields).toHaveLength(1);
  });

  it('disables the seal affordance until the verdict is PASS', () => {
    renderSurface();
    const sealBtn = screen.getByRole('button', {
      name: COHERENCE_COPY.seal.sealLabel,
    });
    expect((sealBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('records an amendment that flips B3 to RESOLVED and the verdict to PASS', () => {
    renderSurface();
    const field = screen.getByLabelText(
      COHERENCE_COPY.gap.amendmentLabel,
    ) as HTMLTextAreaElement;

    act(() => {
      fireEvent.change(field, {
        target: {
          value:
            'Household three-bay compost added, routed to the kitchen garden.',
        },
      });
    });

    const submitBtn = screen.getByRole('button', {
      name: COHERENCE_COPY.gap.submitLabel,
    });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);

    act(() => {
      fireEvent.click(submitBtn);
    });

    // The store recorded a permanent amendment...
    const record = useCoherenceCheckStore.getState().byProject[PID];
    expect(record?.amendments).toHaveLength(1);
    expect(record?.amendments[0]?.itemId).toBe('B3');

    // ...and the surface recomputed: verdict PASS, seal now enabled.
    const surface = screen.getByTestId('coherence-check-surface');
    expect(surface.getAttribute('data-verdict')).toBe('pass');
    expect(screen.getByText(COHERENCE_COPY.gap.resolvedLabel)).toBeTruthy();
    const sealBtn = screen.getByRole('button', {
      name: COHERENCE_COPY.seal.sealLabel,
    });
    expect((sealBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('Amanah: an advance-sale / CSA-like draft raises the advisory and keeps submit disabled', () => {
    renderSurface();
    const field = screen.getByLabelText(
      COHERENCE_COPY.gap.amendmentLabel,
    ) as HTMLTextAreaElement;

    act(() => {
      fireEvent.change(field, {
        target: { value: 'Sell a weekly CSA box subscription to residents.' },
      });
    });

    // Non-blocking advisory shows...
    expect(screen.getByTestId('csa-advisory')).toBeTruthy();
    // ...submit stays disabled, and nothing is recorded.
    const submitBtn = screen.getByRole('button', {
      name: COHERENCE_COPY.gap.submitLabel,
    });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
    act(() => {
      fireEvent.click(submitBtn);
    });
    expect(
      useCoherenceCheckStore.getState().byProject[PID],
    ).toBeUndefined();
  });

  it('seals the Coherence Record once PASS, stamping the surface', () => {
    renderSurface();
    act(() => {
      useCoherenceCheckStore
        .getState()
        .resolveItem(
          PID,
          'B3',
          'Household three-bay compost routed to the kitchen garden.',
          1700,
        );
    });
    const sealBtn = screen.getByRole('button', {
      name: COHERENCE_COPY.seal.sealLabel,
    });
    act(() => {
      fireEvent.click(sealBtn);
    });
    expect(useCoherenceCheckStore.getState().byProject[PID]?.sealedAt).toBeTypeOf(
      'number',
    );
    const panel = screen.getByLabelText('Coherence Record');
    expect(panel.getAttribute('data-sealed')).toBeTruthy();
    expect(within(panel).getByText(/for Hillside Farm/)).toBeTruthy();
  });
});
