/**
 * ringSeedGenerator — turns the Mollison Z1/Z2/Z3 rings into editable
 * draft `LandZone`s so the steward starts from the ideal instead of a
 * blank canvas. Pure: no store access, no React.
 *
 * Anchor resolution (in order): an explicit `isHomeCentre` zone → a
 * legacy `permacultureZone === 0` zone → the parcel-boundary centroid.
 * When no home-centre zone exists one is emitted (a small disc at the
 * anchor) so the original zero-state ("no zones at all") is closed in
 * one action.
 *
 * Each band is clipped to the parcel and has existing zones (hand-drawn
 * work + the home centre + earlier bands) subtracted, so seeds never
 * overlap and a re-run only fills the still-uncovered remainder
 * (idempotent per Z-level).
 *
 * Geometry constants come from `zoneRingConstants` — shared with the
 * read-only overlay so a seed's outer edge lands exactly on its ring.
 */

import * as turf from '@turf/turf';
import {
  ZONE_CATEGORY_CONFIG,
  defaultCategoryForZ,
  type LandZone,
  type ZoneCategory,
} from '../../../../store/zoneStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { ZONE_RING_BANDS, ringCircle } from '../../layers/zoneRingConstants.js';
import type {
  ZoneGenerator,
  ZoneGeneratorContext,
  ZoneGeneratorAvailability,
} from './types.js';

const HOME_CENTRE_RADIUS_M = 15;
const MIN_SEED_AREA_M2 = 50;

type Poly = GeoJSON.Polygon | GeoJSON.MultiPolygon;
type PolyFeature = GeoJSON.Feature<Poly>;

function diff(a: PolyFeature, b: PolyFeature): PolyFeature | null {
  try {
    return (turf.difference(turf.featureCollection([a, b])) ??
      null) as PolyFeature | null;
  } catch {
    return null;
  }
}

function clip(a: PolyFeature, b: PolyFeature): PolyFeature | null {
  try {
    return (turf.intersect(turf.featureCollection([a, b])) ??
      null) as PolyFeature | null;
  } catch {
    return null;
  }
}

/** Union of every polygon/multipolygon feature in the boundary FC. */
function parcelPolygon(
  fc: GeoJSON.FeatureCollection | null,
): PolyFeature | null {
  if (!fc) return null;
  const polys = fc.features.filter(
    (f): f is PolyFeature =>
      f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon',
  );
  if (polys.length === 0) return null;
  let acc = polys[0]!;
  for (let i = 1; i < polys.length; i++) {
    try {
      const u = turf.union(turf.featureCollection([acc, polys[i]!]));
      if (u) acc = u as PolyFeature;
    } catch {
      /* keep acc */
    }
  }
  return acc;
}

interface Anchor {
  center: GeoJSON.Feature<GeoJSON.Point>;
  homeCentreZone: LandZone | null;
}

function resolveAnchor(ctx: ZoneGeneratorContext): Anchor | null {
  const mine = ctx.existingZones.filter((z) => z.projectId === ctx.projectId);
  const hc =
    mine.find((z) => z.isHomeCentre) ??
    mine.find((z) => z.permacultureZone === 0) ??
    null;
  if (hc) {
    return {
      center: turf.centroid(hc.geometry) as GeoJSON.Feature<GeoJSON.Point>,
      homeCentreZone: hc,
    };
  }
  const parcel = parcelPolygon(ctx.parcelBoundary);
  if (parcel) {
    return {
      center: turf.centroid(parcel) as GeoJSON.Feature<GeoJSON.Point>,
      homeCentreZone: null,
    };
  }
  return null;
}

function canRun(ctx: ZoneGeneratorContext): ZoneGeneratorAvailability {
  if (!resolveAnchor(ctx)) {
    return {
      ok: false,
      reason:
        'Draw the parcel boundary (or drop a home centre) so the rings ' +
        'have an anchor to grow from.',
    };
  }
  return { ok: true };
}

function generate(ctx: ZoneGeneratorContext): LandZone[] {
  const anchor = resolveAnchor(ctx);
  if (!anchor) return [];
  const { center, homeCentreZone } = anchor;
  const now = new Date().toISOString();
  const mine = ctx.existingZones.filter((z) => z.projectId === ctx.projectId);
  const out: LandZone[] = [];

  const make = (
    zLevel: 0 | 1 | 2 | 3,
    geom: Poly,
    category: ZoneCategory,
    name: string,
    isHomeCentre: boolean,
  ): LandZone => ({
    id: newAnnotationId('zone'),
    projectId: ctx.projectId,
    name,
    category,
    color: ZONE_CATEGORY_CONFIG[category].color,
    primaryUse: '',
    secondaryUse: '',
    notes: '',
    geometry: geom,
    areaM2: turf.area(turf.feature(geom)),
    permacultureZone: zLevel,
    isHomeCentre,
    seedProvenance: 'ring-seed',
    createdAt: now,
    updatedAt: now,
  });

  let homeFeature: PolyFeature | null = homeCentreZone
    ? (turf.feature(homeCentreZone.geometry) as PolyFeature)
    : null;
  if (!homeCentreZone) {
    const hc = ringCircle(center, HOME_CENTRE_RADIUS_M);
    homeFeature = hc as PolyFeature;
    out.push(make(0, hc.geometry, 'habitation', 'Home centre', true));
  }

  const parcel = parcelPolygon(ctx.parcelBoundary);
  // Existing hand-drawn / prior-seeded work the new seeds must not cover.
  const blockers: PolyFeature[] = mine.map(
    (z) => turf.feature(z.geometry) as PolyFeature,
  );
  if (homeFeature) blockers.push(homeFeature);

  for (const band of ZONE_RING_BANDS) {
    // Idempotent per Z-level: don't re-seed a level already seeded.
    if (
      mine.some(
        (z) =>
          z.seedProvenance === 'ring-seed' &&
          z.permacultureZone === band.zLevel,
      )
    ) {
      continue;
    }

    let geom: PolyFeature | null = ringCircle(center, band.outerM);
    if (band.innerM > 0) {
      geom = diff(geom, ringCircle(center, band.innerM) as PolyFeature);
    }
    if (!geom) continue;
    if (parcel) {
      geom = clip(geom, parcel);
      if (!geom) continue;
    }
    for (const b of [
      ...blockers,
      ...out.map((z) => turf.feature(z.geometry) as PolyFeature),
    ]) {
      geom = diff(geom, b);
      if (!geom) break;
    }
    if (!geom) continue;
    if (turf.area(geom) < MIN_SEED_AREA_M2) continue;

    const zLevel = band.zLevel as 1 | 2 | 3;
    out.push(
      make(
        zLevel,
        geom.geometry,
        defaultCategoryForZ(zLevel),
        `Z${zLevel} (seeded)`,
        false,
      ),
    );
  }

  return out;
}

export const ringSeedGenerator: ZoneGenerator = {
  id: 'ring-seed',
  label: 'Seed zones from rings',
  describe:
    'Generate editable Z0–Z3 draft zones from the Mollison rings, ' +
    'clipped to the parcel. Adjust or dismiss them like any drawn zone.',
  canRun,
  generate,
};
