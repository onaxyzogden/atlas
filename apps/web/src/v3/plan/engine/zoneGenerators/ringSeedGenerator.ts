/**
 * ringSeedGenerator — turns the Mollison Z1–Z5 rings into editable
 * draft `LandZone`s so the steward starts from the ideal instead of a
 * blank canvas. Pure: no store access, no React.
 *
 * Anchor resolution (in order): a steward-picked `ctx.anchorPoint` →
 * an explicit `isHomeCentre` zone → a legacy `permacultureZone === 0`
 * zone → the parcel-boundary centroid. When no home-centre zone exists
 * one is emitted (a small disc at the anchor) so the original zero-state
 * ("no zones at all") is closed in one action.
 *
 * Bands are NOT parcel-clipped — full rings are seeded around the anchor
 * (the outer rings stay whole on a compact lot); the steward trims to
 * the parcel afterwards. Existing zones (hand-drawn work + the home
 * centre + earlier bands) are still subtracted, so seeds never overlap
 * and a re-run only fills the still-uncovered remainder (idempotent per
 * Z-level).
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
import { PERMACULTURE_ZONE_LABEL } from '../../../../lib/zones/permacultureLabels.js';
import {
  DEFAULT_RING_RADII,
  bandsFromRadii,
  ringCircle,
  type ZoneRingBand,
} from '../../layers/zoneRingConstants.js';
import {
  diff,
  parcelPolygon,
  type Poly,
  type PolyFeature,
} from './parcelGeometry.js';
import type {
  ZoneGenerator,
  ZoneGeneratorContext,
  ZoneGeneratorAvailability,
} from './types.js';

const MIN_SEED_AREA_M2 = 50;

/**
 * Pure annulus builder shared by the seed generator and the after-placement
 * resize editor: for each band, `ringCircle(outerM)` minus `ringCircle(innerM)`
 * (the annulus), then minus every blocker (hand-drawn work, the home disc,
 * already-built rings this pass), dropping sub-`MIN_SEED_AREA_M2` slivers.
 * Returns one entry per surviving band — geometry + its Z-level — leaving
 * provenance / category / naming to the caller. No idempotency, no home
 * centre: those are the seeder's concern (the resize editor wants ALL levels
 * rebuilt). `blockers` is consumed read-only.
 */
export function buildRingZoneGeometries(
  center: GeoJSON.Feature<GeoJSON.Point>,
  bands: readonly ZoneRingBand[],
  blockers: readonly PolyFeature[],
): { zLevel: 1 | 2 | 3 | 4 | 5; geometry: Poly }[] {
  const out: { zLevel: 1 | 2 | 3 | 4 | 5; geometry: Poly }[] = [];
  for (const band of bands) {
    let geom: PolyFeature | null = ringCircle(center, band.outerM);
    if (band.innerM > 0) {
      geom = diff(geom, ringCircle(center, band.innerM) as PolyFeature);
    }
    if (!geom) continue;
    for (const b of [
      ...blockers,
      ...out.map((z) => turf.feature(z.geometry) as PolyFeature),
    ]) {
      geom = diff(geom, b);
      if (!geom) break;
    }
    if (!geom) continue;
    if (turf.area(geom) < MIN_SEED_AREA_M2) continue;
    out.push({ zLevel: band.zLevel as 1 | 2 | 3 | 4 | 5, geometry: geom.geometry });
  }
  return out;
}

interface Anchor {
  center: GeoJSON.Feature<GeoJSON.Point>;
  homeCentreZone: LandZone | null;
}

function resolveAnchor(ctx: ZoneGeneratorContext): Anchor | null {
  // Steward-picked point wins: it becomes the Z0 home centre (a fresh disc
  // is emitted at it because homeCentreZone is null) so the rings grow from
  // exactly where the steward clicked, not a guessed centroid.
  if (ctx.anchorPoint) {
    return {
      center: turf.point(ctx.anchorPoint) as GeoJSON.Feature<GeoJSON.Point>,
      homeCentreZone: null,
    };
  }
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
  const radii = ctx.ringRadii ?? DEFAULT_RING_RADII;
  const now = new Date().toISOString();
  const mine = ctx.existingZones.filter((z) => z.projectId === ctx.projectId);
  const out: LandZone[] = [];

  const make = (
    zLevel: 0 | 1 | 2 | 3 | 4 | 5,
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
    const hc = ringCircle(center, radii.homeM);
    homeFeature = hc as PolyFeature;
    out.push(make(0, hc.geometry, 'habitation', 'Home centre', true));
  }

  // No parcel clip: full Mollison rings are seeded around the picked
  // point so Z3 isn't truncated on a compact lot. The steward trims to
  // the parcel afterwards via the explicit "trim seeded zones" action.
  // Existing hand-drawn / prior-seeded work the new seeds must not cover.
  const blockers: PolyFeature[] = mine.map(
    (z) => turf.feature(z.geometry) as PolyFeature,
  );
  if (homeFeature) blockers.push(homeFeature);

  // Idempotent per Z-level: skip any band already ring-seeded. The
  // already-seeded zone stays in `mine` → it's still a blocker for the
  // remaining bands, so re-running only fills the uncovered remainder.
  const pending = bandsFromRadii(radii).filter(
    (band) =>
      !mine.some(
        (z) =>
          z.seedProvenance === 'ring-seed' &&
          z.permacultureZone === band.zLevel,
      ),
  );

  for (const ring of buildRingZoneGeometries(center, pending, blockers)) {
    out.push(
      make(
        ring.zLevel,
        ring.geometry,
        defaultCategoryForZ(ring.zLevel),
        PERMACULTURE_ZONE_LABEL[ring.zLevel],
        false,
      ),
    );
  }

  return out;
}

export const ringSeedGenerator: ZoneGenerator = {
  id: 'ring-seed',
  label: 'Seed zones from home',
  describe:
    'Click a point on the map to seed editable Z0–Z5 Mollison rings ' +
    'from there. Adjust, trim to the parcel, or clear them anytime.',
  canRun,
  generate,
};
