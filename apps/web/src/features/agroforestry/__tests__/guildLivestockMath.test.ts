/**
 * guildLivestockMath.test — covers the tri-axis composition:
 *   - empty parcel → { rows: [], overallPct: 0 }
 *   - host with no members → row included but scores 0; excluded from mean
 *   - fodder matches: distinct, named, ecologicalFunction.includes('fodder')
 *   - toxicity narrows to herd actually paddocked at the host
 *   - canopy coverage capped at 100, missing canopySpreadM skipped
 *   - scoring monotone in fodder count; toxicity reduces score
 *   - pin vs spatial overlap inherited from resolveMembers
 *   - overallPct excludes zero-member hosts from the mean
 *   - covenant lock
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  computeSilvopastureIntegration,
  computeSilvopastureIntegrationPct,
} from '../guildLivestockMath.js';
import { encodeHostId } from '../silvopastureHosts.js';
import type { CropArea } from '../../../store/cropStore.js';
import type { DesignElement } from '../../../store/designElementsStore.js';
import type { Paddock, LivestockSpecies } from '../../../store/livestockStore.js';
import type { Guild, GuildMember } from '../../../store/polycultureStore.js';

const PROJECT_ID = 'proj-1';

function rect(w: number, s: number, e: number, n: number): GeoJSON.Polygon {
  return {
    type: 'Polygon',
    coordinates: [[
      [w, s], [e, s], [e, n], [w, n], [w, s],
    ]],
  };
}

function silvopastureCrop(id: string, geom: GeoJSON.Polygon): CropArea {
  return {
    id,
    projectId: PROJECT_ID,
    name: `Silvo ${id}`,
    type: 'silvopasture',
    color: '#6b9b6b',
    geometry: geom,
    areaM2: 1,
    species: [],
    treeSpacingM: null,
    rowSpacingM: null,
    waterDemand: 'medium',
    irrigationType: 'rain_fed',
    phase: '',
    notes: '',
    createdAt: 'now',
    updatedAt: 'now',
  } as unknown as CropArea;
}

function paddockOf(
  id: string,
  geom: GeoJSON.Polygon,
  species: LivestockSpecies[],
  areaM2: number,
  pin?: string,
): Paddock {
  return {
    id,
    projectId: PROJECT_ID,
    name: `Pad ${id}`,
    geometry: geom,
    areaM2,
    species,
    fencing: 'electric',
    stockingDensity: null,
    grazingCellGroup: null,
    guestSafeBuffer: false,
    waterPointNote: '',
    shelterNote: '',
    phase: '',
    notes: '',
    color: '#c8a97a',
    silvopastureId: pin,
    createdAt: 'now',
    updatedAt: 'now',
  } as unknown as Paddock;
}

function guildOf(
  id: string,
  center: [number, number],
  members: GuildMember[],
  pin?: string,
): Guild {
  return {
    id,
    projectId: PROJECT_ID,
    name: `Guild ${id}`,
    anchorSpeciesId: members[0]?.speciesId ?? '',
    members,
    center,
    centroidUv: [0.5, 0.5],
    silvopastureId: pin,
    createdAt: 'now',
  } as unknown as Guild;
}

function m(speciesId: string): GuildMember {
  return { speciesId, layer: 'canopy' };
}

describe('computeSilvopastureIntegration — empty / no-host', () => {
  it('returns empty report on empty parcel', () => {
    const r = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [],
      designElements: [],
      paddocks: [],
      guilds: [],
    });
    expect(r.rows).toEqual([]);
    expect(r.overallPct).toBe(0);
  });

  it('includes host with no members but excludes it from overallPct mean', () => {
    const host = silvopastureCrop('h1', rect(0, 0, 10, 10));
    const r = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [host],
      designElements: [],
      paddocks: [],
      guilds: [],
    });
    expect(r.rows.length).toBe(1);
    expect(r.rows[0]!.paddockCount).toBe(0);
    expect(r.rows[0]!.guildCount).toBe(0);
    expect(r.rows[0]!.integrationScore).toBe(0);
    expect(r.overallPct).toBe(0);
  });
});

describe('computeSilvopastureIntegration — fodder matches', () => {
  it('lists distinct fodder species from member guilds', () => {
    const host = silvopastureCrop('h1', rect(0, 0, 10, 10));
    const hostId = encodeHostId('crop-area', 'h1');
    const paddock = paddockOf('p1', rect(1, 1, 9, 9), ['cattle'], 1000, hostId);
    // siberian_pea_shrub, comfrey, clover — all fodder; apple is not.
    const guild = guildOf(
      'g1',
      [5, 5],
      [m('siberian_pea_shrub'), m('comfrey'), m('clover'), m('apple')],
      hostId,
    );

    const r = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [host],
      designElements: [],
      paddocks: [paddock],
      guilds: [guild],
    });

    const row = r.rows[0]!;
    expect(row.fodderMatches.map((f) => f.speciesId).sort()).toEqual([
      'clover',
      'comfrey',
      'siberian_pea_shrub',
    ]);
    // each has a commonName from the catalog
    for (const f of row.fodderMatches) {
      expect(f.commonName.length).toBeGreaterThan(0);
    }
  });

  it('integrationScore is monotone in fodder count', () => {
    const host = silvopastureCrop('h1', rect(0, 0, 10, 10));
    const hostId = encodeHostId('crop-area', 'h1');
    const paddock = paddockOf('p1', rect(1, 1, 9, 9), ['cattle'], 1000, hostId);

    function scoreFor(memberIds: string[]): number {
      const g = guildOf('g1', [5, 5], memberIds.map(m), hostId);
      return computeSilvopastureIntegration({
        projectId: PROJECT_ID,
        cropAreas: [host],
        designElements: [],
        paddocks: [paddock],
        guilds: [g],
      }).rows[0]!.integrationScore;
    }

    const s0 = scoreFor([]);
    const s1 = scoreFor(['clover']);
    const s2 = scoreFor(['clover', 'comfrey']);
    const s3 = scoreFor(['clover', 'comfrey', 'siberian_pea_shrub']);
    expect(s0).toBeLessThan(s1);
    expect(s1).toBeLessThan(s2);
    expect(s2).toBeLessThan(s3);
  });
});

describe('computeSilvopastureIntegration — toxicity narrowing', () => {
  it('narrows toxicity findings by herd actually paddocked at the host', () => {
    const host = silvopastureCrop('h1', rect(0, 0, 10, 10));
    const hostId = encodeHostId('crop-area', 'h1');
    // cattle-only herd → black_walnut (horses-only) must NOT flag.
    const paddock = paddockOf('p1', rect(1, 1, 9, 9), ['cattle'], 1000, hostId);
    const guild = guildOf('g1', [5, 5], [m('black_walnut')], hostId);

    const r = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [host],
      designElements: [],
      paddocks: [paddock],
      guilds: [guild],
    });
    expect(r.rows[0]!.toxicityFindings).toEqual([]);
  });

  it('flags toxicity when the herd matches', () => {
    const host = silvopastureCrop('h1', rect(0, 0, 10, 10));
    const hostId = encodeHostId('crop-area', 'h1');
    const paddock = paddockOf('p1', rect(1, 1, 9, 9), ['horses'], 1000, hostId);
    const guild = guildOf('g1', [5, 5], [m('black_walnut')], hostId);

    const r = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [host],
      designElements: [],
      paddocks: [paddock],
      guilds: [guild],
    });
    expect(r.rows[0]!.toxicityFindings.map((t) => t.speciesId)).toEqual([
      'black_walnut',
    ]);
  });

  it('toxicity reduces integrationScore vs. the same guild without it', () => {
    const host = silvopastureCrop('h1', rect(0, 0, 10, 10));
    const hostId = encodeHostId('crop-area', 'h1');
    const paddock = paddockOf('p1', rect(1, 1, 9, 9), ['horses'], 1000, hostId);

    const cleanGuild = guildOf('g1', [5, 5], [m('clover')], hostId);
    const toxicGuild = guildOf(
      'g1',
      [5, 5],
      [m('clover'), m('black_walnut')],
      hostId,
    );

    const clean = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [host],
      designElements: [],
      paddocks: [paddock],
      guilds: [cleanGuild],
    }).rows[0]!.integrationScore;
    const toxic = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [host],
      designElements: [],
      paddocks: [paddock],
      guilds: [toxicGuild],
    }).rows[0]!.integrationScore;
    expect(toxic).toBeLessThan(clean);
  });
});

describe('computeSilvopastureIntegration — canopy coverage', () => {
  it('caps canopy coverage at 100% even with massive guild', () => {
    const host = silvopastureCrop('h1', rect(0, 0, 10, 10));
    const hostId = encodeHostId('crop-area', 'h1');
    const paddock = paddockOf('p1', rect(1, 1, 9, 9), ['cattle'], 10, hostId);
    // black_walnut canopySpreadM=14 → footprint ~154 m², many copies on tiny paddock
    const guild = guildOf(
      'g1',
      [5, 5],
      Array.from({ length: 20 }, () => m('black_walnut')),
      hostId,
    );

    const r = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [host],
      designElements: [],
      paddocks: [paddock],
      guilds: [guild],
    });
    expect(r.rows[0]!.canopyCoveragePct).toBe(100);
  });

  it('skips members without canopySpreadM rather than zeroing them', () => {
    const host = silvopastureCrop('h1', rect(0, 0, 10, 10));
    const hostId = encodeHostId('crop-area', 'h1');
    const paddock = paddockOf('p1', rect(1, 1, 9, 9), ['cattle'], 1000, hostId);
    // american_chestnut has no canopySpreadM in catalog; black_walnut has 14.
    const guild = guildOf(
      'g1',
      [5, 5],
      [m('american_chestnut'), m('black_walnut')],
      hostId,
    );

    const r = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [host],
      designElements: [],
      paddocks: [paddock],
      guilds: [guild],
    });
    // black_walnut alone: π·7² ≈ 153.9 m² ÷ 1000 m² ≈ 15.39%
    expect(r.rows[0]!.canopyCoveragePct).toBeGreaterThan(10);
    expect(r.rows[0]!.canopyCoveragePct).toBeLessThan(20);
  });
});

describe('computeSilvopastureIntegration — canopy union dedup', () => {
  it('dedups two physically-overlapping guilds at the same center', () => {
    const host = silvopastureCrop('h1', rect(0, 0, 10, 10));
    const hostId = encodeHostId('crop-area', 'h1');
    const paddock = paddockOf('p1', rect(1, 1, 9, 9), ['cattle'], 1000, hostId);
    // Two single-walnut guilds at the same center → one full disk worth
    // of overlap (~154 m²). Raw sum ~308, union ~154, dedup ~154.
    const g1 = guildOf('g1', [5, 5], [m('black_walnut')], hostId);
    const g2 = guildOf('g2', [5, 5], [m('black_walnut')], hostId);

    const r = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [host],
      designElements: [],
      paddocks: [paddock],
      guilds: [g1, g2],
    });

    const row = r.rows[0]!;
    expect(row.canopyDedupedM2).toBeGreaterThan(100);
    expect(row.canopyDedupedM2).toBeLessThan(200);
    // Mutually exclusive with the clip path: the union ran cleanly.
    expect(row.canopyClampedM2).toBe(0);
  });

  it('does not dedup when guilds are far apart on the same host', () => {
    const host = silvopastureCrop('h1', rect(0, 0, 10, 10));
    const hostId = encodeHostId('crop-area', 'h1');
    const paddock = paddockOf('p1', rect(1, 1, 9, 9), ['cattle'], 1000, hostId);
    // Two walnut guilds 1° apart in lon ≈ 111 km — disks (~7 m radius)
    // cannot overlap. Raw sum ~308 ≈ union ~308; dedup ~0.
    const g1 = guildOf('g1', [1, 5], [m('black_walnut')], hostId);
    const g2 = guildOf('g2', [9, 5], [m('black_walnut')], hostId);

    const r = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [host],
      designElements: [],
      paddocks: [paddock],
      guilds: [g1, g2],
    });

    const row = r.rows[0]!;
    // turf.circle uses a 32-gon polygon approximation that undershoots
    // π·r² by ~0.6%, so dedup carries ~1 m² noise per disk even with no
    // physical overlap. Two disks → < 5 m² ceiling for "no dedup".
    expect(row.canopyDedupedM2).toBeLessThan(5);
    expect(row.canopyClampedM2).toBe(0);
  });

  it('reports near-zero dedup for a lone canopy member (no self-overlap)', () => {
    const host = silvopastureCrop('h1', rect(0, 0, 10, 10));
    const hostId = encodeHostId('crop-area', 'h1');
    const paddock = paddockOf('p1', rect(1, 1, 9, 9), ['cattle'], 1000, hostId);
    const guild = guildOf('g1', [5, 5], [m('black_walnut')], hostId);

    const r = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [host],
      designElements: [],
      paddocks: [paddock],
      guilds: [guild],
    });

    const row = r.rows[0]!;
    expect(row.hostAreaM2).toBeGreaterThan(154);
    // Single disk → no self-overlap, but turf.circle's 32-gon undershoots
    // π·r² by ~1 m², so dedup carries that approximation residue.
    expect(row.canopyDedupedM2).toBeLessThan(2);
    expect(row.canopyClampedM2).toBe(0);
  });
});

describe('computeSilvopastureIntegration — canopy envelope-clip fallback', () => {
  // Fallback engages when any guild on the host lacks a `center` so the
  // union cannot resolve absolute lon/lat for its members. We assert the
  // legacy `Math.min(rawCanopyM2, hostAreaM2)` behaviour still applies.

  it('falls back to envelope clip when a guild has no center', () => {
    const host = silvopastureCrop('h1', rect(0, 0, 0.0001, 0.0001)); // ~123 m²
    const hostId = encodeHostId('crop-area', 'h1');
    const paddock = paddockOf(
      'p1',
      rect(0, 0, 0.0001, 0.0001),
      ['cattle'],
      100,
      hostId,
    );
    // Construct two guilds without `center` — the union helper returns null
    // and the math falls back to envelope clip. Raw ~308 m², host ~123 m²
    // → clip discount ~185 m².
    const noCenter = (id: string): Guild =>
      ({
        id,
        projectId: PROJECT_ID,
        name: `Guild ${id}`,
        anchorSpeciesId: 'black_walnut',
        members: [m('black_walnut')],
        silvopastureId: hostId,
        createdAt: 'now',
      }) as unknown as Guild;
    const g1 = noCenter('g1');
    const g2 = noCenter('g2');

    const r = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [host],
      designElements: [],
      paddocks: [paddock],
      guilds: [g1, g2],
    });

    const row = r.rows[0]!;
    expect(row.hostAreaM2).toBeGreaterThan(0);
    expect(row.canopyClampedM2).toBeGreaterThan(0);
    expect(row.canopyClampedM2).toBeLessThan(308); // strictly less than raw sum
    expect(row.canopyDedupedM2).toBe(0); // fallback path never sets dedup
    expect(row.canopyCoveragePct).toBe(100); // host ~123 m² ÷ paddock 100 m² capped
  });

  it('does not clip when raw canopy already fits within host envelope (fallback path)', () => {
    const host = silvopastureCrop('h1', rect(0, 0, 10, 10)); // ~1.2e9 m²
    const hostId = encodeHostId('crop-area', 'h1');
    const paddock = paddockOf('p1', rect(1, 1, 9, 9), ['cattle'], 1000, hostId);
    const noCenterGuild = {
      id: 'g1',
      projectId: PROJECT_ID,
      name: 'Guild g1',
      anchorSpeciesId: 'black_walnut',
      members: [m('black_walnut')],
      silvopastureId: hostId,
      createdAt: 'now',
    } as unknown as Guild;

    const r = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [host],
      designElements: [],
      paddocks: [paddock],
      guilds: [noCenterGuild],
    });

    const row = r.rows[0]!;
    expect(row.hostAreaM2).toBeGreaterThan(154);
    expect(row.canopyClampedM2).toBe(0);
    expect(row.canopyDedupedM2).toBe(0);
  });
});

describe('computeSilvopastureIntegration — overallPct', () => {
  it('averages across non-empty hosts only', () => {
    const h1 = silvopastureCrop('h1', rect(0, 0, 10, 10));
    const h2 = silvopastureCrop('h2', rect(20, 20, 30, 30));
    const h1Id = encodeHostId('crop-area', 'h1');
    const paddock = paddockOf('p1', rect(1, 1, 9, 9), ['cattle'], 1000, h1Id);
    const guild = guildOf(
      'g1',
      [5, 5],
      [m('clover'), m('comfrey'), m('siberian_pea_shrub')],
      h1Id,
    );

    const r = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [h1, h2],
      designElements: [],
      paddocks: [paddock],
      guilds: [guild],
    });
    expect(r.rows.length).toBe(2);
    // overallPct must equal the h1 row score, not the average with h2's 0.
    const h1Row = r.rows.find((row) => row.hostId === h1Id)!;
    expect(r.overallPct).toBe(h1Row.integrationScore);
  });

  it('computeSilvopastureIntegrationPct wrapper returns overallPct', () => {
    const h1 = silvopastureCrop('h1', rect(0, 0, 10, 10));
    const h1Id = encodeHostId('crop-area', 'h1');
    const paddock = paddockOf('p1', rect(1, 1, 9, 9), ['cattle'], 1000, h1Id);
    const guild = guildOf('g1', [5, 5], [m('clover')], h1Id);

    const args = {
      projectId: PROJECT_ID,
      cropAreas: [h1],
      designElements: [] as DesignElement[],
      paddocks: [paddock],
      guilds: [guild],
    };
    expect(computeSilvopastureIntegrationPct(args)).toBe(
      computeSilvopastureIntegration(args).overallPct,
    );
  });
});

describe('computeSilvopastureIntegration — pin vs spatial overlap', () => {
  it('uses spatial overlap when no pin is set (parity with resolveMembers)', () => {
    const host = silvopastureCrop('h1', rect(0, 0, 10, 10));
    const paddockSpatial = paddockOf(
      'p1',
      rect(2, 2, 8, 8),
      ['cattle'],
      1000,
    ); // no pin
    const guildSpatial = guildOf('g1', [5, 5], [m('clover')]); // no pin, inside

    const r = computeSilvopastureIntegration({
      projectId: PROJECT_ID,
      cropAreas: [host],
      designElements: [],
      paddocks: [paddockSpatial],
      guilds: [guildSpatial],
    });
    expect(r.rows[0]!.paddockCount).toBe(1);
    expect(r.rows[0]!.guildCount).toBe(1);
    expect(r.rows[0]!.fodderMatches.length).toBe(1);
  });
});

describe('covenant lock', () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const moduleText = readFileSync(
    resolve(__dirname, '../guildLivestockMath.ts'),
    'utf-8',
  );

  it('contains no riba/gharar/csra/salam/investor/financing/cost-of-capital framing', () => {
    const stripped = moduleText.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripped).not.toMatch(
      /\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i,
    );
  });
});
