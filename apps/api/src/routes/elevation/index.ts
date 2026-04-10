/**
 * Elevation proxy — NRCan HRDEM Cloud Optimized GeoTIFF reader.
 *
 * Delegates to ElevationGridReader for raster acquisition, then computes
 * slope/aspect statistics and returns the processed tile to the frontend.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
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
