/**
 * @vitest-environment happy-dom
 *
 * ProtocolDetailColumn — the RIGHT stacked-detail column in Plan Protocol mode.
 * These tests assert:
 *   1. No selection renders the empty state (protocol-detail-empty).
 *   2. One selected template renders one ProtocolLibraryCard.
 *   3. Two selected templates render two cards, in the order supplied
 *      (the shell hands them down already in catalogue/tier order).
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  resolveProjectProtocols,
  type StandardProtocolTemplate,
} from '@ogden/shared';
import ProtocolDetailColumn from '../ProtocolDetailColumn.js';

const TEMPLATES: readonly StandardProtocolTemplate[] = resolveProjectProtocols({
  primaryTypeId: 'silvopasture',
}).protocols.slice(0, 6);

describe('ProtocolDetailColumn', () => {
  it('shows the empty state when nothing is selected', () => {
    render(
      <ProtocolDetailColumn
        selectedTemplates={[]}
        statusByTemplate={{}}
        outputs={{}}
      />,
    );
    expect(screen.getByTestId('protocol-detail-empty')).toBeTruthy();
    expect(screen.queryAllByTestId('protocol-template-card')).toHaveLength(0);
  });

  it('renders one card for a single selected template', () => {
    render(
      <ProtocolDetailColumn
        selectedTemplates={[TEMPLATES[0]!]}
        statusByTemplate={{}}
        outputs={{}}
      />,
    );
    const cards = screen.getAllByTestId('protocol-template-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]!.getAttribute('data-template-id')).toBe(TEMPLATES[0]!.id);
    expect(screen.queryByTestId('protocol-detail-empty')).toBeNull();
  });

  it('stacks multiple selected cards in the order supplied', () => {
    const picked = [TEMPLATES[0]!, TEMPLATES[1]!];
    render(
      <ProtocolDetailColumn
        selectedTemplates={picked}
        statusByTemplate={{}}
        outputs={{}}
      />,
    );
    const cards = screen.getAllByTestId('protocol-template-card');
    expect(cards).toHaveLength(2);
    expect(cards.map((el) => el.getAttribute('data-template-id'))).toEqual([
      TEMPLATES[0]!.id,
      TEMPLATES[1]!.id,
    ]);
  });
});
