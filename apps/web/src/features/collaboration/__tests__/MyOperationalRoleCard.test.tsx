/**
 * @vitest-environment happy-dom
 *
 * MyOperationalRoleCard -- the viewer's self-service operational-role control
 * (ADR 2026-06-24). Store-direct: seed authStore (who am I) + memberStore (my
 * roster row), render, toggle a chip, read the row back. The write goes through
 * memberStore.setOperationalRoles, whose optimistic set survives the absent
 * backend (fetchMembers only overwrites on success), so the row reflects the
 * toggle synchronously.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ProjectMemberRecord } from '@ogden/shared';
import { useMemberStore } from '../../../store/memberStore.js';
import { useAuthStore } from '../../../store/authStore.js';
import MyOperationalRoleCard from '../MyOperationalRoleCard.js';

const PROJECT_ID = 'proj-test';
const USER_ID = '11111111-1111-1111-1111-111111111111';

function makeMember(over: Partial<ProjectMemberRecord> = {}): ProjectMemberRecord {
  return {
    userId: USER_ID,
    email: 'ali@example.nz',
    displayName: 'Ali Rahman',
    role: 'primary_steward',
    operationalRoles: [],
    joinedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function seedViewer(over: Partial<ProjectMemberRecord> = {}): void {
  useAuthStore.setState({
    user: {
      id: USER_ID,
      email: 'ali@example.nz',
      displayName: 'Ali Rahman',
      defaultOrgId: 'org-1',
      emailVerified: true,
    },
  });
  useMemberStore.setState({
    members: [makeMember(over)],
    myRole: 'primary_steward',
    myRoles: {},
    isLoading: false,
  });
}

function myRow(): ProjectMemberRecord | undefined {
  return useMemberStore.getState().members.find((m) => m.userId === USER_ID);
}

beforeEach(() => {
  useMemberStore.setState({ members: [], myRole: null, myRoles: {}, isLoading: false });
  useAuthStore.setState({ user: null });
  localStorage.clear();
});

describe('MyOperationalRoleCard', () => {
  it('renders nothing when the viewer has no member row', () => {
    useAuthStore.setState({
      user: {
        id: USER_ID,
        email: 'ali@example.nz',
        displayName: 'Ali Rahman',
        defaultOrgId: 'org-1',
        emailVerified: true,
      },
    });
    // members empty -> no own row -> null
    const { container } = render(<MyOperationalRoleCard projectId={PROJECT_ID} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('my-operational-role-card')).toBeNull();
  });

  it('shows the full-view preview when the viewer holds no roles', () => {
    seedViewer();
    render(<MyOperationalRoleCard projectId={PROJECT_ID} />);
    expect(screen.getByTestId('my-operational-role-card')).toBeTruthy();
    expect(screen.getByTestId('scope-preview-summary').textContent).toMatch(
      /full view/i,
    );
  });

  it('toggling a chip writes the viewer own row and updates the preview', () => {
    seedViewer();
    render(<MyOperationalRoleCard projectId={PROJECT_ID} />);

    const livestock = () => screen.getByRole('button', { name: 'Livestock Lead' });
    fireEvent.click(livestock());
    expect(myRow()?.operationalRoles).toEqual(['livestock']);
    expect(screen.getByTestId('scope-preview-summary').textContent).toMatch(/1 of 16/);

    // A second role stacks (union widens the scope).
    fireEvent.click(screen.getByRole('button', { name: 'Food Production Lead' }));
    expect(myRow()?.operationalRoles).toEqual(['livestock', 'food_production']);

    // Re-clicking removes just that one.
    fireEvent.click(livestock());
    expect(myRow()?.operationalRoles).toEqual(['food_production']);
  });

  it('seeds the chip active-state from the existing row', () => {
    seedViewer({ operationalRoles: ['finance_legal'] });
    render(<MyOperationalRoleCard projectId={PROJECT_ID} />);
    expect(
      screen.getByRole('button', { name: 'Finance & Legal Lead' }).getAttribute('data-active'),
    ).toBe('true');
    expect(
      screen.getByRole('button', { name: 'Livestock Lead' }).getAttribute('data-active'),
    ).toBe('false');
  });
});
