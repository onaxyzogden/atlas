/**
 * @vitest-environment happy-dom
 *
 * PerProjectHomePage (Slice 5.4) suite.
 *
 * Verifies the four behaviours the slice 5.4 gate calls out:
 *   - Empty state when no project matches the projectId param.
 *   - PageHeader renders the project name; "Finish setup" pill shows
 *     ONLY when wizardStatus === 'in_progress'.
 *   - NextUpCard branches on urgency.breakdown:
 *       - draftWizard → "Resume wizard"
 *       - divergencesHigh → "Open Act" (divergence headline)
 *       - clear → "Nothing urgent" (no CTA)
 *   - AttentionRail surfaces one chip per non-zero urgency breakdown
 *     channel (excluding draftWizard, which is a separate pill); empty
 *     urgency renders the "Land is steady" empty state.
 *
 * Mocks:
 *  1. `lucide-react` — childless `forwardRef` SVG stubs (same pattern
 *     as HeaderStageSpine.test.tsx).
 *  2. `@tanstack/react-router` — `useParams` reads a hoisted mutable
 *     `params.projectId`; `useNavigate` returns a no-op spy.
 *  3. `../../../store/projectStore.js` — hoisted project record (with
 *     mutable metadata for the draft-wizard test).
 *  4. `../useProjectUrgency.js` — returns a hoisted `Map<projectId,
 *     ProjectUrgencyResult>` so each test can drive the breakdown.
 *  5. `../../../store/fieldActionStore.js` — `getNextUpForProject`
 *     returns null (we only test branches where the urgency engine
 *     wins; the field-action fallback is the clear/no-action branch).
 *  6. StageStatusRow's stores — `planTierProgressStore`,
 *     `observeDataPointStore` returning empty `byProject` maps so the
 *     row renders with all-zero metrics (we only assert the row
 *     exists; metric correctness is covered by the helper specs in
 *     `@ogden/shared`).
 *
 * Per-Project Home is the canonical landing per Slice 5.4 ADR; do not
 * regress these behaviours without updating the wizard CTA + Portfolio
 * Home card target in lock-step.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as React from 'react';
import { render, cleanup, screen } from '@testing-library/react';

type ProjectUrgencyResult = {
  projectId: string;
  score: number;
  breakdown: {
    divergencesCritical?: number;
    divergencesHigh?: number;
    staleFoundationDomains?: number;
    ageingFoundationDomains?: number;
    cyclicalReviewsDue?: number;
    blockedFieldActions?: number;
    pendingVerifications?: number;
    inactivityDays?: number;
    draftWizard?: boolean;
  };
};

const h = vi.hoisted(() => ({
  params: { projectId: 'p-1' } as { projectId: string | undefined },
  project: null as null | {
    id: string;
    name: string;
    description: string | null;
    serverId?: string;
    metadata: { wizardStatus?: 'in_progress' | 'complete'; wizardLastStep?: string };
  },
  urgency: null as ProjectUrgencyResult | null,
  navigateSpy: vi.fn(),
  roleMap: new Map<string, string>(),
}));

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

vi.mock('@tanstack/react-router', () => ({
  useParams: () => h.params,
  useNavigate: () => h.navigateSpy,
}));

vi.mock('../../../store/projectStore.js', () => ({
  useProjectStore: (selector: (state: { projects: unknown[] }) => unknown) =>
    selector({ projects: h.project ? [h.project] : [] }),
}));

vi.mock('../useProjectUrgency.js', () => ({
  useProjectUrgency: () => {
    const map = new Map<string, ProjectUrgencyResult>();
    if (h.urgency && h.project) map.set(h.project.id, h.urgency);
    return map;
  },
}));

vi.mock('../../../store/fieldActionStore.js', () => ({
  useFieldActionStore: (
    selector: (state: {
      byProject: Record<string, unknown>;
      getNextUpForProject: (id: string) => null;
    }) => unknown,
  ) =>
    selector({
      byProject: {},
      getNextUpForProject: () => null,
    }),
}));

vi.mock('../../../store/planTierStore.js', async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    '../../../store/planTierStore.js',
  );
  return {
    ...actual,
    usePlanTierProgressStore: (
      selector: (state: { byProject: Record<string, unknown> }) => unknown,
    ) => selector({ byProject: {} }),
  };
});

vi.mock('../../../store/observeDataPointStore.js', () => ({
  useObserveDataPointStore: (
    selector: (state: { byProject: Record<string, unknown> }) => unknown,
  ) => selector({ byProject: {} }),
}));

vi.mock('../../../hooks/useMyProjectRoles.js', () => ({
  useMyProjectRoles: () => h.roleMap,
}));

vi.mock('../../../hooks/useActTaskSync.js', () => ({
  useActTaskSync: vi.fn(),
}));

// Import AFTER mocks so the SUT captures them.
import PerProjectHomePage from '../PerProjectHomePage';
import { useActTaskSync } from '../../../hooks/useActTaskSync.js';

beforeEach(() => {
  h.params = { projectId: 'p-1' };
  h.project = {
    id: 'p-1',
    name: 'Acme Homestead',
    description: 'A small piece of land.',
    metadata: {},
  };
  h.urgency = null;
  h.roleMap = new Map<string, string>();
});
afterEach(() => {
  cleanup();
  h.navigateSpy.mockClear();
});

describe('PerProjectHomePage', () => {
  it('renders the empty state when no project matches the projectId param', () => {
    h.project = null;
    render(<PerProjectHomePage />);
    expect(screen.getByText('No project loaded.')).toBeTruthy();
  });

  it('renders the project name in the page header', () => {
    render(<PerProjectHomePage />);
    expect(screen.getByText('Acme Homestead')).toBeTruthy();
  });

  it('hides the Finish setup pill when the wizard is complete', () => {
    h.project = { ...h.project!, metadata: { wizardStatus: 'complete' } };
    render(<PerProjectHomePage />);
    expect(screen.queryByText('Finish setup')).toBeNull();
  });

  it('shows the Finish setup pill when the wizard is in_progress', () => {
    h.project = {
      ...h.project!,
      metadata: { wizardStatus: 'in_progress', wizardLastStep: 'vision' },
    };
    render(<PerProjectHomePage />);
    expect(screen.getAllByText('Finish setup').length).toBeGreaterThan(0);
  });

  it('surfaces the draft-wizard branch in Next Up when breakdown.draftWizard is true', () => {
    h.project = {
      ...h.project!,
      metadata: { wizardStatus: 'in_progress', wizardLastStep: 'team' },
    };
    h.urgency = {
      projectId: 'p-1',
      score: 50,
      breakdown: { draftWizard: true },
    };
    render(<PerProjectHomePage />);
    expect(screen.getByText('Resume the project wizard')).toBeTruthy();
    expect(screen.getByText('Resume wizard')).toBeTruthy();
  });

  it('surfaces the divergence branch in Next Up when divergencesHigh > 0', () => {
    h.urgency = {
      projectId: 'p-1',
      score: 80,
      breakdown: { divergencesHigh: 2 },
    };
    render(<PerProjectHomePage />);
    expect(screen.getByText('2 field divergences to review')).toBeTruthy();
  });

  it('renders the all-clear branch when urgency has no driving channels', () => {
    h.urgency = { projectId: 'p-1', score: 0, breakdown: {} };
    render(<PerProjectHomePage />);
    expect(
      screen.getByText('Nothing urgent — land is steady.'),
    ).toBeTruthy();
    expect(screen.queryByText('Resume wizard')).toBeNull();
  });

  it('renders the Attention Rail empty state when urgency is undefined', () => {
    h.urgency = null;
    render(<PerProjectHomePage />);
    expect(
      screen.getByText('No urgent signals. Land is steady.'),
    ).toBeTruthy();
  });

  it('renders one chip per non-zero urgency channel in the Attention Rail', () => {
    h.urgency = {
      projectId: 'p-1',
      score: 100,
      breakdown: {
        divergencesCritical: 1,
        blockedFieldActions: 2,
        cyclicalReviewsDue: 1,
      },
    };
    const { container } = render(<PerProjectHomePage />);
    const chips = container.querySelectorAll('[class*="railChip-"]');
    expect(chips.length).toBe(3);
  });

  it('renders the Stage Status Row with three stage cards', () => {
    render(<PerProjectHomePage />);
    expect(screen.getByText('Plan stratum shell')).toBeTruthy();
    expect(screen.getByText('Field actions')).toBeTruthy();
    expect(screen.getByText('Land state')).toBeTruthy();
  });
});

describe('PerProjectHomePage - Slice 5.5a access gate', () => {
  const DENY_TEXT =
    'Your role on this project does not include the home view. Contact the project steward if you need access.';

  it('denies a contractor on a synced project', () => {
    h.project = { ...h.project!, serverId: 'srv-1' };
    h.roleMap = new Map([['srv-1', 'contractor']]);
    render(<PerProjectHomePage />);
    expect(screen.getByText(DENY_TEXT)).toBeTruthy();
  });

  it('denies a landowner on a synced project', () => {
    h.project = { ...h.project!, serverId: 'srv-1' };
    h.roleMap = new Map([['srv-1', 'landowner']]);
    render(<PerProjectHomePage />);
    expect(screen.getByText(DENY_TEXT)).toBeTruthy();
  });

  it('renders the full steward home for an owner on a synced project', () => {
    h.project = { ...h.project!, serverId: 'srv-1' };
    h.roleMap = new Map([['srv-1', 'owner']]);
    render(<PerProjectHomePage />);
    expect(screen.getByText('Plan stratum shell')).toBeTruthy();
    expect(screen.queryByText(DENY_TEXT)).toBeNull();
  });

  it('never gates an unsynced (local-only) project, even with a stale role in the map', () => {
    h.project = { ...h.project!, serverId: undefined };
    h.roleMap = new Map([['srv-1', 'contractor']]);
    render(<PerProjectHomePage />);
    expect(screen.getByText('Plan stratum shell')).toBeTruthy();
    expect(screen.queryByText(DENY_TEXT)).toBeNull();
  });
});

describe('PerProjectHomePage - ActTask pull on open', () => {
  it('pulls ActTasks with the local id + serverId for a synced project', () => {
    h.project = { ...h.project!, serverId: 'srv-1' };
    render(<PerProjectHomePage />);
    expect(vi.mocked(useActTaskSync)).toHaveBeenCalledWith('p-1', 'srv-1');
  });

  it('passes no serverId for a local-only project (hook no-ops)', () => {
    h.project = { ...h.project!, serverId: undefined };
    render(<PerProjectHomePage />);
    expect(vi.mocked(useActTaskSync)).toHaveBeenCalledWith('p-1', undefined);
  });
});
