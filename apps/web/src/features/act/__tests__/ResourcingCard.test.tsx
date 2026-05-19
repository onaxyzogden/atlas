/**
 * @vitest-environment happy-dom
 *
 * ResourcingCard — D2 hardening §4 (per
 * docs/superpowers/specs/2026-05-18-d2-resourcing-design.md).
 *
 * The engine-layer covenant (no cost/hours emitted) is already pinned in
 * packages/shared resourcingConflicts.test.ts. This pins it at the UI
 * layer and proves the surface mounts and badges over-capacity:
 *   1. mounts without throwing;
 *   2. renders the over-capacity badge for a seeded over-cap crew member;
 *   3. emits NO cost/currency string anywhere in the rendered output
 *      (covenant boundary asserted on the rendered DOM, not only the
 *      engine). "Budget" is deliberately NOT in the forbidden set — the
 *      card's lede legitimately points the steward to D3's Budget-vs-
 *      actuals; the covenant is about cost VALUES, not the pointer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { WorkItem } from '@ogden/shared';
import type { CrewMember } from '@ogden/shared';
import type { LocalProject } from '../../../store/projectStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import { useCrewMemberStore } from '../../../store/crewMemberStore.js';
import ResourcingCard from '../ResourcingCard.js';

const PROJECT = { id: 'p1' } as LocalProject;

function wi(p: Partial<WorkItem> & { id: string }): WorkItem {
  return {
    projectId: 'p1',
    source: 'goal-compass',
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

const cm = (id: string, cap: number): CrewMember =>
  ({
    id,
    projectId: 'p1',
    name: id,
    skillLevel: 'general',
    weeklyHoursCap: cap,
    createdAt: 'c',
    updatedAt: 'u',
  }) as CrewMember;

beforeEach(() => {
  localStorage.clear();
  useWorkItemStore.setState({ items: [] });
  useCrewMemberStore.setState({ members: [] });
});

describe('ResourcingCard — D2 UI hardening', () => {
  it('mounts without throwing', () => {
    const { container } = render(
      <ResourcingCard project={PROJECT} onSwitchToMap={() => {}} />,
    );
    expect(container).toBeTruthy();
    expect(screen.getByText('Resourcing')).toBeTruthy();
  });

  it('renders the over-capacity badge for an over-cap crew member', () => {
    useCrewMemberStore.setState({ members: [cm('m1', 40)] });
    useWorkItemStore.setState({
      items: [
        wi({
          id: 'a',
          assigneeId: 'm1',
          laborHrs: 50,
          scheduledStart: '2026-06-01',
        }),
      ],
    });

    render(<ResourcingCard project={PROJECT} onSwitchToMap={() => {}} />);

    // Over-capacity is surfaced (crew row pill + the workload section row).
    expect(screen.getAllByText(/over capacity/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/50h vs 40h cap/i)).toBeTruthy();
  });

  it('renders no cost / currency string anywhere (covenant at the UI layer)', () => {
    useCrewMemberStore.setState({ members: [cm('m1', 40)] });
    useWorkItemStore.setState({
      items: [
        wi({
          id: 'a',
          assigneeId: 'm1',
          laborHrs: 50,
          scheduledStart: '2026-06-01',
          scheduledEnd: '2026-06-10',
          equipmentRequired: ['tractor'],
          materials: [{ label: 'Mulch', unit: 'm3', quantityPerAcre: 2 }],
        }),
      ],
    });

    const { container } = render(
      <ResourcingCard project={PROJECT} onSwitchToMap={() => {}} />,
    );

    const text = container.textContent ?? '';
    expect(text).not.toMatch(/[$€£]|\bcost\b|\busd\b|\bwage\b|\bprice\b/i);
  });
});
