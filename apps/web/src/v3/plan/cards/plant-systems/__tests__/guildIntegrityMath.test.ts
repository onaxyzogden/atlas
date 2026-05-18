import { describe, expect, it } from 'vitest';
import {
  checkGuild,
  checkGuilds,
  resolveCompanion,
} from '../guildIntegrityMath.js';
import type { Guild } from '../../../../../store/polycultureStore.js';

function guild(
  members: { speciesId: string; layer: Guild['members'][number]['layer'] }[],
  anchorSpeciesId = members[0]?.speciesId ?? 'apple',
): Guild {
  return {
    id: 'g1',
    projectId: 'p1',
    name: 'Test guild',
    anchorSpeciesId,
    members,
    createdAt: new Date(0).toISOString(),
  };
}

describe('resolveCompanion (speciesId → matrix bridge)', () => {
  it('resolves a catalog species into the companion matrix', () => {
    const r = resolveCompanion('apple');
    expect(r.matched).toBe(true);
    expect(r.companion).not.toBeNull();
  });

  it('reports unmatched for an id absent from the matrix', () => {
    const r = resolveCompanion('definitely_not_a_real_species');
    expect(r.matched).toBe(false);
    expect(r.companion).toBeNull();
  });
});

describe('checkGuild — antagonism (catalog incompatible fallback)', () => {
  it('flags black_walnut + apple as an error via catalog incompatible', () => {
    const f = checkGuild(
      guild([
        { speciesId: 'black_walnut', layer: 'canopy' },
        { speciesId: 'apple', layer: 'sub_canopy' },
      ]),
    );
    const ant = f.filter((x) => x.kind === 'antagonism');
    expect(ant).toHaveLength(1);
    expect(ant[0]!.severity).toBe('error');
  });
});

describe('checkGuild — unmatched info (never a false all-clear)', () => {
  it('emits an info finding when a pair cannot be matrix-verified', () => {
    const f = checkGuild(
      guild([
        { speciesId: 'definitely_not_a_real_species', layer: 'canopy' },
        { speciesId: 'comfrey', layer: 'herbaceous' },
      ]),
    );
    const info = f.filter((x) => x.kind === 'unmatched');
    expect(info.length).toBeGreaterThanOrEqual(1);
    expect(info[0]!.severity).toBe('info');
  });
});

describe('checkGuild — spacing heuristic', () => {
  it('warns when a layer footprint exceeds the nominal guild plane', () => {
    // Many wide canopy trees in a small-anchor guild → over budget.
    const f = checkGuild(
      guild(
        [
          { speciesId: 'black_walnut', layer: 'canopy' },
          { speciesId: 'pecan', layer: 'canopy' },
          { speciesId: 'white_oak', layer: 'canopy' },
        ],
        'comfrey', // tiny anchor → small nominal plane
      ),
    );
    expect(f.some((x) => x.kind === 'spacing' && x.severity === 'warning')).toBe(
      true,
    );
  });
});

describe('checkGuild — maturity spread', () => {
  it('warns when fast and slow members are mixed', () => {
    const f = checkGuild(
      guild([
        { speciesId: 'black_walnut', layer: 'canopy' }, // ~3650 d
        { speciesId: 'clover', layer: 'ground_cover' }, // ~90 d
      ]),
    );
    expect(f.some((x) => x.kind === 'maturity' && x.severity === 'warning')).toBe(
      true,
    );
  });
});

describe('checkGuild / checkGuilds — edges', () => {
  it('returns [] for an empty guild', () => {
    expect(checkGuild(guild([]))).toEqual([]);
  });

  it('flattens findings across guilds', () => {
    const g1 = guild([
      { speciesId: 'black_walnut', layer: 'canopy' },
      { speciesId: 'apple', layer: 'sub_canopy' },
    ]);
    const g2: Guild = { ...g1, id: 'g2' };
    expect(checkGuilds([g1, g2]).length).toBeGreaterThanOrEqual(2);
  });
});
