/**
 * @vitest-environment happy-dom
 *
 * OperatingDashboardCard — D5 render-only composition surface.
 * Asserts lights + ranked recommendations render from seeded
 * multi-signal data, the empty "on track" state, deep-link target
 * labels present, and no cost/financing string on the surface.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { WorkItem } from '@ogden/shared';
import type { LocalProject } from '../../../store/projectStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import { useCrewMemberStore } from '../../../store/crewMemberStore.js';
import { useWorkItemBudgetStore } from '../../../store/workItemBudgetStore.js';
import { useProofEventStore } from '../../../store/proofEventStore.js';
import OperatingDashboardCard from '../OperatingDashboardCard.js';

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

beforeEach(() => {
  localStorage.clear();
  useWorkItemStore.setState({ items: [] });
  useCrewMemberStore.setState({ members: [] });
  useWorkItemBudgetStore.setState({ actuals: [] });
  useProofEventStore.setState({ events: [] });
});

describe('OperatingDashboardCard — D5', () => {
  it('renders the on-track empty state with no signals', () => {
    render(<OperatingDashboardCard project={PROJECT} onSwitchToMap={() => {}} />);
    expect(screen.getByText(/on track/i)).toBeTruthy();
  });

  it('renders an overdue recommendation deep-linking the Plan tracker', () => {
    useWorkItemStore.setState({
      items: [wi({ id: 'a', status: 'todo', scheduledEnd: '2020-01-01' })],
    });
    render(<OperatingDashboardCard project={PROJECT} onSwitchToMap={() => {}} />);
    expect(screen.getByText(/past scheduled end/i)).toBeTruthy();
    expect(screen.getByText(/Plan tracker/i)).toBeTruthy();
  });

  it('renders four health lights', () => {
    render(<OperatingDashboardCard project={PROJECT} onSwitchToMap={() => {}} />);
    expect(screen.getByText(/Schedule/i)).toBeTruthy();
    expect(screen.getByText(/Resourcing/i)).toBeTruthy();
    expect(screen.getByText(/Budget/i)).toBeTruthy();
    expect(screen.getByText(/Proof/i)).toBeTruthy();
  });

  it('renders no financing/capital lexicon on the surface', () => {
    useWorkItemStore.setState({
      items: [wi({ id: 'a', status: 'done' })],
    });
    const { container } = render(
      <OperatingDashboardCard project={PROJECT} onSwitchToMap={() => {}} />,
    );
    expect(container.textContent ?? '').not.toMatch(
      /interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i,
    );
  });
});
