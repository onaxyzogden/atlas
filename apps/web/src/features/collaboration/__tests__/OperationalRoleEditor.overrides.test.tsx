/**
 * @vitest-environment happy-dom
 *
 * OperationalRoleEditor -- async-resolve regression (pre-push review BLOCKER).
 *
 * `useResolvedOperationalRoles` is a React-Query adapter: while `useProject` is
 * pending it yields the six BUILT-INS, then re-renders with the project's stored
 * overrides once the query resolves. A naive lazy `useState` snapshots the
 * built-ins on first render (before the query resolves) and never re-seeds, so
 * the editor opens on the wrong values and an unmodified Save diffs built-ins
 * against built-ins -> [] -> silently CLOBBERS the project's stored
 * operationalRoleDefs. This pins the fix: the editor re-seeds when the persisted
 * overrides arrive, and an unmodified Save round-trips them losslessly.
 *
 * The sibling OperationalRoleEditor.test.tsx stubs the resolver synchronously
 * (always loaded, built-ins) -- which is exactly why it never caught this. Here
 * the resolver is controllable so we can drive the loading -> loaded transition.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  OperationalRoleDefsOverride,
  ProjectMemberRecord,
  ProjectRole,
} from '@ogden/shared';
import { useMemberStore } from '../../../store/memberStore.js';
import { useAuthStore } from '../../../store/authStore.js';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('../../../hooks/useProjectQueries.js', () => ({
  useSetOperationalRoleDefs: () => ({ mutate, isPending: false }),
}));

// Controllable resolver: flip `phase` to simulate useProject resolving from
// pending (built-ins, isLoading) to loaded (the project's stored overrides).
const resolverState = vi.hoisted(() => ({
  phase: 'loading' as 'loading' | 'loaded',
}));

vi.mock('../../../v3/roles/useResolvedOperationalRoles.js', async () => {
  const shared =
    await vi.importActual<typeof import('@ogden/shared')>('@ogden/shared');
  // The project has renamed food_production -> "Grower" and re-scoped it.
  const OVERRIDES: OperationalRoleDefsOverride = [
    { slug: 'food_production', label: 'Grower', domains: ['plants-food', 'soil'] },
  ];
  return {
    useResolvedOperationalRoles: () => {
      const loaded = resolverState.phase === 'loaded';
      const overrides = loaded ? OVERRIDES : undefined;
      return {
        overrides,
        hasOverrides: loaded,
        defs: shared.resolveOperationalRoleDefs(overrides),
        domainsMap: shared.resolveOperationalRoleDomains(overrides),
        isLoading: !loaded,
      };
    },
  };
});

import OperationalRoleEditor from '../OperationalRoleEditor.js';

const PROJECT_ID = 'proj-test';
const ME = '11111111-1111-1111-1111-111111111111';

function member(
  userId: string,
  over: Partial<ProjectMemberRecord> = {},
): ProjectMemberRecord {
  return {
    userId,
    email: `${userId}@example.nz`,
    displayName: userId,
    role: 'team_member',
    operationalRoles: [],
    joinedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function seed(myRole: ProjectRole, count: number): void {
  useAuthStore.setState({
    user: {
      id: ME,
      email: 'me@example.nz',
      displayName: 'Me',
      defaultOrgId: 'org-1',
      emailVerified: true,
    },
  });
  const members = Array.from({ length: count }, (_, i) =>
    member(i === 0 ? ME : `u${i}`, i === 0 ? { role: myRole } : {}),
  );
  useMemberStore.setState({ members, myRole, myRoles: {}, isLoading: false });
}

beforeEach(() => {
  mutate.mockClear();
  resolverState.phase = 'loading';
  useMemberStore.setState({ members: [], myRole: null, myRoles: {}, isLoading: false });
  useAuthStore.setState({ user: null });
  localStorage.clear();
});

describe('OperationalRoleEditor -- pre-fills stored overrides on async resolve', () => {
  it('re-seeds the draft when the project query resolves with overrides', () => {
    seed('owner', 3);
    // First render: query pending -> resolver yields built-ins (the trap).
    const { rerender } = render(<OperationalRoleEditor projectId={PROJECT_ID} />);

    // Query resolves with the project's stored rename.
    resolverState.phase = 'loaded';
    rerender(<OperationalRoleEditor projectId={PROJECT_ID} />);

    expect(
      (screen.getByTestId('role-label-food_production') as HTMLInputElement).value,
    ).toBe('Grower');
  });

  it('an unmodified Save round-trips the stored overrides (never clobbers with [])', () => {
    seed('primary_steward', 3);
    const { rerender } = render(<OperationalRoleEditor projectId={PROJECT_ID} />);

    resolverState.phase = 'loaded';
    rerender(<OperationalRoleEditor projectId={PROJECT_ID} />);

    // Steward opens the editor and saves without touching anything.
    fireEvent.click(screen.getByTestId('save-roles'));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({
      id: PROJECT_ID,
      input: {
        operationalRoleDefs: [
          { slug: 'food_production', label: 'Grower', domains: ['soil', 'plants-food'] },
        ],
      },
    });
  });
});
