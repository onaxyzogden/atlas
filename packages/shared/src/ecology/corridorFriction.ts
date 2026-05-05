/**
 * corridorFriction — derive a per-polygon friction value from the polygons
 * emitted by `polygonizeBbox`. Per ADR 2026-05-05 (8.1-B.2) and the cover
 * impedance table locked in `corridorLCP.ts`.
 *
 * Inputs are class-keyed polygons in the source CRS (or EPSG:4326 if
 * already reprojected); outputs are the same polygons annotated with
 * canonical class + friction value, ready to feed the patch-graph LCP
 * (8.1-C) or to be rasterised back into the existing zone-grid LCP.
 *
 * No new friction model — this reuses `COVER_IMPEDANCE` from
 * `corridorLCP.ts` so the polygon-based path and the existing
 * zone-grid path stay numerically aligned.
 */

import type { Feature } from 'geojson';
import { COVER_IMPEDANCE, normalizeCoverClass, type CoverClass } from './corridorLCP.js';
import type { CanonicalLandCoverClass } from './landCoverClasses.js';
import { toCanonicalLandCoverClass } from './landCoverClasses.js';
import type {
  PolygonizedFeature,
  PolygonizedClassProps,
  LandCoverSourceId,
} from './polygonizeBbox.js';

export interface FrictionProps extends PolygonizedClassProps {
  canonicalClass: CanonicalLandCoverClass;
  coverClass: CoverClass;
  friction: number;
  /** True when the canonical class is a `(unspecified)` lossy bucket. */
  unspecifiedBucket: boolean;
}

export type FrictionFeature = Feature<
  PolygonizedFeature['geometry'],
  FrictionProps
>;

export interface DeriveCorridorFrictionResult {
  features: FrictionFeature[];
  source: LandCoverSourceId;
  vintage: number;
  /** Sum of feature areaM2 with friction <=3 (permeable) — telemetry. */
  permeableAreaM2: number;
  /** Sum of feature areaM2 with friction >=8 (matrix) — telemetry. */
  hostileAreaM2: number;
}

/**
 * Convert polygonised land-cover features into friction-annotated features.
 * Reuses the cover-impedance table from corridorLCP so the polygon-based
 * 8.1-B path and the zone-grid 8.1-C path agree on edge weights.
 */
export function deriveCorridorFriction(
  features: PolygonizedFeature[],
  meta: { source: LandCoverSourceId; vintage: number },
): DeriveCorridorFrictionResult {
  const out: FrictionFeature[] = [];
  let permeableAreaM2 = 0;
  let hostileAreaM2 = 0;

  for (const f of features) {
    const canonical = toCanonicalLandCoverClass(meta.source, f.properties.classId);
    const cover = normalizeCoverClass(canonical);
    const friction = COVER_IMPEDANCE[cover];
    const unspecifiedBucket = canonical.includes('(unspecified)');

    if (friction <= 3) permeableAreaM2 += f.properties.areaM2;
    if (friction >= 8) hostileAreaM2 += f.properties.areaM2;

    out.push({
      ...f,
      properties: {
        ...f.properties,
        canonicalClass: canonical,
        coverClass: cover,
        friction,
        unspecifiedBucket,
      },
    });
  }

  return {
    features: out,
    source: meta.source,
    vintage: meta.vintage,
    permeableAreaM2,
    hostileAreaM2,
  };
}
