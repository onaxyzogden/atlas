/**
 * @vitest-environment happy-dom
 *
 * ProtocolLibraryCard — emphasis + collapsed treatments added by the Act
 * protocol-layer slice. The card is a SHARED component (Plan detail column +
 * Act rail), so the load-bearing guarantee here is: the default render
 * (`emphasis` omitted) is the unchanged Plan/library card, and the opt-in Act
 * treatments are purely additive.
 *   1. Default = `normal` emphasis, full IF/THEN body, no triggered pill.
 *   2. `triggered` adds the amber "Triggered" pill and keeps the body.
 *   3. `dimmed` sets data-emphasis and shows no pill (still expanded).
 *   4. `collapsed` omits the IF/THEN body + rationale but keeps header + footer,
 *      preserving data-template-id / data-protocol-status (still addressable).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { templatesForEnterprises } from '@ogden/shared';
import ProtocolLibraryCard from '../ProtocolLibraryCard.js';

// A real standard template — the same sheep_beef one the panel parity test uses.
const TEMPLATE = templatesForEnterprises(['sheep_beef']).find(
  (t) => t.id === 'paddock-rotation-cover-trigger',
)!;

afterEach(() => cleanup());

describe('ProtocolLibraryCard emphasis + collapsed', () => {
  it('defaults to normal emphasis with the full body (Plan parity shape)', () => {
    render(<ProtocolLibraryCard template={TEMPLATE} status={undefined} outputs={{}} />);

    const card = screen.getByTestId('protocol-template-card');
    expect(card.getAttribute('data-emphasis')).toBe('normal');
    expect(card.getAttribute('data-template-id')).toBe(TEMPLATE.id);
    expect(card.getAttribute('data-protocol-status')).toBe('none');

    // Body present.
    expect(screen.getByText('IF')).toBeTruthy();
    expect(screen.getByText('THEN')).toBeTruthy();
    // No triggered pill in the default card.
    expect(screen.queryByTestId('protocol-triggered-pill')).toBeNull();
    // Default-status cards no longer render the "Standard template" footer label.
    expect(screen.queryByText('Standard template')).toBeNull();
  });

  it('triggered emphasis adds the amber pill and keeps the body', () => {
    render(
      <ProtocolLibraryCard
        template={TEMPLATE}
        status={undefined}
        outputs={{}}
        emphasis="triggered"
      />,
    );

    const card = screen.getByTestId('protocol-template-card');
    expect(card.getAttribute('data-emphasis')).toBe('triggered');

    const pill = screen.getByTestId('protocol-triggered-pill');
    expect(pill.textContent).toBe('Triggered');
    // Triggered (not collapsed) → body stays.
    expect(screen.getByText('IF')).toBeTruthy();
  });

  it('dimmed emphasis sets data-emphasis and shows no pill', () => {
    render(
      <ProtocolLibraryCard
        template={TEMPLATE}
        status={undefined}
        outputs={{}}
        emphasis="dimmed"
      />,
    );

    const card = screen.getByTestId('protocol-template-card');
    expect(card.getAttribute('data-emphasis')).toBe('dimmed');
    expect(screen.queryByTestId('protocol-triggered-pill')).toBeNull();
    // Dimmed alone does not collapse — body still present.
    expect(screen.getByText('IF')).toBeTruthy();
  });

  it('collapsed omits the body + rationale but keeps header + footer and data attrs', () => {
    render(
      <ProtocolLibraryCard
        template={TEMPLATE}
        status={undefined}
        outputs={{}}
        emphasis="dimmed"
        collapsed
      />,
    );

    const card = screen.getByTestId('protocol-template-card');
    // Body gone.
    expect(screen.queryByText('IF')).toBeNull();
    expect(screen.queryByText('THEN')).toBeNull();
    expect(screen.queryByText(TEMPLATE.rationale)).toBeNull();
    // Header (name) survives; the default "Standard template" label is omitted.
    expect(within(card).getByText(TEMPLATE.name)).toBeTruthy();
    expect(within(card).queryByText('Standard template')).toBeNull();
    // Still addressable by the engine / tests.
    expect(card.getAttribute('data-template-id')).toBe(TEMPLATE.id);
    expect(card.getAttribute('data-protocol-status')).toBe('none');
  });

  it('collapsed + triggered keeps the pill in the header even with the body gone', () => {
    render(
      <ProtocolLibraryCard
        template={TEMPLATE}
        status={undefined}
        outputs={{}}
        emphasis="triggered"
        collapsed
      />,
    );

    expect(screen.getByTestId('protocol-triggered-pill')).toBeTruthy();
    expect(screen.getByText(TEMPLATE.name)).toBeTruthy();
    expect(screen.queryByText('IF')).toBeNull();
  });
});
