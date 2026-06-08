/**
 * @vitest-environment happy-dom
 *
 * EscalationLadder -- numbered collapsible tiers with per-tier config.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
});

import { EscalationLadder } from '../EscalationLadder.js';

const tiers = [
  { title: 'Direct conversation', body: <p>Talk it out</p> },
  { title: 'Mediation', body: <p>Bring a mediator</p> },
  { title: 'Arbitration', body: <p>Binding decision</p> },
];

describe('EscalationLadder', () => {
  it('renders all tier titles with step numbers', () => {
    render(<EscalationLadder tiers={tiers} />);
    expect(screen.getByText('Direct conversation')).toBeTruthy();
    expect(screen.getByText('Mediation')).toBeTruthy();
    expect(screen.getByText('Arbitration')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it("the defaultOpenIndex tier's body is visible and others hidden", () => {
    render(<EscalationLadder tiers={tiers} defaultOpenIndex={1} />);
    expect(screen.getByText('Bring a mediator')).toBeTruthy();
    expect(screen.queryByText('Talk it out')).toBeNull();
    expect(screen.queryByText('Binding decision')).toBeNull();
  });

  it('defaults to opening the first tier', () => {
    render(<EscalationLadder tiers={tiers} />);
    expect(screen.getByText('Talk it out')).toBeTruthy();
    expect(screen.queryByText('Bring a mediator')).toBeNull();
  });

  it('-1 starts all collapsed', () => {
    render(<EscalationLadder tiers={tiers} defaultOpenIndex={-1} />);
    expect(screen.queryByText('Talk it out')).toBeNull();
    expect(screen.queryByText('Bring a mediator')).toBeNull();
  });

  it("clicking a collapsed tier's head reveals its body", () => {
    render(<EscalationLadder tiers={tiers} defaultOpenIndex={0} />);
    const head = screen.getByText('Mediation').closest('button');
    expect(head?.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(head!);
    expect(screen.getByText('Bring a mediator')).toBeTruthy();
    expect(head?.getAttribute('aria-expanded')).toBe('true');
  });

  it("clicking an open tier's head hides its body", () => {
    render(<EscalationLadder tiers={tiers} defaultOpenIndex={0} />);
    const head = screen.getByText('Direct conversation').closest('button');
    expect(head?.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(head!);
    expect(head?.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Talk it out')).toBeNull();
  });

  it('applies the ariaLabel to the list', () => {
    render(<EscalationLadder tiers={tiers} ariaLabel="Dispute ladder" />);
    expect(screen.getByLabelText('Dispute ladder')).toBeTruthy();
  });
});
