/**
 * @vitest-environment happy-dom
 *
 * ActTierObjectiveRail — left rail with an Objectives/Protocols mode toggle.
 * Covers:
 *   1. Objectives mode renders the stratum's objective cards + the toggle.
 *   2. Protocols mode renders the ProtocolLayerPanel (reused) and hides the
 *      objective list.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { findPlanStratum, findPlanStratumObjective } from '@ogden/shared';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import ActTierObjectiveRail from '../ActTierObjectiveRail.js';
import type { ObjectiveProgress } from '../objectiveProgress.js';

const STRATUM = findPlanStratum('s6-integration-design')!;
const OBJECTIVE = findPlanStratumObjective('s6-yield-flows')!;
const PROGRESS: Readonly<Record<string, ObjectiveProgress>> = {
  [OBJECTIVE.id]: { total: 2, verified: 1, state: 'active' },
};

beforeEach(() => {
  useProtocolStore.setState({ records: [] });
});
afterEach(() => cleanup());

function renderRail(mode: 'objectives' | 'protocols', triggeredCount = 0) {
  return render(
    <ActTierObjectiveRail
      stratum={STRATUM}
      objectives={[OBJECTIVE]}
      progressByObjective={PROGRESS}
      activeObjectiveId={null}
      onSelectObjective={vi.fn()}
      mode={mode}
      onModeChange={vi.fn()}
      triggeredCount={triggeredCount}
      projectId="proj-1"
      primaryTypeId="silvopasture"
      secondaryTypeIds={[]}
    />,
  );
}

describe('ActTierObjectiveRail', () => {
  it('objectives mode renders the objective cards and the mode toggle', () => {
    renderRail('objectives');
    expect(screen.getByTestId('act-rail-mode-toggle')).toBeTruthy();
    expect(screen.getByText(OBJECTIVE.title)).toBeTruthy();
    expect(screen.queryByTestId('protocol-layer-panel')).toBeNull();
  });

  it('protocols mode renders the ProtocolLayerPanel and hides the objective list', () => {
    renderRail('protocols');
    expect(screen.getByTestId('act-rail-mode-toggle')).toBeTruthy();
    expect(screen.getByTestId('protocol-layer-panel')).toBeTruthy();
    expect(screen.queryByText(OBJECTIVE.title)).toBeNull();
  });

  it('wraps the protocol panel in .olos-spine-root so the spine tokens resolve (bento framing)', () => {
    renderRail('protocols');
    const panel = screen.getByTestId('protocol-layer-panel');
    // The mount wrapper must carry the spine-root scope; without it the shared
    // protocol cards render "naked" — the --spine-* custom properties they are
    // styled with are declared only under .olos-spine-root.
    expect(panel.parentElement?.className).toContain('olos-spine-root');
  });
});
