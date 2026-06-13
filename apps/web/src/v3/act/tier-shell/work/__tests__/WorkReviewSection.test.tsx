/**
 * @vitest-environment happy-dom
 *
 * WorkReviewSection — the operator review-and-confirm surface for generated
 * livestock work proposals.
 *
 * Covenant pins:
 *   - Rendering proposals NEVER writes the spine; the operator's Confirm is
 *     the only writer and writes exactly one 'livestock-plan' row.
 *   - Amanah scopeNotes render VERBATIM on the proposal row AND in the bulk
 *     confirm overlay (never reworded or truncated).
 *   - Dismiss removes the row from the proposed list without touching the
 *     spine; Restore brings it back.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { CommunityWorkInstance, LivestockWorkInstance } from '@ogden/shared';
import { useLivestockWorkPlanStore } from '../../../../../store/livestockWorkPlanStore.js';
import { useCommunityWorkPlanStore } from '../../../../../store/communityWorkPlanStore.js';
import { useWorkItemStore } from '../../../../../store/workItemStore.js';
import WorkReviewSection from '../WorkReviewSection.js';

const P = 'p1';
const SCOPE =
  'Amanah: sale of livestock not yet possessed is bayʿ mā laysa ʿindak — forbidden.';

function inst(
  key: string,
  over: Partial<LivestockWorkInstance> = {},
): LivestockWorkInstance {
  return {
    key,
    ruleKey: key.slice(0, key.lastIndexOf('__')),
    dueDate: key.slice(key.lastIndexOf('__') + 2),
    kind: 'welfare-check',
    title: 'Weekly welfare & condition check',
    sourceKind: 'husbandry',
    inputsHash: 'hash0001',
    ...over,
  };
}

const K1 = 'lvp__husbandry__welfare-weekly__2026-06-15';
const K2 = 'lvp__husbandry__welfare-weekly__2026-06-22';

function communityInst(
  key: string,
  over: Partial<CommunityWorkInstance> = {},
): CommunityWorkInstance {
  return {
    key,
    ruleKey: key.slice(0, key.lastIndexOf('__')),
    dueDate: key.slice(key.lastIndexOf('__') + 2),
    kind: 'governance-meeting',
    title: 'Quarterly governance meeting',
    inputsHash: 'chash0001',
    ...over,
  };
}

const CK1 = 'cwp__governance__meeting-q1__2026-07-01';
const CK2 = 'cwp__governance__meeting-q2__2026-10-01';

const plan = () => useLivestockWorkPlanStore.getState();
const community = () => useCommunityWorkPlanStore.getState();
const spine = () => useWorkItemStore.getState();

beforeEach(() => {
  useLivestockWorkPlanStore.setState({ rules: [], proposals: [] });
  useCommunityWorkPlanStore.setState({ rules: [], proposals: [] });
  useWorkItemStore.setState({ items: [], migratedSources: [] });
});

describe('WorkReviewSection', () => {
  it('renders nothing when the project has no proposals', () => {
    render(<WorkReviewSection projectId={P} />);
    expect(screen.queryByTestId('work-review-section')).toBeNull();
  });

  it('renders proposed rows with VERBATIM scopeNotes and never writes the spine', () => {
    plan().applyGeneration(P, {
      rules: [],
      instances: [inst(K1, { scopeNotes: SCOPE })],
    });
    render(<WorkReviewSection projectId={P} />);
    expect(screen.getAllByTestId('work-proposal-row')).toHaveLength(1);
    expect(
      screen.getByTestId('work-proposal-scope-notes').textContent,
    ).toBe(SCOPE);
    // Sovereign steward: rendering/generation never touches the spine.
    expect(spine().items).toEqual([]);
  });

  it('Confirm writes exactly one livestock-plan spine row', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1)] });
    render(<WorkReviewSection projectId={P} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(spine().items).toHaveLength(1);
    expect(spine().items[0]).toMatchObject({
      id: `lvw__${K1}`,
      projectId: P,
      source: 'livestock-plan',
      status: 'todo',
    });
  });

  it('Confirm all routes through the overlay with VERBATIM flagged scopeNotes', () => {
    plan().applyGeneration(P, {
      rules: [],
      instances: [inst(K1, { scopeNotes: SCOPE }), inst(K2)],
    });
    render(<WorkReviewSection projectId={P} />);
    fireEvent.click(screen.getByTestId('work-confirm-all'));
    // Overlay opens — nothing written yet.
    expect(screen.getByTestId('work-bulk-confirm-overlay')).toBeTruthy();
    expect(spine().items).toEqual([]);
    const amanahRows = screen.getAllByTestId('work-bulk-amanah-row');
    expect(amanahRows).toHaveLength(1);
    expect(amanahRows[0]!.textContent).toContain(SCOPE);
    fireEvent.click(screen.getByTestId('work-bulk-confirm'));
    expect(spine().items).toHaveLength(2);
    expect(plan().proposals.every((p) => p.status === 'confirmed')).toBe(true);
  });

  it('needs-review "changed": flag renders, nothing moves until the operator resolves', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1)] });
    render(<WorkReviewSection projectId={P} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    // Regeneration with different content → 'changed' flag (advisory only).
    act(() => {
      plan().applyGeneration(P, {
        rules: [],
        instances: [
          inst(K1, {
            title: 'Fortnightly welfare check',
            inputsHash: 'hash0002',
          }),
        ],
      });
    });
    const row = screen.getByTestId('work-needs-review-row');
    expect(row.textContent).toContain('plan changed');
    expect(row.textContent).toContain('Fortnightly welfare check');
    // Confirmed-never-mutated: the spine row is untouched by the regeneration.
    expect(spine().items[0]!.title).toBe('Weekly welfare & condition check');
    fireEvent.click(screen.getByRole('button', { name: 'Accept update' }));
    expect(spine().items[0]!.title).toBe('Fortnightly welfare check');
    expect(screen.queryByTestId('work-needs-review-row')).toBeNull();
  });

  it('needs-review "orphaned": Cancel work cancels the spine row (kept for audit)', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1)] });
    render(<WorkReviewSection projectId={P} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    act(() => {
      plan().applyGeneration(P, { rules: [], instances: [] });
    });
    const row = screen.getByTestId('work-needs-review-row');
    expect(row.textContent).toContain('orphaned');
    // Orphaned has no regenerated instance to accept.
    expect(screen.queryByRole('button', { name: 'Accept update' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel work' }));
    expect(spine().items).toHaveLength(1);
    expect(spine().items[0]!.status).toBe('cancelled');
    expect(plan().proposals[0]!.status).toBe('dismissed');
  });

  it('needs-review "Keep mine": flag clears, spine untouched', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1)] });
    render(<WorkReviewSection projectId={P} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    act(() => {
      plan().applyGeneration(P, { rules: [], instances: [] });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }));
    expect(screen.queryByTestId('work-needs-review-row')).toBeNull();
    expect(spine().items[0]!.status).toBe('todo');
    expect(plan().proposals[0]!.status).toBe('confirmed');
  });

  it('Dismiss keeps the spine untouched; Restore re-proposes', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1)] });
    render(<WorkReviewSection projectId={P} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(spine().items).toEqual([]);
    expect(screen.queryAllByTestId('work-proposal-row')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /1 dismissed/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(plan().proposals[0]!.status).toBe('proposed');
  });
});

describe('WorkReviewSection — dual-store (Phase 5)', () => {
  it('both domains populated → two headed lists, each showing its own proposals', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1)] });
    community().applyGeneration(P, {
      rules: [],
      instances: [communityInst(CK1)],
    });
    render(<WorkReviewSection projectId={P} />);

    const headings = screen.getAllByTestId('work-review-domain-heading');
    expect(headings).toHaveLength(2);
    expect(headings[0]!.textContent).toBe('Livestock plan');
    expect(headings[1]!.textContent).toBe('Community plan');

    // Each list shows its own proposal row.
    const rows = screen.getAllByTestId('work-proposal-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain('Weekly welfare & condition check');
    expect(rows[1]!.textContent).toContain('Quarterly governance meeting');
  });

  it('community-only → no domain headings, identical structure to livestock-only', () => {
    community().applyGeneration(P, {
      rules: [],
      instances: [communityInst(CK1)],
    });
    render(<WorkReviewSection projectId={P} />);

    // No domain headings when only one domain has content.
    expect(screen.queryAllByTestId('work-review-domain-heading')).toHaveLength(0);

    // Standard proposal row and section still render.
    expect(screen.getByTestId('work-review-section')).toBeTruthy();
    const rows = screen.getAllByTestId('work-proposal-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.textContent).toContain('Quarterly governance meeting');
  });

  it('community Confirm mutates community store only, not livestock store', () => {
    community().applyGeneration(P, {
      rules: [],
      instances: [communityInst(CK1)],
    });
    render(<WorkReviewSection projectId={P} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    // Community spine row created with community-plan source.
    expect(spine().items).toHaveLength(1);
    expect(spine().items[0]).toMatchObject({
      id: `cmw__${CK1}`,
      projectId: P,
      source: 'community-plan',
      status: 'todo',
    });

    // Livestock store untouched.
    expect(plan().proposals).toHaveLength(0);
    // Community proposal is confirmed.
    expect(community().proposals[0]!.status).toBe('confirmed');
  });

  it('community Dismiss mutates community store; Restore re-proposes via community store', () => {
    community().applyGeneration(P, {
      rules: [],
      instances: [communityInst(CK1)],
    });
    render(<WorkReviewSection projectId={P} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(spine().items).toEqual([]);
    expect(community().proposals[0]!.status).toBe('dismissed');
    fireEvent.click(screen.getByRole('button', { name: /1 dismissed/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(community().proposals[0]!.status).toBe('proposed');
    expect(plan().proposals).toHaveLength(0);
  });

  it('community proposal with scopeNotes shows verbatim text in Confirm-all overlay', () => {
    community().applyGeneration(P, {
      rules: [],
      instances: [
        communityInst(CK1, { scopeNotes: SCOPE }),
        communityInst(CK2),
      ],
    });
    render(<WorkReviewSection projectId={P} />);
    fireEvent.click(screen.getByTestId('work-confirm-all'));

    // Overlay opens — nothing written yet.
    expect(screen.getByTestId('work-bulk-confirm-overlay')).toBeTruthy();
    expect(spine().items).toEqual([]);

    const amanahRows = screen.getAllByTestId('work-bulk-amanah-row');
    expect(amanahRows).toHaveLength(1);
    expect(amanahRows[0]!.textContent).toContain(SCOPE);

    fireEvent.click(screen.getByTestId('work-bulk-confirm'));
    expect(spine().items).toHaveLength(2);
    expect(
      community().proposals.every((p) => p.status === 'confirmed'),
    ).toBe(true);
    // Livestock store still untouched.
    expect(plan().proposals).toHaveLength(0);
  });
});
