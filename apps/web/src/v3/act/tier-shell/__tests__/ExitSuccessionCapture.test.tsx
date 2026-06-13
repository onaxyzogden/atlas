/**
 * @vitest-environment happy-dom
 *
 * ExitSuccessionCapture -- multi-mode CONTROLLED renderer for objective
 * ev-s7-exit-succession (5 checklist items c1..c5, modes exitProcess /
 * dwellingTransfer / landReversion / dissolution / legalReview). Ported from
 * Downloads/olos_exit_succession_act.html.
 *
 * Verified behaviours:
 *   - exitSuccessionModeFor maps each c1..c5 id (and null for others).
 *   - decode is TOTAL/defensive (non-array -> defaults; garbage / unknown keys
 *     dropped; recommended defaults seeded but never fabricated registry data).
 *   - encode round-trips losslessly.
 *   - validity per mode (advisory -- record-ready once defaults present).
 *   - summarise strings per mode.
 *   - a render assertion + one interaction per mode (change a select, pick a
 *     pricing model, toggle a legal-review scope item).
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// lucide-react forwardRef icons spread [undefined] into <svg> children when
// childless, which React + happy-dom reject on re-render. Replace every
// component export with a clean <svg> stub (established pattern).
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

import {
  ExitSuccessionCapture,
  exitSuccessionModeFor,
  decodeExitSuccession,
  encodeExitSuccession,
  isExitSuccessionValid,
  summariseExitSuccession,
  legalReviewSignatory,
  type ExitSuccessionMode,
} from '../ExitSuccessionCapture.js';
import type { FormValue } from '../actToolCatalog.js';

function renderMode(mode: ExitSuccessionMode, value: FormValue) {
  const onChange = vi.fn();
  render(<ExitSuccessionCapture mode={mode} value={value} onChange={onChange} />);
  return { onChange };
}

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('exitSuccessionModeFor', () => {
  it('maps c1..c5 to the correct mode', () => {
    expect(exitSuccessionModeFor('ev-s7-exit-succession-c1')).toBe('exitProcess');
    expect(exitSuccessionModeFor('ev-s7-exit-succession-c2')).toBe('dwellingTransfer');
    expect(exitSuccessionModeFor('ev-s7-exit-succession-c3')).toBe('landReversion');
    expect(exitSuccessionModeFor('ev-s7-exit-succession-c4')).toBe('dissolution');
    expect(exitSuccessionModeFor('ev-s7-exit-succession-c5')).toBe('legalReview');
  });

  it('returns null for unrelated ids', () => {
    expect(exitSuccessionModeFor('ev-s1-provision-balance-c1')).toBeNull();
    expect(exitSuccessionModeFor('ev-s7-exit-succession-c6')).toBeNull();
    expect(exitSuccessionModeFor('ev-s7-exit-succession-')).toBeNull();
    expect(exitSuccessionModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode / encode (shared mechanics)
// ---------------------------------------------------------------------------

describe('decode / encode', () => {
  it('decode of empty seeds the recommended defaults', () => {
    const m = decodeExitSuccession('exitProcess', {});
    expect(m.mode).toBe('exitProcess');
    expect(m.choices.noticePeriod).toBe(
      '6 months -- allows community to find replacement household',
    );
    expect(m.choices.paymentTiming).toBe(
      'On confirmed departure date -- simultaneous with dwelling handover',
    );
  });

  it('decode is defensive: non-array esChoices -> pure defaults', () => {
    const m = decodeExitSuccession('dwellingTransfer', {
      esChoices: 'nope',
    } as unknown as FormValue);
    expect(m.choices.pricingModel).toBe('clt');
  });

  it('decode drops garbage and unknown keys, keeps known overrides', () => {
    const m = decodeExitSuccession('exitProcess', {
      esChoices: ['noticePeriod::3 months', 'garbage', 'bogusKey::x', '::y'],
    });
    expect(m.choices.noticePeriod).toBe('3 months');
    // unknown keys never appear
    expect('bogusKey' in m.choices).toBe(false);
    expect('' in m.choices).toBe(false);
  });

  it('encode round-trips losslessly for every mode', () => {
    const modes: ExitSuccessionMode[] = [
      'exitProcess',
      'dwellingTransfer',
      'landReversion',
      'dissolution',
      'legalReview',
    ];
    for (const mode of modes) {
      const model = decodeExitSuccession(mode, {});
      const encoded = encodeExitSuccession(model);
      expect(decodeExitSuccession(mode, encoded)).toEqual(model);
    }
  });

  it('encode preserves an operator override through a round-trip', () => {
    const model = decodeExitSuccession('legalReview', {
      esChoices: ['planningCompatible::on', 'advisor::Independent advisor for exit review'],
    });
    expect(model.choices.planningCompatible).toBe('on');
    expect(model.choices.advisor).toBe('Independent advisor for exit review');
    expect(decodeExitSuccession('legalReview', encodeExitSuccession(model))).toEqual(model);
  });
});

// ---------------------------------------------------------------------------
// validity (advisory -- record-ready once defaults present)
// ---------------------------------------------------------------------------

describe('isExitSuccessionValid', () => {
  it('every protocol mode is record-ready by default (legalReview excepted)', () => {
    const modes: ExitSuccessionMode[] = [
      'exitProcess',
      'dwellingTransfer',
      'landReversion',
      'dissolution',
    ];
    for (const mode of modes) {
      expect(isExitSuccessionValid(mode, {})).toBe(true);
    }
  });

  it('F1 GATE: legalReview is NOT record-ready until legally reviewed AND signed', () => {
    // Bare default (scope toggles seeded, no adviser/signature) -> locked.
    expect(isExitSuccessionValid('legalReview', {})).toBe(false);
    // Adviser named but not yet signed -> still locked.
    const named = decodeExitSuccession('legalReview', {});
    named.choices.advName = 'Amina Yusuf, called to the Ontario bar 2014';
    expect(isExitSuccessionValid('legalReview', encodeExitSuccession(named))).toBe(false);
    // Named AND signed -> recordable.
    const signed = decodeExitSuccession('legalReview', encodeExitSuccession(named));
    signed.choices.advSignedAt = '2026-06-13T10:00:00.000Z';
    expect(isExitSuccessionValid('legalReview', encodeExitSuccession(signed))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// summarise
// ---------------------------------------------------------------------------

describe('summariseExitSuccession', () => {
  it('exitProcess reports the notice period', () => {
    expect(summariseExitSuccession('exitProcess', {})).toBe('Exit process: 6 months notice');
  });

  it('dwellingTransfer names the pricing model', () => {
    expect(summariseExitSuccession('dwellingTransfer', {})).toBe('CLT resale formula transfer');
    const market = decodeExitSuccession('dwellingTransfer', {
      esChoices: ['pricingModel::market'],
    });
    expect(summariseExitSuccession('dwellingTransfer', encodeExitSuccession(market))).toBe(
      'Market value transfer',
    );
  });

  it('landReversion reports the revert trigger', () => {
    expect(summariseExitSuccession('landReversion', {})).toBe('Land reverts: On departure date');
  });

  it('dissolution reports the decision basis', () => {
    expect(summariseExitSuccession('dissolution', {})).toBe(
      'Dissolution: Unanimous agreement of all current full members',
    );
  });

  it('legalReview counts confirmed scope items (5 of 6 on by default)', () => {
    expect(summariseExitSuccession('legalReview', {})).toBe('5 / 6 review items confirmed');
  });
});

// ---------------------------------------------------------------------------
// render + interaction per mode
// ---------------------------------------------------------------------------

describe('exitProcess -- render / interaction', () => {
  it('renders the 3 stages and changes a select', () => {
    const { onChange } = renderMode('exitProcess', {});
    expect(screen.getByText('Notice of intent to exit')).toBeTruthy();
    expect(screen.getByText('Settlement payment')).toBeTruthy();
    fireEvent.change(screen.getByTestId('es-select-noticePeriod'), {
      target: { value: '3 months' },
    });
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.esChoices).toContain('noticePeriod::3 months');
  });
});

describe('dwellingTransfer -- render / interaction', () => {
  it('renders the pricing models and picks one', () => {
    const { onChange } = renderMode('dwellingTransfer', {});
    expect(screen.getByText('CLT resale formula -- community-controlled price')).toBeTruthy();
    fireEvent.click(screen.getByTestId('es-pricing-market'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.esChoices).toContain('pricingModel::market');
  });
});

describe('landReversion -- render / interaction', () => {
  it('renders the agricultural section and changes a select', () => {
    const { onChange } = renderMode('landReversion', {});
    expect(screen.getByText('Agricultural and food system contributions')).toBeTruthy();
    fireEvent.change(screen.getByTestId('es-select-revertTrigger'), {
      target: { value: 'On settlement payment completion' },
    });
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.esChoices).toContain('revertTrigger::On settlement payment completion');
  });
});

describe('dissolution -- render / interaction', () => {
  it('renders the warning box and changes a select', () => {
    const { onChange } = renderMode('dissolution', {});
    expect(screen.getByText(/Define this before the community needs it/i)).toBeTruthy();
    fireEvent.change(screen.getByTestId('es-select-decisionRequires'), {
      target: { value: 'Supermajority (75%) vote' },
    });
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.esChoices).toContain('decisionRequires::Supermajority (75%) vote');
  });
});

describe('legalReview -- render / interaction', () => {
  it('renders the scope toggles and flips one off', () => {
    const { onChange } = renderMode('legalReview', {});
    expect(
      screen.getByText(
        'Exit process -- notice period and settlement calculation are legally enforceable',
      ),
    ).toBeTruthy();
    // membersSigned is on by default -- toggling emits it off
    fireEvent.click(screen.getByTestId('es-toggle-membersSigned'));
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.esChoices).toContain('membersSigned::off');
  });

  it('the sign button is disabled until an adviser is named, then stamps an ISO instant', () => {
    const { onChange } = renderMode('legalReview', {});
    const signBtn = screen.getByTestId('es-sign') as HTMLButtonElement;
    expect(signBtn.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('es-adv-name'), {
      target: { value: 'Amina Yusuf, called 2014' },
    });
    const afterName = onChange.mock.calls.at(-1)![0] as FormValue;
    expect(afterName.esChoices).toContain('advName::Amina Yusuf, called 2014');
    // Naming the adviser leaves the signature empty.
    expect(afterName.esChoices).toContain('advSignedAt::');

    // Re-render with the named value so the button is enabled, then sign.
    const signOnChange = vi.fn();
    render(
      <ExitSuccessionCapture
        mode="legalReview"
        value={afterName}
        onChange={signOnChange}
      />,
    );
    fireEvent.click(screen.getAllByTestId('es-sign').at(-1)!);
    const afterSign = signOnChange.mock.calls.at(-1)![0] as FormValue;
    const signedEntry = (afterSign.esChoices as string[]).find((e) =>
      e.startsWith('advSignedAt::'),
    );
    expect(signedEntry).toMatch(/^advSignedAt::\d{4}-\d{2}-\d{2}T/);
  });

  it('editing the adviser name clears a prior signature (no stale signed instant)', () => {
    const signed = decodeExitSuccession('legalReview', {});
    signed.choices.advName = 'Amina Yusuf';
    signed.choices.advSignedAt = '2026-06-13T10:00:00.000Z';
    const onChange = vi.fn();
    render(
      <ExitSuccessionCapture
        mode="legalReview"
        value={encodeExitSuccession(signed)}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByTestId('es-adv-name'), {
      target: { value: 'Different Adviser' },
    });
    const emitted = onChange.mock.calls.at(-1)![0] as FormValue;
    expect(emitted.esChoices).toContain('advSignedAt::');
    expect(emitted.esChoices).not.toContain('advSignedAt::2026-06-13T10:00:00.000Z');
  });
});

describe('legalReviewSignatory', () => {
  it('is null until named AND signed, then returns the adviser attestation', () => {
    expect(legalReviewSignatory({})).toBeNull();

    const named = decodeExitSuccession('legalReview', {});
    named.choices.advName = 'Amina Yusuf, called to the Ontario bar 2014';
    expect(legalReviewSignatory(encodeExitSuccession(named))).toBeNull();

    named.choices.advSignedAt = '2026-06-13T10:00:00.000Z';
    const sig = legalReviewSignatory(encodeExitSuccession(named));
    expect(sig).toMatchObject({
      signerName: 'Amina Yusuf, called to the Ontario bar 2014',
      signerRole: 'legal adviser',
      signedAt: '2026-06-13T10:00:00.000Z',
    });
    expect(sig!.attestation).toContain('legally reviewed');
  });
});
