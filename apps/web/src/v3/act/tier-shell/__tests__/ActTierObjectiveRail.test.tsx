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
import * as React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import {
  findPlanStratum,
  findPlanStratumObjective,
  type PlanStratumObjective,
} from '@ogden/shared';

// lucide-react forwardRef icons spread [undefined] into <svg> children when
// childless, which React 18 + happy-dom reject on re-render. Replace every
// component export with a clean <svg> stub (established pattern, mirrors
// ActTierExecutionPanel.protocols.test). The deselect affordance renders a
// ChevronLeft icon, so the objective-detail header needs this stub to mount.
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

function renderRail(
  mode: 'objectives' | 'protocols',
  triggeredCount = 0,
  activeObjectiveId: string | null = null,
  objectives: readonly PlanStratumObjective[] = [OBJECTIVE],
  onSelectObjective: (objectiveId: string) => void = vi.fn(),
  onSelectProtocol: (templateId: string) => void = vi.fn(),
  activeStratumId: string | null = 's6-integration-design',
  selectedProtocolId: string | null = null,
) {
  return render(
    <ActTierObjectiveRail
      stratum={STRATUM}
      objectives={objectives}
      progressByObjective={PROGRESS}
      activeObjectiveId={activeObjectiveId}
      onSelectObjective={onSelectObjective}
      mode={mode}
      onModeChange={vi.fn()}
      triggeredCount={triggeredCount}
      projectId="proj-1"
      primaryTypeId="silvopasture"
      secondaryTypeIds={[]}
      activeStratumId={activeStratumId}
      selectedProtocolId={selectedProtocolId}
      onSelectProtocol={onSelectProtocol}
    />,
  );
}

describe('ActTierObjectiveRail', () => {
  it('objectives mode renders the objective cards and the mode toggle', () => {
    renderRail('objectives');
    expect(screen.getByTestId('act-rail-mode-toggle')).toBeTruthy();
    // The card tile shows the objective's shortTitle (falling back to title).
    expect(
      screen.getByText(OBJECTIVE.shortTitle ?? OBJECTIVE.title),
    ).toBeTruthy();
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

  it('with no objective selected the header shows the stratum context', () => {
    renderRail('objectives', 0, null);
    // The stratum summary is unique to the header (not echoed by any card).
    expect(screen.getByText(STRATUM.summary)).toBeTruthy();
    // No objective-detail markers when nothing is selected.
    expect(screen.queryByText('Decision progress')).toBeNull();
  });

});

describe('ActTierObjectiveRail (protocols mode threads stratum scope + selection)', () => {
  // Both silvopasture-primary S6 protocols; tree-browse precedes establishment
  // in authored order.
  const OTHER_PROTOCOL_ID = 'silv-tree-browse-damage';

  it('scopes the panel to activeStratumId — only the S6 tier group renders', () => {
    renderRail('protocols', 0, null, [OBJECTIVE], vi.fn(), vi.fn(), 's6-integration-design');
    const headings = screen
      .getAllByTestId('protocol-tier-heading')
      .map((el) => el.textContent);
    expect(headings).toEqual(['S6 · Integration Design']);
  });

  it('threads onSelectProtocol — clicking a card calls back with the template id', () => {
    const onSelectProtocol = vi.fn();
    renderRail(
      'protocols',
      0,
      null,
      [OBJECTIVE],
      vi.fn(),
      onSelectProtocol,
      's6-integration-design',
    );
    const card = screen
      .getAllByTestId('protocol-template-card')
      .find((el) => el.getAttribute('data-template-id') === OTHER_PROTOCOL_ID)!;
    fireEvent.click(card);
    expect(onSelectProtocol).toHaveBeenCalledWith(OTHER_PROTOCOL_ID);
  });

  it('threads selectedProtocolId — the matching card carries data-selected="true"', () => {
    renderRail(
      'protocols',
      0,
      null,
      [OBJECTIVE],
      vi.fn(),
      vi.fn(),
      's6-integration-design',
      OTHER_PROTOCOL_ID,
    );
    const card = screen
      .getAllByTestId('protocol-template-card')
      .find((el) => el.getAttribute('data-template-id') === OTHER_PROTOCOL_ID)!;
    expect(card.getAttribute('data-selected')).toBe('true');
  });
});
