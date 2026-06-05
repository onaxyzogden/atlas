/**
 * @vitest-environment happy-dom
 *
 * ProtocolLayerPanel — ACT variant. The Plan-parity guard lives in the sibling
 * ProtocolLayerPanel.test.tsx and renders WITHOUT a variant (it must stay green
 * — that is the proof Plan is byte-identical). This suite covers the Act-only
 * behavior added by the protocol-layer slice, now over the RESOLVED standing-
 * protocol set (resolver wiring 2026-06-04):
 *   1. variant="act" + triggeredIds marks the matching card data-emphasis="triggered"
 *      and every other card "dimmed" — nothing is hidden ("emphasize, don't hide").
 *   2. The triggered card floats to the top of its tier (stable triggered-first sort),
 *      overriding authored order within the stratum group.
 *   3. Non-triggered cards collapse (IF/THEN body omitted); the triggered one keeps it.
 *   4. The header count switches to "· N triggered".
 *   5. Grouping stays by stratum (no separate triggered super-section).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import { resolveProjectProtocols } from '@ogden/shared';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import ProtocolLayerPanel from '../ProtocolLayerPanel.js';

const PROJECT_ID = 'proj-1';
const RESOLVED_COUNT = resolveProjectProtocols({
  primaryTypeId: 'silvopasture',
}).protocols.length;
// Both are silvopasture-primary S6 protocols; in authored order tree-browse
// precedes establishment, so triggering establishment proves the triggered-first
// sort flips them within the S6 stratum group.
const TRIGGERED_ID = 'silv-establishment-protection';
const OTHER_ID = 'silv-tree-browse-damage';

beforeEach(() => {
  useProtocolStore.setState({ records: [] });
});
afterEach(() => cleanup());

function renderAct() {
  return render(
    <ProtocolLayerPanel
      projectId={PROJECT_ID}
      primaryTypeId="silvopasture"
      secondaryTypeIds={[]}
      variant="act"
      triggeredIds={[TRIGGERED_ID]}
    />,
  );
}

function allCardIds() {
  return screen
    .getAllByTestId('protocol-template-card')
    .map((el) => el.getAttribute('data-template-id'));
}

function cardById(id: string) {
  return screen
    .getAllByTestId('protocol-template-card')
    .find((el) => el.getAttribute('data-template-id') === id);
}

describe('ProtocolLayerPanel (Act variant)', () => {
  it('marks the triggered card and dims every other card without hiding any', () => {
    renderAct();

    // Nothing hidden — all resolved templates stay mounted ("emphasize, don't hide").
    expect(screen.getAllByTestId('protocol-template-card')).toHaveLength(
      RESOLVED_COUNT,
    );

    expect(cardById(TRIGGERED_ID)!.getAttribute('data-emphasis')).toBe(
      'triggered',
    );
    expect(cardById(OTHER_ID)!.getAttribute('data-emphasis')).toBe('dimmed');
  });

  it('floats the triggered card above its tier-mates (overriding authored order)', () => {
    renderAct();
    const ids = allCardIds();
    // Despite tree-browse being authored before establishment, the triggered
    // establishment card now sorts ahead of it within the S6 group.
    expect(ids.indexOf(TRIGGERED_ID)).toBeLessThan(ids.indexOf(OTHER_ID));
  });

  it('collapses the dimmed cards but keeps the triggered card body + pill', () => {
    renderAct();

    // Exactly one card keeps its IF/THEN body — the triggered one. All dimmed
    // cards collapse to header + footer (no IF label rendered).
    expect(screen.getAllByText('IF')).toHaveLength(1);

    const triggered = cardById(TRIGGERED_ID)!;
    expect(within(triggered).getByText('IF')).toBeTruthy();
    expect(
      within(triggered).getByTestId('protocol-triggered-pill'),
    ).toBeTruthy();
  });

  it('switches the header count to "N triggered"', () => {
    renderAct();
    expect(screen.getByTestId('protocol-layer-panel').textContent).toContain(
      '1 triggered',
    );
  });

  it('groups by stratum with no separate triggered super-section', () => {
    renderAct();
    const headings = screen
      .getAllByTestId('protocol-tier-heading')
      .map((el) => el.textContent);
    // Multiple stratum groups (universal spans all 7); the triggered card's
    // stratum heading is present, and no synthetic "triggered" section exists.
    expect(headings.length).toBeGreaterThan(1);
    expect(headings).toContain('S6 · Integration Design');
    expect(headings.some((h) => /triggered/i.test(h ?? ''))).toBe(false);
  });
});

describe('ProtocolLayerPanel (Act stratum scope + clickable cards)', () => {
  it('renders only the active stratum group when activeStratumId is set', () => {
    render(
      <ProtocolLayerPanel
        projectId={PROJECT_ID}
        primaryTypeId="silvopasture"
        secondaryTypeIds={[]}
        variant="act"
        activeStratumId="s6-integration-design"
      />,
    );
    const headings = screen
      .getAllByTestId('protocol-tier-heading')
      .map((el) => el.textContent);
    // Strictly scoped — exactly the S6 group, no other strata leak through.
    expect(headings).toEqual(['S6 · Integration Design']);
    // The S6-authored silvopasture protocols are present; a non-S6 universal one is not.
    expect(cardById(TRIGGERED_ID)).toBeTruthy();
  });

  it('fires onSelectProtocol with the template id when a card is clicked', () => {
    const onSelect = vi.fn();
    render(
      <ProtocolLayerPanel
        projectId={PROJECT_ID}
        primaryTypeId="silvopasture"
        secondaryTypeIds={[]}
        variant="act"
        activeStratumId="s6-integration-design"
        onSelectProtocol={onSelect}
      />,
    );
    fireEvent.click(cardById(OTHER_ID)!);
    expect(onSelect).toHaveBeenCalledWith(OTHER_ID);
  });

  it('marks the selected card with data-selected="true"', () => {
    render(
      <ProtocolLayerPanel
        projectId={PROJECT_ID}
        primaryTypeId="silvopasture"
        secondaryTypeIds={[]}
        variant="act"
        activeStratumId="s6-integration-design"
        onSelectProtocol={vi.fn()}
        selectedProtocolId={OTHER_ID}
      />,
    );
    expect(cardById(OTHER_ID)!.getAttribute('data-selected')).toBe('true');
    expect(cardById(TRIGGERED_ID)!.getAttribute('data-selected')).toBe('false');
  });
});
