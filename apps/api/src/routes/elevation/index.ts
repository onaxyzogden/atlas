/**
 * Elevation proxy — NRCan HRDEM Cloud Optimized GeoTIFF reader.
 *
 * Delegates to ElevationGridReader for raster acquisition, then computes
 * slope/aspect statistics and returns the processed tile to the frontend.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ElevationProfileRequest, type ElevationProfileResponse } from '@ogden/shared';
import { ValidationError } from '../../lib/errors.js';
import { readElevationGrid } from '../../services/terrain/ElevationGridReader.js';

// ── Request schema ───────────────────────────────────────────────────────────

const BboxQuerySchema = z.object({
  minLon: z.coerce.number().min(-180).max(180),
  minLat: z.coerce.number().min(-90).max(90),
  maxLon: z.coerce.number().min(-180).max(180),
  maxLat: z.coerce.number().min(-90).max(90),
});

// ── Route ────────────────────────────────────────────────────────────────────

export default async function elevationRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole } = fastify;

  /**
   * POST /elevation/profile
   *
   * Samples a user-drawn LineString against the country-appropriate DEM
   * (3DEP US / HRDEM CA) and returns distance/elevation pairs for the §2
   * cross-section chart. Bbox is derived from the line's extent and padded by
   * ~1 cell on each side to avoid edge-interpolation gaps.
   */
  fastify.post(
    '/profile',
    { preHandler: [authenticate, fastify.requirePhase('P2'), resolveProjectRole] },
    async (req): Promise<{ data: ElevationProfileResponse; meta: undefined; error: null }> => {
      const parsed = ElevationProfileRequest.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid elevation profile request', parsed.error.issues);
      }
      const { projectId, geometry, sampleCount = 128 } = parsed.data;

      const [project] = await db<{ country: string | null }[]>`
        SELECT country FROM projects WHERE id = ${projectId}
      `;
      const country = (project?.country === 'CA' ? 'CA' : 'US') as 'US' | 'CA';

      const coords = geometry.coordinates;
      let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
      for (const [lng, lat] of coords) {
        if (lng < minLon) minLon = lng;
        if (lng > maxLon) maxLon = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      // Pad the bbox a touch so the endpoints aren't clipped by the reader.
      const latPad = Math.max((maxLat - minLat) * 0.05, 1e-4);
      const lonPad = Math.max((maxLon - minLon) * 0.05, 1e-4);
      const bbox: [number, number, number, number] = [
        minLon - lonPad,
        minLat - latPad,
        maxLon + lonPad,
        maxLat + latPad,
      ];

      const grid = await readElevationGrid(bbox, country);

      // Cumulative distance along the line — great-circle approx. on a plane is
      // fine at parcel scale; we use the haversine-lite lat-scaled metre ratio.
      const cumDist: number[] = [0];
      for (let i = 1; i < coords.length; i++) {
        const [lng1, lat1] = coords[i - 1]!;
        const [lng2, lat2] = coords[i]!;
        const latMid = (lat1 + lat2) / 2;
        const mPerDegLat = 111320;
        const mPerDegLon = 111320 * Math.cos((latMid * Math.PI) / 180);
        const dx = (lng2 - lng1) * mPerDegLon;
        const dy = (lat2 - lat1) * mPerDegLat;
        cumDist.push(cumDist[i - 1]! + Math.sqrt(dx * dx + dy * dy));
      }
      const totalDistanceM = cumDist[cumDist.length - 1]!;

      const samples: ElevationProfileResponse['samples'] = [];
      const nodata = grid.noDataValue;
      for (let i = 0; i < sampleCount; i++) {
        const t = sampleCount === 1 ? 0 : i / (sampleCount - 1);
        const targetDist = t * totalDistanceM;
        let segIdx = 0;
        while (segIdx < cumDist.length - 2 && cumDist[segIdx + 1]! < targetDist) segIdx++;
        const segStart = cumDist[segIdx]!;
        const segEnd = cumDist[segIdx + 1]!;
        const segT = segEnd === segStart ? 0 : (targetDist - segStart) / (segEnd - segStart);
        const [lng1, lat1] = coords[segIdx]!;
        const [lng2, lat2] = coords[segIdx + 1]!;
        const lng = lng1 + (lng2 - lng1) * segT;
        const lat = lat1 + (lat2 - lat1) * segT;

        // Map (lng, lat) to grid (col, row) via linear bbox interpolation.
        const [bLon0, bLat0, bLon1, bLat1] = grid.bbox;
        const colF = ((lng - bLon0) / (bLon1 - bLon0)) * (grid.width - 1);
        // Raster rows increase top-to-bottom; lat decreases.
        const rowF = ((bLat1 - lat) / (bLat1 - bLat0)) * (grid.height - 1);
        const elevationM = bilinear(grid.data, grid.width, grid.height, colF, rowF, nodata);

        samples.push({ distanceM: targetDist, elevationM, lng, lat });
      }

      let min = Infinity, max = -Infinity, sum = 0, count = 0;
      for (const s of samples) {
        if (s.elevationM === null || !isFinite(s.elevationM)) continue;
        if (s.elevationM < min) min = s.elevationM;
        if (s.elevationM > max) max = s.elevationM;
        sum += s.elevationM;
        count++;
      }
      const minM = count > 0 ? min : null;
      const maxM = count > 0 ? max : null;
      const meanM = count > 0 ? sum / count : null;
      const reliefM = minM !== null && maxM !== null ? maxM - minM : null;

      return {
        data: {
          projectId,
          totalDistanceM,
          minM,
          maxM,
          meanM,
          reliefM,
          samples,
          sourceApi: grid.sourceApi,
          confidence: grid.confidence,
        },
        meta: undefined,
        error: null,
      };
    },
  );



  /**
   * GET /elevation/nrcan-hrdem?minLon=&minLat=&maxLon=&maxLat=
   *
   * Public endpoint (no auth required) — called by the frontend layer fetcher.
   * Returns processed raster tile data with NAVD88-adjusted elevations.
   */
  fastify.get<{ Querystring: z.infer<typeof BboxQuerySchema> }>(
    '/nrcan-hrdem',
    async (req, reply) => {
      const parsed = BboxQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid bounding box', parsed.error.issues);
      }

      const { minLon, minLat, maxLon, maxLat } = parsed.data;

      // Validate bbox is reasonable (< ~50km span to prevent abuse)
      const latSpanDeg = maxLat - minLat;
      const lonSpanDeg = maxLon - minLon;
      if (latSpanDeg <= 0 || lonSpanDeg <= 0) {
        throw new ValidationError('Bounding box must have positive extent');
      }
      if (latSpanDeg > 0.5 || lonSpanDeg > 0.5) {
        throw new ValidationError('Bounding box too large (max ~50km)');
      }

      let grid;
      try {
        grid = await readElevationGrid([minLon, minLat, maxLon, maxLat], 'CA');
      } catch {
        return reply.send({
          data: {
            fetch_status: 'unavailable' as const,
            confidence: 'low' as const,
            source_api: 'NRCan HRDEM (STAC)',
            attribution: 'Natural Resources Canada',
            summary: null,
            raster_tile: null,
            message: 'No HRDEM coverage found for this bounding box',
          },
          error: null,
        });
      }

      // Compute statistics from the grid
      let min = Infinity, max = -Infinity, sum = 0, validCount = 0;
      for (let i = 0; i < grid.data.length; i++) {
        const v = grid.data[i]!;
        if (v === grid.noDataValue || v < -1000) continue;
        if (v < min) min = v;
        if (v > max) max = v;
        sum += v;
        validCount++;
      }

      if (validCount === 0) {
        return reply.send({
          data: {
            fetch_status: 'failed' as const,
            confidence: 'low' as const,
            source_api: 'NRCan HRDEM (STAC)',
            attribution: 'Natural Resources Canada',
            summary: null,
            raster_tile: null,
            message: 'COG contained no valid elevation data for this bbox',
          },
          error: null,
        });
      }

      const mean = sum / validCount;

      // Slope & aspect from the raster grid
      let slopeSum = 0, slopeMax = 0, slopeCount = 0;
      const aspectBins: Record<string, number> = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };

      for (let row = 1; row < grid.height - 1; row++) {
        for (let col = 1; col < grid.width - 1; col++) {
          const idx = row * grid.width + col;
          const z = grid.data[idx]!;
          if (z === grid.noDataValue || z < -1000) continue;

          const zL = grid.data[idx - 1]!;
          const zR = grid.data[idx + 1]!;
          const zU = grid.data[idx - grid.width]!;
          const zD = grid.data[idx + grid.width]!;
          if (zL === grid.noDataValue || zR === grid.noDataValue || zU === grid.noDataValue || zD === grid.noDataValue) continue;
          if (zL < -1000 || zR < -1000 || zU < -1000 || zD < -1000) continue;

          const dzdx = (zR - zL) / (2 * grid.cellSizeX);
          const dzdy = (zD - zU) / (2 * grid.cellSizeY);
          const slopeDeg = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI);

          slopeSum += slopeDeg;
          if (slopeDeg > slopeMax) slopeMax = slopeDeg;
          slopeCount++;

          const aspectRad = Math.atan2(-dzdx, dzdy);
          const aspectDeg = ((aspectRad * 180) / Math.PI + 360) % 360;
          const bin = aspectDeg < 22.5 ? 'N' : aspectDeg < 67.5 ? 'NE' : aspectDeg < 112.5 ? 'E'
            : aspectDeg < 157.5 ? 'SE' : aspectDeg < 202.5 ? 'S' : aspectDeg < 247.5 ? 'SW'
            : aspectDeg < 292.5 ? 'W' : aspectDeg < 337.5 ? 'NW' : 'N';
          aspectBins[bin]!++;
        }
      }

      const meanSlope = slopeCount > 0 ? slopeSum / slopeCount : 0;
      const predominantAspect = slopeCount > 0
        ? Object.entries(aspectBins).sort((a, b) => b[1] - a[1])[0]![0]
        : 'S';

      const isLidar = grid.confidence === 'high';

      return reply.send({
        data: {
          fetch_status: 'complete' as const,
          confidence: grid.confidence,
          source_api: isLidar ? 'NRCan HRDEM Lidar DTM (1m)' : 'NRCan HRDEM CDEM (30m)',
          attribution: 'Natural Resources Canada, Open Government Licence',
          data_date: new Date().toISOString().split('T')[0],
          datum: 'NAVD88',
          datum_offset_applied: -0.40, // approximate, actual applied in reader
          original_datum: 'CGVD2013',
          raster_url: null,
          summary: {
            min_elevation_m: Math.round(min),
            max_elevation_m: Math.round(max),
            mean_elevation_m: Math.round(mean),
            mean_slope_deg: +meanSlope.toFixed(1),
            max_slope_deg: +Math.min(slopeMax, 90).toFixed(1),
            predominant_aspect: predominantAspect,
          },
          raster_tile: {
            width: grid.width,
            height: grid.height,
            bbox: [minLon, minLat, maxLon, maxLat],
            resolution_m: grid.resolution_m,
            noDataValue: grid.noDataValue,
            data: Array.from(grid.data),
          },
        },
        error: null,
      });
    },
  );
}

function bilinear(
  data: Float32Array,
  width: number,
  height: number,
  colF: number,
  rowF: number,
  nodata: number,
): number | null {
  if (colF < 0 || colF > width - 1 || rowF < 0 || rowF > height - 1) return null;
  const c0 = Math.floor(colF);
  const r0 = Math.floor(rowF);
  const c1 = Math.min(c0 + 1, width - 1);
  const r1 = Math.min(r0 + 1, height - 1);
  const fx = colF - c0;
  const fy = rowF - r0;
  const v00 = data[r0 * width + c0]!;
  const v10 = data[r0 * width + c1]!;
  const v01 = data[r1 * width + c0]!;
  const v11 = data[r1 * width + c1]!;
  const valid = (v: number) => v !== nodata && v > -1000 && isFinite(v);
  if (!valid(v00) || !valid(v10) || !valid(v01) || !valid(v11)) return null;
  const top = v00 * (1 - fx) + v10 * fx;
  const bot = v01 * (1 - fx) + v11 * fx;
  return top * (1 - fy) + bot * fy;
}
