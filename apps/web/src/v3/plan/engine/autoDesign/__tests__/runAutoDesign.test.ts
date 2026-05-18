import { describe, expect, it } from 'vitest';
import * as turf from '@turf/turf';
import { runAutoDesign, type AutoDesignInput } from '../runAutoDesign.js';
import { makeZone, makeGoalTree, makeSiteProfile } from './fixtures.js';

const PID = 'proj-fixture';
const GEN = 'gen-1';

function buildInput(): AutoDesignInput {
  // Four painted zones at distinct ring bands / covers / categories.
  const zones = [
    makeZone('z-food', {
      category: 'food_production',
      successionStage: 'pioneer',
      groundCover: 'bare-soil',
      permacultureZone: 2,
      lng: 0,
      lat: 0,
      sideDeg: 0.03,
    }),
    makeZone('z-pasture', {
      category: 'livestock',
      suitableForLivestock: true,
      successionStage: 'mid',
      groundCover: 'thriving-grasses',
      permacultureZone: 3,
      lng: 0.05,
      lat: 0,
      sideDeg: 0.04,
    }),
    makeZone('z-water', {
      category: 'water_retention',
      successionStage: 'pioneer',
      groundCover: 'wetland',
      permacultureZone: 4,
      lng: 0.1,
      lat: 0,
      sideDeg: 0.02,
    }),
    makeZone('z-home', {
      category: 'habitation',
      permacultureZone: 0,
      lng: 0.13,
      lat: 0,
      sideDeg: 0.01,
    }),
  ];
  return {
    projectId: PID,
    generationId: GEN,
    goalTree: makeGoalTree(),
    siteProfile: makeSiteProfile(PID, 40),
    zones,
    startDate: '2026-06-01',
  };
}

describe('runAutoDesign', () => {
  it('selects interventions and stamps draft geometry into zones', () => {
    const res = runAutoDesign(buildInput());

    expect(res.sequencing.selected.length).toBeGreaterThan(0);
    expect(res.drafts.length).toBeGreaterThan(0);

    // Every draft references a real zone + a real selected intervention.
    const zoneIds = new Set(['z-food', 'z-pasture', 'z-water', 'z-home']);
    const selIds = new Set(res.sequencing.selected.map((s) => s.intervention.id));
    for (const d of res.drafts) {
      expect(zoneIds.has(d.zoneId!)).toBe(true);
      expect(selIds.has(d.interventionId)).toBe(true);
    }
  });

  it('schedules tasks anchored to the chosen start date', () => {
    const res = runAutoDesign(buildInput());
    expect(res.scheduledTasks.length).toBeGreaterThan(0);
    const dated = res.scheduledTasks.filter((t) => t.task.scheduledStart);
    expect(dated.length).toBeGreaterThan(0);
    for (const t of dated) {
      expect(
        new Date(t.task.scheduledStart!).getFullYear(),
      ).toBeGreaterThanOrEqual(2026);
    }
  });

  it('is deterministic — same input yields identical drafts', () => {
    const a = runAutoDesign(buildInput());
    const b = runAutoDesign(buildInput());
    expect(a.drafts).toEqual(b.drafts);
    expect(a.scheduledTasks).toEqual(b.scheduledTasks);
  });

  it('routes livestock paddocks into the pasture zone', () => {
    const res = runAutoDesign(buildInput());
    const paddockDrafts = res.drafts.filter(
      (d) =>
        d.interventionId === 'cattle-rotational-grazing' ||
        d.interventionId === 'small-ruminant-paddock',
    );
    if (paddockDrafts.length) {
      for (const d of paddockDrafts) expect(d.zoneId).toBe('z-pasture');
    }
  });

  it('every stamped polygon sits within its allocated zone', () => {
    const res = runAutoDesign(buildInput());
    const zoneFeatById: Record<string, GeoJSON.Feature> = {};
    for (const z of buildInput().zones) {
      zoneFeatById[z.id] = turf.buffer(
        turf.feature(z.geometry),
        0.002,
        { units: 'kilometers' },
      )!;
    }
    for (const d of res.drafts) {
      if (d.geometry.type !== 'Polygon') continue;
      const parent = zoneFeatById[d.zoneId!];
      if (!parent) continue;
      expect(
        turf.booleanWithin(turf.feature(d.geometry), parent),
      ).toBe(true);
    }
  });

  it('lists zone-affine interventions that emitted no geometry', () => {
    const res = runAutoDesign(buildInput());
    // contour-line interventions (swale/keyline) have no terrain here,
    // so they should report as empty-geometry.
    expect(Array.isArray(res.emptyGeometryInterventionIds)).toBe(true);
  });

  // Parcel containment + equal-area for tile-strip drafts (grazing
  // paddocks / annual beds — the steward's fix). This goal tree selects
  // silvopasture-alley + integrated-stock-cropland as its tile-strip
  // livestock infrastructure; the contract is keyed on the geometry
  // template, not on specific catalog ids.
  const isTileStrip = (d: { geometry: { type: string }; template: string }) =>
    d.geometry.type === 'Polygon' && d.template === 'tile-strip';

  function parcelFC(
    box: [number, number, number, number],
  ): GeoJSON.FeatureCollection {
    const [w, s, e, n] = box;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
          },
        },
      ],
    };
  }

  it('clips tile-strip drafts to zone ∩ parcel and keeps them equal-area', () => {
    // z-pasture spans lng [0.05, 0.09]; this parcel keeps only its
    // left portion, so tile strips must be trimmed to the overlap.
    const parcel = parcelFC([0.05, -0.01, 0.07, 0.05]);
    const parcelPoly = turf.buffer(turf.feature(parcel.features[0]!.geometry), 0.003, {
      units: 'kilometers',
    })!;
    const res = runAutoDesign({ ...buildInput(), parcelBoundary: parcel });

    const paddocks = res.drafts.filter(isTileStrip);
    expect(paddocks.length).toBeGreaterThan(0);
    for (const d of paddocks) {
      expect(d.zoneId).toBe('z-pasture');
      expect(
        turf.booleanWithin(turf.feature(d.geometry), parcelPoly),
      ).toBe(true);
    }

    // Per intervention+zone group, largest cell ≤ smallest + 10%.
    const groups = new Map<string, number[]>();
    for (const d of paddocks) {
      const key = `${d.interventionId}|${d.zoneId}`;
      const arr = groups.get(key) ?? [];
      arr.push(turf.area(turf.feature(d.geometry)));
      groups.set(key, arr);
    }
    for (const areas of groups.values()) {
      if (areas.length < 2) continue;
      const max = Math.max(...areas);
      const min = Math.min(...areas);
      expect((max - min) / max).toBeLessThanOrEqual(0.1);
    }
  });

  it('emits no tile-strip drafts when the suitable zone is outside the parcel', () => {
    // Parcel disjoint from every zone → tile-strip clip yields nothing.
    const res = runAutoDesign({
      ...buildInput(),
      parcelBoundary: parcelFC([0.2, 0.2, 0.21, 0.21]),
    });
    expect(res.drafts.filter(isTileStrip)).toHaveLength(0);
  });

  // Largest pairwise overlap ratio across all tile-strip paddock drafts:
  // area(A ∩ B) / min(area A, area B). Adjacent strips share only edges
  // (zero-area intersection) so a correct generation is ≈ 0.
  function maxPaddockOverlapRatio(
    drafts: { geometry: GeoJSON.Geometry; template: string }[],
  ): number {
    const polys = drafts
      .filter(isTileStrip)
      .map((d) => turf.feature(d.geometry as GeoJSON.Polygon));
    let worst = 0;
    for (let i = 0; i < polys.length; i++) {
      for (let j = i + 1; j < polys.length; j++) {
        const inter = turf.intersect(
          turf.featureCollection([polys[i]!, polys[j]!]),
        );
        if (!inter) continue;
        const ia = turf.area(inter);
        if (ia <= 0) continue;
        const denom = Math.min(
          turf.area(polys[i]!),
          turf.area(polys[j]!),
        );
        if (denom > 0) worst = Math.max(worst, ia / denom);
      }
    }
    return worst;
  }

  it('co-selected tile-strip interventions on one zone do not overlap', () => {
    // Single productive zone that scores for BOTH default tile-strip
    // interventions (silvopasture-alley + integrated-stock-cropland):
    // ring 3 ∈ both ring ranges, livestock + food affine. With no other
    // productive zone to absorb them, both subdivide this one polygon.
    // Before the claimed-footprint ledger that stacked two full grids.
    const base = buildInput();
    const zones = [
      base.zones.find((z) => z.id === 'z-home')!,
      base.zones.find((z) => z.id === 'z-water')!,
      makeZone('z-mixed', {
        category: 'livestock',
        suitableForLivestock: true,
        successionStage: 'mid',
        groundCover: 'thriving-grasses',
        permacultureZone: 3,
        lng: 0.05,
        lat: 0,
        sideDeg: 0.05,
      }),
    ];
    const res = runAutoDesign({ ...base, zones });
    const paddocks = res.drafts.filter(isTileStrip);
    expect(paddocks.length).toBeGreaterThan(0);
    // Precondition: the sequencer selected >=2 tile-strip interventions
    // and z-mixed is the only zone any of them can score (z-water/z-home
    // are vetoed for tile-strip affinity) — so absent the ledger they
    // would both subdivide z-mixed (the stacked-grid bug). Post-fix the
    // first claims it and the rest cascade onto the (empty) leftover.
    const tileStripSelected = res.sequencing.selected.filter(
      (s) => s.intervention.geometryTemplate === 'tile-strip',
    );
    expect(tileStripSelected.length).toBeGreaterThanOrEqual(2);
    expect(new Set(paddocks.map((d) => d.zoneId))).toEqual(
      new Set(['z-mixed']),
    );
    expect(maxPaddockOverlapRatio(res.drafts)).toBeLessThan(0.02);
  });

  it('paddocks from overlapping painted livestock zones do not overlap', () => {
    // Two steward-painted livestock zones that physically overlap. Each
    // subdivides independently; the ledger must prevent the second zone's
    // strips from re-tiling the shared region.
    const base = buildInput();
    const zones = [
      base.zones.find((z) => z.id === 'z-home')!,
      makeZone('z-pasture-a', {
        category: 'livestock',
        suitableForLivestock: true,
        successionStage: 'mid',
        groundCover: 'thriving-grasses',
        permacultureZone: 3,
        lng: 0.05,
        lat: 0,
        sideDeg: 0.04,
      }),
      makeZone('z-pasture-b', {
        category: 'livestock',
        suitableForLivestock: true,
        successionStage: 'mid',
        groundCover: 'thriving-grasses',
        permacultureZone: 3,
        lng: 0.07, // overlaps z-pasture-a on lng [0.07, 0.09]
        lat: 0,
        sideDeg: 0.04,
      }),
    ];
    const res = runAutoDesign({ ...base, zones });
    expect(res.drafts.filter(isTileStrip).length).toBeGreaterThan(0);
    expect(maxPaddockOverlapRatio(res.drafts)).toBeLessThan(0.02);
  });
});
