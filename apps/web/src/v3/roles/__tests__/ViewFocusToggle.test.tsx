/**
 * @vitest-environment happy-dom
 *
 * ViewFocusToggle -- pure presentational segmented control. No stores: render
 * with explicit props, assert the active segment + count annotation, click a
 * segment and confirm onChange fires with the right mode.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ViewFocusToggle from '../ViewFocusToggle.js';

describe('ViewFocusToggle', () => {
  it('marks the role segment active in role mode', () => {
    render(<ViewFocusToggle focusMode="role" onChange={() => {}} />);
    expect(screen.getByTestId('view-focus-role').getAttribute('data-active')).toBe(
      'true',
    );
    expect(screen.getByTestId('view-focus-full').getAttribute('data-active')).toBe(
      'false',
    );
  });

  it('marks the full segment active in full mode', () => {
    render(<ViewFocusToggle focusMode="full" onChange={() => {}} />);
    expect(screen.getByTestId('view-focus-full').getAttribute('data-active')).toBe(
      'true',
    );
  });

  it('annotates "My focus" with the in-focus count (and total) when in role mode', () => {
    render(
      <ViewFocusToggle focusMode="role" onChange={() => {}} inFocusCount={3} totalCount={9} />,
    );
    expect(screen.getByTestId('view-focus-role').textContent).toContain('(3 / 9)');
  });

  it('does NOT show the count on the role segment when in full mode', () => {
    render(
      <ViewFocusToggle focusMode="full" onChange={() => {}} inFocusCount={3} totalCount={9} />,
    );
    expect(screen.getByTestId('view-focus-role').textContent).not.toContain('(3');
  });

  it('calls onChange with the clicked mode', () => {
    const onChange = vi.fn();
    render(<ViewFocusToggle focusMode="role" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('view-focus-full'));
    expect(onChange).toHaveBeenCalledWith('full');
    fireEvent.click(screen.getByTestId('view-focus-role'));
    expect(onChange).toHaveBeenCalledWith('role');
  });
});
