// @vitest-environment happy-dom
/**
 * WorkItemRow -- steward link (Option 1) on the mark-done form.
 *
 * The Act work agenda is the one capture surface where a completed task can be
 * attributed back to a joined member. Work can only be assigned to a member
 * with a userId, so the picker is MEMBERS-ONLY (pending invites are excluded --
 * they have no userId to attribute to).
 *
 * Pins:
 *   - The picker appears in the mark-done form only when the roster has members.
 *   - Picking a member fills the free-text "Who" name AND records assigneeId on
 *     the spine (fulfilWorkItem).
 *   - A free-text actor records who with NO assigneeId (off-platform helper).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ProjectMemberRecord, WorkItem } from '@ogden/shared';

// lucide-react's CJS icon exports re-render as childless objects that React +
// happy-dom reject; replace each component export with a clean <svg> stub
// (established convention -- mirrors the capture suites).
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

import WorkItemRow from '../WorkItemRow.js';
import { useWorkItemStore } from '../../../../../store/workItemStore.js';
import { useMemberStore } from '../../../../../store/memberStore.js';

function wi(p: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'manual',
    overridden: false,
    createdAt: 'c',
    updatedAt: 'u',
    title: p.id,
    phaseId: null,
    status: 'todo',
    dependsOn: [],
    dependsOnAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    ...p,
  } as WorkItem;
}

const member: ProjectMemberRecord = {
  userId: '11111111-1111-1111-1111-111111111111',
  email: 'ali@example.nz',
  displayName: 'Ali Rahman',
  role: 'primary_steward',
  operationalRoles: [],
  joinedAt: '2026-01-01T00:00:00.000Z',
};

const TODAY = '2026-06-14';

beforeEach(() => {
  useWorkItemStore.setState({ items: [], migratedSources: [] });
  useMemberStore.setState({ members: [], myRole: null, myRoles: {}, isLoading: false });
});

function mount(item: WorkItem) {
  useWorkItemStore.setState({ items: [item], migratedSources: [] });
  return render(<WorkItemRow item={item} todayISO={TODAY} />);
}

describe('WorkItemRow -- steward link (Option 1)', () => {
  it('shows no picker when the roster has no members', () => {
    mount(wi({ id: 'w1', title: 'Mulch the swale' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark done' }));
    expect(
      screen.queryByRole('combobox', { name: 'Assign this work to a steward' }),
    ).toBeNull();
  });

  it('picking a member fills the name and records assigneeId on the spine', () => {
    useMemberStore.setState({ members: [member], myRole: null, myRoles: {}, isLoading: false });
    mount(wi({ id: 'w1', title: 'Mulch the swale' }));

    fireEvent.click(screen.getByRole('button', { name: 'Mark done' }));
    const picker = screen.getByRole('combobox', {
      name: 'Assign this work to a steward',
    }) as HTMLSelectElement;
    // 'u:<userId>' is the compact ref token for a joined member.
    fireEvent.change(picker, { target: { value: `u:${member.userId}` } });

    const who = screen.getByLabelText('Who') as HTMLInputElement;
    expect(who.value).toBe('Ali Rahman');

    fireEvent.click(screen.getByRole('button', { name: 'Save · mark done' }));
    const done = useWorkItemStore.getState().items[0]!;
    expect(done.status).toBe('done');
    expect(done.who).toBe('Ali Rahman');
    expect(done.assigneeId).toBe(member.userId);
  });

  it('a free-text actor records who with no assigneeId', () => {
    useMemberStore.setState({ members: [member], myRole: null, myRoles: {}, isLoading: false });
    mount(wi({ id: 'w1', title: 'Mulch the swale' }));

    fireEvent.click(screen.getByRole('button', { name: 'Mark done' }));
    const who = screen.getByLabelText('Who') as HTMLInputElement;
    fireEvent.change(who, { target: { value: 'Off-platform helper' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save · mark done' }));
    const done = useWorkItemStore.getState().items[0]!;
    expect(done.who).toBe('Off-platform helper');
    expect('assigneeId' in done).toBe(false);
  });
});
