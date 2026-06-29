/**
 * @vitest-environment happy-dom
 *
 * WorkspacePopup -- the centered-modal popup that animates IN and OUT. The shared
 * <Modal> returns null on close (instant exit); this component adds an enter/exit
 * state machine so the working panel can animate OUT before unmounting.
 *
 * Verified behaviours:
 *   1. open=false -> nothing rendered (no portal node).
 *   2. open=true  -> panel mounts in the document.body portal with
 *      data-state="open" and renders its children.
 *   3. the close button defers onClose: it sets data-state="closing" and only
 *      calls onClose after the panel's animationend fires.
 *   4. backdrop click and Escape behave the same (closing -> animationend -> onClose).
 *   5. an EXTERNAL close (open flips to false) animates out, keeping the last
 *      children visible during "closing", then unmounts on animationend.
 *
 * happy-dom does not run CSS animations, so the exit is advanced by firing a
 * synthetic `animationend` on the panel (role="dialog") -- exactly the event the
 * component listens for.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkspacePopup from '../WorkspacePopup.js';

describe('WorkspacePopup -- closed state', () => {
  it('renders nothing when open is false', () => {
    render(
      <WorkspacePopup open={false} onClose={vi.fn()}>
        <p>workspace body</p>
      </WorkspacePopup>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('workspace body')).toBeNull();
  });
});

describe('WorkspacePopup -- open state', () => {
  it('mounts the panel in the body portal with data-state="open" and renders children', () => {
    render(
      <WorkspacePopup open onClose={vi.fn()} ariaLabel="Test workspace">
        <p>workspace body</p>
      </WorkspacePopup>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('data-state')).toBe('open');
    expect(dialog.getAttribute('aria-label')).toBe('Test workspace');
    // Portaled to document.body, not nested in the render container.
    expect(dialog.closest('body')).toBe(document.body);
    expect(screen.getByText('workspace body')).toBeTruthy();
  });
});

describe('WorkspacePopup -- deferred close (close button)', () => {
  it('sets data-state="closing" on click and calls onClose only after animationend', () => {
    const onClose = vi.fn();
    render(
      <WorkspacePopup open onClose={onClose}>
        <p>workspace body</p>
      </WorkspacePopup>,
    );
    fireEvent.click(screen.getByRole('button', { name: /close workspace/i }));
    // Closing has begun but onClose is deferred until the exit animation ends.
    expect(screen.getByRole('dialog').getAttribute('data-state')).toBe('closing');
    expect(onClose).not.toHaveBeenCalled();
    // Finishing the panel's OUT keyframe completes the close + unmounts.
    fireEvent.animationEnd(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('WorkspacePopup -- backdrop + Escape', () => {
  it('closes on a backdrop click (target === overlay), deferring onClose', () => {
    const onClose = vi.fn();
    render(
      <WorkspacePopup open onClose={onClose}>
        <p>workspace body</p>
      </WorkspacePopup>,
    );
    const dialog = screen.getByRole('dialog');
    // The overlay is the dialog's parent (role="presentation"). Click IT directly
    // so e.target === e.currentTarget.
    const overlay = dialog.parentElement as HTMLElement;
    fireEvent.click(overlay);
    expect(dialog.getAttribute('data-state')).toBe('closing');
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.animationEnd(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close when the click originates inside the panel body', () => {
    const onClose = vi.fn();
    render(
      <WorkspacePopup open onClose={onClose}>
        <p>workspace body</p>
      </WorkspacePopup>,
    );
    fireEvent.click(screen.getByText('workspace body'));
    expect(screen.getByRole('dialog').getAttribute('data-state')).toBe('open');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape, deferring onClose until animationend', () => {
    const onClose = vi.fn();
    render(
      <WorkspacePopup open onClose={onClose}>
        <p>workspace body</p>
      </WorkspacePopup>,
    );
    // useFocusTrap listens for Escape on document; firing on the dialog bubbles up.
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('dialog').getAttribute('data-state')).toBe('closing');
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.animationEnd(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('WorkspacePopup -- external close', () => {
  it('animates out (keeping last children) then unmounts when open flips to false', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <WorkspacePopup open onClose={onClose}>
        <p>frozen body</p>
      </WorkspacePopup>,
    );
    expect(screen.getByRole('dialog').getAttribute('data-state')).toBe('open');
    // Parent clears its selection: open -> false while still mounted.
    rerender(
      <WorkspacePopup open={false} onClose={onClose}>
        {null}
      </WorkspacePopup>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('data-state')).toBe('closing');
    // The last-open children stay visible through the exit (not blanked).
    expect(screen.getByText('frozen body')).toBeTruthy();
    // animationend finishes the close + unmounts. onClose still fires exactly once.
    fireEvent.animationEnd(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('ignores animationend bubbling from child content (only the panel keyframe advances)', () => {
    const onClose = vi.fn();
    render(
      <WorkspacePopup open onClose={onClose}>
        <button type="button">inner</button>
      </WorkspacePopup>,
    );
    // A child's animationend must NOT advance the machine while still open.
    fireEvent.animationEnd(screen.getByText('inner'));
    expect(screen.getByRole('dialog').getAttribute('data-state')).toBe('open');
    expect(onClose).not.toHaveBeenCalled();
  });
});
