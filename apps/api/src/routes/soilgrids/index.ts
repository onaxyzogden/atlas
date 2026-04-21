/**
 * SoilGrids routes — self-hosted ISRIC SoilGrids v2.0 COGs.
 *
 * Attribution: ISRIC SoilGrids v2.0 — CC BY 4.0 (permissive; no auth gate).
 *
 *   GET /api/v1/soilgrids/query?lat=&lng=
 *     Point-query across all manifest properties. Returns one reading per
 *     property (value + unit).
 *
 *   GET /api/v1/soilgrids/catalog
 *     Manifest summary for the frontend property picker: property key, label,
 *     unit, value range, and color-ramp id.
 *
 *   GET /api/v1/soilgrids/raster/:property
 *     Stream the COG bytes for map-side visualization with HTTP Range support
 *     (geotiff.js byte-ranges the header + strips). Manifest lookup is the
 *     only trust boundary — no user input reaches the filesystem path.
 */

import { promises as fsp, createReadStream } from 'node:fs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '../../lib/errors.js';
import { getSoilGridsService } from '../../services/soilgrids/SoilGridsRasterService.js';

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export default async function soilgridsRoutes(fastify: FastifyInstance) {

  fastify.get<{ Querystring: z.infer<typeof QuerySchema> }>(
    '/query',
    async (req, reply) => {
      const parsed = QuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid lat/lng query parameters', parsed.error.issues);
      }

      const { lat, lng } = parsed.data;

      const service = getSoilGridsService();
      if (!service || !service.isEnabled()) {
        return reply.send({
          data: {
            fetch_status: 'unavailable' as const,
            confidence: 'low' as const,
            source_api: 'ISRIC SoilGrids v2.0 (self-hosted)',
            attribution: 'ISRIC SoilGrids v2.0 — CC BY 4.0',
            summary: null,
            message: 'SoilGrids rasters not loaded — see apps/api/data/soilgrids/README.md',
          },
          error: null,
        });
      }

      try {
        const result = await service.query(lat, lng);
        return reply.send({ data: result, error: null });
      } catch (err) {
        fastify.log.error({ err, lat, lng }, 'SoilGrids query failed');
        return reply.send({
          data: {
            fetch_status: 'failed' as const,
            confidence: 'low' as const,
            source_api: 'ISRIC SoilGrids v2.0 (self-hosted)',
            attribution: 'ISRIC SoilGrids v2.0 — CC BY 4.0',
            summary: null,
            message: 'SoilGrids raster query failed',
          },
          error: null,
        });
      }
    },
  );

  // ─── Catalog — manifest summary for the map-side property picker ──────────

  fastify.get('/catalog', async (_req, reply) => {
    const service = getSoilGridsService();
    const entries = service ? service.getManifestEntries() : [];
    return reply.send({
      data: {
        entries,
        count: entries.length,
        attribution: service?.getAttribution() ?? 'ISRIC SoilGrids v2.0 — CC BY 4.0',
      },
      error: null,
    });
  });

  // ─── Raster bytes with HTTP Range support ─────────────────────────────────
  //
  // SoilGrids is CC BY 4.0 (permissive), so no JWT gate — unlike GAEZ.

  fastify.get<{ Params: { property: string } }>(
    '/raster/:property',
    async (req, reply) => {
      const { property } = req.params;

      const service = getSoilGridsService();
      if (!service || !service.isEnabled()) {
        return reply.code(404).send({
          data: null,
          error: { code: 'NOT_FOUND', message: 'SoilGrids service disabled on this deployment' },
        });
      }

      const filePath = service.resolveLocalFilePath(property);
      if (!filePath) {
        return reply.code(404).send({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Raster not found for property' },
        });
      }

      let stat;
      try {
        stat = await fsp.stat(filePath);
      } catch {
        return reply.code(404).send({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Raster file missing on disk' },
        });
      }

      const total = stat.size;
      const range = req.headers.range;

      reply.header('Accept-Ranges', 'bytes');
      reply.header('Content-Type', 'image/tiff');
      reply.header('Cache-Control', 'public, max-age=3600');

      if (!range) {
        reply.header('Content-Length', String(total));
        return reply.send(createReadStream(filePath));
      }

      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!match) {
        reply.header('Content-Range', `bytes */${total}`);
        return reply.code(416).send();
      }
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : total - 1;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total || end >= total) {
        reply.header('Content-Range', `bytes */${total}`);
        return reply.code(416).send();
      }

      reply.code(206);
      reply.header('Content-Range', `bytes ${start}-${end}/${total}`);
      reply.header('Content-Length', String(end - start + 1));
      return reply.send(createReadStream(filePath, { start, end }));
    },
  );
}
