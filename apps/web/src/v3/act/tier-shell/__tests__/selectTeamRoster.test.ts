/**
 * selectTeamRoster -- pure adapter that normalizes the canonical Steward/Team
 * Object (roster join) + the project Intent Object (SharedVision) into the
 * read-model the Declaration right-pane panel (TeamRegistryPanel) renders.
 *
 * These are plain-fixture unit tests -- no store, no render. They pin:
 *   1. member rows       -- name fallback, initials, role label, complete flag.
 *   2. labour bars        -- only pledged hours, pct vs busiest, total, empties.
 *   3. intent reference   -- Amanah-clean derivation from SharedVision only.
 *   4. Amanah wording-pin -- the adapter authors no advance-sale / CSA copy.
 */

import { describe, expect, it } from 'vitest';
import type { ProjectMemberRecord } from '@ogden/shared';
import type {
  SharedVision,
  StewardProfile,
} from '../../../../store/visionStore.js';
import type { StewardRosterEntry } from '../../../observe/modules/human-context/roster.js';
import { selectTeamRoster } from '../selectTeamRoster.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function member(over: Partial<ProjectMemberRecord> = {}): ProjectMemberRecord {
  return {
    userId: 'u1',
    email: 'ali@example.nz',
    displayName: 'Ali Rahman',
    role: 'primary_steward',
    operationalRoles: [],
    joinedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function entry(
  profile: StewardProfile = {},
  over: Partial<ProjectMemberRecord> = {},
): StewardRosterEntry {
  return { member: member(over), profile };
}

// ---------------------------------------------------------------------------
// Member rows
// ---------------------------------------------------------------------------

describe('selectTeamRoster -- member rows', () => {
  it('uses displayName, derives two initials, and reports rosterSize', () => {
    const model = selectTeamRoster([entry()], {});
    expect(model.rosterSize).toBe(1);
    expect(model.members[0]?.name).toBe('Ali Rahman');
    expect(model.members[0]?.initials).toBe('AR');
  });

  it('falls back to the email local-part, then to "Steward"', () => {
    const noName = selectTeamRoster(
      [entry({}, { displayName: '', email: 'noor@farm.nz' })],
      {},
    );
    expect(noName.members[0]?.name).toBe('noor');
    expect(noName.members[0]?.initials).toBe('NO');

    const blank = selectTeamRoster(
      [entry({}, { displayName: '', email: '' })],
      {},
    );
    expect(blank.members[0]?.name).toBe('Steward');
  });

  it('prefers teamRole, then humanized relationship, then humanized app role', () => {
    expect(
      selectTeamRoster([entry({ teamRole: 'Land manager' })], {}).members[0]
        ?.roleLabel,
    ).toBe('Land manager');
    expect(
      selectTeamRoster([entry({ relationship: 'co-steward' })], {})
        .members[0]?.roleLabel,
    ).toBe('Co Steward');
    // No teamRole / relationship -> humanize the app role token.
    expect(selectTeamRoster([entry()], {}).members[0]?.roleLabel).toBe(
      'Primary Steward',
    );
  });

  it('marks a steward complete only once a functional team role is set', () => {
    const constituted = selectTeamRoster(
      [entry({ teamRole: 'Land manager' }), entry({}, { userId: 'u2' })],
      {},
    );
    expect(constituted.members[0]?.complete).toBe(true);
    expect(constituted.members[1]?.complete).toBe(false);
    expect(constituted.constitutedCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Labour bars
// ---------------------------------------------------------------------------

describe('selectTeamRoster -- labour bars', () => {
  it('includes only stewards with pledged hours and scales pct to the busiest', () => {
    const model = selectTeamRoster(
      [
        entry({ maintenanceHrsInitial: 20, maintenanceHrsOngoing: 10 }), // 30
        entry(
          { maintenanceHrsInitial: 15, maintenanceHrsOngoing: 0 }, // 15
          { userId: 'u2', displayName: 'Noor' },
        ),
        entry({}, { userId: 'u3', displayName: 'Idle' }), // 0 -> excluded
      ],
      {},
    );
    expect(model.labour.map((b) => b.userId)).toEqual(['u1', 'u2']);
    expect(model.labour[0]?.hoursPerWeek).toBe(30);
    expect(model.labour[0]?.pct).toBe(100);
    expect(model.labour[1]?.pct).toBe(50);
    expect(model.totalWeeklyHours).toBe(45);
  });

  it('reports an empty labour list and zero total when nobody pledged hours', () => {
    const model = selectTeamRoster([entry()], {});
    expect(model.labour).toEqual([]);
    expect(model.totalWeeklyHours).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Intent reference (Amanah-clean -- SharedVision only)
// ---------------------------------------------------------------------------

describe('selectTeamRoster -- intent reference', () => {
  it('derives Purpose / Non-negotiable / Committed from SharedVision', () => {
    const sharedVision: SharedVision = {
      statement: 'A regenerative family farm.',
      constraints: ['No debt financing.'],
      coreFunctions: ['Grow food', 'Steward soil'],
    };
    const model = selectTeamRoster([], sharedVision);
    expect(model.intent.map((i) => i.kind)).toEqual([
      'purpose',
      'nonNegotiable',
      'committed',
    ]);
    expect(model.intent[0]).toEqual({
      kind: 'purpose',
      label: 'Purpose',
      text: 'A regenerative family farm.',
    });
    expect(model.intent[1]?.text).toBe('No debt financing.');
    expect(model.intent[2]?.text).toBe('Grow food, Steward soil');
  });

  it('falls back through the candidate chain per intent kind', () => {
    const model = selectTeamRoster([], {
      experienceGoals: ['Learn permaculture'],
      principles: ['Care for the land'],
      successMetrics: ['Soil organic matter up 1pt'],
    });
    // purpose: no statement -> joined experienceGoals.
    expect(model.intent.find((i) => i.kind === 'purpose')?.text).toBe(
      'Learn permaculture',
    );
    // nonNegotiable: no constraints -> first principle.
    expect(model.intent.find((i) => i.kind === 'nonNegotiable')?.text).toBe(
      'Care for the land',
    );
    // committed: no coreFunctions -> first success metric.
    expect(model.intent.find((i) => i.kind === 'committed')?.text).toBe(
      'Soil organic matter up 1pt',
    );
  });

  it('emits NO intent rows for an empty SharedVision (fabricates nothing)', () => {
    expect(selectTeamRoster([], {}).intent).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Amanah wording-pin
// ---------------------------------------------------------------------------

describe('selectTeamRoster -- Amanah wording-pin', () => {
  it('authors no advance-sale / subscription / CSA framing in static copy', () => {
    // Drive the adapter with rich, clean data so every static label + derived
    // field is exercised, then assert the whole model corpus is clean. The only
    // strings the adapter authors are the three intent labels; everything else
    // is the steward's own recorded data.
    const model = selectTeamRoster(
      [entry({ teamRole: 'Land manager', maintenanceHrsInitial: 12 })],
      {
        statement: 'A regenerative family farm.',
        constraints: ['No riba.'],
        coreFunctions: ['Grow food'],
      },
    );
    const corpus = [
      ...model.members.flatMap((m) => [m.name, m.roleLabel]),
      ...model.labour.map((b) => b.name),
      ...model.intent.flatMap((i) => [i.label, i.text]),
    ]
      .join(' ')
      .toLowerCase();
    expect(corpus).not.toMatch(
      /subscription|presale|advance sale|csa|csra|yield[- ]share/,
    );
  });
});
