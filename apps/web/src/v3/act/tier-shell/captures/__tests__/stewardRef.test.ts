import { describe, it, expect } from 'vitest';
import {
  encodeStewardRef,
  decodeStewardRef,
  sameStewardRef,
  buildStewardOptions,
  findStewardOption,
  type StewardRef,
} from '../stewardRef.js';
import type { StewardModel } from '../../StewardCapture.js';
import type { StewardRosterEntry } from '../../../../observe/modules/human-context/roster.js';

function member(
  userId: string,
  email: string,
  displayName: string | null,
): StewardRosterEntry {
  return {
    member: {
      userId,
      email,
      displayName,
      role: 'team_member',
      joinedAt: '2026-01-01T00:00:00.000Z',
    },
    // The profile overlay is irrelevant to option building; an empty overlay is
    // the documented join fallback.
    profile: {},
  } as StewardRosterEntry;
}

const emptyModel: StewardModel = { invites: [] };

describe('encode/decode round-trip', () => {
  it('round-trips a userId ref', () => {
    const ref: StewardRef = { userId: 'abc-123' };
    expect(encodeStewardRef(ref)).toBe('u:abc-123');
    expect(decodeStewardRef('u:abc-123')).toEqual(ref);
  });

  it('round-trips an email ref', () => {
    const ref: StewardRef = { email: 'a@b.com' };
    expect(encodeStewardRef(ref)).toBe('e:a@b.com');
    expect(decodeStewardRef('e:a@b.com')).toEqual(ref);
  });

  it('round-trips null as the empty token', () => {
    expect(encodeStewardRef(null)).toBe('');
    expect(decodeStewardRef('')).toBeNull();
  });

  it('treats a blank userId/email ref as no link', () => {
    expect(encodeStewardRef({ userId: '   ' })).toBe('');
    expect(encodeStewardRef({ email: '' })).toBe('');
  });
});

describe('total decode of junk', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['blank', '   '],
    ['foreign prefix', 'x:whatever'],
    ['bare name', 'Fatima'],
    ['u: with no id', 'u:'],
    ['e: with no email', 'e:   '],
  ])('decodes %s to null', (_label, token) => {
    expect(decodeStewardRef(token as string | null | undefined)).toBeNull();
  });
});

describe('sameStewardRef', () => {
  it('matches identical userIds', () => {
    expect(sameStewardRef({ userId: 'x' }, { userId: 'x' })).toBe(true);
    expect(sameStewardRef({ userId: 'x' }, { userId: 'y' })).toBe(false);
  });
  it('matches emails case-insensitively', () => {
    expect(sameStewardRef({ email: 'A@B.com' }, { email: 'a@b.com' })).toBe(true);
  });
  it('never cross-matches userId vs email vs null', () => {
    expect(sameStewardRef({ userId: 'x' }, { email: 'x' })).toBe(false);
    expect(sameStewardRef(null, { userId: 'x' })).toBe(false);
    expect(sameStewardRef(null, null)).toBe(true);
  });
});

describe('buildStewardOptions', () => {
  it('maps members to userId options and invites to email options', () => {
    const roster = [member('u1', 'lead@farm.org', 'Aisha')];
    const model: StewardModel = {
      invites: [{ name: 'Bilal', email: 'bilal@farm.org', role: 'team_member' }],
    };
    const opts = buildStewardOptions(roster, model);
    expect(opts).toEqual([
      { ref: { userId: 'u1' }, label: 'Aisha', sub: 'lead@farm.org', kind: 'member' },
      { ref: { email: 'bilal@farm.org' }, label: 'Bilal', sub: 'bilal@farm.org', kind: 'invite' },
    ]);
  });

  it('dedupes an invite that shares a member email (userId wins, member kept)', () => {
    const roster = [member('u1', 'Lead@Farm.org', 'Aisha')];
    const model: StewardModel = {
      invites: [{ name: 'Aisha (dup)', email: 'lead@farm.org', role: 'landowner' }],
    };
    const opts = buildStewardOptions(roster, model);
    expect(opts).toHaveLength(1);
    expect(opts[0]?.kind).toBe('member');
    expect(opts[0]?.ref).toEqual({ userId: 'u1' });
  });

  it('skips invites with no email (no stable handle)', () => {
    const model: StewardModel = {
      invites: [{ name: 'Nobody', email: '   ', role: 'team_member' }],
    };
    expect(buildStewardOptions([], model)).toEqual([]);
  });

  it('falls back member label to email then "Member"', () => {
    const opts = buildStewardOptions(
      [member('u1', 'x@y.com', null), member('u2', '', '')],
      emptyModel,
    );
    expect(opts[0]?.label).toBe('x@y.com');
    expect(opts[1]?.label).toBe('Member');
  });

  it('dedupes two invites with the same email', () => {
    const model: StewardModel = {
      invites: [
        { name: 'First', email: 'dup@x.com', role: 'team_member' },
        { name: 'Second', email: 'DUP@x.com', role: 'contractor' },
      ],
    };
    const opts = buildStewardOptions([], model);
    expect(opts).toHaveLength(1);
    expect(opts[0]?.label).toBe('First');
  });
});

describe('findStewardOption', () => {
  const opts = buildStewardOptions(
    [member('u1', 'a@b.com', 'Aisha')],
    { invites: [{ name: 'Bilal', email: 'bilal@farm.org', role: 'team_member' }] },
  );
  it('resolves a stored userId ref to its option', () => {
    expect(findStewardOption(opts, { userId: 'u1' })?.label).toBe('Aisha');
  });
  it('resolves a stored email ref to its invite option', () => {
    expect(findStewardOption(opts, { email: 'bilal@farm.org' })?.label).toBe('Bilal');
  });
  it('returns undefined for null or unmatched refs', () => {
    expect(findStewardOption(opts, null)).toBeUndefined();
    expect(findStewardOption(opts, { userId: 'ghost' })).toBeUndefined();
  });
});
