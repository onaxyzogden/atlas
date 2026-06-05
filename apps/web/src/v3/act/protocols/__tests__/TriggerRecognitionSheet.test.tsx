/**
 * @vitest-environment happy-dom
 *
 * TriggerRecognitionSheet - the bottom sheet shown after Act proof capture when
 * a protocol trigger is recognised (Trigger Recognition UX Spec v1.1, 4).
 * Covers the always-present spec elements: tier badge glyph, protocol name,
 * the three-option action row, and that each button calls onResolve with the
 * matching ConfirmationStatus.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { STANDARD_PROTOCOL_TEMPLATES } from '@ogden/shared';
import TriggerRecognitionSheet from '../TriggerRecognitionSheet.js';

afterEach(() => cleanup());

const TEMPLATE = STANDARD_PROTOCOL_TEMPLATES[0]!;

function renderSheet(overrides: { onResolve?: () => void } = {}) {
  return render(
    <TriggerRecognitionSheet
      projectId="proj-A"
      template={TEMPLATE}
      tier="respond"
      outputs={{}}
      onResolve={overrides.onResolve ?? vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe('TriggerRecognitionSheet', () => {
  it('renders the sheet with the tier glyph and protocol name', () => {
    renderSheet();
    expect(screen.getByTestId('trigger-recognition-sheet')).toBeTruthy();
    expect(screen.getByTestId('tier-badge')).toBeTruthy();
    expect(screen.getByText('\u25B2')).toBeTruthy();
    expect(screen.getByText(TEMPLATE.name)).toBeTruthy();
  });

  it('renders all three action options', () => {
    renderSheet();
    expect(screen.getByText('Confirm')).toBeTruthy();
    expect(screen.getByText('Dismiss')).toBeTruthy();
    expect(screen.getByText('Flag for review')).toBeTruthy();
  });

  it('Confirm resolves as confirmed', () => {
    const onResolve = vi.fn();
    renderSheet({ onResolve });
    fireEvent.click(screen.getByText('Confirm'));
    expect(onResolve).toHaveBeenCalledWith('confirmed');
  });

  it('Dismiss resolves as false_positive', () => {
    const onResolve = vi.fn();
    renderSheet({ onResolve });
    fireEvent.click(screen.getByText('Dismiss'));
    expect(onResolve).toHaveBeenCalledWith('false_positive');
  });

  it('Flag for review resolves as pending_review', () => {
    const onResolve = vi.fn();
    renderSheet({ onResolve });
    fireEvent.click(screen.getByText('Flag for review'));
    expect(onResolve).toHaveBeenCalledWith('pending_review');
  });

  it('expands "Why this protocol?" to reveal the IF/THEN recipe', () => {
    renderSheet();
    // collapsed: response text not shown until expanded
    expect(screen.queryByText(TEMPLATE.response)).toBeNull();
    fireEvent.click(screen.getByText('Why this protocol?'));
    expect(screen.getByText(TEMPLATE.response)).toBeTruthy();
  });
});
