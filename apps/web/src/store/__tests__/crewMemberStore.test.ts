// @vitest-environment happy-dom
/**
 * crewMemberStore — plain projectId-tagged CRUD (Sub-project D2).
 * No Goal-Compass preservation contract (crew is steward-authored only).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCrewMemberStore } from '../crewMemberStore.js';
import type { CrewMember } from '@ogden/shared';

function cm(partial: Partial<CrewMember> & { id: string }): CrewMember {
  return {
    projectId: 'p1',
    name: partial.id,
    skillLevel: 'general',
    weeklyHoursCap: 40,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  } as CrewMember;
}

const reset = () => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useCrewMemberStore.setState({ members: [] });
};

describe('crewMemberStore', () => {
  beforeEach(reset);

  it('adds, updates (bumps updatedAt), and deletes members', () => {
    const s = useCrewMemberStore.getState();
    s.addMember(cm({ id: 'a', name: 'Aisha' }));
    expect(useCrewMemberStore.getState().members).toHaveLength(1);

    useCrewMemberStore.getState().updateMember('a', { weeklyHoursCap: 20 });
    const updated = useCrewMemberStore.getState().members[0]!;
    expect(updated.weeklyHoursCap).toBe(20);
    expect(updated.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');

    useCrewMemberStore.getState().deleteMember('a');
    expect(useCrewMemberStore.getState().members).toHaveLength(0);
  });

  it('scopes getProjectMembers to a single project', () => {
    useCrewMemberStore.setState({
      members: [
        cm({ id: 'a', projectId: 'p1' }),
        cm({ id: 'b', projectId: 'p1' }),
        cm({ id: 'c', projectId: 'p2' }),
      ],
    });
    expect(
      useCrewMemberStore.getState().getProjectMembers('p1').map((m) => m.id),
    ).toEqual(['a', 'b']);
    expect(
      useCrewMemberStore.getState().getProjectMembers('p2').map((m) => m.id),
    ).toEqual(['c']);
  });
});
