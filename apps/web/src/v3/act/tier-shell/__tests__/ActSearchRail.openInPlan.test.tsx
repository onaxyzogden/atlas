/**
 * @vitest-environment happy-dom
 *
 * ActSearchRail — "Open in Plan" secondary control on tool search results.
 * Covers:
 *   1. The control renders for a plan-capable tool (id in planToolIds).
 *   2. It is absent for a tool NOT in planToolIds (e.g. a log-arm field log).
 *   3. It is absent entirely when onOpenToolInPlan is not provided.
 *   4. Clicking it calls onOpenToolInPlan with the tool's match (NOT onSelectTool).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { findPlanStratumObjective } from '@ogden/shared';

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

import ActSearchRail from '../ActSearchRail.js';
import { ACT_TOOL_CATALOG } from '../actToolCatalog.js';
import type { ActToolMatch } from '../../../search/useStageSearchResults.js';

const OBJECTIVE = findPlanStratumObjective('s6-yield-flows')!;

// `contour` is a map-arm tool (has a Plan home); `harvest` is a log-arm field
// log (Act-only — dropped by resolvePlanTools, so never in planToolIds).
const CONTOUR_MATCH: ActToolMatch = {
  tool: ACT_TOOL_CATALOG.contour!,
  objective: OBJECTIVE,
  categoryLabel: 'Terrain & Survey',
};
const HARVEST_MATCH: ActToolMatch = {
  tool: ACT_TOOL_CATALOG.harvest!,
  objective: OBJECTIVE,
  categoryLabel: 'Field Logs',
};

afterEach(() => cleanup());

function renderRail(
  overrides: {
    planToolIds?: ReadonlySet<string>;
    onOpenToolInPlan?: (m: ActToolMatch) => void;
    onSelectTool?: (m: ActToolMatch) => void;
  } = {},
) {
  return render(
    <ActSearchRail
      query="contour"
      toolMatches={[CONTOUR_MATCH, HARVEST_MATCH]}
      objectiveMatches={[]}
      progressByObjective={{}}
      activeObjectiveId={null}
      onSelectTool={overrides.onSelectTool ?? vi.fn()}
      onSelectObjective={vi.fn()}
      planToolIds={overrides.planToolIds}
      onOpenToolInPlan={overrides.onOpenToolInPlan}
    />,
  );
}

describe('ActSearchRail — Open in Plan', () => {
  it('renders the control only for a plan-capable tool, not a log-arm tool', () => {
    renderRail({
      planToolIds: new Set(['contour']),
      onOpenToolInPlan: vi.fn(),
    });
    const buttons = screen.getAllByRole('button', { name: 'Open in Plan' });
    expect(buttons).toHaveLength(1);
    // It sits in the contour row, not the harvest row.
    const contourRow = screen.getByText('Contour lines').closest('div');
    expect(within(contourRow!).queryByText('Open in Plan')).toBeTruthy();
    const harvestRow = screen.getByText(ACT_TOOL_CATALOG.harvest!.label).closest('div');
    expect(within(harvestRow!).queryByText('Open in Plan')).toBeNull();
  });

  it('renders no control when onOpenToolInPlan is not provided', () => {
    renderRail({ planToolIds: new Set(['contour']) });
    expect(screen.queryByText('Open in Plan')).toBeNull();
  });

  it('clicking the control calls onOpenToolInPlan with the tool match, not onSelectTool', () => {
    const onOpenToolInPlan = vi.fn();
    const onSelectTool = vi.fn();
    renderRail({
      planToolIds: new Set(['contour']),
      onOpenToolInPlan,
      onSelectTool,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open in Plan' }));
    expect(onOpenToolInPlan).toHaveBeenCalledWith(CONTOUR_MATCH);
    expect(onSelectTool).not.toHaveBeenCalled();
  });
});
