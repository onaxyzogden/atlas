/**
 * @vitest-environment happy-dom
 *
 * ProtocolsEmptyCue — the Protocols-mode placeholder for the Plan center canvas
 * and right rail, replacing the objectives-flavoured PlanReadyCue. Proves:
 *   1. hasProtocols=false renders the "no project type set" copy.
 *   2. hasProtocols=true renders the transient "Select a protocol" copy.
 *   3. The testid + data-has-protocols attribute are present and reflect the prop.
 *   4. `compact` toggles the padding variant (narrow right rail vs center).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ProtocolsEmptyCue from '../ProtocolsEmptyCue.js';

afterEach(() => cleanup());

describe('ProtocolsEmptyCue', () => {
  it('renders the no-project-type copy when the library is empty', () => {
    render(<ProtocolsEmptyCue hasProtocols={false} />);

    const cue = screen.getByTestId('protocols-empty-cue');
    expect(cue).toBeTruthy();
    expect(cue.getAttribute('data-has-protocols')).toBe('false');
    expect(cue.textContent).toContain('no project type set yet');
    expect(cue.textContent).toContain('populate the protocol library');
  });

  it('renders the select-a-protocol copy when the library has entries', () => {
    render(<ProtocolsEmptyCue hasProtocols />);

    const cue = screen.getByTestId('protocols-empty-cue');
    expect(cue.getAttribute('data-has-protocols')).toBe('true');
    expect(cue.textContent).toContain('Select a protocol from the list');
  });

  it('uses the roomier padding by default and the tighter padding when compact', () => {
    const { rerender } = render(<ProtocolsEmptyCue hasProtocols={false} />);
    expect(screen.getByTestId('protocols-empty-cue').style.padding).toBe(
      '24px 22px',
    );

    rerender(<ProtocolsEmptyCue hasProtocols={false} compact />);
    expect(screen.getByTestId('protocols-empty-cue').style.padding).toBe(
      '16px 18px',
    );
  });
});
