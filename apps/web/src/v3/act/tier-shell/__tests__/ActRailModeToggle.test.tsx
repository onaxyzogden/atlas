/**
 * @vitest-environment happy-dom
 *
 * ActRailModeToggle — left-rail Objectives/Protocols segmented control.
 * Covers: both segments render; onChange fires with the chosen mode; the amber
 * attention badge is hidden at count 0 and shows the count when > 0.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ActRailModeToggle from '../ActRailModeToggle.js';

afterEach(() => cleanup());

describe('ActRailModeToggle', () => {
  it('renders both segments', () => {
    render(
      <ActRailModeToggle mode="objectives" onChange={vi.fn()} attentionCount={0} />,
    );
    expect(screen.getByText('Objectives')).toBeTruthy();
    expect(screen.getByText('Protocols')).toBeTruthy();
  });

  it('fires onChange with the chosen mode', () => {
    const onChange = vi.fn();
    render(
      <ActRailModeToggle mode="objectives" onChange={onChange} attentionCount={0} />,
    );
    fireEvent.click(screen.getByText('Protocols'));
    expect(onChange).toHaveBeenCalledWith('protocols');

    fireEvent.click(screen.getByText('Objectives'));
    expect(onChange).toHaveBeenCalledWith('objectives');
  });

  it('hides the attention badge when count is 0', () => {
    render(
      <ActRailModeToggle mode="objectives" onChange={vi.fn()} attentionCount={0} />,
    );
    expect(screen.queryByTestId('act-rail-protocol-badge')).toBeNull();
  });

  it('shows the attention count when > 0', () => {
    render(
      <ActRailModeToggle mode="objectives" onChange={vi.fn()} attentionCount={3} />,
    );
    const badge = screen.getByTestId('act-rail-protocol-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('3');
  });

  it('marks the active segment via aria-checked', () => {
    render(
      <ActRailModeToggle mode="protocols" onChange={vi.fn()} attentionCount={0} />,
    );
    expect(screen.getByText('Protocols').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Objectives').getAttribute('aria-checked')).toBe('false');
  });
});
