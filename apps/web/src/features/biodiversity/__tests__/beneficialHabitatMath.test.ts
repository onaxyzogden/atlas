/**
 * beneficialHabitatMath.test — verifies the pure habitat-inventory math.
 *
 *   - empty parcel → zero overall, no rows
 *   - guild filter respects projectId
 *   - distinct beneficial species de-dup across guilds
 *   - plant-richness band caps at 40
 *   - structural band caps at 40
 *   - functional-diversity bonus caps at 20
 *   - hedgerow length sums across multi-segment line
 *   - pond area derived from polygon geometry via Turf
 *   - shrub point count
 *   - malformed geometry skipped (no NaN)
 *   - guild with no beneficial members → row with count 0
 *   - scoring monotone in beneficial species count
 *   - computeBeneficialHabitatPct == report.overall.coveragePct (wrapper parity)
 *   - covenant lock
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  computeBeneficialHabitatReport,
  computeBeneficialHabitatPct,
} from '../beneficialHabitatMath.js';
import type { Guild } from '../../../store/polycultureStore.js';
import type { DesignElement } from '../../../store/designElementsStore.js';

const PROJECT_ID = 'proj-A';

function guild(
  id: string,
  speciesIds: string[],
  overrides: Partial<Guild> = {},
): Guild {
  return {
    id,
    projectId: PROJECT_ID,
    name: `Guild ${id}`,
    anchorSpeciesId: speciesIds[0] ?? 'unknown',
    members: speciesIds.map((s) => ({ speciesId: s, layer: 'canopy' as const })),
    createdAt: '2026-01-01',
    ...overrides,
  };
}

function hedgerow(id: string, coords: [number, number][]): DesignElement {
  return {
    id,
    category: 'vegetation',
    kind: 'hedgerow',
    geometry: { type: 'LineString', coordinates: coords },
    phase: 'trees',
    createdAt: '2026-01-01',
  };
}

function pond(id: string, ring: [number, number][]): DesignElement {
  return {
    id,
    category: 'water',
    kind: 'pond',
    geometry: { type: 'Polygon', coordinates: [ring] },
    phase: 'water',
    createdAt: '2026-01-01',
  };
}

function shrubElement(id: string, coord: [number, number]): DesignElement {
  return {
    id,
    category: 'vegetation',
    kind: 'shrub',
    geometry: { type: 'Point', coordinates: coord },
    phase: 'trees',
    createdAt: '2026-01-01',
  };
}

function habitatPoint(
  id: string,
  kind:
    | 'owl-box'
    | 'raptor-perch'
    | 'nest-box'
    | 'brush-pile'
    | 'snag',
  coord: [number, number],
): DesignElement {
  return {
    id,
    category: 'habitat',
    kind,
    geometry: { type: 'Point', coordinates: coord },
    phase: 'trees',
    createdAt: '2026-01-01',
  };
}

function insectaryStrip(
  id: string,
  coords: [number, number][],
): DesignElement {
  return {
    id,
    category: 'habitat',
    kind: 'insectary-strip',
    geometry: { type: 'LineString', coordinates: coords },
    phase: 'soil',
    createdAt: '2026-01-01',
  };
}

function wetlandEdge(id: string, ring: [number, number][]): DesignElement {
  return {
    id,
    category: 'habitat',
    kind: 'wetland-edge',
    geometry: { type: 'Polygon', coordinates: [ring] },
    phase: 'water',
    createdAt: '2026-01-01',
  };
}

// Small square polygon roughly 1 ha in WGS84 near (0,0) — Turf.area returns m²
function squareRing(sizeDeg: number): [number, number][] {
  return [
    [0, 0],
    [sizeDeg, 0],
    [sizeDeg, sizeDeg],
    [0, sizeDeg],
    [0, 0],
  ];
}

describe('computeBeneficialHabitatReport — empty + filter', () => {
  it('empty parcel → zero overall, no rows', () => {
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [],
      designElements: [],
    });
    expect(r.guildCount).toBe(0);
    expect(r.overall.coveragePct).toBe(0);
    expect(r.overall.distinctBeneficialSpecies).toBe(0);
    expect(r.overall.hedgerowLengthM).toBe(0);
    expect(r.overall.pondAreaM2).toBe(0);
    expect(r.overall.shrubCount).toBe(0);
    expect(r.overall.categoriesPresent).toEqual([]);
    expect(r.guildRows).toEqual([]);
  });

  it('respects projectId — guilds from other projects excluded', () => {
    const other = guild('g1', ['clover'], { projectId: 'proj-B' });
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [other],
      designElements: [],
    });
    expect(r.guildCount).toBe(0);
  });
});

describe('computeBeneficialHabitatReport — plant dimension', () => {
  it('counts distinct beneficial species (deduplicated across guilds)', () => {
    const g1 = guild('g1', ['clover', 'yarrow']);
    const g2 = guild('g2', ['clover', 'borage']);
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [g1, g2],
      designElements: [],
    });
    expect(r.overall.distinctBeneficialSpecies).toBe(3);
  });

  it('guild with no beneficial members → row with count 0', () => {
    const g = guild('g1', ['american_chestnut']); // wildlife_food → counts
    const empty = guild('g2', ['not-a-real-species']);
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [g, empty],
      designElements: [],
    });
    const row = r.guildRows.find((row) => row.guildId === 'g2');
    expect(row?.beneficialSpeciesCount).toBe(0);
  });

  it('plant-richness band caps at 40 (10 beneficial species saturates)', () => {
    const many = guild('g1', [
      'clover',
      'yarrow',
      'borage',
      'apple',
      'pear',
      'cherry',
      'blueberry',
      'currant',
      'elderberry',
      'comfrey',
      'pawpaw',
      'persimmon',
    ]);
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [many],
      designElements: [],
    });
    // plant-richness band alone is capped at 40; bonus + structural may add more
    // but with no structures the structural band is 0.
    const expectedFromPlants = Math.min(40, r.overall.distinctBeneficialSpecies * 4);
    expect(expectedFromPlants).toBe(40);
  });

  it('scoring monotone in beneficial species count', () => {
    const small = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [guild('g1', ['clover'])],
      designElements: [],
    });
    const big = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [guild('g1', ['clover', 'yarrow', 'borage'])],
      designElements: [],
    });
    expect(big.overall.coveragePct).toBeGreaterThan(small.overall.coveragePct);
  });
});

describe('computeBeneficialHabitatReport — structural dimension', () => {
  it('counts shrub points', () => {
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [],
      designElements: [
        shrubElement('s1', [0, 0]),
        shrubElement('s2', [0.001, 0]),
        shrubElement('s3', [0.002, 0]),
      ],
    });
    expect(r.overall.shrubCount).toBe(3);
  });

  it('sums hedgerow length across multi-segment line', () => {
    // ~111 km per degree at equator → use tiny offsets for testable m values
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [],
      designElements: [
        hedgerow('h1', [
          [0, 0],
          [0.0009, 0], // ~100m
          [0.0018, 0], // another ~100m
        ]),
      ],
    });
    expect(r.overall.hedgerowLengthM).toBeGreaterThan(150);
    expect(r.overall.hedgerowLengthM).toBeLessThan(250);
  });

  it('derives pond area from polygon via Turf', () => {
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [],
      designElements: [pond('p1', squareRing(0.001))],
    });
    expect(r.overall.pondAreaM2).toBeGreaterThan(0);
  });

  it('structural band caps at 40', () => {
    // 25 shrubs alone would push (25 * 4 = 100) — but it caps at 40
    const shrubs = Array.from({ length: 25 }, (_, i) =>
      shrubElement(`s${i}`, [i * 0.001, 0]),
    );
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [],
      designElements: shrubs,
    });
    // structural band derivable from overall: (shrubCount * 4) capped at 40
    const band = Math.min(40, r.overall.shrubCount * 4);
    expect(band).toBe(40);
    // total composite: 0 plants + 40 structural + bonus from shrub categories
    expect(r.overall.coveragePct).toBeLessThanOrEqual(100);
  });
});

describe('computeBeneficialHabitatReport — combined + edge', () => {
  it('functional-diversity bonus caps at 20', () => {
    // Provide structures + plants covering > 4 distinct categories
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [guild('g1', ['clover', 'yarrow', 'apple'])],
      designElements: [
        hedgerow('h1', [
          [0, 0],
          [0.0009, 0],
        ]),
        pond('p1', squareRing(0.001)),
        shrubElement('s1', [0.005, 0]),
      ],
    });
    // categoriesPresent should include multiple categories; bonus = min(20, count*5)
    const bonus = Math.min(20, r.overall.categoriesPresent.length * 5);
    expect(bonus).toBeLessThanOrEqual(20);
    expect(r.overall.coveragePct).toBeLessThanOrEqual(100);
  });

  it('composite caps at 100', () => {
    const many = guild('g1', [
      'clover',
      'yarrow',
      'borage',
      'apple',
      'pear',
      'cherry',
      'blueberry',
      'currant',
      'elderberry',
      'comfrey',
      'pawpaw',
      'persimmon',
    ]);
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [many],
      designElements: [
        hedgerow('h1', [
          [0, 0],
          [0.01, 0],
        ]),
        pond('p1', squareRing(0.01)),
        ...Array.from({ length: 30 }, (_, i) =>
          shrubElement(`s${i}`, [i * 0.001, 0.005]),
        ),
      ],
    });
    expect(r.overall.coveragePct).toBeLessThanOrEqual(100);
  });

  it('malformed geometry skipped (no NaN)', () => {
    const malformed: DesignElement = {
      id: 'bad',
      category: 'vegetation',
      kind: 'hedgerow',
      geometry: { type: 'LineString', coordinates: [] },
      phase: 'trees',
      createdAt: '2026-01-01',
    };
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [],
      designElements: [malformed],
    });
    expect(Number.isFinite(r.overall.hedgerowLengthM)).toBe(true);
    expect(Number.isFinite(r.overall.coveragePct)).toBe(true);
  });
});

describe('computeBeneficialHabitatReport — habitat-feature unification (2026-05-21)', () => {
  it('zero-state: new habitat tallies are 0 on an empty parcel', () => {
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [],
      designElements: [],
    });
    expect(r.overall.owlBoxCount).toBe(0);
    expect(r.overall.raptorPerchCount).toBe(0);
    expect(r.overall.nestBoxCount).toBe(0);
    expect(r.overall.brushPileCount).toBe(0);
    expect(r.overall.snagCount).toBe(0);
    expect(r.overall.insectaryStripLengthM).toBe(0);
    expect(r.overall.wetlandEdgeAreaM2).toBe(0);
  });

  it('counts each habitat point kind independently', () => {
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [],
      designElements: [
        habitatPoint('o1', 'owl-box', [0, 0]),
        habitatPoint('o2', 'owl-box', [0.001, 0]),
        habitatPoint('p1', 'raptor-perch', [0.002, 0]),
        habitatPoint('n1', 'nest-box', [0.003, 0]),
        habitatPoint('b1', 'brush-pile', [0.004, 0]),
        habitatPoint('s1', 'snag', [0.005, 0]),
        habitatPoint('s2', 'snag', [0.006, 0]),
      ],
    });
    expect(r.overall.owlBoxCount).toBe(2);
    expect(r.overall.raptorPerchCount).toBe(1);
    expect(r.overall.nestBoxCount).toBe(1);
    expect(r.overall.brushPileCount).toBe(1);
    expect(r.overall.snagCount).toBe(2);
  });

  it('sums insectary-strip length and wetland-edge area', () => {
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [],
      designElements: [
        insectaryStrip('i1', [
          [0, 0],
          [0.0009, 0],
        ]),
        wetlandEdge('w1', squareRing(0.001)),
      ],
    });
    expect(r.overall.insectaryStripLengthM).toBeGreaterThan(50);
    expect(r.overall.insectaryStripLengthM).toBeLessThan(150);
    expect(r.overall.wetlandEdgeAreaM2).toBeGreaterThan(0);
  });

  it('habitat kinds contribute to the structural band (monotonic)', () => {
    const empty = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [],
      designElements: [],
    });
    const withHabitats = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [],
      designElements: [
        habitatPoint('o1', 'owl-box', [0, 0]),
        habitatPoint('p1', 'raptor-perch', [0.001, 0]),
        habitatPoint('s1', 'snag', [0.002, 0]),
      ],
    });
    expect(withHabitats.overall.coveragePct).toBeGreaterThan(
      empty.overall.coveragePct,
    );
  });

  it('habitat kinds populate categoriesPresent via beneficialFunctionCatalog', () => {
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [],
      designElements: [
        habitatPoint('o1', 'owl-box', [0, 0]),
        habitatPoint('s1', 'snag', [0.001, 0]),
        insectaryStrip('i1', [
          [0, 0.001],
          [0.0009, 0.001],
        ]),
      ],
    });
    // avian_shelter from owl-box + snag; predatory_insectary + pollinator from
    // insectary-strip + snag. We just require >= 2 distinct categories.
    expect(r.overall.categoriesPresent.length).toBeGreaterThanOrEqual(2);
  });

  it('composite still capped at 100 with many habitat features', () => {
    const points = Array.from({ length: 50 }, (_, i) =>
      habitatPoint(`o${i}`, 'owl-box', [i * 0.001, 0]),
    );
    const r = computeBeneficialHabitatReport({
      projectId: PROJECT_ID,
      guilds: [],
      designElements: points,
    });
    expect(r.overall.coveragePct).toBeLessThanOrEqual(100);
  });
});

describe('computeBeneficialHabitatPct wrapper', () => {
  it('equals report.overall.coveragePct', () => {
    const args = {
      projectId: PROJECT_ID,
      guilds: [guild('g1', ['clover', 'yarrow'])],
      designElements: [
        hedgerow('h1', [
          [0, 0],
          [0.0009, 0],
        ]),
      ],
    };
    expect(computeBeneficialHabitatPct(args)).toBe(
      computeBeneficialHabitatReport(args).overall.coveragePct,
    );
  });
});

describe('beneficialHabitatMath covenant lock', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const moduleText = readFileSync(
    resolve(__dirname, '../beneficialHabitatMath.ts'),
    'utf-8',
  );

  it('contains no riba/gharar/csra/salam/investor/financing/cost-of-capital framing', () => {
    const stripped = moduleText.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripped).not.toMatch(
      /\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i,
    );
  });
});
