/**
 * @vitest-environment happy-dom
 *
 * PlanExecutionTrackerCard — workItemDraftStore hand-off banner.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import { useWorkItemDraftStore } from '../../../store/workItemDraftStore.js';
import PlanExecutionTrackerCard from '../PlanExecutionTrackerCard.js';
import type { LocalProject } from '../../../store/projectStore.js';

const PROJECT = { id: 'p1' } as LocalProject;

beforeEach(() => {
  localStorage.clear();
  useWorkItemStore.setState({ items: [] });
  useWorkItemDraftStore.setState({ draft: null });
});

describe('PlanExecutionTrackerCard — adherence draft banner', () => {
  it('renders no banner when draft is null', () => {
    render(<PlanExecutionTrackerCard project={PROJECT} onSwitchToMap={() => {}} />);
    expect(screen.queryByText(/make-good/i)).toBeNull();
  });

  it('renders the banner when a draft is present', () => {
    useWorkItemDraftStore.getState().setDraft({
      title: 'Make-good move — overgrazed paddock a',
      paddockId: 'a',
      source: 'rotation-adherence',
    });
    render(<PlanExecutionTrackerCard project={PROJECT} onSwitchToMap={() => {}} />);
    expect(screen.getByText(/make-good move/i)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /create work item/i }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeTruthy();
  });

  it('clicking Create work item calls addItem once and clears the draft', () => {
    useWorkItemDraftStore.getState().setDraft({
      title: 'Make-good move — overgrazed paddock a',
      paddockId: 'a',
      source: 'rotation-adherence',
    });
    render(<PlanExecutionTrackerCard project={PROJECT} onSwitchToMap={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /create work item/i }));
    const items = useWorkItemStore.getState().items;
    expect(items.length).toBe(1);
    expect(items[0]!.title).toMatch(/make-good/i);
    expect(items[0]!.projectId).toBe('p1');
    expect(items[0]!.status).toBe('todo');
    expect(useWorkItemDraftStore.getState().draft).toBeNull();
  });

  it('clicking Dismiss clears the draft without adding an item', () => {
    useWorkItemDraftStore.getState().setDraft({
      title: 'Make-good move — overgrazed paddock a',
      paddockId: 'a',
      source: 'rotation-adherence',
    });
    render(<PlanExecutionTrackerCard project={PROJECT} onSwitchToMap={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(useWorkItemStore.getState().items.length).toBe(0);
    expect(useWorkItemDraftStore.getState().draft).toBeNull();
  });
});
