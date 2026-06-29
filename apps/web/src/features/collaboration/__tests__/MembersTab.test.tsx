/**
 * @vitest-environment happy-dom
 *
 * MembersTab -- per-member operational-role chips (pre-push review MAJOR).
 *
 * The roster chips must show each project's PROJECT-NATURAL role name (Option C
 * rename), not the static built-in label. Before the fix MembersTab read
 * `OPERATIONAL_ROLE_DEFS[slug].label` directly, so an owner who renamed a role
 * in the editor mounted at the top of this very tab still saw the built-in name
 * on the member chips below. This pins the chips to `useResolvedOperationalRoles`.
 *
 * The child collaboration cards and the solo check are stubbed so the test
 * isolates the chip rendering; the resolver is stubbed to a renamed label.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LocalProject } from '../../../store/projectStore.js';
import type { ProjectMemberRecord, ProjectRole } from '@ogden/shared';
import { useMemberStore } from '../../../store/memberStore.js';
import { useAuthStore } from '../../../store/authStore.js';

// Isolate the roster: stub the sibling cards + the solo check.
vi.mock('../UserManagementReadinessCard.js', () => ({ default: () => null }));
vi.mock('../MyOperationalRoleCard.js', () => ({ default: () => null }));
vi.mock('../OperationalRoleEditor.js', () => ({ default: () => null }));
vi.mock('../FirstMemberRolePrompt.js', () => ({ default: () => null }));
vi.mock('../useIsSoloProject.js', () => ({ useIsSoloProject: () => false }));

// Project renamed food_production -> "Grower"; the resolver hands the chips
// the project-natural label.
vi.mock('../../../v3/roles/useResolvedOperationalRoles.js', async () => {
  const shared =
    await vi.importActual<typeof import('@ogden/shared')>('@ogden/shared');
  return {
    useResolvedOperationalRoles: () => ({
      isLoading: false,
      labelFor: (slug: keyof typeof shared.OPERATIONAL_ROLE_DEFS) =>
        slug === 'food_production'
          ? 'Grower'
          : shared.OPERATIONAL_ROLE_DEFS[slug].label,
    }),
  };
});

import MembersTab from '../MembersTab.js';

const ME = '11111111-1111-1111-1111-111111111111';
const PROJECT: LocalProject = { id: 'proj-test' } as unknown as LocalProject;

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

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: ME,
      email: 'me@example.nz',
      displayName: 'Me',
      defaultOrgId: 'org-1',
      emailVerified: true,
    },
  });
  useMemberStore.setState({
    members: [
      member(ME, { role: 'owner' as ProjectRole }),
      member('u1', { role: 'designer' as ProjectRole, operationalRoles: ['food_production'] }),
    ],
    myRole: 'owner',
    myRoles: {},
    isLoading: false,
    // No-op the fetch effects so they don't clobber the seeded roster.
    fetchMembers: vi.fn(),
    fetchMyRole: vi.fn(),
    inviteMember: vi.fn(),
    updateRole: vi.fn(),
    removeMember: vi.fn(),
  });
});

describe('MembersTab -- operational-role chips', () => {
  it('renders the project-resolved (renamed) label, not the built-in', () => {
    render(<MembersTab project={PROJECT} />);
    expect(screen.getByText('Grower')).toBeTruthy();
    expect(screen.queryByText('Food Production Lead')).toBeNull();
  });
});
