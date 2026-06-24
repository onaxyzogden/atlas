/**
 * @vitest-environment happy-dom
 *
 * StewardTeamCapture -- store-direct Steward / Team Object capture (Tier-0 /
 * Stratum-1 restructure, 2026-06-16). Mirrors StakeholderCapture.test.tsx
 * (happy-dom + testing-library + lucide-react stub). Two halves:
 *   1. Pure exported helpers (stewardTeamModeFor / isStewardTeamValid /
 *      summariseStewardTeam) -- operate on snapshots, no render.
 *   2. Store-direct render/write behaviour per mode -- the component writes the
 *      canonical record straight into visionStore (no lifted marker state), so a
 *      write is asserted by reading the store back.
 *
 * The roster is the memberStore <-> visionStore.stewardProfiles join, so both
 * stores are seeded. updateStewardProfile/updateStewardTeam only .map over an
 * EXISTING vision, so each render test seeds the project first (ensureDefaults).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ProjectMemberRecord } from '@ogden/shared';
import { STEWARD_DOMAINS } from '@ogden/shared';

// lucide-react's CJS icon exports re-render as childless objects that React +
// happy-dom reject; replace each component export with a clean <svg> stub
// (established convention -- mirrors the capture suites).
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

import StewardTeamCapture, {
  stewardTeamModeFor,
  isStewardTeamValid,
  summariseStewardTeam,
  EMPTY_STEWARD_TEAM,
} from '../StewardTeamCapture.js';
import {
  useVisionStore,
  type StewardProfile,
  type StewardTeam,
} from '../../../../store/visionStore.js';
import { useMemberStore } from '../../../../store/memberStore.js';
import type { StewardRosterEntry } from '../../../observe/modules/human-context/roster.js';

// --------------------------------------------------------------------------
// Shared fixtures
// --------------------------------------------------------------------------

const PROJECT_ID = 'proj-test';
const USER_ID = '11111111-1111-1111-1111-111111111111';

function makeMember(over: Partial<ProjectMemberRecord> = {}): ProjectMemberRecord {
  return {
    userId: USER_ID,
    email: 'ali@example.nz',
    displayName: 'Ali Rahman',
    role: 'primary_steward',
    operationalRoles: [],
    joinedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

/** Snapshot roster entry for the pure-helper tests (no store needed). */
function makeEntry(
  profile: StewardProfile = {},
  over: Partial<ProjectMemberRecord> = {},
): StewardRosterEntry {
  return { member: makeMember(over), profile };
}

const EMPTY_FORM = {} as const;

// --------------------------------------------------------------------------
// Pure helper: stewardTeamModeFor
// --------------------------------------------------------------------------

describe('stewardTeamModeFor', () => {
  const cases: ReadonlyArray<[string, ReturnType<typeof stewardTeamModeFor>]> = [
    ['s1-steward-c1', 'roster'],
    ['s1-steward-c2', 'roles'],
    ['s1-steward-c3', 'rights'],
    ['s1-steward-c4', 'capability'],
    ['s1-steward-c6', 'capital'],
    ['s1-steward-c7', 'gaps'],
    ['s1-steward-c8', 'governance'],
    ['s1-steward-c9', 'operational'],
  ];

  it.each(cases)('maps %s -> %s', (itemId, mode) => {
    expect(stewardTeamModeFor(itemId)).toBe(mode);
  });

  it('returns null for c5 (labour routes to LabourInventoryCapture)', () => {
    expect(stewardTeamModeFor('s1-steward-c5')).toBeNull();
  });

  it('returns null for any non-steward id', () => {
    expect(stewardTeamModeFor('s1-vision-c1')).toBeNull();
    expect(stewardTeamModeFor('s1-steward-cX')).toBeNull();
  });
});

// --------------------------------------------------------------------------
// Pure helper: isStewardTeamValid
// --------------------------------------------------------------------------

describe('isStewardTeamValid', () => {
  it('c1 is false with an empty roster', () => {
    expect(isStewardTeamValid('s1-steward-c1', [], EMPTY_STEWARD_TEAM, EMPTY_FORM)).toBe(
      false,
    );
  });

  it('c1 is true with at least one steward', () => {
    expect(
      isStewardTeamValid('s1-steward-c1', [makeEntry()], EMPTY_STEWARD_TEAM, EMPTY_FORM),
    ).toBe(true);
  });

  it('every other item is always recordable (even with an empty roster)', () => {
    for (const id of [
      's1-steward-c2',
      's1-steward-c3',
      's1-steward-c4',
      's1-steward-c6',
      's1-steward-c7',
      's1-steward-c8',
      's1-steward-c9',
    ]) {
      expect(isStewardTeamValid(id, [], EMPTY_STEWARD_TEAM, EMPTY_FORM)).toBe(true);
    }
  });
});

// --------------------------------------------------------------------------
// Pure helper: summariseStewardTeam
// --------------------------------------------------------------------------

describe('summariseStewardTeam', () => {
  it('c1 counts stewards (singular / plural)', () => {
    expect(
      summariseStewardTeam('s1-steward-c1', [makeEntry()], EMPTY_STEWARD_TEAM, EMPTY_FORM),
    ).toBe('1 steward on the team');
    expect(
      summariseStewardTeam(
        's1-steward-c1',
        [makeEntry(), makeEntry({}, { userId: 'u2' })],
        EMPTY_STEWARD_TEAM,
        EMPTY_FORM,
      ),
    ).toBe('2 stewards on the team');
  });

  it('c2 counts stewards with a non-empty team role', () => {
    expect(
      summariseStewardTeam(
        's1-steward-c2',
        [makeEntry({ teamRole: 'Land manager' }), makeEntry({}, { userId: 'u2' })],
        EMPTY_STEWARD_TEAM,
        EMPTY_FORM,
      ),
    ).toBe('1 role defined');
  });

  it('c3 counts stewards with at least one decision right', () => {
    expect(
      summariseStewardTeam(
        's1-steward-c3',
        [makeEntry({ decisionRights: { water: 'lead' } })],
        EMPTY_STEWARD_TEAM,
        EMPTY_FORM,
      ),
    ).toBe('Decision rights set for 1 steward');
  });

  it('c4 counts domains covered across the whole team', () => {
    expect(
      summariseStewardTeam(
        's1-steward-c4',
        [
          makeEntry({ capabilityByDomain: { water: [], food: [] } }),
          makeEntry({ capabilityByDomain: { food: [] } }, { userId: 'u2' }),
        ],
        EMPTY_STEWARD_TEAM,
        EMPTY_FORM,
      ),
    ).toBe(`2 of ${STEWARD_DOMAINS.length} domains covered`);
  });

  it('c6 reports permitted funding sources', () => {
    expect(
      summariseStewardTeam('s1-steward-c6', [], {}, EMPTY_FORM),
    ).toBe('No funding sources recorded');
    expect(
      summariseStewardTeam(
        's1-steward-c6',
        [],
        { fundingSources: ['Charitable donation'] },
        EMPTY_FORM,
      ),
    ).toBe('1 funding source noted');
  });

  it('c7 reports identified skill gaps', () => {
    expect(summariseStewardTeam('s1-steward-c7', [], {}, EMPTY_FORM)).toBe(
      'No skill gaps recorded',
    );
    expect(
      summariseStewardTeam(
        's1-steward-c7',
        [],
        { skillGaps: ['Bookkeeping', 'Water-system design'] },
        EMPTY_FORM,
      ),
    ).toBe('2 skill gaps identified');
  });

  it('c8 reports whether a governance framework is set', () => {
    expect(summariseStewardTeam('s1-steward-c8', [], {}, EMPTY_FORM)).toBe(
      'No governance framework recorded',
    );
    expect(
      summariseStewardTeam(
        's1-steward-c8',
        [],
        { governance: 'Consensus with a steward quorum.' },
        EMPTY_FORM,
      ),
    ).toBe('Governance framework noted');
  });

  it('c9 counts assignable members with an operational focus', () => {
    expect(
      summariseStewardTeam('s1-steward-c9', [makeEntry()], EMPTY_STEWARD_TEAM, EMPTY_FORM),
    ).toBe('No operational roles assigned');
    expect(
      summariseStewardTeam(
        's1-steward-c9',
        [
          makeEntry({}, { operationalRoles: ['livestock'] }),
          makeEntry({}, { userId: 'u2', operationalRoles: [] }),
        ],
        EMPTY_STEWARD_TEAM,
        EMPTY_FORM,
      ),
    ).toBe('Operational focus set for 1 member');
  });

  it('c9 ignores members the operational layer does not apply to', () => {
    // A reviewer holding roles in stale data must not be counted -- the layer
    // only applies to stewards / team members.
    expect(
      summariseStewardTeam(
        's1-steward-c9',
        [makeEntry({}, { role: 'reviewer', operationalRoles: ['livestock'] })],
        EMPTY_STEWARD_TEAM,
        EMPTY_FORM,
      ),
    ).toBe('No operational roles assigned');
  });
});

// --------------------------------------------------------------------------
// Store-direct component behaviour
// --------------------------------------------------------------------------

beforeEach(() => {
  useMemberStore.setState({
    members: [],
    myRole: null,
    myRoles: {},
    isLoading: false,
  });
  useVisionStore.setState({ visions: [] });
  localStorage.clear();
});

/** Seed the live roster with a single member. */
function seedMember(over: Partial<ProjectMemberRecord> = {}): void {
  useMemberStore.setState({
    members: [makeMember(over)],
    myRole: null,
    myRoles: {},
    isLoading: false,
  });
}

/** Seed a vision record so the store setters have somewhere to write. */
function seedProject(
  profiles: Record<string, StewardProfile> = {},
  team: StewardTeam = {},
): void {
  useVisionStore.getState().ensureDefaults(PROJECT_ID);
  useVisionStore.setState((s) => ({
    visions: s.visions.map((v) =>
      v.projectId === PROJECT_ID
        ? { ...v, stewardProfiles: profiles, stewardTeam: team }
        : v,
    ),
  }));
}

function profile(): StewardProfile | undefined {
  return useVisionStore.getState().getVisionData(PROJECT_ID)?.stewardProfiles[USER_ID];
}

function teamRecord(): StewardTeam {
  return (
    useVisionStore.getState().getVisionData(PROJECT_ID)?.stewardTeam ??
    EMPTY_STEWARD_TEAM
  );
}

describe('StewardTeamCapture -- c1 roster', () => {
  it('shows the empty note when the roster has no members', () => {
    seedProject();
    render(<StewardTeamCapture itemId="s1-steward-c1" projectId={PROJECT_ID} />);
    expect(screen.getByText(/No stewards on the team yet/)).toBeTruthy();
  });

  it('lists each member of the canonical team', () => {
    seedMember();
    seedProject();
    render(<StewardTeamCapture itemId="s1-steward-c1" projectId={PROJECT_ID} />);
    expect(screen.getByText('Ali Rahman')).toBeTruthy();
  });
});

describe('StewardTeamCapture -- c2 roles (per-person writes)', () => {
  it('typing a team role writes it onto the profile', () => {
    seedMember();
    seedProject();
    render(<StewardTeamCapture itemId="s1-steward-c2" projectId={PROJECT_ID} />);

    fireEvent.change(screen.getByPlaceholderText(/Land manager/), {
      target: { value: 'Land manager' },
    });
    expect(profile()?.teamRole).toBe('Land manager');
  });

  it('selecting a resident status writes it, and re-clicking clears it', () => {
    seedMember();
    seedProject();
    render(<StewardTeamCapture itemId="s1-steward-c2" projectId={PROJECT_ID} />);

    const liveIn = () => screen.getByRole('button', { name: 'Live-in' });
    fireEvent.click(liveIn());
    expect(profile()?.residentStatus).toBe('live-in');
    fireEvent.click(liveIn());
    expect(profile()?.residentStatus).toBeUndefined();
  });
});

describe('StewardTeamCapture -- c3 decision rights', () => {
  it('clicking a level sets the right for the first domain', () => {
    seedMember();
    seedProject();
    render(<StewardTeamCapture itemId="s1-steward-c3" projectId={PROJECT_ID} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Leads' })[0]!);
    expect(profile()?.decisionRights?.[STEWARD_DOMAINS[0]]).toBe('lead');
  });
});

describe('StewardTeamCapture -- c4 capability', () => {
  it('toggling a domain chip adds then removes the domain', () => {
    seedMember();
    seedProject();
    render(<StewardTeamCapture itemId="s1-steward-c4" projectId={PROJECT_ID} />);

    const water = () => screen.getByRole('button', { name: 'Water' });
    fireEvent.click(water());
    expect('water' in (profile()?.capabilityByDomain ?? {})).toBe(true);
    fireEvent.click(water());
    expect('water' in (profile()?.capabilityByDomain ?? {})).toBe(false);
  });
});

describe('StewardTeamCapture -- c6 capital (permitted channels)', () => {
  it('renders the verbatim Amanah scope note', () => {
    seedProject();
    render(<StewardTeamCapture itemId="s1-steward-c6" projectId={PROJECT_ID} />);
    expect(screen.getByText(/not advance sale of future yield/)).toBeTruthy();
  });

  it('selecting a permitted channel records it on the team', () => {
    seedProject();
    render(<StewardTeamCapture itemId="s1-steward-c6" projectId={PROJECT_ID} />);

    fireEvent.click(screen.getByRole('button', { name: 'Charitable donation' }));
    expect(teamRecord().fundingSources).toEqual(['Charitable donation']);
  });
});

describe('StewardTeamCapture -- c7 skill gaps', () => {
  it('adding a gap records it on the team', () => {
    seedProject();
    render(<StewardTeamCapture itemId="s1-steward-c7" projectId={PROJECT_ID} />);

    fireEvent.change(screen.getByPlaceholderText(/Water-system design/), {
      target: { value: 'Bookkeeping' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(teamRecord().skillGaps).toEqual(['Bookkeeping']);
  });
});

describe('StewardTeamCapture -- c8 governance', () => {
  it('typing the framework records it on the team', () => {
    seedProject();
    render(<StewardTeamCapture itemId="s1-steward-c8" projectId={PROJECT_ID} />);

    fireEvent.change(
      screen.getByPlaceholderText(/Describe the decision-making process/),
      { target: { value: 'Consensus with a steward quorum.' } },
    );
    expect(teamRecord().governance).toBe('Consensus with a steward quorum.');
  });
});

describe('StewardTeamCapture -- c9 operational roles (membership writes)', () => {
  function memberRow(userId = USER_ID): ProjectMemberRecord | undefined {
    return useMemberStore.getState().members.find((m) => m.userId === userId);
  }

  it('toggling a role chip writes operationalRoles onto the member row', () => {
    seedMember(); // primary_steward -> assignable
    seedProject();
    render(<StewardTeamCapture itemId="s1-steward-c9" projectId={PROJECT_ID} />);

    // Empty roles => ScopePreview shows the full-view fallback.
    expect(screen.getByTestId('scope-preview-summary').textContent).toMatch(
      /full view/i,
    );

    const livestock = () =>
      screen.getByRole('button', { name: 'Livestock Lead' });
    fireEvent.click(livestock());
    expect(memberRow()?.operationalRoles).toEqual(['livestock']);
    // Scope preview now reflects the single livestock domain.
    expect(screen.getByTestId('scope-preview-summary').textContent).toMatch(
      /1 of 16/,
    );
    expect(screen.getByTestId('scope-chip-animals-livestock')).toBeTruthy();

    // Re-clicking clears it (back to full view).
    fireEvent.click(livestock());
    expect(memberRow()?.operationalRoles).toEqual([]);
  });

  it('lists non-assignable members read-only and offers them no role chips', () => {
    useMemberStore.setState({
      members: [
        makeMember(), // steward -> assignable
        makeMember({
          userId: 'u2',
          displayName: 'Reviewer Sam',
          role: 'reviewer',
        }),
      ],
      myRole: null,
      myRoles: {},
      isLoading: false,
    });
    seedProject();
    render(<StewardTeamCapture itemId="s1-steward-c9" projectId={PROJECT_ID} />);

    expect(screen.getByText('Not role-scoped')).toBeTruthy();
    expect(screen.getByText('Reviewer Sam')).toBeTruthy();
    // Only the one assignable steward gets a chip set (6 roles); the reviewer
    // gets none -- so exactly one "Livestock Lead" chip exists.
    expect(screen.getAllByRole('button', { name: 'Livestock Lead' })).toHaveLength(
      1,
    );
  });

  it('shows the empty-roster note when there are no members', () => {
    seedProject();
    render(<StewardTeamCapture itemId="s1-steward-c9" projectId={PROJECT_ID} />);
    expect(screen.getByText(/No stewards on the team yet/)).toBeTruthy();
  });
});
