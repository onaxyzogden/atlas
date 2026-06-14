/**
 * @vitest-environment happy-dom
 *
 * ProtocolMeaningPane — the MEANING half of the Plan Protocols-workspace center
 * canvas (rendered beside the mechanics editor). Pure of any store: everything is
 * read off the template. Proves:
 *   1. It renders the severity posture (tier label + canonical gloss).
 *   2. The gloss strings are the canonical verbatim per-tier postures.
 *   3. It renders the rationale.
 *   4. It renders the verbatim Amanah caution only when scopeNotes is present.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { templatesForEnterprises, resolveProjectProtocols } from '@ogden/shared';
import ProtocolMeaningPane from '../ProtocolMeaningPane.js';

// Legacy template — no severityTier (defaults RESPOND) and no scopeNotes.
const PLAIN = templatesForEnterprises(['sheep_beef']).find(
  (t) => t.id === 'paddock-rotation-cover-trigger',
)!;

// Carries a verbatim Amanah scopeNote + an explicit RESPOND severity.
const SCOPED = resolveProjectProtocols({
  primaryTypeId: 'market_garden',
}).protocols.find((t) => t.id === 'mg-market-channel-advance-sale')!;

afterEach(() => cleanup());

describe('ProtocolMeaningPane', () => {
  it('renders the respond posture + gloss and the rationale for a plain template', () => {
    render(<ProtocolMeaningPane template={PLAIN} />);

    expect(screen.getByTestId('protocol-meaning-pane')).toBeTruthy();
    const posture = screen.getByTestId('protocol-meaning-posture');
    expect(within(posture).getByText('Respond')).toBeTruthy();
    expect(
      within(posture).getByText(
        'generate an assignable field action; affected area paused.',
      ),
    ).toBeTruthy();

    expect(screen.getByText(PLAIN.rationale)).toBeTruthy();
  });

  it('renders the canonical gloss for each severity tier (verbatim)', () => {
    const cases: Array<[string, string]> = [
      ['stop', 'halt project-wide; Plan approval to resume.'],
      ['respond', 'generate an assignable field action; affected area paused.'],
      ['watch', 'log only; no action required.'],
      [
        'abundance',
        'a positive condition was reached; begin an observation cycle before acting.',
      ],
    ];
    for (const [tier, gloss] of cases) {
      const { unmount } = render(
        <ProtocolMeaningPane
          template={{ ...PLAIN, severityTier: tier as typeof PLAIN.severityTier }}
        />,
      );
      expect(screen.getByText(gloss)).toBeTruthy();
      unmount();
    }
  });

  it('renders the verbatim Amanah caution when scopeNotes is present', () => {
    render(<ProtocolMeaningPane template={SCOPED} />);
    const caution = screen.getByTestId('protocol-amanah-caution');
    expect(caution.textContent).toContain('Amanah');
    // Verbatim — exact authored text, never reworded or truncated.
    expect(caution.textContent).toContain(SCOPED.scopeNotes!);
  });

  it('omits the Amanah caution when the template has no scopeNotes', () => {
    render(<ProtocolMeaningPane template={PLAIN} />);
    expect(screen.queryByTestId('protocol-amanah-caution')).toBeNull();
  });
});
