/**
 * @vitest-environment happy-dom
 *
 * ProtocolLayerPanel — ACT variant. The Plan-parity guard lives in the sibling
 * ProtocolLayerPanel.test.tsx and renders WITHOUT a variant (it must stay green
 * — that is the proof Plan is byte-identical). This suite covers the Act-only
 * behavior added by the protocol-layer slice:
 *   1. variant="act" + triggeredIds marks the matching card data-emphasis="triggered"
 *      and every other card "dimmed" — nothing is hidden ("emphasize, don't hide").
 *   2. The triggered card floats to the top of its tier (stable triggered-first sort).
 *   3. Non-triggered cards collapse (IF/THEN body omitted); the triggered one keeps it.
 *   4. The header count switches to "· N triggered".
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { templatesForEnterprises } from '@ogden/shared';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import ProtocolLayerPanel from '../ProtocolLayerPanel.js';

const PROJECT_ID = 'proj-1';
const SHEEP_BEEF_COUNT = templatesForEnterprises(['sheep_beef']).length; // 9
const TRIGGERED_ID = 'paddock-rotation-cover-trigger';
const OTHER_ID = 'rest-period-re-entry-gate';

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

function cardById(id: string) {
  return screen
    .getAllByTestId('protocol-template-card')
    .find((el) => el.getAttribute('data-template-id') === id);
}

describe('ProtocolLayerPanel (Act variant)', () => {
  it('marks the triggered card and dims every other card without hiding any', () => {
    renderAct();

    // Nothing hidden — all templates stay mounted ("emphasize, don't hide").
    expect(screen.getAllByTestId('protocol-template-card')).toHaveLength(
      SHEEP_BEEF_COUNT,
    );

    expect(cardById(TRIGGERED_ID)!.getAttribute('data-emphasis')).toBe(
      'triggered',
    );
    expect(cardById(OTHER_ID)!.getAttribute('data-emphasis')).toBe('dimmed');
  });

  it('floats the triggered card to the top of its tier', () => {
    renderAct();
    const first = screen.getAllByTestId('protocol-template-card')[0]!;
    expect(first.getAttribute('data-template-id')).toBe(TRIGGERED_ID);
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

  it('still groups under the single real tier heading (no separate triggered super-section)', () => {
    renderAct();
    const headings = screen.getAllByTestId('protocol-tier-heading');
    expect(headings).toHaveLength(1);
    expect(headings[0]!.textContent).toBe('Stratum 6 — Integration');
  });
});
