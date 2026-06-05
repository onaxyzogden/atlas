/**
 * @vitest-environment happy-dom
 *
 * ActFlowConnectorPopover -- the rail-activated, Modal-based list-capture form
 * that authors a closed-loop material flow (default materialKind `greywater`)
 * into closedLoopStore from the Act tools rail.
 *
 * Verified behaviours:
 *   1. When the Act flow popover store is open, the Modal renders with the
 *      Material select defaulting to `greywater`.
 *   2. Save is disabled until a label + both endpoints are filled; filling the
 *      label + free-text From/To enables it.
 *   3. Saving calls addMaterialFlow with origin 'list', materialKind 'greywater',
 *      the greywater color, and the free-text endpoints landing in
 *      sourceLabel/sinkLabel with null ids.
 *   4. A blank label keeps Save disabled.
 *
 * The component reads `open`/`close` from useActFlowPopoverStore and
 * addMaterialFlow from useClosedLoopStore; useFlowEndpointOptions resolves to []
 * with empty stores, so these tests exercise the free-text ("Other...") path.
 * No lucide-react import is needed (Modal has no lucide dependency).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ActFlowConnectorPopover from '../ActFlowConnectorPopover.js';
import { useActFlowPopoverStore } from '../actFlowPopoverStore.js';
import { useClosedLoopStore } from '../../../../store/closedLoopStore.js';

const FREE = '__free__';

function openPopover() {
  useActFlowPopoverStore.setState({ open: true });
}

describe('ActFlowConnectorPopover', () => {
  beforeEach(() => {
    useActFlowPopoverStore.setState({ open: false });
  });

  /** selects order: [Material, From, To]. */
  function getSelects(): [HTMLSelectElement, HTMLSelectElement, HTMLSelectElement] {
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const [material, from, to] = selects;
    if (!material || !from || !to) {
      throw new Error(`expected 3 selects, got ${selects.length}`);
    }
    return [material, from, to];
  }

  it('defaults the Material select to greywater when open', () => {
    openPopover();
    render(<ActFlowConnectorPopover projectId="p1" />);
    const [material] = getSelects();
    expect(material.value).toBe('greywater');
  });

  it('disables Save with a blank label and enables it once label + endpoints are filled', () => {
    openPopover();
    render(<ActFlowConnectorPopover projectId="p1" />);
    const save = screen.getByRole('button', { name: 'Add flow' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    const [, from, to] = getSelects();
    fireEvent.change(from, { target: { value: FREE } });
    fireEvent.change(to, { target: { value: FREE } });
    // Label still blank -> still disabled.
    expect(save.disabled).toBe(true);

    const labelInput = screen.getByPlaceholderText(
      'e.g. Kitchen greywater to orchard',
    );
    fireEvent.change(labelInput, { target: { value: 'Kitchen greywater to orchard' } });
    fireEvent.change(screen.getByPlaceholderText('Source description'), {
      target: { value: 'Kitchen sink' },
    });
    fireEvent.change(screen.getByPlaceholderText('Sink description'), {
      target: { value: 'Orchard swale' },
    });
    expect(save.disabled).toBe(false);
  });

  it('shows the no-features credit guidance when the project has no mapped features', () => {
    // useFlowEndpointOptions resolves to [] with empty stores, so pinning is
    // impossible -> the guidance must adapt rather than nag the steward to pin.
    openPopover();
    render(<ActFlowConnectorPopover projectId="p1" />);
    expect(
      screen.getByText(/No mapped features in this project yet/i),
    ).toBeTruthy();
    // The free-text / prompt copy and the earned copy must NOT show in this state.
    expect(screen.queryByText(/Pin BOTH endpoints/i)).toBeNull();
    expect(
      screen.queryByText(/both endpoints are mapped features/i),
    ).toBeNull();
  });

  it('keeps the flow non-earned (no closed-loop credit) when both endpoints are free text', () => {
    openPopover();
    render(<ActFlowConnectorPopover projectId="p1" />);
    const [, from, to] = getSelects();
    fireEvent.change(from, { target: { value: FREE } });
    fireEvent.change(to, { target: { value: FREE } });
    // No structured options exist, so even with both endpoints chosen (free text)
    // the state stays no-features, never earned.
    expect(
      screen.queryByText(/both endpoints are mapped features/i),
    ).toBeNull();
    expect(
      screen.getByText(/No mapped features in this project yet/i),
    ).toBeTruthy();
  });

  it('Save calls addMaterialFlow with origin list + greywater color + free-text endpoints', () => {
    const addSpy = vi.fn();
    useClosedLoopStore.setState({ addMaterialFlow: addSpy });
    openPopover();
    render(<ActFlowConnectorPopover projectId="p1" />);

    const [, from, to] = getSelects();
    fireEvent.change(from, { target: { value: FREE } });
    fireEvent.change(to, { target: { value: FREE } });
    fireEvent.change(
      screen.getByPlaceholderText('e.g. Kitchen greywater to orchard'),
      { target: { value: '  Kitchen greywater to orchard  ' } },
    );
    fireEvent.change(screen.getByPlaceholderText('Source description'), {
      target: { value: 'Kitchen sink' },
    });
    fireEvent.change(screen.getByPlaceholderText('Sink description'), {
      target: { value: 'Orchard swale' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));

    expect(addSpy).toHaveBeenCalledTimes(1);
    const firstCall = addSpy.mock.calls[0];
    if (!firstCall) throw new Error('addMaterialFlow was not called');
    const flow = firstCall[0];
    expect(flow.projectId).toBe('p1');
    expect(flow.label).toBe('Kitchen greywater to orchard');
    expect(flow.materialKind).toBe('greywater');
    expect(flow.origin).toBe('list');
    expect(flow.color).toBe('#5aa0a8');
    expect(flow.sourceId).toBeNull();
    expect(flow.sinkId).toBeNull();
    expect(flow.sourceLabel).toBe('Kitchen sink');
    expect(flow.sinkLabel).toBe('Orchard swale');
    // Popover closes after a successful save.
    expect(useActFlowPopoverStore.getState().open).toBe(false);
  });
});
