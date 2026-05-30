import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  UpsertSyncedRecordInput,
  SyncedRecord,
  toCamelCase,
  type ConflictResolution,
} from '@ogden/shared';

/**
 * Typed per-record sync transport for the Act stores (ADR 7 Phase 1 —
 * wiki/decisions/2026-05-29-atlas-spec-act-map-first-surface.md). One typed row
 * per (project, store_key, record_id) in `synced_records`, so an individual
 * FieldAction / Observe feed event / Observe data point / Observe cycle is
 * first-class on the wire — each with its own monotonic `rev`. This replaces
 * the opaque per-(project, store_key) versioned-blob transport (project-state)
 * for the four Act stores only.
 *
 * Conflict model — identical to project-state (stale-write reject + surface):
 * the PUT does INSERT … ON CONFLICT DO UPDATE … WHERE the stored rev <= the
 * client's baseRev. A stale write affects 0 rows; the route then reads the
 * authoritative row and returns 409 {serverRev, serverPayload} so the client
 * surfaces the conflict instead of silently clobbering. The 409 is sent as the
 * explicit `{ data, error }` envelope (not thrown) so `details` actually
 * reaches the client — the global error handler's serializer would drop it.
 *
 * The observed_at / source_type / cycle_id / task_type columns are
 * denormalised hints (best-effort copies of fields already inside `payload`)
 * so the queue can tier (Phase 2) and the server can index without parsing the
 * blob. A store whose records lack a field sends null.
 */

const ParamsProjectIdStoreKey = z.object({
  projectId: z.string().uuid(),
  storeKey: z.string().min(1).max(128),
});
const ParamsProjectIdStoreKeyRecordId = z.object({
  projectId: z.string().uuid(),
  storeKey: z.string().min(1).max(128),
  recordId: z.string().min(1).max(256),
});

function parseRow(row: Record<string, unknown>) {
  // `rev` is BIGINT; postgres.js returns it as a string to avoid precision
  // loss. The wire contract (SyncedRecord) is a JS number, so coerce here at
  // the single server-row → wire-shape boundary. `observed_at` / `updated_at`
  // come back as Date (or null for the nullable observed_at) — normalise to
  // ISO strings for the datetime() contract.
  const rev = row['rev'];
  const observedAt = row['observed_at'];
  const updatedAt = row['updated_at'];
  return SyncedRecord.parse(
    toCamelCase({
      ...row,
      rev: typeof rev === 'string' ? Number(rev) : rev,
      observed_at: observedAt instanceof Date ? observedAt.toISOString() : observedAt,
      updated_at: updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
    }),
  );
}

export default async function actRecordRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /project/:projectId/:storeKey — all records for one store (any role)
  fastify.get<{ Params: { projectId: string; storeKey: string } }>(
    '/project/:projectId/:storeKey',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const { projectId, storeKey } = ParamsProjectIdStoreKey.parse(req.params);
      const rows = await db`
        SELECT project_id, store_key, record_id, payload, schema_version,
               rev, observed_at, source_type, cycle_id, task_type,
               updated_by, updated_at
        FROM synced_records
        WHERE project_id = ${projectId} AND store_key = ${storeKey}
        ORDER BY record_id
      `;
      return {
        data: rows.map(parseRow),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // PUT /project/:projectId/:storeKey/:recordId — upsert one record (owner + designer)
  fastify.put<{ Params: { projectId: string; storeKey: string; recordId: string } }>(
    '/project/:projectId/:storeKey/:recordId',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer')] },
    async (req, reply) => {
      const { projectId, storeKey, recordId } = ParamsProjectIdStoreKeyRecordId.parse(
        req.params,
      );
      const body = UpsertSyncedRecordInput.parse(req.body);

      // Fresh insert gets rev = DEFAULT 1. On an existing row we only bump when
      // the client's baseRev is not behind the stored rev; a stale write
      // matches no row (0 rows returned) and is surfaced as 409. `db.json`
      // serializes the payload once — pre-stringifying then casting `::jsonb`
      // double-encodes it into a jsonb string scalar.
      const [row] = await db`
        INSERT INTO synced_records (
          project_id, store_key, record_id, payload, schema_version,
          observed_at, source_type, cycle_id, task_type, updated_by
        ) VALUES (
          ${projectId}, ${storeKey}, ${recordId}, ${db.json(
            (body.payload ?? null) as Parameters<typeof db.json>[0],
          )}::jsonb, ${body.schemaVersion},
          ${body.observedAt ?? null}, ${body.sourceType ?? null},
          ${body.cycleId ?? null}, ${body.taskType ?? null}, ${req.userId}
        )
        ON CONFLICT (project_id, store_key, record_id) DO UPDATE SET
          payload        = EXCLUDED.payload,
          schema_version = EXCLUDED.schema_version,
          observed_at    = EXCLUDED.observed_at,
          source_type    = EXCLUDED.source_type,
          cycle_id       = EXCLUDED.cycle_id,
          task_type      = EXCLUDED.task_type,
          rev            = synced_records.rev + 1,
          updated_by     = EXCLUDED.updated_by,
          updated_at     = now()
        WHERE synced_records.rev <= ${body.baseRev}
        RETURNING project_id, store_key, record_id, payload, schema_version,
                  rev, observed_at, source_type, cycle_id, task_type,
                  updated_by, updated_at
      `;

      if (!row) {
        // Stale write — read the authoritative row and surface the conflict.
        const [current] = await db`
          SELECT project_id, store_key, record_id, payload, schema_version,
                 rev, observed_at, source_type, cycle_id, task_type,
                 updated_by, updated_at
          FROM synced_records
          WHERE project_id = ${projectId} AND store_key = ${storeKey}
            AND record_id = ${recordId}
        `;
        const serverState = current ? parseRow(current) : null;

        // Resolution under ratified LWW (ADR 12 §6.1), keyed on observed_at:
        // the server wins a tie. We can only AUTO-resolve when BOTH timestamps
        // are present and parseable AND the local edit is the loser
        // (server >= local). Otherwise safety cannot be proven, so we escalate
        // — never auto-applied; the client retains local and surfaces it.
        const localObservedMs = body.observedAt ? Date.parse(body.observedAt) : NaN;
        const serverObservedMs = serverState?.observedAt
          ? Date.parse(serverState.observedAt)
          : NaN;
        const resolution: ConflictResolution =
          !Number.isNaN(localObservedMs) &&
          !Number.isNaN(serverObservedMs) &&
          localObservedMs <= serverObservedMs
            ? 'auto_resolved'
            : 'escalated';

        // Durable conflict log — every 409 writes one row (audit trail + the
        // data source for the Phase 4 Keep-mine/Keep-server surface).
        const [logRow] = await db`
          INSERT INTO sync_log (
            project_id, store_key, record_id,
            local_payload, server_payload, local_rev, server_rev,
            observed_at_local, observed_at_server, resolution_status, detected_by
          ) VALUES (
            ${projectId}, ${storeKey}, ${recordId},
            ${db.json((body.payload ?? null) as Parameters<typeof db.json>[0])}::jsonb,
            ${db.json((serverState?.payload ?? null) as Parameters<typeof db.json>[0])}::jsonb,
            ${body.baseRev}, ${serverState?.rev ?? null},
            ${body.observedAt ?? null}, ${serverState?.observedAt ?? null},
            ${resolution}, ${req.userId}
          )
          RETURNING id
        `;
        const syncLogId = (logRow?.['id'] as string | undefined) ?? null;

        // Escalation queue — only when we could NOT auto-resolve. UPSERT so a
        // re-escalation of a still-open record updates the pointer rather than
        // stacking duplicates (resolved rows are deleted by Phase 4).
        if (resolution === 'escalated') {
          await db`
            INSERT INTO failed_records (sync_log_id, project_id, store_key, record_id)
            VALUES (${syncLogId}, ${projectId}, ${storeKey}, ${recordId})
            ON CONFLICT (project_id, store_key, record_id) DO UPDATE SET
              sync_log_id = EXCLUDED.sync_log_id,
              created_at  = now()
          `;
        }

        reply.code(409);
        return {
          data: null,
          meta: undefined,
          error: {
            code: 'CONFLICT',
            message: `Stale write for ${storeKey}/${recordId}: server rev is ahead of baseRev ${body.baseRev}`,
            details: {
              serverRev: serverState?.rev ?? null,
              serverPayload: serverState?.payload ?? null,
              resolution,
              syncLogId,
            },
          },
        };
      }

      return { data: parseRow(row), meta: undefined, error: null };
    },
  );
}
