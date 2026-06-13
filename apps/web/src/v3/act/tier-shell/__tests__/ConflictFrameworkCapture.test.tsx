/**
 * @vitest-environment happy-dom
 *
 * ConflictFrameworkCapture -- multi-mode CONTROLLED renderer for objective
 * ev-s1-conflict-framework (7 checklist items c1..c7, modes decisionProcess /
 * disputePathway / communityAgreements / exitProcess / dissolution /
 * reviewCadence / signOff).
 *
 * Verified behaviours:
 *   - conflictFrameworkModeFor maps each c1..c7 id (and null for others).
 *   - decode is TOTAL/defensive (non-array -> empty; garbage entries dropped;
 *     unknown agreement ids / household ids dropped; never fabricates seeds).
 *   - encode round-trips losslessly per mode.
 *   - validity per mode, with EMPHASIS on the signOff pre-land-work HARD GATE
 *     (locked while < 4 signed; unlocks at all-4 signed/reservations).
 *   - summarise strings per mode.
 *   - a render assertion per mode (distinctive label/control present), incl. the
 *     verbatim halal-kitchen agreement string.
 *   - one interaction per mode (pick a select, toggle an agreement, sign a
 *     household and assert the gate flips).
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
  ConflictFrameworkCapture,
  conflictFrameworkModeFor,
  decodeConflictFramework,
  encodeConflictFramework,
  householdsFrom,
  isConflictFrameworkValid,
  summariseConflictFramework,
  signOffSignatories,
  type FoundingHousehold,
  type ConflictFrameworkMode,
  type SignOffModel,
  type CommunityAgreementsModel,
  type SelectModeModel,
} from '../ConflictFrameworkCapture.js';
import type { FormValue } from '../actToolCatalog.js';

// Fixture roster used across signOff tests. Uses mc1..mc4 ids to keep test
// data compact; householdsFrom tests (below) verify the real seed-N output.
const FIXTURE_ROSTER: readonly FoundingHousehold[] = [
  { id: 'mc1', initials: 'SM', name: 'Sarah Mitchell', avatar: 'av1' },
  { id: 'mc2', initials: 'MD', name: 'Marcus Delacroix', avatar: 'av2' },
  { id: 'mc3', initials: 'AN', name: 'Aroha Ngai', avatar: 'av3' },
  { id: 'mc4', initials: 'EY', name: 'Elif Yildiz', avatar: 'av4' },
];

function renderMode(
  mode: ConflictFrameworkMode,
  value: FormValue,
  roster: readonly FoundingHousehold[] = [],
) {
  const onChange = vi.fn();
  render(
    <ConflictFrameworkCapture
      mode={mode}
      value={value}
      onChange={onChange}
      itemId="ev-s1-conflict-framework-c1"
      projectId="ev-demo"
      roster={roster}
    />,
  );
  return { onChange };
}

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('conflictFrameworkModeFor', () => {
  it('maps c1..c7 to the correct mode', () => {
    expect(conflictFrameworkModeFor('ev-s1-conflict-framework-c1')).toBe(
      'decisionProcess',
    );
    expect(conflictFrameworkModeFor('ev-s1-conflict-framework-c2')).toBe(
      'disputePathway',
    );
    expect(conflictFrameworkModeFor('ev-s1-conflict-framework-c3')).toBe(
      'communityAgreements',
    );
    expect(conflictFrameworkModeFor('ev-s1-conflict-framework-c4')).toBe(
      'exitProcess',
    );
    expect(conflictFrameworkModeFor('ev-s1-conflict-framework-c5')).toBe(
      'dissolution',
    );
    expect(conflictFrameworkModeFor('ev-s1-conflict-framework-c6')).toBe(
      'reviewCadence',
    );
    expect(conflictFrameworkModeFor('ev-s1-conflict-framework-c7')).toBe(
      'signOff',
    );
  });

  it('returns null for unrelated ids', () => {
    expect(conflictFrameworkModeFor('s1-vision-constraints')).toBeNull();
    expect(conflictFrameworkModeFor('ev-s1-conflict-framework-c8')).toBeNull();
    expect(conflictFrameworkModeFor('ev-s1-conflict-framework')).toBeNull();
    expect(conflictFrameworkModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decisionProcess (select mode, representative of the 5 select modes)
// ---------------------------------------------------------------------------

describe('decisionProcess -- decode / encode / validity / summarise / render', () => {
  it('decode of empty never fabricates: every key unset', () => {
    const m = decodeConflictFramework(
      'decisionProcess',
      {},
    ) as SelectModeModel;
    expect(m.kind).toBe('decisionProcess');
    expect(Object.values(m.sel).every((v) => v === '')).toBe(true);
    expect(m.sel.cfPrimaryModel).toBe('');
    expect(m.sel.cfQuorum).toBe('');
  });

  it('decode is defensive: array value coerces to empty string', () => {
    const m = decodeConflictFramework('decisionProcess', {
      cfPrimaryModel: ['nope'],
    } as unknown as FormValue) as SelectModeModel;
    expect(m.sel.cfPrimaryModel).toBe('');
  });

  it('encode round-trips', () => {
    const value: FormValue = {
      cfPrimaryModel: 'Consensus -- everyone must agree',
      cfQuorum: 'All 4 founding households',
    };
    const model = decodeConflictFramework('decisionProcess', value);
    expect(
      decodeConflictFramework(
        'decisionProcess',
        encodeConflictFramework(model),
      ),
    ).toEqual(model);
  });

  it('valid only when both primary model and quorum are set', () => {
    expect(isConflictFrameworkValid('decisionProcess', {})).toBe(false);
    expect(
      isConflictFrameworkValid('decisionProcess', {
        cfPrimaryModel: 'Consensus -- everyone must agree',
      }),
    ).toBe(false);
    expect(
      isConflictFrameworkValid('decisionProcess', {
        cfPrimaryModel: 'Consensus -- everyone must agree',
        cfQuorum: 'All 4 founding households',
      }),
    ).toBe(true);
  });

  it('summarise reports the head of the primary model + quorum', () => {
    expect(
      summariseConflictFramework('decisionProcess', {
        cfPrimaryModel: 'Consent -- "I can live with this" (not unanimous approval)',
        cfQuorum: 'All 4 founding households',
      }),
    ).toBe('Consent model -- All 4 founding households');
  });

  it('renders the decision-model section and picks the primary model', () => {
    const { onChange } = renderMode('decisionProcess', {});
    expect(screen.getByText('Decision model')).toBeTruthy();
    // "Quorum" appears twice (section eyebrow + select-row label); assert the
    // unique quorum info-note instead.
    expect(
      screen.getByText(/All 4 required for: new membership/),
    ).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Primary model' }), {
      target: { value: 'Consensus -- everyone must agree' },
    });
    expect(onChange).toHaveBeenCalled();
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.cfPrimaryModel).toBe('Consensus -- everyone must agree');
  });
});

// ---------------------------------------------------------------------------
// disputePathway
// ---------------------------------------------------------------------------

describe('disputePathway -- validity / summarise / render', () => {
  it('valid only when all 3 tier resolvers are set', () => {
    expect(
      isConflictFrameworkValid('disputePathway', {
        cfT1Who: 'Parties in dispute -- direct conversation within 5 days',
        cfT2Facilitator: 'Any non-involved founding member',
      }),
    ).toBe(false);
    expect(
      isConflictFrameworkValid('disputePathway', {
        cfT1Who: 'Parties in dispute -- direct conversation within 5 days',
        cfT2Facilitator: 'Any non-involved founding member',
        cfT3Mediator: 'Joint selection',
      }),
    ).toBe(true);
  });

  it('renders the 3 tier cards', () => {
    renderMode('disputePathway', {});
    expect(
      screen.getByText('Tier 1 -- Informal -- direct conversation'),
    ).toBeTruthy();
    expect(screen.getByText('Tier 2 -- Internal facilitation')).toBeTruthy();
    expect(
      screen.getByText('Tier 3 -- External mediation or arbitration'),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// communityAgreements (incl. the verbatim halal-kitchen string)
// ---------------------------------------------------------------------------

describe('communityAgreements -- decode / validity / summarise / render', () => {
  it('decode drops unknown agreement ids and never fabricates', () => {
    const m = decodeConflictFramework('communityAgreements', {
      cfAgreements: ['noise-quiet', 'bogus', 'spaces-kitchen'],
    }) as CommunityAgreementsModel;
    expect(m.enabled).toEqual(['noise-quiet', 'spaces-kitchen']);
  });

  it('decode of empty enables nothing', () => {
    const m = decodeConflictFramework(
      'communityAgreements',
      {},
    ) as CommunityAgreementsModel;
    expect(m.enabled).toEqual([]);
  });

  it('encode round-trips', () => {
    const model = decodeConflictFramework('communityAgreements', {
      cfAgreements: ['noise-quiet', 'visitors-halal'],
      cfQuietHours: '10pm-7am daily',
    });
    expect(
      decodeConflictFramework(
        'communityAgreements',
        encodeConflictFramework(model),
      ),
    ).toEqual(model);
  });

  it('valid only when >= 1 agreement is adopted', () => {
    expect(isConflictFrameworkValid('communityAgreements', {})).toBe(false);
    expect(
      isConflictFrameworkValid('communityAgreements', {
        cfAgreements: ['noise-quiet'],
      }),
    ).toBe(true);
  });

  it('summarise reports the adopted count (pluralised)', () => {
    expect(
      summariseConflictFramework('communityAgreements', {
        cfAgreements: ['noise-quiet'],
      }),
    ).toBe('1 community agreement adopted');
    expect(
      summariseConflictFramework('communityAgreements', {
        cfAgreements: ['noise-quiet', 'spaces-kitchen'],
      }),
    ).toBe('2 community agreements adopted');
  });

  it('renders the verbatim halal-kitchen agreement and toggles an item', () => {
    const { onChange } = renderMode('communityAgreements', {});
    expect(
      screen.getByText(
        'Halal food standards observed in communal kitchen -- applies to all communal food preparation',
      ),
    ).toBeTruthy();
    // The clickable affordance is the checkbox button (aria-label == the item
    // label); the title text renders in a separate non-interactive div.
    fireEvent.click(
      screen.getByLabelText('Quiet hours -- no power tools or loud music'),
    );
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.cfAgreements).toContain('noise-quiet');
  });
});

// ---------------------------------------------------------------------------
// exitProcess
// ---------------------------------------------------------------------------

describe('exitProcess -- validity / summarise / render', () => {
  const full: FormValue = {
    cfExitNotice: '6 months -- time to find replacement household',
    cfExitSettlement: 'Buy-in paid minus outstanding obligations',
    cfExitDwelling: 'Community identifies replacement -- CLT transfer process',
    cfExitMembership: 'Full rights maintained -- levy continues',
    cfExitEmergency:
      'Notice period waived -- community acts in good faith on settlement',
  };

  it('valid only when all 5 selects are set', () => {
    expect(isConflictFrameworkValid('exitProcess', {})).toBe(false);
    const { cfExitEmergency: _drop, ...partial } = full;
    expect(isConflictFrameworkValid('exitProcess', partial)).toBe(false);
    expect(isConflictFrameworkValid('exitProcess', full)).toBe(true);
  });

  it('summarise reports the notice head', () => {
    expect(summariseConflictFramework('exitProcess', full)).toBe(
      'Exit process -- 6 months notice',
    );
  });

  it('renders the member-exit section', () => {
    renderMode('exitProcess', {});
    expect(screen.getByText('Member exit process')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// dissolution
// ---------------------------------------------------------------------------

describe('dissolution -- validity / render', () => {
  it('valid only when all 6 selects are set', () => {
    expect(isConflictFrameworkValid('dissolution', {})).toBe(false);
    const full: FormValue = {
      cfDisProposedBy: 'Majority of members',
      cfDisDecision: 'Supermajority (75%)',
      cfDisMediation: 'Recommended -- not required',
      cfDisLand: 'Sold -- proceeds distributed pro-rata',
      cfDisDwelling: 'Market value -- independent appraisal',
      cfDisAssets: 'Members purchase at agreed valuation',
    };
    expect(isConflictFrameworkValid('dissolution', full)).toBe(true);
  });

  it('renders the dissolution section', () => {
    renderMode('dissolution', {});
    expect(screen.getByText('Dissolution protocol')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// reviewCadence
// ---------------------------------------------------------------------------

describe('reviewCadence -- validity / summarise / render', () => {
  const full: FormValue = {
    cfCadCheckin: 'Weekly',
    cfCadGovernance: 'Monthly',
    cfCadAnnual: 'Annually (February)',
    cfCadFull: 'Every 2 years',
    cfCadFiveYear: 'Year 5 then every 5 years',
  };

  it('valid only when all 5 cadence selects are set (record-keeping optional)', () => {
    expect(isConflictFrameworkValid('reviewCadence', {})).toBe(false);
    expect(isConflictFrameworkValid('reviewCadence', full)).toBe(true);
  });

  it('summarise reports the check-in cadence', () => {
    expect(summariseConflictFramework('reviewCadence', full)).toBe(
      'Review cadence -- Weekly check-in',
    );
  });

  it('renders both the cadence and record-keeping sections', () => {
    renderMode('reviewCadence', {});
    expect(screen.getByText('Review cadence')).toBeTruthy();
    expect(screen.getByText('Decision record-keeping')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// signOff -- the pre-land-work HARD GATE
// ---------------------------------------------------------------------------

describe('signOff -- decode / validity / summarise / render / gate', () => {
  const TS = '2026-06-13T10:00:00.000Z';
  function sigValue(pairs: string[]): FormValue {
    return { cfSignatures: pairs };
  }
  /** All four households signed at TS (a complete, timestamped sign-off). */
  const allSignedAt: string[] = [
    `mc1::signed::${TS}`,
    `mc2::signed::${TS}`,
    `mc3::signed::${TS}`,
    `mc4::signed::${TS}`,
  ];

  it('decode drops malformed + unknown-household entries, never fabricates', () => {
    const m = decodeConflictFramework(
      'signOff',
      sigValue([
        'mc1::signed',
        'no-separator',
        'ghost::signed',
        'mc2::bogus',
        'mc3::reservations',
      ]),
      FIXTURE_ROSTER,
    ) as SignOffModel;
    expect(m.signatures).toEqual({ mc1: 'signed', mc3: 'reservations' });
    // No third segment -> no attestation timestamps recorded.
    expect(m.signedAt).toEqual({});
  });

  it('decode parses the optional signedAt timestamp segment', () => {
    const m = decodeConflictFramework(
      'signOff',
      sigValue([`mc1::signed::${TS}`, 'mc2::signed']),
      FIXTURE_ROSTER,
    ) as SignOffModel;
    expect(m.signatures).toEqual({ mc1: 'signed', mc2: 'signed' });
    // Only mc1 carried a timestamp; mc2 is an un-timestamped (legacy) toggle.
    expect(m.signedAt).toEqual({ mc1: TS });
  });

  it('decode of empty leaves every household pending', () => {
    const m = decodeConflictFramework('signOff', {}, FIXTURE_ROSTER) as SignOffModel;
    expect(m.signatures).toEqual({});
    expect(m.signedAt).toEqual({});
  });

  it('encode round-trips (pending households omitted; timestamps preserved)', () => {
    const model = decodeConflictFramework(
      'signOff',
      sigValue([`mc1::signed::${TS}`, 'mc2::reservations']),
      FIXTURE_ROSTER,
    );
    expect(
      decodeConflictFramework('signOff', encodeConflictFramework(model, FIXTURE_ROSTER), FIXTURE_ROSTER),
    ).toEqual(model);
  });

  it('HARD GATE: locked until all households sign or reserve', () => {
    expect(isConflictFrameworkValid('signOff', {}, FIXTURE_ROSTER)).toBe(false);
    expect(
      isConflictFrameworkValid(
        'signOff',
        sigValue([`mc1::signed::${TS}`, `mc2::signed::${TS}`, `mc3::signed::${TS}`]),
        FIXTURE_ROSTER,
      ),
    ).toBe(false);
    // All 4: a mix of signed + reservations unlocks (reservations non-blocking).
    expect(
      isConflictFrameworkValid(
        'signOff',
        sigValue([
          `mc1::signed::${TS}`,
          `mc2::reservations::${TS}`,
          `mc3::signed::${TS}`,
          `mc4::reservations::${TS}`,
        ]),
        FIXTURE_ROSTER,
      ),
    ).toBe(true);
    // A pending among the 4 keeps it locked.
    expect(
      isConflictFrameworkValid(
        'signOff',
        sigValue([
          `mc1::signed::${TS}`,
          `mc2::signed::${TS}`,
          `mc3::signed::${TS}`,
          'mc4::pending',
        ]),
        FIXTURE_ROSTER,
      ),
    ).toBe(false);
  });

  it('F1 GATE: all 4 toggled "signed" WITHOUT timestamps stays locked', () => {
    // A bare toggle (no signedAt) is not a signature -- legacy data must not
    // satisfy the pre-land-work gate.
    expect(
      isConflictFrameworkValid(
        'signOff',
        sigValue(['mc1::signed', 'mc2::signed', 'mc3::signed', 'mc4::signed']),
        FIXTURE_ROSTER,
      ),
    ).toBe(false);
    // The same four, timestamped, unlock.
    expect(isConflictFrameworkValid('signOff', sigValue(allSignedAt), FIXTURE_ROSTER)).toBe(true);
  });

  it('R2: empty roster cannot vacuously pass the gate', () => {
    // A2 guard: roster.length < 1 must return false even though 0 === 0.
    expect(isConflictFrameworkValid('signOff', sigValue(allSignedAt), [])).toBe(false);
    expect(isConflictFrameworkValid('signOff', {}, [])).toBe(false);
  });

  it('signOffSignatories returns a ProofSignatory per timestamped signature', () => {
    const sigs = signOffSignatories(
      sigValue([`mc1::signed::${TS}`, `mc2::reservations::${TS}`, 'mc3::signed']),
      FIXTURE_ROSTER,
    );
    // mc3 has no timestamp -> not a signature proof; mc4 pending -> absent.
    expect(sigs).toHaveLength(2);
    expect(sigs[0]).toMatchObject({
      signerName: 'Sarah Mitchell',
      signerRole: 'founding member',
      signedAt: TS,
    });
    expect(sigs[0]!.attestation).toContain('agree to be bound');
    // reservations are recorded faithfully in the attestation text.
    expect(sigs[1]!.signerName).toBe('Marcus Delacroix');
    expect(sigs[1]!.attestation).toContain('reservations noted');
  });

  it('summarise reports signed/total and reservation count', () => {
    expect(
      summariseConflictFramework(
        'signOff',
        sigValue(['mc1::signed', 'mc2::reservations']),
        FIXTURE_ROSTER,
      ),
    ).toBe('2/4 households signed (1 with reservations)');
    expect(
      summariseConflictFramework('signOff', sigValue(['mc1::signed']), FIXTURE_ROSTER),
    ).toBe('1/4 households signed');
  });

  it('renders all fixture households and the framework checklist', () => {
    renderMode('signOff', {}, FIXTURE_ROSTER);
    for (const h of FIXTURE_ROSTER) {
      expect(screen.getByText(h.name)).toBeTruthy();
    }
    expect(screen.getByText('Framework being signed off')).toBeTruthy();
  });

  it('signing a household emits a timestamped signature entry', () => {
    const { onChange } = renderMode('signOff', {}, FIXTURE_ROSTER);
    fireEvent.click(screen.getAllByText('Signed -- I agree')[0]!);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    const entries = emitted.cfSignatures as string[];
    const mc1 = entries.find((e) => e.startsWith('mc1::signed::'));
    expect(mc1).toBeTruthy();
    // the third segment is an ISO timestamp stamped at sign time.
    expect(mc1!.split('::')[2]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('renders empty when roster is [] (no households shown, gate locked)', () => {
    renderMode('signOff', {}, []);
    expect(screen.queryByText('Signed -- I agree')).toBeNull();
    // Gate status shows 0/0 but is locked.
    expect(screen.getByText('0/0 households signed')).toBeTruthy();
  });

  it('gate flips to unlocked once the last household signs', () => {
    // 3 of 4 already signed (timestamped) -> still locked.
    const threeSigned = sigValue([
      `mc1::signed::${TS}`,
      `mc2::signed::${TS}`,
      `mc3::signed::${TS}`,
    ]);
    expect(isConflictFrameworkValid('signOff', threeSigned, FIXTURE_ROSTER)).toBe(false);

    const onChange = vi.fn();
    render(
      <ConflictFrameworkCapture
        mode="signOff"
        value={threeSigned}
        onChange={onChange}
        itemId="ev-s1-conflict-framework-c7"
        projectId="ev-demo"
        roster={FIXTURE_ROSTER}
      />,
    );
    // Sign the 4th household.
    fireEvent.click(screen.getAllByText('Signed -- I agree')[3]!);
    const emitted = onChange.mock.calls.at(-1)![0] as FormValue;
    expect(isConflictFrameworkValid('signOff', emitted, FIXTURE_ROSTER)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// householdsFrom -- roster derivation from StewardModel
// ---------------------------------------------------------------------------

describe('householdsFrom', () => {
  it('returns empty array for no invites', () => {
    expect(householdsFrom({ invites: [] })).toEqual([]);
  });

  it('excludes contractors and blank-name invites', () => {
    const result = householdsFrom({
      invites: [
        { name: 'Alice Brown', email: 'a@x.com', role: 'team_member' },
        { name: 'Bob Crew', email: 'b@x.com', role: 'contractor' },
        { name: '', email: 'c@x.com', role: 'team_member' },
        { name: 'Clara Davis', email: 'd@x.com', role: 'landowner' },
      ],
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe('Alice Brown');
    expect(result[1]!.name).toBe('Clara Davis');
  });

  it('assigns deterministic seed-N ids', () => {
    const result = householdsFrom({
      invites: [
        { name: 'Alice Brown', email: 'a@x.com', role: 'team_member' },
        { name: 'Clara Davis', email: 'c@x.com', role: 'landowner' },
      ],
    });
    expect(result[0]!.id).toBe('seed-0');
    expect(result[1]!.id).toBe('seed-1');
  });

  it('derives initials from first + last word', () => {
    const result = householdsFrom({
      invites: [
        { name: 'Alice Brown', email: 'a@x.com', role: 'team_member' },
        { name: 'SingleName', email: 'b@x.com', role: 'team_member' },
        { name: 'Ali ibn Abi Talib', email: 'c@x.com', role: 'team_member' },
      ],
    });
    expect(result[0]!.initials).toBe('AB');
    expect(result[1]!.initials).toBe('S');
    expect(result[2]!.initials).toBe('AT');
  });

  it('cycles avatar slots av1..av4 for more than 4 members', () => {
    const invites = Array.from({ length: 5 }, (_, i) => ({
      name: `Member ${i}`,
      email: `m${i}@x.com`,
      role: 'team_member' as const,
    }));
    const result = householdsFrom({ invites });
    expect(result.map((h) => h.avatar)).toEqual(['av1', 'av2', 'av3', 'av4', 'av1']);
  });
});
