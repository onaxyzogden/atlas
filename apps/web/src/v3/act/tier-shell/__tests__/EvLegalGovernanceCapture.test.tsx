/**
 * @vitest-environment happy-dom
 *
 * EvLegalGovernanceCapture (SP1 Group 2) -- a CONTROLLED, SELF-ROUTING renderer
 * over a FLAT FormValue (Record<string, string | string[]>) for the
 * ev-s1-legal-governance objective (8 items / 8 modes), including a HARD GATE on
 * the legal-advice item. Pure-core tests (decode / encode round-trip / validity /
 * summary) mirror the BoundaryCapture test pattern.
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

import EvLegalGovernanceCapture, {
  legalGovernanceModeFor,
  decodeLegalGovernance,
  emitLegalGovernance,
  isLegalGovernanceValid,
  summariseLegalGovernance,
  legalAdviceGateSignatory,
  type LegalGovernanceModel,
  type LegalAdviceGateModel,
} from '../EvLegalGovernanceCapture';
import type { FormValue } from '../actToolCatalog.js';

// Round-trip helper: encode (via emit) then decode reconstructs the model.
function roundTrip(itemId: string, model: LegalGovernanceModel): LegalGovernanceModel {
  let captured: Record<string, string | string[]> = {};
  emitLegalGovernance((next) => {
    captured = next;
  }, model);
  return decodeLegalGovernance(itemId, captured);
}

// A complete legalAdviceGate model with overridable fields (keeps the many
// literals below DRY now the gate carries adviser identity + signature).
function gateModel(over: Partial<LegalAdviceGateModel> = {}): LegalAdviceGateModel {
  return {
    kind: 'legalAdviceGate',
    adviceScope: [],
    adviceWritten: '',
    adviceDate: '',
    advFirm: '',
    advName: '',
    advDate: '',
    advNature: '',
    advSignedAt: '',
    ...over,
  };
}

function renderGate(value: FormValue) {
  const onChange = vi.fn();
  render(
    <EvLegalGovernanceCapture
      itemId="ev-s1-legal-governance-c7"
      value={value}
      onChange={onChange}
      resolveOptions={() => []}
    />,
  );
  return { onChange };
}

describe('legalGovernanceModeFor', () => {
  it('maps each checklist id to its mode', () => {
    expect(legalGovernanceModeFor('ev-s1-legal-governance-c1')).toBe('legalEntityPicker');
    expect(legalGovernanceModeFor('ev-s1-legal-governance-c8')).toBe('jurisdiction');
    expect(legalGovernanceModeFor('ev-s1-legal-governance-c2')).toBe('entityDecisionRecord');
    expect(legalGovernanceModeFor('ev-s1-legal-governance-c3')).toBe('tenureModel');
    expect(legalGovernanceModeFor('ev-s1-legal-governance-c4')).toBe('decisionFramework');
    expect(legalGovernanceModeFor('ev-s1-legal-governance-c5')).toBe('financialGovernance');
    expect(legalGovernanceModeFor('ev-s1-legal-governance-c6')).toBe('membershipRegister');
    expect(legalGovernanceModeFor('ev-s1-legal-governance-c7')).toBe('legalAdviceGate');
  });
  it('falls back to legalEntityPicker for unknown ids', () => {
    expect(legalGovernanceModeFor('something-else')).toBe('legalEntityPicker');
  });
});

describe('decode is total and defensive', () => {
  it('entity picker decodes empty FormValue to empty selection', () => {
    expect(decodeLegalGovernance('ev-s1-legal-governance-c1', {})).toEqual({
      kind: 'legalEntityPicker',
      entity: '',
    });
  });
  it('jurisdiction decodes empty FormValue to empty scalars', () => {
    expect(decodeLegalGovernance('ev-s1-legal-governance-c8', {})).toEqual({
      kind: 'jurisdiction',
      country: '',
      province: '',
      regOffice: '',
    });
  });
  it('entity decision record decodes the three rationale scalars', () => {
    expect(
      decodeLegalGovernance('ev-s1-legal-governance-c2', {
        ratWhy: 'why',
        ratEnables: 'enables',
        ratConstrains: 'constrains',
      }),
    ).toEqual({
      kind: 'entityDecisionRecord',
      why: 'why',
      enables: 'enables',
      constrains: 'constrains',
    });
  });
  it('membership register decodes rights/obligations as independent arrays', () => {
    expect(
      decodeLegalGovernance('ev-s1-legal-governance-c6', {
        rights: ['Right to occupy'],
        obligations: ['Pay levy', 'Contribute hours'],
      }),
    ).toEqual({
      kind: 'membershipRegister',
      rights: ['Right to occupy'],
      obligations: ['Pay levy', 'Contribute hours'],
    });
  });
  it('legal advice gate decodes scope array + scalars + adviser fields', () => {
    expect(decodeLegalGovernance('ev-s1-legal-governance-c7', {})).toEqual(gateModel());
  });
});

describe('encode is the exact inverse of decode (round-trip)', () => {
  it('round-trips legalEntityPicker', () => {
    const model: LegalGovernanceModel = { kind: 'legalEntityPicker', entity: 'Co-operative' };
    expect(roundTrip('ev-s1-legal-governance-c1', model)).toEqual(model);
  });
  it('round-trips jurisdiction', () => {
    const model: LegalGovernanceModel = {
      kind: 'jurisdiction',
      country: 'Canada',
      province: 'Ontario',
      regOffice: 'Registered office is on the land',
    };
    expect(roundTrip('ev-s1-legal-governance-c8', model)).toEqual(model);
  });
  it('round-trips entityDecisionRecord', () => {
    const model: LegalGovernanceModel = {
      kind: 'entityDecisionRecord',
      why: 'A land trust holds the land in perpetuity',
      enables: 'collective stewardship',
      constrains: 'individual resale',
    };
    expect(roundTrip('ev-s1-legal-governance-c2', model)).toEqual(model);
  });
  it('round-trips tenureModel', () => {
    const model: LegalGovernanceModel = { kind: 'tenureModel', tenure: 'Leasehold' };
    expect(roundTrip('ev-s1-legal-governance-c3', model)).toEqual(model);
  });
  it('round-trips decisionFramework', () => {
    const model: LegalGovernanceModel = {
      kind: 'decisionFramework',
      framework: 'Consent (sociocracy)',
      quorum: '67% of active members',
    };
    expect(roundTrip('ev-s1-legal-governance-c4', model)).toEqual(model);
  });
  it('round-trips financialGovernance', () => {
    const model: LegalGovernanceModel = {
      kind: 'financialGovernance',
      banking: 'Trustee-held funds',
      authSingle: '$500',
      authDouble: '$5,000',
      authVote: '$10,000',
      fyEnd: '30 June',
    };
    expect(roundTrip('ev-s1-legal-governance-c5', model)).toEqual(model);
  });
  it('round-trips membershipRegister', () => {
    const model: LegalGovernanceModel = {
      kind: 'membershipRegister',
      rights: ['Right to occupy', 'Vote'],
      obligations: ['Pay levy'],
    };
    expect(roundTrip('ev-s1-legal-governance-c6', model)).toEqual(model);
  });
  it('round-trips legalAdviceGate (incl. adviser identity + signature)', () => {
    const model: LegalGovernanceModel = gateModel({
      adviceScope: ['Entity type', 'Tenure', 'Financial', 'Membership', 'Tensions'],
      adviceWritten: 'yes',
      adviceDate: '2026-06-07',
      advFirm: 'Northern Light LLP',
      advName: 'Amina Yusuf, called 2014',
      advDate: '07/06/2026',
      advNature: 'formal opinion',
      advSignedAt: '2026-06-07T12:00:00.000Z',
    });
    expect(roundTrip('ev-s1-legal-governance-c7', model)).toEqual(model);
  });
});

describe('isLegalGovernanceValid', () => {
  it('entity picker requires a selection', () => {
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c1', { kind: 'legalEntityPicker', entity: '' })).toBe(false);
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c1', { kind: 'legalEntityPicker', entity: 'Co-operative' })).toBe(true);
  });
  it('jurisdiction requires country and province', () => {
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c8', { kind: 'jurisdiction', country: 'Canada', province: '', regOffice: '' })).toBe(false);
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c8', { kind: 'jurisdiction', country: 'Canada', province: 'Ontario', regOffice: '' })).toBe(true);
  });
  it('entity decision record gates on rationale lengths', () => {
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c2', { kind: 'entityDecisionRecord', why: 'too short', enables: 'ok now', constrains: 'ok now' })).toBe(false);
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c2', { kind: 'entityDecisionRecord', why: 'A land trust holds the land in perpetuity', enables: 'stewardship', constrains: 'resale ease' })).toBe(true);
  });
  it('tenure and framework require their primary select', () => {
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c3', { kind: 'tenureModel', tenure: '' })).toBe(false);
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c3', { kind: 'tenureModel', tenure: 'Leasehold' })).toBe(true);
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c4', { kind: 'decisionFramework', framework: '', quorum: '' })).toBe(false);
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c4', { kind: 'decisionFramework', framework: 'Full consensus', quorum: '' })).toBe(true);
  });
  it('financial governance requires a banking structure', () => {
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c5', { kind: 'financialGovernance', banking: '', authSingle: '', authDouble: '', authVote: '', fyEnd: '' })).toBe(false);
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c5', { kind: 'financialGovernance', banking: 'Trustee-held funds', authSingle: '', authDouble: '', authVote: '', fyEnd: '' })).toBe(true);
  });
  it('membership register is always recordable', () => {
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c6', { kind: 'membershipRegister', rights: [], obligations: [] })).toBe(true);
  });
  it('legal advice gate needs all 6 scope items checked', () => {
    const signed = { advName: 'Amina Yusuf', advSignedAt: '2026-06-07T12:00:00.000Z' };
    // 5 items is NOT sufficient -- regression guard against old 5-gate behaviour.
    expect(
      isLegalGovernanceValid('ev-s1-legal-governance-c7', gateModel({ adviceScope: ['a', 'b', 'c', 'd', 'e'], ...signed })),
    ).toBe(false);
    // 4 items is also invalid.
    expect(
      isLegalGovernanceValid('ev-s1-legal-governance-c7', gateModel({ adviceScope: ['a', 'b', 'c', 'd'], ...signed })),
    ).toBe(false);
    // All 6 items + a signed adviser opinion is valid.
    expect(
      isLegalGovernanceValid('ev-s1-legal-governance-c7', gateModel({ adviceScope: ['a', 'b', 'c', 'd', 'e', 'f'], ...signed })),
    ).toBe(true);
  });

  it('F1 GATE: 6-of-6 scope toggles alone do NOT satisfy the gate without a signed opinion', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'];
    // All 6 toggled but no adviser named, no signature -> NOT recordable.
    expect(
      isLegalGovernanceValid('ev-s1-legal-governance-c7', gateModel({ adviceScope: six })),
    ).toBe(false);
    // Adviser named but the opinion was never signed in-app -> still NOT recordable.
    expect(
      isLegalGovernanceValid('ev-s1-legal-governance-c7', gateModel({ adviceScope: six, advName: 'Amina Yusuf' })),
    ).toBe(false);
    // A signature timestamp without a named signer is not a valid attestation.
    expect(
      isLegalGovernanceValid('ev-s1-legal-governance-c7', gateModel({ adviceScope: six, advSignedAt: '2026-06-07T12:00:00.000Z' })),
    ).toBe(false);
    // Named adviser + in-app signature -> recordable.
    expect(
      isLegalGovernanceValid(
        'ev-s1-legal-governance-c7',
        gateModel({ adviceScope: six, advName: 'Amina Yusuf', advSignedAt: '2026-06-07T12:00:00.000Z' }),
      ),
    ).toBe(true);
  });
});

describe('summariseLegalGovernance', () => {
  it('summarises each mode', () => {
    expect(summariseLegalGovernance('ev-s1-legal-governance-c1', { kind: 'legalEntityPicker', entity: 'Co-operative' })).toBe('Co-operative');
    expect(summariseLegalGovernance('ev-s1-legal-governance-c8', { kind: 'jurisdiction', country: 'Canada', province: 'Ontario', regOffice: '' })).toBe('Ontario, Canada');
    expect(summariseLegalGovernance('ev-s1-legal-governance-c3', { kind: 'tenureModel', tenure: 'Leasehold' })).toBe('Leasehold');
    expect(summariseLegalGovernance('ev-s1-legal-governance-c4', { kind: 'decisionFramework', framework: 'Full consensus', quorum: '67% of active members' })).toBe('Full consensus (quorum 67% of active members)');
    expect(summariseLegalGovernance('ev-s1-legal-governance-c5', { kind: 'financialGovernance', banking: 'Trustee-held funds', authSingle: '', authDouble: '', authVote: '', fyEnd: '' })).toBe('Trustee-held funds');
    expect(summariseLegalGovernance('ev-s1-legal-governance-c6', { kind: 'membershipRegister', rights: ['a'], obligations: ['b', 'c'] })).toBe('1 right, 2 obligations');
    expect(summariseLegalGovernance('ev-s1-legal-governance-c7', gateModel({ adviceScope: ['a', 'b', 'c', 'd', 'e', 'f'], advName: 'Amina Yusuf', advSignedAt: '2026-06-07T12:00:00.000Z' }))).toBe('Legal advice confirmed');
    expect(summariseLegalGovernance('ev-s1-legal-governance-c7', gateModel({ adviceScope: ['a', 'b'], adviceWritten: 'pending' }))).toBe('2 of 6 scope items cleared');
  });
});

// Encode a gate model to its FormValue (the shape the signatory reader consumes).
function encodeGate(over: Partial<LegalAdviceGateModel> = {}): FormValue {
  let captured: FormValue = {};
  emitLegalGovernance((next) => {
    captured = next;
  }, gateModel(over));
  return captured;
}

describe('legalAdviceGateSignatory', () => {
  it('is null until an adviser is named AND has signed, then returns the attestation', () => {
    expect(legalAdviceGateSignatory({})).toBeNull();
    // Named but the opinion was never signed in-app.
    expect(
      legalAdviceGateSignatory(encodeGate({ advName: 'Amina Yusuf, called 2014' })),
    ).toBeNull();
    // A timestamp without a named signer is not a valid attestation.
    expect(
      legalAdviceGateSignatory(encodeGate({ advSignedAt: '2026-06-07T12:00:00.000Z' })),
    ).toBeNull();

    const sig = legalAdviceGateSignatory(
      encodeGate({
        advFirm: 'Northern Light LLP',
        advName: 'Amina Yusuf, called to the Ontario bar 2014',
        advSignedAt: '2026-06-07T12:00:00.000Z',
      }),
    );
    expect(sig).toMatchObject({
      signerName: 'Amina Yusuf, called to the Ontario bar 2014',
      signerRole: 'legal adviser',
      signedAt: '2026-06-07T12:00:00.000Z',
    });
    // The firm is folded into the attestation; the binding-opinion language stays.
    expect(sig?.attestation).toContain('Northern Light LLP');
    expect(sig?.attestation).toMatch(/legally reviewed/i);
  });
});

describe('legalAdviceGate render (c7 sign-off)', () => {
  it('the sign button is disabled until an adviser is named, then stamps an ISO instant', () => {
    const { onChange } = renderGate({});
    const signBtn = screen.getByTestId('lg-sign') as HTMLButtonElement;
    expect(signBtn.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('adv-name'), {
      target: { value: 'Amina Yusuf, called 2014' },
    });
    const afterName = onChange.mock.calls.at(-1)![0] as FormValue;
    expect(afterName.advName).toBe('Amina Yusuf, called 2014');
    // Naming the adviser leaves the signature empty -- the gate is not yet cleared.
    expect(afterName.advSignedAt).toBe('');

    // Re-render with the named value so the button enables, then sign.
    const signOnChange = vi.fn();
    render(
      <EvLegalGovernanceCapture
        itemId="ev-s1-legal-governance-c7"
        value={afterName}
        onChange={signOnChange}
        resolveOptions={() => []}
      />,
    );
    fireEvent.click(screen.getAllByTestId('lg-sign').at(-1)!);
    const afterSign = signOnChange.mock.calls.at(-1)![0] as FormValue;
    expect(afterSign.advSignedAt as string).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('editing the adviser name clears a prior signature (no stale signed instant)', () => {
    const value = encodeGate({
      advName: 'Amina Yusuf',
      advSignedAt: '2026-06-13T10:00:00.000Z',
    });
    const { onChange } = renderGate(value);
    // A signed gate shows the signed-meta, not the sign button.
    expect(screen.getByTestId('lg-signed')).toBeTruthy();

    fireEvent.change(screen.getByTestId('adv-name'), {
      target: { value: 'Different Adviser' },
    });
    const emitted = onChange.mock.calls.at(-1)![0] as FormValue;
    expect(emitted.advSignedAt).toBe('');
  });
});
