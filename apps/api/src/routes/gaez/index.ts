/**
 * GAEZ v4 point-query route — self-hosted FAO GAEZ v4 Theme 4 COGs.
 *
 * GET /api/v1/gaez/query?lat=&lng=
 *
 * Public endpoint (no auth) — matches the elevation proxy pattern.
 * Returns per-crop suitability class + attainable yield + derived summary.
 *
 * Attribution: FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '../../lib/errors.js';
import { getGaezService } from '../../services/gaez/GaezRasterService.js';

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export default async function gaezRoutes(fastify: FastifyInstance) {

  fastify.get<{ Querystring: z.infer<typeof QuerySchema> }>(
    '/query',
    async (req, reply) => {
      const parsed = QuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid lat/lng query parameters', parsed.error.issues);
      }

      const { lat, lng } = parsed.data;

      const service = getGaezService();
      if (!service || !service.isEnabled()) {
        return reply.send({
          data: {
            fetch_status: 'unavailable' as const,
            confidence: 'low' as const,
            source_api: 'FAO GAEZ v4 (self-hosted)',
            attribution: 'FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO',
            summary: null,
            message: 'GAEZ rasters not loaded — run pnpm --filter @ogden/api run ingest:gaez',
          },
          error: null,
        });
      }

      try {
        const result = await service.query(lat, lng);
        return reply.send({ data: result, error: null });
      } catch (err) {
        fastify.log.error({ err, lat, lng }, 'GAEZ query failed');
        return reply.send({
          data: {
            fetch_status: 'failed' as const,
            confidence: 'low' as const,
            source_api: 'FAO GAEZ v4 (self-hosted)',
            attribution: 'FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO',
            summary: null,
            message: 'GAEZ raster query failed',
          },
          error: null,
        });
      }
    },
  );
}
