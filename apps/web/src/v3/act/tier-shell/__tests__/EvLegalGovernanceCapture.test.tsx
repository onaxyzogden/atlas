/**
 * @vitest-environment happy-dom
 *
 * EvLegalGovernanceCapture (SP1 Group 2) -- a CONTROLLED, SELF-ROUTING renderer
 * over a FLAT FormValue (Record<string, string | string[]>) for the
 * ev-s1-legal-governance objective (8 items / 8 modes), including a HARD GATE on
 * the legal-advice item. Pure-core tests (decode / encode round-trip / validity /
 * summary) mirror the BoundaryCapture test pattern.
 */

import { describe, it, expect } from 'vitest';
import {
  legalGovernanceModeFor,
  decodeLegalGovernance,
  emitLegalGovernance,
  isLegalGovernanceValid,
  summariseLegalGovernance,
  type LegalGovernanceModel,
} from '../EvLegalGovernanceCapture';

// Round-trip helper: encode (via emit) then decode reconstructs the model.
function roundTrip(itemId: string, model: LegalGovernanceModel): LegalGovernanceModel {
  let captured: Record<string, string | string[]> = {};
  emitLegalGovernance((next) => {
    captured = next;
  }, model);
  return decodeLegalGovernance(itemId, captured);
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
  it('legal advice gate decodes scope array + scalars', () => {
    expect(decodeLegalGovernance('ev-s1-legal-governance-c7', {})).toEqual({
      kind: 'legalAdviceGate',
      adviceScope: [],
      adviceWritten: '',
      adviceDate: '',
    });
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
  it('round-trips legalAdviceGate', () => {
    const model: LegalGovernanceModel = {
      kind: 'legalAdviceGate',
      adviceScope: ['Entity type', 'Tenure', 'Financial', 'Membership', 'Tensions'],
      adviceWritten: 'yes',
      adviceDate: '2026-06-07',
    };
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
  it('legal advice gate is invalid until all 6 scope items are checked', () => {
    // 5 items is NOT sufficient -- regression guard against old 5-gate behaviour.
    const five: LegalGovernanceModel = { kind: 'legalAdviceGate', adviceScope: ['a', 'b', 'c', 'd', 'e'], adviceWritten: 'yes', adviceDate: '' };
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c7', five)).toBe(false);
    // 4 items is also invalid.
    const four: LegalGovernanceModel = { kind: 'legalAdviceGate', adviceScope: ['a', 'b', 'c', 'd'], adviceWritten: 'yes', adviceDate: '' };
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c7', four)).toBe(false);
    // All 6 items required -- adviceWritten is no longer checked by validity.
    const six: LegalGovernanceModel = { kind: 'legalAdviceGate', adviceScope: ['a', 'b', 'c', 'd', 'e', 'f'], adviceWritten: '', adviceDate: '' };
    expect(isLegalGovernanceValid('ev-s1-legal-governance-c7', six)).toBe(true);
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
    expect(summariseLegalGovernance('ev-s1-legal-governance-c7', { kind: 'legalAdviceGate', adviceScope: ['a', 'b', 'c', 'd', 'e', 'f'], adviceWritten: '', adviceDate: '' })).toBe('Legal advice confirmed');
    expect(summariseLegalGovernance('ev-s1-legal-governance-c7', { kind: 'legalAdviceGate', adviceScope: ['a', 'b'], adviceWritten: 'pending', adviceDate: '' })).toBe('2 of 6 scope items cleared');
  });
});
