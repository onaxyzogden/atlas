/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ToastContainer, toast, useToastStore } from './Toast.js';

describe('Toast — action button', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });
  afterEach(() => cleanup());

  it('renders an action button with its label when an action is supplied', () => {
    const onClick = vi.fn();
    toast.action('success', 'Deactivated 3 protocols', { label: 'Undo', onClick });
    render(<ToastContainer />);

    const btn = screen.getByTestId('toast-action');
    expect(btn.textContent).toBe('Undo');
    expect(screen.getByText('Deactivated 3 protocols')).toBeTruthy();
  });

  it('clicking the action runs onClick exactly once and dismisses the toast', () => {
    const onClick = vi.fn();
    toast.action('success', 'Deactivated 3 protocols', { label: 'Undo', onClick });
    render(<ToastContainer />);

    fireEvent.click(screen.getByTestId('toast-action'));

    expect(onClick).toHaveBeenCalledTimes(1);
    // The toast is removed from the store after the action fires.
    expect(useToastStore.getState().toasts).toHaveLength(0);
    expect(screen.queryByTestId('toast-action')).toBeNull();
  });

  it('back-compat: a plain toast renders no action button', () => {
    toast.success('Saved');
    render(<ToastContainer />);

    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.queryByTestId('toast-action')).toBeNull();
  });
});
