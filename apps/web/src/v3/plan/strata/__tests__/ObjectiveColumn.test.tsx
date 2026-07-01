/**
 * @vitest-environment happy-dom
 *
 * ObjectiveColumn -- review-flag chip threading (T1.7).
 *
 * Verified behaviour: when reviewFlagStore has an open flag for an objective
 * in the rendered column, the corresponding ObjectiveCard shows the amber
 * "Review" chip (confirming that useReviewFlagCountsByObjective is wired
 * through and passed as reviewFlagCount to each card).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useReviewFlagStore } from '../../../../store/reviewFlagStore.js';
import { useMemberStore } from '../../../../store/memberStore.js';
import { useAuthStore } from '../../../../store/authStore.js';
import { useObserveDataPointStore } from '../../../../store/observeDataPointStore.js';
import { findObjectiveGlobally } from '../../objectiveCatalog.js';
import ObjectiveColumn from '../ObjectiveColumn.js';
import type { PlanStratum } from '@ogden/shared';

// lucide-react -- stub icons using the importOriginal + forwardRef-SVG pattern
// (established in ActTierExecutionPanel.protocols.test.tsx). Avoids the CJS
// React-instance mismatch crash and the Proxy infinite-recursion crash.
vi.mock('lucide-react', async (importOriginal) => {
  const React = await import('react');
  let actual: Record<string, unknown>;
  try {
    actual = await importOriginal<Record<string, unknown>>();
  } catch {
    actual = {};
  }
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' && value !== null && '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', { ref, 'data-lucide-icon': key, 'aria-hidden': 'true' });
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

// ObjectiveColumn resolves per-project role labels/domains via
// useResolvedOperationalRoles (React Query). This suite renders store-direct (no
// QueryClientProvider) and exercises built-in scoping/badges, so we stub the
// resolver to the real built-ins -- composeScopedRail stays byte-identical.
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

const PROJECT_ID = 'test-objcol-reviewflags';

// Use s6-yield-flows as a real objective belonging to s6-integration-design.
const objective = findObjectiveGlobally('s6-yield-flows')!;

const STRATUM: PlanStratum = {
  id: 's6-integration-design',
  ordinal: 6,
  title: 'Integration Design',
  summary: 'How the systems integrate -- yield flows, ecology, stewardship intensity.',
};

beforeEach(() => {
  // Reset store state and localStorage between tests.
  useReviewFlagStore.setState({ byProject: {} });
  // Operational Role Layer stores read by useViewScope / the divergence wiring.
  // Default empty == layer disengaged, so the existing tests stay byte-identical.
  useMemberStore.setState({ members: [], myRole: null });
  useAuthStore.setState({ user: null });
  useObserveDataPointStore.getState().clearForProject(PROJECT_ID);
  window.localStorage.clear();
});

describe('ObjectiveColumn -- reviewFlagCount threading', () => {
  it('shows the Review chip on an objective card when an open flag exists', () => {
    // Seed one open review flag for the objective.
    useReviewFlagStore.getState().raiseFlag({
      projectId: PROJECT_ID,
      objectiveId: objective.id,
      sourceTemplateId: 'paddock_rotation_cover_trigger',
      observedCount: 3,
      deviationSign: 'over',
      depth: 'threshold',
      direction: 'tighten',
      reason: 'Rotation activated 3x above expected rate -- consider tightening threshold',
    });

    render(
      <ObjectiveColumn
        stratum={STRATUM}
        objectives={[objective]}
        objectiveStatuses={{ [objective.id]: 'active' }}
        activeObjectiveId={null}
        projectId={PROJECT_ID}
        onSelectObjective={vi.fn()}
      />,
    );

    // The chip should be visible on the card for this objective.
    const chip = screen.queryByTestId(`objective-review-flag-${objective.id}`);
    expect(chip).not.toBeNull();
    expect(chip?.textContent).toBe('Review');
  });

  it('does NOT show the Review chip when there are no open flags', () => {
    render(
      <ObjectiveColumn
        stratum={STRATUM}
        objectives={[objective]}
        objectiveStatuses={{ [objective.id]: 'active' }}
        activeObjectiveId={null}
        projectId={PROJECT_ID}
        onSelectObjective={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId(`objective-review-flag-${objective.id}`),
    ).toBeNull();
  });

  it('does NOT show the chip for a resolved flag (closed = not open)', () => {
    // Raise and immediately resolve the flag.
    const flagId = crypto.randomUUID();
    useReviewFlagStore.getState().raiseFlag({
      id: flagId,
      projectId: PROJECT_ID,
      objectiveId: objective.id,
      sourceTemplateId: 'paddock_rotation_cover_trigger',
      observedCount: 1,
      deviationSign: 'under',
      depth: 'threshold',
      direction: 'loosen',
      reason: 'Under-triggered -- threshold may be too conservative',
    });
    useReviewFlagStore.getState().resolveFlag(PROJECT_ID, flagId);

    render(
      <ObjectiveColumn
        stratum={STRATUM}
        objectives={[objective]}
        objectiveStatuses={{ [objective.id]: 'active' }}
        activeObjectiveId={null}
        projectId={PROJECT_ID}
        onSelectObjective={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId(`objective-review-flag-${objective.id}`),
    ).toBeNull();
  });
});

describe('ObjectiveColumn -- shared-resource-divergence promotion (Operational Role Layer)', () => {
  // s5-water-strategy's footprint includes hydrology -- a SHARED resource owned
  // by ecology_soils + infrastructure. A viewer scoped to food_production
  // ({ plants-food }) has it OUT of focus; an ACTIVE hydrology divergence must
  // PROMOTE it back into view, because a shared-resource change is everyone's
  // concern. This pins the Phase-4 always-surface divergence channel end-to-end
  // through the shell wiring (useDivergedDomains -> collectAlwaysSurface).
  const water = findObjectiveGlobally('s5-water-strategy')!;
  const WATER_STRATUM: PlanStratum = {
    id: water.stratumId,
    ordinal: 5,
    title: 'System Design',
    summary: 'Water + systems design.',
  };

  // A non-solo (2-member) project where the viewer is scoped to food_production,
  // so a hydrology-footprint objective is out of focus.
  function seedScopedViewer(): void {
    useAuthStore.setState({ user: { id: 'u1' } as never });
    useMemberStore.setState({
      members: [
        {
          userId: 'u1',
          role: 'team_member',
          operationalRoles: ['food_production'],
        } as never,
        { userId: 'u2', role: 'team_member', operationalRoles: [] } as never,
      ],
      myRole: 'team_member',
    });
  }

  function seedHydrologyDivergence(): void {
    useObserveDataPointStore
      .getState()
      .setProjectPoints(PROJECT_ID, [
        {
          domainId: 'hydrology',
          isSuperseded: false,
          statusOutput: 'major_constraint',
        } as never,
      ]);
  }

  it('promotes an out-of-focus objective when its shared-resource domain has diverged', () => {
    seedScopedViewer();
    seedHydrologyDivergence();

    render(
      <ObjectiveColumn
        stratum={WATER_STRATUM}
        objectives={[water]}
        objectiveStatuses={{ [water.id]: 'active' }}
        activeObjectiveId={null}
        projectId={PROJECT_ID}
        onSelectObjective={vi.fn()}
      />,
    );

    const chip = screen.queryByTestId(`objective-surface-chip-${water.id}`);
    expect(chip).not.toBeNull();
    expect(chip?.textContent).toContain('Shared resource');
  });

  it('does NOT promote the out-of-focus objective when nothing has diverged', () => {
    seedScopedViewer();
    // no divergence seeded -- the objective stays de-emphasized (never hidden).

    render(
      <ObjectiveColumn
        stratum={WATER_STRATUM}
        objectives={[water]}
        objectiveStatuses={{ [water.id]: 'active' }}
        activeObjectiveId={null}
        projectId={PROJECT_ID}
        onSelectObjective={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId(`objective-surface-chip-${water.id}`),
    ).toBeNull();
  });
});
