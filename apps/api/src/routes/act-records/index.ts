import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  UpsertSyncedRecordInput,
  SyncedRecord,
  ConflictListItem,
  ResolveConflictInput,
  ResolveConflictResult,
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
const ParamsProjectIdConflicts = z.object({
  projectId: z.string().uuid(),
});
const ParamsResolveConflict = z.object({
  projectId: z.string().uuid(),
  syncLogId: z.string().uuid(),
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

/**
 * One escalated conflict row for the Phase 4 surface — a `failed_records`
 * escalation joined to the `sync_log` row that captured both payloads.
 * postgres.js returns jsonb columns already parsed, BIGINT revs as strings, and
 * timestamps as Date — normalise to the ConflictListItem wire contract here.
 */
function parseConflictRow(row: Record<string, unknown>): ConflictListItem {
  const num = (v: unknown): number | null =>
    v == null ? null : typeof v === 'string' ? Number(v) : (v as number);
  const iso = (v: unknown): string | null =>
    v instanceof Date ? v.toISOString() : (v as string | null);
  return ConflictListItem.parse({
    syncLogId: row['sync_log_id'],
    failedRecordId: row['failed_record_id'],
    storeKey: row['store_key'],
    recordId: row['record_id'],
    localPayload: row['local_payload'],
    serverPayload: row['server_payload'],
    localRev: num(row['local_rev']),
    serverRev: num(row['server_rev']),
    observedAtLocal: iso(row['observed_at_local']),
    observedAtServer: iso(row['observed_at_server']),
    detectedAt: iso(row['detected_at']) as string,
  });
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

  // GET /project/:projectId/conflicts — every open (escalated) conflict for the
  // project, for the Phase 4 Keep-mine/Keep-server surface. Static `conflicts`
  // out-prioritises the `:storeKey` param route in find-my-way, and no Act
  // store is named "conflicts", so there is no collision. Any role may read.
  fastify.get<{ Params: { projectId: string } }>(
    '/project/:projectId/conflicts',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const { projectId } = ParamsProjectIdConflicts.parse(req.params);
      const rows = await db`
        SELECT
          sl.id                 AS sync_log_id,
          fr.id                 AS failed_record_id,
          sl.store_key          AS store_key,
          sl.record_id          AS record_id,
          sl.local_payload      AS local_payload,
          sl.server_payload     AS server_payload,
          sl.local_rev          AS local_rev,
          sl.server_rev         AS server_rev,
          sl.observed_at_local  AS observed_at_local,
          sl.observed_at_server AS observed_at_server,
          sl.detected_at        AS detected_at
        FROM failed_records fr
        JOIN sync_log sl ON sl.id = fr.sync_log_id
        WHERE fr.project_id = ${projectId}
          AND sl.resolution_status = 'escalated'
        ORDER BY sl.detected_at DESC
      `;
      return { data: rows.map(parseConflictRow), meta: { total: rows.length }, error: null };
    },
  );

  // POST /project/:projectId/conflicts/:syncLogId/resolve — close an escalated
  // conflict by the steward's choice (owner + designer only). keep_server is a
  // no-op write (the server row already won the 409); keep_mine is the one
  // sanctioned clobber of a newer server rev — the local payload is force-
  // written as a NEW rev, durably attributed via resolved_by. Idempotent: an
  // already-resolved conflict returns the current authoritative state without
  // re-applying keep_mine (never double-bumps). Wrapped in a transaction so the
  // record write, the sync_log close, and the failed_records delete are atomic.
  fastify.post<{ Params: { projectId: string; syncLogId: string } }>(
    '/project/:projectId/conflicts/:syncLogId/resolve',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer')] },
    async (req, reply) => {
      const { projectId, syncLogId } = ParamsResolveConflict.parse(req.params);
      const { choice } = ResolveConflictInput.parse(req.body);
      const userId = req.userId;

      // db.begin's TransactionSql lacks a tagged-template call signature under
      // tsc (TS2349) — annotate (sql: any), the repo-wide convention for
      // db.begin callbacks. Runtime is the real, fully-typed tx client.
      const outcome = await db.begin(async (sql: any) => {
        const [log] = await sql`
          SELECT id, store_key, record_id, local_payload, observed_at_local,
                 resolution_status
          FROM sync_log
          WHERE id = ${syncLogId} AND project_id = ${projectId}
          FOR UPDATE
        `;
        if (!log) return { status: 'not_found' as const };

        const storeKey = log['store_key'] as string;
        const recordId = log['record_id'] as string;

        const readAuthoritative = async (): Promise<Record<string, unknown> | null> => {
          const [current] = await sql`
            SELECT project_id, store_key, record_id, payload, schema_version,
                   rev, observed_at, source_type, cycle_id, task_type,
                   updated_by, updated_at
            FROM synced_records
            WHERE project_id = ${projectId} AND store_key = ${storeKey}
              AND record_id = ${recordId}
          `;
          return current ?? null;
        };

        // Idempotent: a re-resolve returns current state, never re-applies.
        if (log['resolution_status'] === 'resolved') {
          return {
            status: 'ok' as const,
            storeKey,
            recordId,
            authoritative: await readAuthoritative(),
          };
        }

        let authoritative: Record<string, unknown> | null;
        if (choice === 'keep_mine') {
          // Sanctioned override: force-write the local payload at rev + 1.
          const [updated] = await sql`
            UPDATE synced_records SET
              payload     = ${sql.json(
                (log['local_payload'] ?? null) as Parameters<typeof sql.json>[0],
              )}::jsonb,
              rev         = rev + 1,
              observed_at = ${(log['observed_at_local'] as Date | null) ?? null},
              updated_by  = ${userId},
              updated_at  = now()
            WHERE project_id = ${projectId} AND store_key = ${storeKey}
              AND record_id = ${recordId}
            RETURNING project_id, store_key, record_id, payload, schema_version,
                      rev, observed_at, source_type, cycle_id, task_type,
                      updated_by, updated_at
          `;
          authoritative = updated ?? null;
        } else {
          // keep_server: the server row already won the 409; just re-read it.
          authoritative = await readAuthoritative();
        }

        await sql`
          UPDATE sync_log SET
            resolution_status = 'resolved',
            resolved_at = now(),
            resolved_by = ${userId}
          WHERE id = ${syncLogId}
        `;
        await sql`DELETE FROM failed_records WHERE sync_log_id = ${syncLogId}`;

        return { status: 'ok' as const, storeKey, recordId, authoritative };
      });

      if (outcome.status === 'not_found') {
        reply.code(404);
        return {
          data: null,
          meta: undefined,
          error: {
            code: 'NOT_FOUND',
            message: `No conflict ${syncLogId} for project ${projectId}`,
          },
        };
      }
      if (!outcome.authoritative) {
        reply.code(409);
        return {
          data: null,
          meta: undefined,
          error: {
            code: 'AUTHORITATIVE_RECORD_MISSING',
            message: `Resolved conflict ${syncLogId} but no authoritative record for ${outcome.storeKey}/${outcome.recordId}`,
          },
        };
      }
      const parsed = parseRow(outcome.authoritative);
      return {
        data: ResolveConflictResult.parse({
          storeKey: outcome.storeKey,
          recordId: outcome.recordId,
          rev: parsed.rev,
          payload: parsed.payload,
          resolutionStatus: 'resolved',
        }),
        meta: undefined,
        error: null,
      };
    },
  );
}
