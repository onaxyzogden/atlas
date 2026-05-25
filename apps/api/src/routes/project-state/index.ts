import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UpsertProjectStateInput, ProjectStateBlob, toCamelCase } from '@ogden/shared';

/**
 * Generic versioned-blob sync transport (Phase 2 of the durable P0-1 fix —
 * Full syncService Coverage). One opaque row per (project, storeKey) for
 * every store classified `versioned-blob` in
 * apps/web/src/lib/syncManifest.ts.
 *
 * Conflict model — stale-write reject + surface: the PUT does
 * INSERT … ON CONFLICT DO UPDATE … WHERE the stored rev <= the client's
 * baseRev. A stale write affects 0 rows; the route then reads the
 * authoritative row and returns 409 {serverRev, serverPayload} so the
 * client surfaces the conflict instead of silently clobbering. The 409 is
 * sent as the explicit `{ data, error }` envelope (not thrown) so the
 * authoritative `details` actually reaches the client — the global error
 * handler's default serializer would drop `details`.
 *
 * Geometry-bearing design elements never travel here — they stay on the
 * `design_features` typed path (the syncManifest coverage guard enforces
 * the `typed-design-feature` classification, so the blob path cannot
 * double-write that surface).
 */

const ParamsProjectId = z.object({ projectId: z.string().uuid() });
const ParamsProjectIdStoreKey = z.object({
  projectId: z.string().uuid(),
  storeKey: z.string().min(1).max(128),
});

function parseRow(row: Record<string, unknown>) {
  const updatedAt = row['updated_at'];
  // `rev` is BIGINT; postgres.js returns it as a string to avoid precision
  // loss. The wire contract (ProjectStateBlob) is a JS number, so coerce here
  // at the single server-row → wire-shape boundary.
  const rev = row['rev'];
  return ProjectStateBlob.parse(
    toCamelCase({
      ...row,
      rev: typeof rev === 'string' ? Number(rev) : rev,
      updated_at: updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
    }),
  );
}

export default async function projectStateRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /project/:projectId — all blobs for the project (any role)
  fastify.get<{ Params: { projectId: string } }>(
    '/project/:projectId',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const { projectId } = ParamsProjectId.parse(req.params);
      const rows = await db`
        SELECT project_id, store_key, payload, schema_version,
               rev, updated_by, updated_at
        FROM project_state_blobs
        WHERE project_id = ${projectId}
        ORDER BY store_key
      `;
      return {
        data: rows.map(parseRow),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // GET /project/:projectId/:storeKey — one blob (any role)
  fastify.get<{ Params: { projectId: string; storeKey: string } }>(
    '/project/:projectId/:storeKey',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req, reply) => {
      const { projectId, storeKey } = ParamsProjectIdStoreKey.parse(req.params);
      const [row] = await db`
        SELECT project_id, store_key, payload, schema_version,
               rev, updated_by, updated_at
        FROM project_state_blobs
        WHERE project_id = ${projectId} AND store_key = ${storeKey}
      `;
      if (!row) {
        reply.code(404);
        return { data: null, meta: undefined, error: { code: 'NOT_FOUND', message: 'No state for store' } };
      }
      return { data: parseRow(row), meta: undefined, error: null };
    },
  );

  // PUT /project/:projectId/:storeKey — upsert one blob (owner + designer)
  fastify.put<{ Params: { projectId: string; storeKey: string } }>(
    '/project/:projectId/:storeKey',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer')] },
    async (req, reply) => {
      const { projectId, storeKey } = ParamsProjectIdStoreKey.parse(req.params);
      const body = UpsertProjectStateInput.parse(req.body);

      // Fresh insert gets rev = DEFAULT 1. On an existing row we only bump
      // when the client's baseRev is not behind the stored rev; a stale
      // write matches no row (0 rows returned) and is surfaced as 409.
      // `db.json` serializes the payload once — pre-stringifying then casting
      // `::jsonb` double-encodes it into a jsonb string scalar.
      const [row] = await db`
        INSERT INTO project_state_blobs (
          project_id, store_key, payload, schema_version, updated_by
        ) VALUES (
          ${projectId}, ${storeKey}, ${db.json(
            (body.payload ?? null) as Parameters<typeof db.json>[0],
          )}::jsonb,
          ${body.schemaVersion}, ${req.userId}
        )
        ON CONFLICT (project_id, store_key) DO UPDATE SET
          payload        = EXCLUDED.payload,
          schema_version = EXCLUDED.schema_version,
          rev            = project_state_blobs.rev + 1,
          updated_by     = EXCLUDED.updated_by,
          updated_at     = now()
        WHERE project_state_blobs.rev <= ${body.baseRev}
        RETURNING project_id, store_key, payload, schema_version,
                  rev, updated_by, updated_at
      `;

      if (!row) {
        // Stale write — read the authoritative row and surface the conflict.
        const [current] = await db`
          SELECT project_id, store_key, payload, schema_version,
                 rev, updated_by, updated_at
          FROM project_state_blobs
          WHERE project_id = ${projectId} AND store_key = ${storeKey}
        `;
        const serverState = current ? parseRow(current) : null;
        reply.code(409);
        return {
          data: null,
          meta: undefined,
          error: {
            code: 'CONFLICT',
            message: `Stale write for ${storeKey}: server rev is ahead of baseRev ${body.baseRev}`,
            details: {
              serverRev: serverState?.rev ?? null,
              serverPayload: serverState?.payload ?? null,
            },
          },
        };
      }

      return { data: parseRow(row), meta: undefined, error: null };
    },
  );
}
