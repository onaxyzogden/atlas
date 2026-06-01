/**
 * @vitest-environment happy-dom
 *
 * PrimarySetModal - the Plan header primary-type picker (shown when a project
 * has no primary yet). Asserts: it renders only can-be-primary types (the 12
 * PRIMARY_TYPES, no residential); Confirm is disabled until a type is picked;
 * selecting a type and confirming fires onConfirm with that id; and Cancel /
 * Escape / backdrop each dismiss without confirming.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PRIMARY_TYPES } from '@ogden/shared';

// lucide-react ships CJS in this environment; its `require('react')` resolves
// to a different React instance than the test runner, causing the classic
// "Objects are not valid as a React child" crash. Stub the icons - the tests
// care about button text / testids, not SVG rendering.
vi.mock('lucide-react', () => ({
  Layers: () => null,
  X: () => null,
}));

import PrimarySetModal from '../PrimarySetModal.js';

function setup() {
  const onConfirm = vi.fn();
  const onDismiss = vi.fn();
  render(<PrimarySetModal onConfirm={onConfirm} onDismiss={onDismiss} />);
  return { onConfirm, onDismiss };
}

describe('PrimarySetModal', () => {
  it('renders only the can-be-primary types (no secondary-only residential)', () => {
    setup();
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBe(PRIMARY_TYPES.length);
    expect(screen.queryByText('Residential')).toBeNull();
  });

  it('disables Confirm until a type is selected', () => {
    setup();
    const confirm = screen.getByTestId('plan-primary-set-confirm');
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    const [firstRadio] = screen.getAllByRole('radio');
    fireEvent.click(firstRadio!);
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
  });

  it('fires onConfirm with the selected type id on confirm', () => {
    const { onConfirm } = setup();
    const firstType = PRIMARY_TYPES[0]!;
    const [firstRadio] = screen.getAllByRole('radio');
    fireEvent.click(firstRadio!);
    fireEvent.click(screen.getByTestId('plan-primary-set-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(firstType.id);
  });

  it('dismisses (without confirming) on Cancel', () => {
    const { onConfirm, onDismiss } = setup();
    fireEvent.click(screen.getByTestId('plan-primary-set-cancel'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('dismisses on Escape', () => {
    const { onDismiss } = setup();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses on backdrop click', () => {
    const { onConfirm, onDismiss } = setup();
    fireEvent.click(screen.getByTestId('plan-primary-set-backdrop'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
