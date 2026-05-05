/**
 * Polygon-friction path for the PollinatorOpportunityProcessor.
 *
 * Per ADR 2026-05-05-pollinator-corridor-raster-pipeline (8.1-B.3, B.4).
 * Replaces the synthesized 5×5 patch grid with a real polygon-based
 * friction surface derived from `polygonizeBbox` + `deriveCorridorFriction`.
 *
 * Gating:
 *   - `POLLINATOR_USE_POLYGON_FRICTION=true` enables the call site.
 *   - The function itself returns `null` when no `LandCoverRasterService`
 *     resolves for the project location, when the chosen service hasn't
 *     loaded its manifest, or when the `clipToBbox` capability isn't
 *     wired yet (Phase 5-minimal — full wiring lands once real tiles
 *     are available and `clipToBbox` is added to the base class).
 *
 * Timeout:
 *   - The processor wraps the call in a `POLLINATOR_POLYGON_TIMEOUT_MS`
 *     race; a null return or a thrown error both fall through to the
 *     synthesized grid path.
 *
 * Output shape mirrors what the synthesized grid emits so downstream
 * consumers (UI, scoring) can treat the two paths interchangeably,
 * with `samplingMethod: 'polygon'` flagging the new path's provenance.
 */

import type { Feature, Polygon } from 'geojson';
import {
  deriveCorridorFriction,
  polygonizeBbox,
  polygonizePixelGrid,
  type ClipProvider,
  type FrictionFeature,
  type LandCoverSourceId,
  type Polygonizer,
  type Reprojector,
} from '@ogden/shared';

export interface PolygonPathInput {
  source: LandCoverSourceId;
  parcel: Feature<Polygon>;
  bufferKm?: number;
  clipProvider: ClipProvider;
  /** Defaults to the pure-JS fallback. Production injects polygonizeWithGdal. */
  polygonizer?: Polygonizer;
  /** Optional CRS reprojector. Production wires PostGIS ST_Transform. */
  reprojector?: Reprojector;
}

export interface PolygonPathResult {
  features: FrictionFeature[];
  source: LandCoverSourceId;
  vintage: number;
  pixelCount: number;
  polygonizeMs: number;
  permeableAreaM2: number;
  hostileAreaM2: number;
  /** Fraction of the polygonised area considered permeable (friction ≤ 3). */
  permeableFraction: number;
}

/**
 * Run the polygon-friction path. Returns null when the path is gated off
 * or the service-resolution / clipping fails — caller falls through to
 * the synthesized grid in that case.
 */
export async function runPolygonFrictionPath(
  input: PolygonPathInput,
): Promise<PolygonPathResult | null> {
  try {
    const polygonized = await polygonizeBbox(input.parcel, {
      source: input.source,
      bufferKm: input.bufferKm,
      clipProvider: input.clipProvider,
      polygonizer: input.polygonizer ?? polygonizePixelGrid,
      ...(input.reprojector ? { reprojector: input.reprojector } : {}),
    });

    const friction = deriveCorridorFriction(polygonized.features, {
      source: polygonized.source,
      vintage: polygonized.vintage,
    });

    const totalArea = friction.permeableAreaM2 + friction.hostileAreaM2;
    const permeableFraction = totalArea > 0 ? friction.permeableAreaM2 / totalArea : 0;

    return {
      features: friction.features,
      source: friction.source,
      vintage: friction.vintage,
      pixelCount: polygonized.pixelCount,
      polygonizeMs: polygonized.polygonizeMs,
      permeableAreaM2: friction.permeableAreaM2,
      hostileAreaM2: friction.hostileAreaM2,
      permeableFraction,
    };
  } catch {
    // Caller decides whether to log; swallow here so the timeout race is clean.
    return null;
  }
}

/**
 * Wrap any promise in a timeout that resolves to `null` when exceeded.
 * Used by PollinatorOpportunityProcessor to bound the polygon-path budget
 * at `POLLINATOR_POLYGON_TIMEOUT_MS` so a slow GDAL run can't stall the
 * downstream BullMQ job.
 */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}
