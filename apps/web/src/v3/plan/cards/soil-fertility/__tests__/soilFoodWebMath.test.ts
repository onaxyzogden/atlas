import { describe, expect, it } from 'vitest';
import {
  checkGuild,
  checkGuilds,
  resolveProfile,
} from '../soilFoodWebMath.js';
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

describe('resolveProfile (speciesId → soil-biology lookup)', () => {
  it('resolves a known catalog species', () => {
    const r = resolveProfile('apple');
    expect(r.matched).toBe(true);
    expect(r.profile?.mycorrhiza).toBe('arbuscular');
  });

  it('reports unmatched for an id absent from the table', () => {
    const r = resolveProfile('definitely_not_a_real_species');
    expect(r.matched).toBe(false);
    expect(r.profile).toBeNull();
  });
});

describe('checkGuild — mycorrhizal coherence', () => {
  it('warns when an ecto member sits under an arbuscular anchor', () => {
    const f = checkGuild(
      guild(
        [
          { speciesId: 'apple', layer: 'canopy' },
          { speciesId: 'white_oak', layer: 'sub_canopy' },
        ],
        'apple',
      ),
    );
    const myc = f.filter((x) => x.kind === 'mycorrhiza');
    expect(myc).toHaveLength(1);
    expect(myc[0]!.severity).toBe('warning');
  });

  it('does not warn when all members share the anchor mycorrhiza type', () => {
    const f = checkGuild(
      guild(
        [
          { speciesId: 'apple', layer: 'canopy' },
          { speciesId: 'clover', layer: 'ground_cover' },
        ],
        'apple',
      ),
    );
    expect(f.some((x) => x.kind === 'mycorrhiza')).toBe(false);
  });
});

describe('checkGuild — unmatched info (never a false all-clear)', () => {
  it('emits an info finding when a member has no profile', () => {
    const f = checkGuild(
      guild([
        { speciesId: 'definitely_not_a_real_species', layer: 'canopy' },
        { speciesId: 'apple', layer: 'sub_canopy' },
      ]),
    );
    const info = f.filter((x) => x.kind === 'unmatched');
    expect(info.length).toBeGreaterThanOrEqual(1);
    expect(info[0]!.severity).toBe('info');
  });
});

describe('checkGuild — dominant-exudate rollup', () => {
  it('emits one info exudate finding naming the dominant class', () => {
    const f = checkGuild(
      guild([
        { speciesId: 'apple', layer: 'canopy' }, // sugar
        { speciesId: 'pear', layer: 'canopy' }, // sugar
        { speciesId: 'comfrey', layer: 'herbaceous' }, // organic_acid
      ]),
    );
    const ex = f.filter((x) => x.kind === 'exudate');
    expect(ex).toHaveLength(1);
    expect(ex[0]!.severity).toBe('info');
    expect(ex[0]!.rationale).toContain('sugar');
  });
});

describe('checkGuild / checkGuilds — edges', () => {
  it('returns [] for an empty guild', () => {
    expect(checkGuild(guild([]))).toEqual([]);
  });

  it('flattens findings across guilds', () => {
    const g1 = guild(
      [
        { speciesId: 'apple', layer: 'canopy' },
        { speciesId: 'white_oak', layer: 'sub_canopy' },
      ],
      'apple',
    );
    const g2: Guild = { ...g1, id: 'g2' };
    expect(checkGuilds([g1, g2]).length).toBeGreaterThanOrEqual(2);
  });
});
