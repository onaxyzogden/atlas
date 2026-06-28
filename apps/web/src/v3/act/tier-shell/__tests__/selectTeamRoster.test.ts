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

  it('prefers operational-role labels, then teamRole, then relationship, then app role', () => {
    // Operational-role labels win (joined) -- the standardized "what they do"
    // that replaced the free-text team role (Phase-4 consolidation 2026-06-28).
    expect(
      selectTeamRoster(
        [entry({ teamRole: 'Land manager' }, { operationalRoles: ['food_production'] })],
        {},
      ).members[0]?.roleLabel,
    ).toBe('Food Production Lead');
    // Legacy free-text still displays when no operational role is set.
    expect(
      selectTeamRoster([entry({ teamRole: 'Land manager' })], {}).members[0]
        ?.roleLabel,
    ).toBe('Land manager');
    expect(
      selectTeamRoster([entry({ relationship: 'co-steward' })], {})
        .members[0]?.roleLabel,
    ).toBe('Co Steward');
    // No operational role / teamRole / relationship -> humanize the app role.
    expect(selectTeamRoster([entry()], {}).members[0]?.roleLabel).toBe(
      'Primary Steward',
    );
  });

  it('uses the project roleLabelMap override for the roster label', () => {
    expect(
      selectTeamRoster(
        [entry({}, { operationalRoles: ['food_production'] })],
        {},
        { food_production: 'Grower' },
      ).members[0]?.roleLabel,
    ).toBe('Grower');
  });

  it('marks an assignable member constituted once they carry an operational role (or legacy team role)', () => {
    const model = selectTeamRoster(
      [
        entry({}, { userId: 'u1', operationalRoles: ['food_production'] }), // op role -> constituted
        entry({ teamRole: 'Land manager' }, { userId: 'u2' }), // legacy free-text still counts
        entry({}, { userId: 'u3' }), // assignable, nothing set -> not yet
      ],
      {},
    );
    expect(model.members[0]?.complete).toBe(true);
    expect(model.members[1]?.complete).toBe(true);
    expect(model.members[2]?.complete).toBe(false);
    expect(model.constitutedCount).toBe(2);
  });

  it('counts a non-assignable member as constituted by presence (layer does not apply)', () => {
    const model = selectTeamRoster(
      [entry({}, { userId: 'v1', role: 'reviewer' })],
      {},
    );
    expect(model.members[0]?.complete).toBe(true);
    expect(model.constitutedCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Operational-role labels (ADR 2026-06-24 -- display-only)
// ---------------------------------------------------------------------------

describe('selectTeamRoster -- operationalRoleLabels', () => {
  it('maps stored slugs to human labels in stored order', () => {
    const model = selectTeamRoster(
      [entry({}, { operationalRoles: ['livestock', 'food_production'] })],
      {},
    );
    expect(model.members[0]?.operationalRoleLabels).toEqual([
      'Livestock Lead',
      'Food Production Lead',
    ]);
  });

  it('emits an empty array when the member holds no operational roles', () => {
    expect(selectTeamRoster([entry()], {}).members[0]?.operationalRoleLabels).toEqual(
      [],
    );
  });

  it('drops unknown / stale slugs rather than rendering a raw token', () => {
    const model = selectTeamRoster(
      [
        entry({}, {
          // `legacy_role` is not a known OperationalRole -- it must be dropped.
          operationalRoles: ['legacy_role', 'finance_legal'] as never,
        }),
      ],
      {},
    );
    expect(model.members[0]?.operationalRoleLabels).toEqual(['Finance & Legal Lead']);
  });

  it('applies the project roleLabelMap override to the chips, built-ins for the rest', () => {
    const model = selectTeamRoster(
      [entry({}, { operationalRoles: ['food_production', 'livestock'] })],
      {},
      { food_production: 'Grower' },
    );
    expect(model.members[0]?.operationalRoleLabels).toEqual([
      'Grower',
      'Livestock Lead',
    ]);
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
