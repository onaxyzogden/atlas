/**
 * @vitest-environment happy-dom
 *
 * InlineFeaturePopover — exit-fade contract.
 *
 * The 2026-05-30 Slice J ship gives the click-driven inline form the same
 * deferred-unmount fade as the host-canopy-union tooltip: when
 * `useInlineFormStore.active` flips to null (save / cancel / outside-click /
 * ESC), the form stays mounted with `data-exiting='true'` until either the
 * opacity transitionend fires or a 200ms safety timeout elapses. These
 * tests pin that contract without exercising the full schema-driven render
 * — every field-rendering test path remains a separate concern.
 *
 * Asserts:
 *   - active=null with no prior store value renders nothing (cold start)
 *   - open(payload) mounts the form with data-visible='true' (the
 *     useLayoutEffect mount-flip)
 *   - close() flips data-visible off and data-exiting='true' (exit phase
 *     engaged; CSS pointer-events:none then blocks interactions)
 *   - opacity transitionend during exit clears the displayed mirror
 *     (form unmounts)
 *   - transform transitionend during exit does NOT clear (the propertyName
 *     filter must distinguish opacity from transform)
 *   - reverse-in-flight: open() during the exit window restores the form
 *     (no spurious unmount when the steward re-opens the same tool)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, createEvent, act } from '@testing-library/react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import InlineFeaturePopover from '../InlineFeaturePopover.js';
import {
  useInlineFormStore,
  type InlineFormPayload,
} from '../inlineFormStore.js';

function fireTransitionEnd(el: Element, propertyName: string): void {
  const ev = createEvent.transitionEnd(el, {});
  Object.defineProperty(ev, 'propertyName', { value: propertyName });
  fireEvent(el, ev);
}

// Minimal payload — the popover's only structural requirement is title +
// fields. The actual fields aren't relevant to the fade contract.
function makePayload(overrides: Partial<InlineFormPayload> = {}): InlineFormPayload {
  return {
    title: 'Test Form',
    anchor: [0, 0],
    fields: [
      { kind: 'text', key: 'name', label: 'Name', required: false } as never,
    ],
    initial: { name: '' },
    onSave: () => {},
    onCancel: () => {},
    ...overrides,
  };
}

// The popover never actually reads from the map prop — it's retained only
// so existing call sites typecheck. An empty object cast suffices.
const fakeMap = {} as MaplibreMap;

describe('InlineFeaturePopover — exit fade', () => {
  beforeEach(() => {
    useInlineFormStore.setState({ active: null });
  });

  it('renders nothing when active is null and no displayed history', () => {
    render(<InlineFeaturePopover map={fakeMap} />);
    expect(screen.queryByTestId('inline-feature-popover')).toBeNull();
  });

  it('mounts with data-visible="true" after useLayoutEffect flip', () => {
    render(<InlineFeaturePopover map={fakeMap} />);
    act(() => {
      useInlineFormStore.getState().open(makePayload());
    });
    const form = screen.getByTestId('inline-feature-popover');
    expect(form.getAttribute('data-visible')).toBe('true');
    expect(form.hasAttribute('data-exiting')).toBe(false);
  });

  it('flips data-exiting on close() and unmounts after opacity transitionend', () => {
    render(<InlineFeaturePopover map={fakeMap} />);
    act(() => {
      useInlineFormStore.getState().open(makePayload());
    });
    expect(screen.getByTestId('inline-feature-popover')).toBeTruthy();

    act(() => {
      useInlineFormStore.getState().close();
    });

    const form = screen.getByTestId('inline-feature-popover');
    expect(form.getAttribute('data-exiting')).toBe('true');
    expect(form.hasAttribute('data-visible')).toBe(false);

    // Transform-property transitionend (the other interpolated property)
    // must NOT trigger unmount — the propertyName filter keeps unmount
    // tied to opacity so the form doesn't disappear mid-translate.
    fireTransitionEnd(form, 'transform');
    expect(screen.queryByTestId('inline-feature-popover')).toBeTruthy();

    fireTransitionEnd(form, 'opacity');
    expect(screen.queryByTestId('inline-feature-popover')).toBeNull();
  });

  it('reverse-in-flight: open() during exit restores the form, no spurious unmount', () => {
    render(<InlineFeaturePopover map={fakeMap} />);
    act(() => {
      useInlineFormStore.getState().open(makePayload({ title: 'First Form' }));
    });
    act(() => {
      useInlineFormStore.getState().close();
    });
    expect(
      screen.getByTestId('inline-feature-popover').getAttribute('data-exiting'),
    ).toBe('true');

    // Steward re-opens a tool while the previous form is still fading out.
    // The new active should clear data-exiting and the displayed mirror
    // should swap to the new payload, NOT unmount and remount.
    act(() => {
      useInlineFormStore.getState().open(makePayload({ title: 'Second Form' }));
    });

    const form = screen.getByTestId('inline-feature-popover');
    expect(form.hasAttribute('data-exiting')).toBe(false);
    expect(form.getAttribute('data-visible')).toBe('true');
    expect(form.getAttribute('aria-label')).toBe('Second Form');

    // A transitionend fired AFTER the reverse-in-flight must not clear
    // the now-restored displayed mirror — the exiting flag is already
    // false, so the handler short-circuits.
    fireTransitionEnd(form, 'opacity');
    expect(screen.getByTestId('inline-feature-popover')).toBeTruthy();
  });
});
