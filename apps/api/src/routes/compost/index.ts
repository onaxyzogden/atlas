/**
 * Compost routes — composer for the thermophilic-composting vertical.
 *
 * Registered at prefix /api/v1/compost in src/app.ts. A distinct lightweight
 * vertical: it reuses the JWT auth + organizations/RBAC + time-series plumbing
 * but NOT the land-use project taxonomy (no project rows, no resolveProjectRole,
 * no objective catalogue). Authorization runs through org membership — see
 * lib/compostAccess.ts.
 *
 * Route map under /api/v1/compost/:
 *   - sites/                        — CompostSite (POST/GET list ?orgId=)
 *   - sites/:siteId                 — CompostSite by id (GET/PATCH/DELETE)
 *   - sites/:siteId/piles           — CompostPile create + list
 *   - piles/:pileId                 — CompostPile by id (GET/PATCH/DELETE)
 *   - piles/:pileId/readings        — CompostReading create + list (the curve)
 *   - readings/:readingId           — CompostReading by id (GET/PATCH/DELETE)
 *
 * Device-token sensor ingestion (POST /ingest) lands in Phase 4 as a separate,
 * isolated plugin — it is deliberately NOT registered here.
 */

import type { FastifyInstance } from 'fastify';
import compostSiteRoutes from './sites.js';
import compostPileRoutes from './piles.js';
import compostReadingRoutes from './readings.js';

export default async function compostRoutes(fastify: FastifyInstance) {
  await fastify.register(compostSiteRoutes);
  await fastify.register(compostPileRoutes);
  await fastify.register(compostReadingRoutes);
}
