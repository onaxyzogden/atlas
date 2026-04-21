/**
 * GAEZ v4 routes — self-hosted FAO GAEZ v4 Theme 4 COGs.
 *
 * Public endpoints (no auth) — match the elevation proxy pattern.
 * Attribution: FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO.
 *
 *   GET /api/v1/gaez/query?lat=&lng=[&scenario=]
 *     Point-query across manifest entries. Sprint CD adds optional scenario
 *     filter (lowercase alphanumeric + underscore); omitting it preserves the
 *     pre-CD behavior of sampling every entry.
 *
 *   GET /api/v1/gaez/catalog[?scenario=]           (Sprint CB; Sprint CD filter)
 *     Manifest summary for the frontend crop picker.
 *
 *   GET /api/v1/gaez/raster/:scenario/:crop/:waterSupply/:inputLevel/:variable
 *     (Sprint CB; Sprint CD added :scenario as first path segment.)
 *     Stream the COG bytes for map-side visualization. Accept-Ranges: bytes,
 *     so geotiff.js can byte-range the header + relevant strips. Manifest
 *     lookup is the only trust boundary — no user input reaches the path.
 */

import { promises as fsp, createReadStream } from 'node:fs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '../../lib/errors.js';
import { getGaezService } from '../../services/gaez/GaezRasterService.js';

// Sprint CD — scenario identifiers are user-supplied path segments; constrain
// to lowercase alphanumerics + underscore so nothing traversal-shaped (/, .., \)
// can reach the manifest lookup. Length cap keeps log / URL growth bounded.
const SCENARIO_RE = /^[a-z0-9_]{1,64}$/;

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  scenario: z.string().regex(SCENARIO_RE).optional(),
});

const CatalogSchema = z.object({
  scenario: z.string().regex(SCENARIO_RE).optional(),
});

const VARIABLES = ['suitability', 'yield'] as const;
type Variable = (typeof VARIABLES)[number];

export default async function gaezRoutes(fastify: FastifyInstance) {

  fastify.get<{ Querystring: z.infer<typeof QuerySchema> }>(
    '/query',
    async (req, reply) => {
      const parsed = QuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid lat/lng query parameters', parsed.error.issues);
      }

      const { lat, lng, scenario } = parsed.data;

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
        const result = await service.query(lat, lng, scenario);
        return reply.send({ data: result, error: null });
      } catch (err) {
        fastify.log.error({ err, lat, lng, scenario }, 'GAEZ query failed');
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

  // ─── Sprint CB: catalog — manifest summary for the map-side crop picker ───

  fastify.get<{ Querystring: z.infer<typeof CatalogSchema> }>(
    '/catalog',
    async (req, reply) => {
      const parsed = CatalogSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid catalog query parameters', parsed.error.issues);
      }
      const { scenario } = parsed.data;
      const service = getGaezService();
      const entries = service ? service.getManifestEntries(scenario) : [];
      return reply.send({
        data: {
          entries,
          count: entries.length,
          attribution: service?.getAttribution() ?? 'FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO',
        },
        error: null,
      });
    },
  );

  // ─── Sprint CB: raster bytes with HTTP Range support ──────────────────────

  fastify.get<{
    Params: {
      scenario: string;
      crop: string;
      waterSupply: string;
      inputLevel: string;
      variable: string;
    };
  }>('/raster/:scenario/:crop/:waterSupply/:inputLevel/:variable', {
    // Sprint CC: FAO GAEZ v4 is CC BY-NC-SA 3.0 IGO. Gate raster streaming behind
    // JWT as defense-in-depth; the NC-license decision itself is tracked on
    // wiki/LAUNCH-CHECKLIST.md. /catalog (manifest digest) and /query
    // (single-pixel readings) remain public.
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const { scenario, crop, waterSupply, inputLevel, variable } = req.params;

    // Sprint CD — scenario is a user-supplied path segment; validate before it
    // reaches the manifest lookup. Rejects uppercase, dots, slashes, anything
    // that could escape the data dir or shape up as traversal.
    if (!SCENARIO_RE.test(scenario)) {
      return reply.code(400).send({
        data: null,
        error: { code: 'BAD_REQUEST', message: 'Invalid scenario identifier' },
      });
    }

    if (!VARIABLES.includes(variable as Variable)) {
      return reply.code(404).send({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Unknown variable (expected suitability|yield)' },
      });
    }

    const service = getGaezService();
    if (!service || !service.isEnabled()) {
      return reply.code(404).send({
        data: null,
        error: { code: 'NOT_FOUND', message: 'GAEZ service disabled on this deployment' },
      });
    }

    const filePath = service.resolveLocalFilePath(
      scenario,
      crop,
      waterSupply,
      inputLevel,
      variable as Variable,
    );
    if (!filePath) {
      return reply.code(404).send({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Raster not found for (crop, water, input, variable)' },
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
  });
}
