/**
 * @vitest-environment happy-dom
 *
 * OperationalRoleEditor -- the owner / primary-steward control that renames +
 * re-scopes the six operational roles for a project (ADR 2026-06-24, Option C).
 * Store-direct: seed memberStore (my system role + roster size for the solo
 * gate). The resolver hook (React Query) and the save mutation are stubbed, so
 * the test exercises the editor's own logic: the admin/solo gate, the minimal
 * override payload it sends, the orphan-domain warning, and reset-to-default.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ProjectMemberRecord, ProjectRole } from '@ogden/shared';
import { useMemberStore } from '../../../store/memberStore.js';
import { useAuthStore } from '../../../store/authStore.js';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

// Stub the save mutation -- assert the payload, no React Query plumbing needed.
vi.mock('../../../hooks/useProjectQueries.js', () => ({
  useSetOperationalRoleDefs: () => ({ mutate, isPending: false }),
}));

// Stub the resolver to the real built-ins (no QueryClientProvider).
vi.mock('../../../v3/roles/useResolvedOperationalRoles.js', async () => {
  const shared =
    await vi.importActual<typeof import('@ogden/shared')>('@ogden/shared');
  return {
    useResolvedOperationalRoles: () => ({
      defs: shared.resolveOperationalRoleDefs(),
      domainsMap: shared.resolveOperationalRoleDomains(),
    }),
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

/** Seed the viewer's system role + a roster of `count` members (solo gate). */
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
  useMemberStore.setState({ members: [], myRole: null, myRoles: {}, isLoading: false });
  useAuthStore.setState({ user: null });
  localStorage.clear();
});

describe('OperationalRoleEditor -- gating', () => {
  it('renders nothing for a non-admin viewer', () => {
    seed('team_member', 3);
    const { container } = render(<OperationalRoleEditor projectId={PROJECT_ID} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on a solo project (lone steward)', () => {
    seed('primary_steward', 1);
    const { container } = render(<OperationalRoleEditor projectId={PROJECT_ID} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders for an owner on a multi-member project', () => {
    seed('owner', 3);
    render(<OperationalRoleEditor projectId={PROJECT_ID} />);
    expect(screen.getByTestId('operational-role-editor')).toBeTruthy();
    // One label input per built-in role, seeded with its built-in label.
    expect(
      (screen.getByTestId('role-label-food_production') as HTMLInputElement).value,
    ).toBe('Food Production Lead');
  });
});

describe('OperationalRoleEditor -- save payload', () => {
  it('sends the minimal override for a rename + re-scope', () => {
    seed('primary_steward', 3); // primary_steward is also an admin
    render(<OperationalRoleEditor projectId={PROJECT_ID} />);

    fireEvent.change(screen.getByTestId('role-label-food_production'), {
      target: { value: 'Grower' },
    });
    // Add `soil` to food_production (built-in is {plants-food}).
    fireEvent.click(screen.getByTestId('domain-food_production-soil'));

    fireEvent.click(screen.getByTestId('save-roles'));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({
      id: PROJECT_ID,
      input: {
        operationalRoleDefs: [
          {
            slug: 'food_production',
            label: 'Grower',
            domains: ['soil', 'plants-food'],
          },
        ],
      },
    });
  });

  it('sends an empty payload when nothing was changed', () => {
    seed('owner', 3);
    render(<OperationalRoleEditor projectId={PROJECT_ID} />);
    fireEvent.click(screen.getByTestId('save-roles'));
    expect(mutate).toHaveBeenCalledWith({
      id: PROJECT_ID,
      input: { operationalRoleDefs: [] },
    });
  });
});

describe('OperationalRoleEditor -- orphan warning', () => {
  it('warns (advisory) when a re-scope leaves a domain owned by no role', () => {
    seed('owner', 3);
    render(<OperationalRoleEditor projectId={PROJECT_ID} />);

    expect(screen.queryByTestId('orphan-warning')).toBeNull();
    // Remove plants-food from its only owner.
    fireEvent.click(screen.getByTestId('domain-food_production-plants-food'));
    expect(screen.getByTestId('orphan-warning')).toBeTruthy();
    expect(screen.getByTestId('orphan-warning').textContent).toMatch(
      /Plants, Crops & Food Systems/,
    );
  });
});

describe('OperationalRoleEditor -- reset', () => {
  it('reset-all restores built-in labels and yields an empty payload', () => {
    seed('owner', 3);
    render(<OperationalRoleEditor projectId={PROJECT_ID} />);

    fireEvent.change(screen.getByTestId('role-label-food_production'), {
      target: { value: 'Grower' },
    });
    fireEvent.click(screen.getByTestId('reset-all'));

    expect(
      (screen.getByTestId('role-label-food_production') as HTMLInputElement).value,
    ).toBe('Food Production Lead');

    fireEvent.click(screen.getByTestId('save-roles'));
    expect(mutate).toHaveBeenCalledWith({
      id: PROJECT_ID,
      input: { operationalRoleDefs: [] },
    });
  });
});
