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
  scopeForRoles,
  type PlanStratumObjective,
} from '@ogden/shared';
import type { SurfaceReason } from '../../../roles/alwaysSurface.js';

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

// The rail resolves per-project role labels/domains via
// useResolvedOperationalRoles (React Query). This suite renders store-direct
// (no QueryClientProvider) and exercises built-in scoping/badges, so we stub the
// resolver to the real built-ins -- composeScopedRail then behaves byte-identically.
vi.mock('../../../roles/useResolvedOperationalRoles.js', async () => {
  const shared =
    await vi.importActual<typeof import('@ogden/shared')>('@ogden/shared');
  return {
    useResolvedOperationalRoles: () => ({
      defs: shared.resolveOperationalRoleDefs(),
      domainsMap: shared.resolveOperationalRoleDomains(),
      labelFor: (slug: keyof typeof shared.OPERATIONAL_ROLE_DEFS) =>
        shared.OPERATIONAL_ROLE_DEFS[slug].label,
    }),
  };
});

import { useProtocolStore } from '../../../../store/protocolStore.js';
import ActTierObjectiveRail from '../ActTierObjectiveRail.js';
import type { ObjectiveProgress } from '../objectiveProgress.js';
import { expectNoA11yViolations } from '../../../../test/a11y.js';

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

  it('objective cards carry no stratum-title eyebrow (it lives only in the rail header)', () => {
    const { container } = renderRail('objectives');
    // The per-card stratum eyebrow was removed as redundant — every card in the
    // list shares the selected stratum, which the rail header already names.
    expect(container.querySelector('[class*="objEyebrow"]')).toBeNull();
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

describe('ActTierObjectiveRail (a11y)', () => {
  it('objectives mode has no axe violations (allowlisted rules)', async () => {
    const { container } = renderRail('objectives');
    await expectNoA11yViolations(container);
  });

  it('protocols mode has no axe violations (allowlisted rules)', async () => {
    const { container } = renderRail('protocols');
    await expectNoA11yViolations(container);
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

describe('ActTierObjectiveRail (headerSlot)', () => {
  // The Plan tier shell passes its interactive stratum switcher as headerSlot;
  // Act passes none. The default static header must render byte-identically when
  // the slot is omitted, and be REPLACED (not duplicated) when it is provided.
  it('renders the default stratum header when headerSlot is omitted (Act parity)', () => {
    renderRail('objectives');
    // The stratum summary is unique to the default header.
    expect(screen.getByText(STRATUM.summary)).toBeTruthy();
  });

  it('replaces the default header with headerSlot when provided (Plan)', () => {
    render(
      <ActTierObjectiveRail
        stratum={STRATUM}
        objectives={[OBJECTIVE]}
        progressByObjective={PROGRESS}
        activeObjectiveId={null}
        onSelectObjective={vi.fn()}
        mode="objectives"
        onModeChange={vi.fn()}
        triggeredCount={0}
        projectId="proj-1"
        primaryTypeId="silvopasture"
        secondaryTypeIds={[]}
        activeStratumId="s6-integration-design"
        selectedProtocolId={null}
        onSelectProtocol={vi.fn()}
        headerSlot={<div data-testid="custom-header-slot">SWITCHER</div>}
      />,
    );
    expect(screen.getByTestId('custom-header-slot')).toBeTruthy();
    // Default header replaced, not duplicated.
    expect(screen.queryByText(STRATUM.summary)).toBeNull();
    // The objective list still renders below the slot.
    expect(
      screen.getByText(OBJECTIVE.shortTitle ?? OBJECTIVE.title),
    ).toBeTruthy();
  });
});

describe('ActTierObjectiveRail (operational role scope)', () => {
  // Three real objectives across the FOOD scope boundary:
  //   s6-yield-flows    -> [plants-food, ...]  IN focus
  //   s5-water-strategy -> [hydrology, ...]    OUT (un-promoted -> collapsible)
  //   s1-stewardship    -> [people-governance] OUT (promoted via open flag)
  const FOOD_SCOPE = scopeForRoles(['food_production']); // { plants-food }
  const IN_OBJ = findPlanStratumObjective('s6-yield-flows')!;
  const OUT_WATER = findPlanStratumObjective('s5-water-strategy')!;
  const OUT_STEWARD = findPlanStratumObjective('s1-stewardship')!;
  const SCOPE_OBJECTIVES = [IN_OBJ, OUT_WATER, OUT_STEWARD];
  const SCOPE_PROGRESS: Readonly<Record<string, ObjectiveProgress>> = {
    [IN_OBJ.id]: { total: 2, verified: 1, state: 'active' },
  };
  const SURFACE_MAP = new Map<string, SurfaceReason[]>([
    ['s1-stewardship', ['open-review-flag']],
  ]);

  function renderScoped(
    focusMode: 'role' | 'full' = 'role',
    onFocusModeChange: (mode: 'role' | 'full') => void = vi.fn(),
  ) {
    return render(
      <ActTierObjectiveRail
        stratum={STRATUM}
        objectives={SCOPE_OBJECTIVES}
        progressByObjective={SCOPE_PROGRESS}
        activeObjectiveId={null}
        onSelectObjective={vi.fn()}
        mode="objectives"
        onModeChange={vi.fn()}
        triggeredCount={0}
        projectId="proj-1"
        primaryTypeId="silvopasture"
        secondaryTypeIds={[]}
        activeStratumId="s6-integration-design"
        selectedProtocolId={null}
        onSelectProtocol={vi.fn()}
        // role view ⇒ scope engaged; full view ⇒ scopedDomains omitted.
        scopedDomains={focusMode === 'role' ? FOOD_SCOPE : undefined}
        surfaceMap={SURFACE_MAP}
        showFocusToggle
        focusMode={focusMode}
        onFocusModeChange={onFocusModeChange}
      />,
    );
  }

  it('renders the focus toggle with an in-focus count (in-scope + promoted of total)', () => {
    renderScoped('role');
    expect(screen.getByTestId('view-focus-toggle')).toBeTruthy();
    // 2 in focus (s6 in-scope + s1 promoted) of 3 total.
    expect(screen.getByTestId('view-focus-role').textContent).toContain('2 / 3');
  });

  it('promotes an out-of-scope objective carrying an open flag into the in-focus list', () => {
    renderScoped('role');
    expect(
      screen.getByText(OUT_STEWARD.shortTitle ?? OUT_STEWARD.title),
    ).toBeTruthy();
    // Amber surfaced chip names the promotion reason.
    expect(screen.getByText('Open review flag')).toBeTruthy();
  });

  it('buries an un-promoted out-of-scope objective behind the collapsible until expanded', () => {
    renderScoped('role');
    const outTitle = OUT_WATER.shortTitle ?? OUT_WATER.title;
    // Collapsed by default -> not rendered, but the count advertises it exists.
    expect(screen.queryByText(outTitle)).toBeNull();
    const toggle = screen.getByTestId('rail-outside-focus-toggle');
    expect(toggle.textContent).toContain('Outside your focus (1)');
    fireEvent.click(toggle);
    // Expanded -> the dimmed card is reachable (never hidden, only de-emphasized).
    expect(screen.getByText(outTitle)).toBeTruthy();
  });

  it('auto-expands the outside group + directive copy when nothing is in focus', () => {
    const outTitle = OUT_WATER.shortTitle ?? OUT_WATER.title;
    // Only an out-of-scope, un-promoted objective -> mainList empty, so the
    // rail must auto-expand the outside group instead of stranding the member
    // on an empty pane behind a click.
    render(
      <ActTierObjectiveRail
        stratum={STRATUM}
        objectives={[OUT_WATER]}
        progressByObjective={{}}
        activeObjectiveId={null}
        onSelectObjective={vi.fn()}
        mode="objectives"
        onModeChange={vi.fn()}
        triggeredCount={0}
        projectId="proj-1"
        primaryTypeId="silvopasture"
        secondaryTypeIds={[]}
        activeStratumId="s6-integration-design"
        selectedProtocolId={null}
        onSelectProtocol={vi.fn()}
        scopedDomains={FOOD_SCOPE}
        surfaceMap={new Map()}
        showFocusToggle
        focusMode="role"
        onFocusModeChange={vi.fn()}
      />,
    );
    // Directive empty-state copy names the count and points downward (not the
    // old tautological "nothing in your focus" line).
    expect(
      screen.getByText(/None of the 1 objective in this stratum/i),
    ).toBeTruthy();
    // The out-of-focus card is reachable WITHOUT clicking the toggle.
    expect(screen.getByText(outTitle)).toBeTruthy();
    // The toggle still renders open so the member can collapse it back.
    const toggle = screen.getByTestId('rail-outside-focus-toggle');
    expect(toggle.textContent).toContain('Outside your focus (1)');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('full view renders every objective flat with no outside section', () => {
    renderScoped('full');
    expect(
      screen.getByText(OUT_WATER.shortTitle ?? OUT_WATER.title),
    ).toBeTruthy();
    expect(
      screen.getByText(OUT_STEWARD.shortTitle ?? OUT_STEWARD.title),
    ).toBeTruthy();
    expect(screen.queryByTestId('rail-outside-focus-toggle')).toBeNull();
    // The toggle stays so a steward can switch back to My focus.
    expect(screen.getByTestId('view-focus-toggle')).toBeTruthy();
  });

  it('role-focus view has no axe violations (allowlisted rules)', async () => {
    const { container } = renderScoped('role');
    await expectNoA11yViolations(container);
  });
});
