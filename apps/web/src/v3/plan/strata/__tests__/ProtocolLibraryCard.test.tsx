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

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import { templatesForEnterprises, resolveProjectProtocols } from '@ogden/shared';
import ProtocolLibraryCard from '../ProtocolLibraryCard.js';

// A real standard template — a legacy sheep_beef one (no severityTier/scopeNotes,
// so it exercises the resolveSeverityTier default + the no-caution path).
const TEMPLATE = templatesForEnterprises(['sheep_beef']).find(
  (t) => t.id === 'paddock-rotation-cover-trigger',
)!;

// A resolved catalogue protocol carrying a verbatim Amanah scopeNote and an
// explicit severityTier — the market_garden advance-sale review.
const SCOPED_TEMPLATE = resolveProjectProtocols({
  primaryTypeId: 'market_garden',
}).protocols.find((t) => t.id === 'mg-market-channel-advance-sale')!;

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

  it('renders a severity-tier badge (default RESPOND when none authored)', () => {
    render(<ProtocolLibraryCard template={TEMPLATE} status={undefined} outputs={{}} />);

    const card = screen.getByTestId('protocol-template-card');
    // Legacy template authors no severityTier → resolveSeverityTier defaults RESPOND.
    expect(card.getAttribute('data-severity')).toBe('respond');
    const badge = screen.getByTestId('protocol-severity-badge');
    expect(badge.textContent).toBe('Respond');
  });

  it('surfaces the verbatim Amanah caution and severity for a scoped protocol', () => {
    render(
      <ProtocolLibraryCard template={SCOPED_TEMPLATE} status={undefined} outputs={{}} />,
    );

    const card = screen.getByTestId('protocol-template-card');
    expect(card.getAttribute('data-has-scope-notes')).toBe('true');
    expect(card.getAttribute('data-severity')).toBe('respond');

    const caution = screen.getByTestId('protocol-amanah-caution');
    // Verbatim — the exact authored scopeNotes text, never reworded/truncated.
    expect(caution.textContent).toContain('Amanah');
    expect(caution.textContent).toContain(SCOPED_TEMPLATE.scopeNotes!);
  });

  it('omits the Amanah caution when the template has no scopeNotes', () => {
    render(<ProtocolLibraryCard template={TEMPLATE} status={undefined} outputs={{}} />);

    const card = screen.getByTestId('protocol-template-card');
    expect(card.getAttribute('data-has-scope-notes')).toBe('false');
    expect(screen.queryByTestId('protocol-amanah-caution')).toBeNull();
  });

  it('collapsed hides the Amanah caution along with the body', () => {
    render(
      <ProtocolLibraryCard
        template={SCOPED_TEMPLATE}
        status={undefined}
        outputs={{}}
        emphasis="dimmed"
        collapsed
      />,
    );

    // The caution lives inside the !collapsed body gate.
    expect(screen.queryByTestId('protocol-amanah-caution')).toBeNull();
    // The severity badge lives in the (always-rendered) header.
    expect(screen.getByTestId('protocol-severity-badge')).toBeTruthy();
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

describe('ProtocolLibraryCard source attribution', () => {
  // A universal protocol (no `source` stamped, or source==='universal') from the
  // resolved homestead set.
  const UNIVERSAL = resolveProjectProtocols({ primaryTypeId: 'homestead' })
    .protocols.find((t) => (t.source ?? 'universal') === 'universal')!;

  // A secondary protocol the resolver attributed to the silvopasture layer when
  // silvopasture is added as a secondary type to a homestead project.
  const SECONDARY = resolveProjectProtocols({
    primaryTypeId: 'homestead',
    secondaryTypeIds: ['silvopasture'],
  }).protocols.find(
    (t) => t.source === 'secondary' && t.sourceTypeId === 'silvopasture',
  );

  it('renders a "Universal" source badge for a universal protocol', () => {
    render(<ProtocolLibraryCard template={UNIVERSAL} status={undefined} outputs={{}} />);
    const badge = screen.getByTestId('protocol-source-badge');
    expect(badge.getAttribute('data-source')).toBe('universal');
    expect(badge.textContent).toBe('Universal');
  });

  it('renders a "Secondary - <type>" source badge for a secondary protocol', () => {
    // Guard: the homestead+silvopasture pairing must yield at least one secondary
    // protocol, else this assertion is vacuous. Fail loudly if the catalogue changes.
    expect(SECONDARY).toBeTruthy();
    render(<ProtocolLibraryCard template={SECONDARY!} status={undefined} outputs={{}} />);
    const badge = screen.getByTestId('protocol-source-badge');
    expect(badge.getAttribute('data-source')).toBe('secondary');
    expect(badge.textContent).toBe('Secondary - Silvopasture');
  });
});

describe('ProtocolLibraryCard mechanics variant', () => {
  // The Plan Protocols-workspace renders the editor card as `mechanics`: header +
  // live IF/THEN only. Rationale/Amanah move to the center MEANING pane; the
  // feeds/status footer moves to the right-rail WIRING pane. Default (`full`) is
  // unchanged (covered above), so here we only prove the mechanics strip.

  it('keeps the header + IF/THEN but omits rationale, Amanah, and the feeds/status footer', () => {
    render(
      <ProtocolLibraryCard
        template={SCOPED_TEMPLATE}
        status="active"
        outputs={{}}
        variant="mechanics"
      />,
    );

    const card = screen.getByTestId('protocol-template-card');
    // Header survives: name + severity badge.
    expect(within(card).getByText(SCOPED_TEMPLATE.name)).toBeTruthy();
    expect(within(card).getByTestId('protocol-severity-badge')).toBeTruthy();
    // Live IF/THEN box survives (so threshold substitution still shows).
    expect(screen.getByText('IF')).toBeTruthy();
    expect(screen.getByText('THEN')).toBeTruthy();

    // Rationale omitted.
    expect(screen.queryByText(SCOPED_TEMPLATE.rationale)).toBeNull();
    // Amanah caution omitted (it moves verbatim to the MEANING pane).
    expect(screen.queryByTestId('protocol-amanah-caution')).toBeNull();
    // Feeds/status footer omitted — the `active` status label is the footer's,
    // so its absence proves the footer is gone.
    expect(screen.queryByText('Active')).toBeNull();
  });

  it('full variant (default) keeps the Amanah caution + status footer for the same scoped template', () => {
    render(
      <ProtocolLibraryCard template={SCOPED_TEMPLATE} status="active" outputs={{}} />,
    );
    // Baseline so the mechanics omissions above are meaningful, not vacuous.
    expect(screen.getByTestId('protocol-amanah-caution')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
  });
});

describe('ProtocolLibraryCard onSelect (Act clickable cards)', () => {
  it('is inert (no button role / data-selected) when onSelect is omitted', () => {
    render(<ProtocolLibraryCard template={TEMPLATE} status={undefined} outputs={{}} />);
    const card = screen.getByTestId('protocol-template-card');
    expect(card.getAttribute('role')).toBeNull();
    expect(card.getAttribute('data-selected')).toBeNull();
  });

  it('becomes a button and fires onSelect on click and Enter/Space', () => {
    const onSelect = vi.fn();
    render(
      <ProtocolLibraryCard
        template={TEMPLATE}
        status={undefined}
        outputs={{}}
        onSelect={onSelect}
      />,
    );
    const card = screen.getByTestId('protocol-template-card');
    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('tabindex')).toBe('0');

    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it('reflects the selected flag via data-selected', () => {
    const { rerender } = render(
      <ProtocolLibraryCard
        template={TEMPLATE}
        status={undefined}
        outputs={{}}
        onSelect={vi.fn()}
        selected={false}
      />,
    );
    expect(
      screen.getByTestId('protocol-template-card').getAttribute('data-selected'),
    ).toBe('false');
    rerender(
      <ProtocolLibraryCard
        template={TEMPLATE}
        status={undefined}
        outputs={{}}
        onSelect={vi.fn()}
        selected
      />,
    );
    expect(
      screen.getByTestId('protocol-template-card').getAttribute('data-selected'),
    ).toBe('true');
  });
});
