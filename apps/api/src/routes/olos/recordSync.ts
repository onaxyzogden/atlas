/**
 * OLOS record sync — shared machinery that gives the three olos record domains
 * (observations / proofs / verifications) full `rev`-based parity with the Act
 * typed-record transport (routes/act-records/index.ts), per Phase 3B of the
 * local-first hardening plan.
 *
 * Unlike Act records — which live as opaque blobs in `synced_records` — the
 * canonical olos data stays single-sourced in its own structured tables
 * (migration 043) with a `rev BIGINT` column added in migration 053. We do NOT
 * mirror rows into `synced_records`; instead these tables join the SAME wire
 * contract:
 *   - rev-gated PUT: an UPDATE bumps `rev` only WHERE the stored rev is not
 *     ahead of the client's baseRev. A stale write matches 0 rows → 409.
 *   - 409 surface: identical to act-records — a durable `sync_log` row + an
 *     escalated `failed_records` pointer keyed (project_id, store_key,
 *     record_id), and the `{serverRev, serverPayload, resolution, syncLogId}`
 *     envelope. olos conflicts ALWAYS escalate (the steward decides keep-mine /
 *     keep-server; never auto-clobbered) — there is no observed_at LWW tier for
 *     these domains, so safety can never be proven server-side.
 *   - real-time broadcast: `record_upserted` author-excluded, exactly like
 *     act-records (unconditional in-process — only clients with the
 *     SYNC_STATE_BLOBS flag subscribe and apply).
 *
 * The mappers, conflict-surface, broadcast, and keep-mine/read-authoritative
 * registry live here so each route file stays a thin CRUD shell and the resolve
 * route in index.ts can stay storeKey-generic.
 */

import type { FastifyInstance } from 'fastify';
import type { WsEvent, ConflictResolution } from '@ogden/shared';

/**
 * Client-facing persist names of the three olos record stores — the storeKeys
 * carried on the wire (sync_log.store_key, the broadcast payload, the conflict
 * labels). They MUST match the web stores' persist names so the coverage guard
 * and the Phase 4 conflict surface line up across client and server.
 */
export const OLOS_STORE_KEYS = {
  observation: 'ogden-olos-observation-records',
  proof: 'ogden-olos-proof-records',
  verification: 'ogden-olos-verification-records',
} as const;

/**
 * Wire schemaVersion for olos record payloads. Bumped only on a
 * backwards-incompatible payload reshape; the client descriptors (3B-3) declare
 * the same number so applyIncomingRecord's version-skew guard agrees.
 */
export const OLOS_SCHEMA_VERSION = 1;

// The postgres tagged-template client is painful to type precisely; the repo's
// established convention (see act-records db.begin callbacks) is to thread it as
// `any` and rely on the runtime client being fully typed. `Row` is one raw DB
// row, `MappedOlosRecord` one wire-shape record (always carrying id + rev).
type Sql = any;
type Row = Record<string, unknown>;
export type MappedOlosRecord = Record<string, unknown> & {
  id: string;
  rev: number;
};

/** Coerce a BIGINT `rev` (postgres.js returns it as a string to avoid precision
 *  loss) to the JS number the wire contract uses. */
function revNum(v: unknown): number {
  return typeof v === 'string' ? Number(v) : (v as number);
}

// ─── Per-store row mappers (raw DB row → wire shape, incl. rev) ───────────────

export function mapObservationRow(row: Row): MappedOlosRecord {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    objectiveId: row.objective_id as string,
    status: row.status as string,
    summary: row.summary as string,
    constraints: row.constraints as string,
    unknowns: row.unknowns as string,
    flags: (row.flags ?? []) as string[],
    evidenceRefs: (row.evidence_refs ?? []) as unknown[],
    locationGeometry: row.location_geojson ?? null,
    recordedBy: (row.recorded_by ?? null) as string | null,
    recordedAt: (row.recorded_at as Date).toISOString(),
    recommendedNextReview:
      row.recommended_next_review instanceof Date
        ? (row.recommended_next_review as Date).toISOString()
        : null,
    rev: revNum(row.rev),
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export function mapProofRow(row: Row): MappedOlosRecord {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    taskId: row.task_id as string,
    proofType: row.proof_type as string,
    fileUri: (row.file_uri ?? null) as string | null,
    note: (row.note ?? null) as string | null,
    measurementValue:
      row.measurement_value === null ? null : Number(row.measurement_value),
    measurementUnit: (row.measurement_unit ?? null) as string | null,
    geotag: (row.geotag ?? null) as unknown,
    details: (row.details ?? null) as unknown,
    capturedAt: (row.captured_at as Date).toISOString(),
    submittedBy: (row.submitted_by ?? null) as string | null,
    verificationStatus: row.verification_status as string,
    rev: revNum(row.rev),
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export function mapVerificationRow(row: Row): MappedOlosRecord {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    taskId: row.task_id as string,
    verifierId: (row.verifier_id ?? null) as string | null,
    outcome: row.outcome as string,
    criteriaChecked: (row.criteria_checked ?? []) as unknown[],
    notes: (row.notes ?? null) as string | null,
    requiredReworkIds: (row.required_rework_ids ?? []) as string[],
    proofRecordIds: (row.proof_record_ids ?? []) as string[],
    verifiedAt: (row.verified_at as Date).toISOString(),
    rev: revNum(row.rev),
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

// ─── changed-since delta item (server → reconnect catch-up) ───────────────────

/** The per-row envelope the reconnect delta-pull consumes — same fields
 *  pullActRecordDelta reads from act-records' changed-since: storeKey, recordId
 *  (= the row's uuid PK), rev, schemaVersion, the full mapped record as
 *  `payload`, and the SERVER `updatedAt` (so the watermark advance is immune to
 *  client clock skew). */
export function toOlosDeltaItem(
  storeKey: string,
  record: MappedOlosRecord,
  updatedAt: string,
) {
  return {
    storeKey,
    recordId: record.id,
    rev: record.rev,
    schemaVersion: OLOS_SCHEMA_VERSION,
    payload: record,
    updatedAt,
  };
}

// ─── 409 conflict surface (shared by all three routes) ────────────────────────

interface SurfaceConflictArgs {
  projectId: string;
  storeKey: string;
  recordId: string;
  baseRev: number;
  /** The record the client tried to write (the editable fields it sent). */
  localPayload: Record<string, unknown> | null;
  serverRev: number | null;
  serverPayload: Record<string, unknown> | null;
  userId: string;
}

/**
 * Persist a stale olos write as a durable conflict and return the 409 envelope
 * — byte-identical posture to act-records, minus the observed_at LWW branch:
 * olos records carry no comparable "observed_at" so safety can never be proven,
 * and every conflict ESCALATES to the steward. Writes one `sync_log` row (both
 * payloads, both revs) + upserts the open `failed_records` escalation pointer.
 * Caller must `reply.code(409)` — returned object is the `{data,error}` body.
 */
export async function surfaceOlosConflict(
  db: Sql,
  args: SurfaceConflictArgs,
): Promise<{
  data: null;
  meta: undefined;
  error: {
    code: 'CONFLICT';
    message: string;
    details: {
      serverRev: number | null;
      serverPayload: Record<string, unknown> | null;
      resolution: ConflictResolution;
      syncLogId: string | null;
    };
  };
}> {
  const { projectId, storeKey, recordId, baseRev, localPayload, serverRev, serverPayload, userId } =
    args;
  const resolution: ConflictResolution = 'escalated';

  const [logRow] = await db`
    INSERT INTO sync_log (
      project_id, store_key, record_id,
      local_payload, server_payload, local_rev, server_rev,
      observed_at_local, observed_at_server, resolution_status, detected_by
    ) VALUES (
      ${projectId}, ${storeKey}, ${recordId},
      ${db.json(localPayload ?? null)}::jsonb,
      ${db.json(serverPayload ?? null)}::jsonb,
      ${baseRev}, ${serverRev ?? null},
      ${null}, ${null}, ${resolution}, ${userId}
    )
    RETURNING id
  `;
  const syncLogId = (logRow?.['id'] as string | undefined) ?? null;

  await db`
    INSERT INTO failed_records (sync_log_id, project_id, store_key, record_id)
    VALUES (${syncLogId}, ${projectId}, ${storeKey}, ${recordId})
    ON CONFLICT (project_id, store_key, record_id) DO UPDATE SET
      sync_log_id = EXCLUDED.sync_log_id,
      created_at  = now()
  `;

  return {
    data: null,
    meta: undefined,
    error: {
      code: 'CONFLICT',
      message: `Stale write for ${storeKey}/${recordId}: server rev is ahead of baseRev ${baseRev}`,
      details: { serverRev: serverRev ?? null, serverPayload: serverPayload ?? null, resolution, syncLogId },
    },
  };
}

// ─── Live broadcast (shared by all three routes) ──────────────────────────────

interface BroadcastArgs {
  projectId: string;
  storeKey: string;
  recordId: string;
  rev: number;
  payload: Record<string, unknown> | null;
  userId: string;
}

/**
 * Broadcast a live olos upsert to other connected project members, author
 * excluded (they already applied it locally and would re-enqueue an echo).
 * Unconditional in-process, mirroring act-records: the message only reaches
 * sockets in the project room, and only clients with SYNC_STATE_BLOBS on
 * subscribe and apply it (dropping any rev not strictly newer than they hold).
 */
export function broadcastOlosUpsert(fastify: FastifyInstance, args: BroadcastArgs): void {
  const event: WsEvent = {
    type: 'record_upserted',
    payload: {
      storeKey: args.storeKey,
      projectId: args.projectId,
      recordId: args.recordId,
      rev: args.rev,
      schemaVersion: OLOS_SCHEMA_VERSION,
      payload: args.payload,
    } as unknown as Record<string, unknown>,
    userId: args.userId,
    userName: null,
    timestamp: new Date().toISOString(),
  };
  fastify.wsBroadcast(args.projectId, event, args.userId);
}

// ─── keep-mine / read-authoritative registry (the generic resolve route) ──────
//
// The Phase 4 steward surface closes an escalated conflict by storeKey. The
// resolve route (index.ts) is storeKey-generic; the per-table writes live here.
// keep_server is a read no-op (the server row already won the 409); keep_mine is
// the one sanctioned override — force-write the steward's local payload into the
// structured columns at rev + 1 (the olos updated_at trigger stamps updated_at).

interface OlosRecordStore {
  storeKey: string;
  readAuthoritative(sql: Sql, projectId: string, recordId: string): Promise<MappedOlosRecord | null>;
  applyKeepMine(
    sql: Sql,
    projectId: string,
    recordId: string,
    localPayload: Record<string, unknown>,
  ): Promise<MappedOlosRecord | null>;
}

const observationStore: OlosRecordStore = {
  storeKey: OLOS_STORE_KEYS.observation,
  async readAuthoritative(sql, projectId, recordId) {
    const [row] = await sql`
      SELECT r.*, ST_AsGeoJSON(r.location_geometry)::jsonb AS location_geojson
      FROM olos_observation_records r
      WHERE r.id = ${recordId} AND r.project_id = ${projectId}
    `;
    return row ? mapObservationRow(row) : null;
  },
  async applyKeepMine(sql, projectId, recordId, p) {
    const locationPatch =
      p.locationGeometry === undefined
        ? sql`location_geometry`
        : p.locationGeometry === null
          ? sql`NULL`
          : sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(p.locationGeometry)}), 4326)`;
    const [row] = await sql`
      UPDATE olos_observation_records SET
        status                  = COALESCE(${p.status ?? null},      status),
        summary                 = COALESCE(${p.summary ?? null},     summary),
        constraints             = COALESCE(${p.constraints ?? null}, constraints),
        unknowns                = COALESCE(${p.unknowns ?? null},    unknowns),
        flags                   = COALESCE(${(p.flags as string[] | undefined) ?? null}, flags),
        evidence_refs           = COALESCE(${p.evidenceRefs ? sql.json(p.evidenceRefs) : null}, evidence_refs),
        location_geometry       = ${locationPatch},
        recommended_next_review = COALESCE(${(p.recommendedNextReview as string | undefined) ?? null}, recommended_next_review),
        rev                     = rev + 1
      WHERE project_id = ${projectId} AND id = ${recordId}
      RETURNING *, ST_AsGeoJSON(location_geometry)::jsonb AS location_geojson
    `;
    return row ? mapObservationRow(row) : null;
  },
};

const proofStore: OlosRecordStore = {
  storeKey: OLOS_STORE_KEYS.proof,
  async readAuthoritative(sql, projectId, recordId) {
    const [row] = await sql`
      SELECT * FROM olos_proof_records
      WHERE id = ${recordId} AND project_id = ${projectId}
    `;
    return row ? mapProofRow(row) : null;
  },
  async applyKeepMine(sql, projectId, recordId, p) {
    const [row] = await sql`
      UPDATE olos_proof_records SET
        proof_type          = COALESCE(${p.proofType ?? null}, proof_type),
        file_uri            = ${p.fileUri === undefined ? sql`file_uri` : p.fileUri ?? null},
        note                = ${p.note === undefined ? sql`note` : p.note ?? null},
        measurement_value   = ${p.measurementValue === undefined ? sql`measurement_value` : p.measurementValue ?? null},
        measurement_unit    = ${p.measurementUnit === undefined ? sql`measurement_unit` : p.measurementUnit ?? null},
        geotag              = ${p.geotag === undefined ? sql`geotag` : p.geotag === null ? null : sql.json(p.geotag)},
        details             = ${p.details === undefined ? sql`details` : p.details === null ? null : sql.json(p.details)},
        captured_at         = COALESCE(${(p.capturedAt as string | undefined) ?? null}, captured_at),
        verification_status = COALESCE(${p.verificationStatus ?? null}, verification_status),
        rev                 = rev + 1
      WHERE project_id = ${projectId} AND id = ${recordId}
      RETURNING *
    `;
    return row ? mapProofRow(row) : null;
  },
};

const verificationStore: OlosRecordStore = {
  storeKey: OLOS_STORE_KEYS.verification,
  async readAuthoritative(sql, projectId, recordId) {
    const [row] = await sql`
      SELECT * FROM olos_verification_records
      WHERE id = ${recordId} AND project_id = ${projectId}
    `;
    return row ? mapVerificationRow(row) : null;
  },
  async applyKeepMine(sql, projectId, recordId, p) {
    const [row] = await sql`
      UPDATE olos_verification_records SET
        outcome             = COALESCE(${p.outcome ?? null}, outcome),
        criteria_checked    = COALESCE(${p.criteriaChecked ? sql.json(p.criteriaChecked) : null}, criteria_checked),
        notes               = ${p.notes === undefined ? sql`notes` : p.notes ?? null},
        required_rework_ids = COALESCE(${(p.requiredReworkIds as string[] | undefined) ?? null}, required_rework_ids),
        proof_record_ids    = COALESCE(${(p.proofRecordIds as string[] | undefined) ?? null}::uuid[], proof_record_ids),
        verified_at         = COALESCE(${(p.verifiedAt as string | undefined) ?? null}, verified_at),
        rev                 = rev + 1
      WHERE project_id = ${projectId} AND id = ${recordId}
      RETURNING *
    `;
    return row ? mapVerificationRow(row) : null;
  },
};

/** storeKey → per-table conflict-resolution writer, for the generic resolve
 *  route. Unknown storeKey (not an olos record store) → undefined. */
export const OLOS_RECORD_STORES: Record<string, OlosRecordStore> = {
  [OLOS_STORE_KEYS.observation]: observationStore,
  [OLOS_STORE_KEYS.proof]: proofStore,
  [OLOS_STORE_KEYS.verification]: verificationStore,
};
