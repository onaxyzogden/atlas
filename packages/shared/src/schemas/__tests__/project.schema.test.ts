import { describe, it, expect } from 'vitest';
import { QueuedTeamInvite, ProjectMetadata } from '../project.schema.js';

describe('QueuedTeamInvite', () => {
  it('accepts an invite without a name (name optional)', () => {
    expect(
      QueuedTeamInvite.safeParse({
        email: 'a@b.com',
        role: 'team_member',
        queuedAt: new Date(0).toISOString(),
      }).success,
    ).toBe(true);
  });

  it('accepts an invite with a name', () => {
    expect(
      QueuedTeamInvite.safeParse({
        name: 'Amina Yusuf',
        email: 'a@b.com',
        role: 'landowner',
        queuedAt: new Date(0).toISOString(),
      }).success,
    ).toBe(true);
  });

  it('rejects an invalid role', () => {
    expect(
      QueuedTeamInvite.safeParse({
        email: 'a@b.com',
        role: 'owner',
        queuedAt: new Date(0).toISOString(),
      }).success,
    ).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(
      QueuedTeamInvite.safeParse({
        email: 'nope',
        role: 'contractor',
        queuedAt: new Date(0).toISOString(),
      }).success,
    ).toBe(false);
  });

  it('round-trips through ProjectMetadata.team', () => {
    expect(
      ProjectMetadata.safeParse({
        team: {
          queuedInvites: [
            {
              name: 'X',
              email: 'a@b.com',
              role: 'team_member',
              queuedAt: new Date(0).toISOString(),
            },
          ],
        },
      }).success,
    ).toBe(true);
  });
});
