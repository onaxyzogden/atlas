import type { FastifyInstance } from 'fastify';
import {
  CreateTemplateInput,
  InstantiateTemplateInput,
  ProjectMetadata,
  ProjectSummary,
  TemplateSnapshot,
  TemplateSummary,
  extractPolygonalGeometry,
  toCamelCase,
} from '@ogden/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000a71a';

/**
 * Project templates route — Section 1 Gap B (+ Phase 4 deep-snapshot extension).
 *
 * Phase: P2. Gated via fastify.requirePhase('P2'): when
 * ATLAS_PHASE_MAX < P2 the routes 404 to avoid leaking their presence.
 *
 * Owner-private snapshots (POST /templates) remain owner-scoped.
 *
 * Phase 4 (2026-05-21) adds a *public* instantiate path used by the
 * Three Streams Showcase Portal's per-tier ContactCTA — cold visitors
 * register, then call POST /templates/public/:slug/instantiate to clone
 * a system-owned, slug-addressable template (today: "ecosystem-farm",
 * snapshotted from Three Streams Farm by migration 035). Authentication
 * is still required (no anonymous projects); only the *owner* check is
 * relaxed for rows where public = TRUE.
 */
export default async function templateRoutes(fastify: FastifyInstance) {
  const { db, authenticate, requirePhase } = fastify;
  const p2 = requirePhase('P2');

  // GET /templates — list current user's templates + the public catalogue
  fastify.get('/', { preHandler: [authenticate, p2] }, async (req) => {
    const rows = await db`
      SELECT id, owner_id, name, source_project_id, slug, public, created_at
      FROM project_templates
      WHERE owner_id = ${req.userId} OR public = TRUE
      ORDER BY public DESC, created_at DESC
    `;
    return {
      data: rows.map((r) => TemplateSummary.parse(toCamelCase(r))),
      meta: { total: rows.length },
      error: null,
    };
  });

  // POST /templates — snapshot a project into a template (owner-private,
  // shallow snapshot — Phase-4 deep-snapshot fields are not populated here;
  // they ship pre-baked via migration 035 for the public showcase template).
  fastify.post('/', { preHandler: [authenticate, p2] }, async (req, reply) => {
    const body = CreateTemplateInput.parse(req.body);

    const [source] = await db`
      SELECT p.id, p.owner_id,
             p.name, p.description, p.project_type,
             p.country, p.province_state, p.units, p.metadata,
             p.owner_notes, p.zoning_notes, p.access_notes, p.water_rights_notes,
             CASE WHEN p.parcel_boundary IS NOT NULL
                  THEN ST_AsGeoJSON(p.parcel_boundary)::jsonb
                  ELSE NULL END AS parcel_boundary_geojson
      FROM projects p
      WHERE p.id = ${body.sourceProjectId}
    `;
    if (!source) throw new NotFoundError('Project', body.sourceProjectId);
    if (source.owner_id !== req.userId) {
      throw new ForbiddenError('Only the project owner can save a template from it');
    }

    const snapshot: TemplateSnapshot = {
      name: source.name as string,
      description: (source.description as string | null) ?? null,
      projectType: (source.project_type as TemplateSnapshot['projectType']) ?? null,
      country: source.country as TemplateSnapshot['country'],
      provinceState: (source.province_state as string | null) ?? null,
      units: source.units as TemplateSnapshot['units'],
      metadata: ProjectMetadata.parse(source.metadata ?? {}),
      ownerNotes: (source.owner_notes as string | null) ?? null,
      zoningNotes: (source.zoning_notes as string | null) ?? null,
      accessNotes: (source.access_notes as string | null) ?? null,
      waterRightsNotes: (source.water_rights_notes as string | null) ?? null,
      parcelBoundaryGeojson: source.parcel_boundary_geojson ?? null,
    };

    const [tpl] = await db`
      INSERT INTO project_templates (owner_id, name, source_project_id, snapshot)
      VALUES (
        ${req.userId}, ${body.name}, ${body.sourceProjectId},
        ${db.json(snapshot as never)}
      )
      RETURNING id, owner_id, name, source_project_id, slug, public, created_at
    `;

    reply.code(201);
    return { data: TemplateSummary.parse(toCamelCase(tpl)), meta: undefined, error: null };
  });

  // ─────────────────────────────────────────────────────────────────────
  // Owner-private instantiate — POST /templates/:id/instantiate
  // ─────────────────────────────────────────────────────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/:id/instantiate',
    { preHandler: [authenticate, p2] },
    async (req, reply) => {
      const body = InstantiateTemplateInput.parse(req.body);

      const [tpl] = await db`
        SELECT id, owner_id, snapshot, public
        FROM project_templates
        WHERE id = ${req.params.id}
      `;
      if (!tpl) throw new NotFoundError('Template', req.params.id);
      if (tpl.owner_id !== req.userId && !tpl.public) {
        throw new ForbiddenError('Template belongs to another user');
      }

      const snapshot = TemplateSnapshot.parse(tpl.snapshot);
      const project = await instantiateFromSnapshot({
        fastify,
        snapshot,
        userId: req.userId!,
        projectName: body.name,
        boundaryOverride: body.parcelBoundaryGeojson ?? null,
      });

      reply.code(201);
      return { data: ProjectSummary.parse(toCamelCase(project)), meta: undefined, error: null };
    },
  );

  // ─────────────────────────────────────────────────────────────────────
  // Public instantiate by slug — POST /templates/public/:slug/instantiate
  // Cold-visitor entry from the Three Streams Showcase Portal. Still
  // requires authenticate (no anonymous projects); only the owner check
  // is relaxed for rows where public = TRUE.
  // ─────────────────────────────────────────────────────────────────────
  fastify.post<{ Params: { slug: string } }>(
    '/public/:slug/instantiate',
    { preHandler: [authenticate, p2] },
    async (req, reply) => {
      const body = InstantiateTemplateInput.parse(req.body);

      const [tpl] = await db`
        SELECT id, snapshot
        FROM project_templates
        WHERE slug = ${req.params.slug} AND public = TRUE
      `;
      if (!tpl) throw new NotFoundError('PublicTemplate', req.params.slug);

      const snapshot = TemplateSnapshot.parse(tpl.snapshot);
      const project = await instantiateFromSnapshot({
        fastify,
        snapshot,
        userId: req.userId!,
        projectName: body.name,
        boundaryOverride: body.parcelBoundaryGeojson ?? null,
      });

      reply.code(201);
      return { data: ProjectSummary.parse(toCamelCase(project)), meta: undefined, error: null };
    },
  );
}

/**
 * Shared instantiation pipeline used by both the owner-private and public
 * routes. Inserts the project, replays the boundary (if provided), then
 * replays the optional deep-snapshot entities (design_features,
 * regeneration_events, project_relationships) using PostGIS ST_Translate
 * to position centroid-normalized geometry at the visitor's parcel.
 *
 * Layers + site assessment are NOT replayed — those come from the Tier-1
 * fetch enqueued at the end (parcel-driven, not snapshot-driven).
 */
async function instantiateFromSnapshot(args: {
  fastify: FastifyInstance;
  snapshot: TemplateSnapshot;
  userId: string;
  projectName: string;
  boundaryOverride: unknown;
}) {
  const { fastify, snapshot, userId, projectName, boundaryOverride } = args;
  const { db } = fastify;

  const [project] = await db`
    INSERT INTO projects (
      owner_id, name, description, project_type,
      country, province_state, units, metadata,
      owner_notes, zoning_notes, access_notes, water_rights_notes
    ) VALUES (
      ${userId}, ${projectName}, ${snapshot.description},
      ${snapshot.projectType}, ${snapshot.country}, ${snapshot.provinceState},
      ${snapshot.units}, ${db.json(snapshot.metadata as never)},
      ${snapshot.ownerNotes}, ${snapshot.zoningNotes},
      ${snapshot.accessNotes}, ${snapshot.waterRightsNotes}
    )
    RETURNING id, name, description, status, project_type, country, province_state,
              conservation_auth_id, address, parcel_id, acreage,
              data_completeness_score, parcel_boundary IS NOT NULL AS has_parcel_boundary,
              created_at, updated_at
  `;

  // Boundary — prefer the caller-supplied override; fall back to the
  // snapshot's stored boundary (typically NULL for the public template).
  const candidateBoundary =
    boundaryOverride ?? snapshot.parcelBoundaryGeojson ?? null;
  const snapshotGeom = candidateBoundary
    ? extractPolygonalGeometry(candidateBoundary)
    : null;

  if (snapshotGeom) {
    const geojsonStr = JSON.stringify(snapshotGeom);
    await db`
      UPDATE projects SET
        parcel_boundary = ST_Multi(ST_GeomFromGeoJSON(${geojsonStr})),
        centroid        = ST_Centroid(ST_GeomFromGeoJSON(${geojsonStr})),
        acreage         = ST_Area(
          ST_GeomFromGeoJSON(${geojsonStr})::geography
        ) / 4046.86
      WHERE id = ${project!.id}
    `;

    // Deep replay only when we have a visitor boundary to translate against.
    // design_features.geometry is NOT NULL, so without a centroid we cannot
    // insert sensible features. The dreaming-tier flow (no-boundary clone)
    // gets an empty project; the client can re-trigger deep replay after the
    // visitor draws their boundary (tracked Phase 4.5).
    await replayDeepSnapshot({ fastify, snapshot, projectId: project!.id, userId });
  }

  // Tier-1 fetch (boundary may or may not be set — same pattern as POST /projects).
  await db`
    INSERT INTO data_pipeline_jobs (project_id, job_type, status)
    VALUES (${project!.id}, 'fetch_tier1', 'queued')
  `;
  if (fastify.pipeline) {
    await fastify.pipeline.enqueueTier1Fetch(project!.id);
  }

  return project!;
}

/**
 * Deep-snapshot replay — design_features (centroid-translated to the
 * visitor's parcel), regeneration_events (date-shifted from canon Y0
 * to the visitor's project.created_at), project_relationships
 * (label → fresh-uuid resolved from the inserted design_features).
 *
 * Each section is best-effort and idempotent on re-invocation patterns:
 * the project is freshly created above, so we don't ON CONFLICT here —
 * but each section short-circuits when the snapshot has no entries.
 */
async function replayDeepSnapshot(args: {
  fastify: FastifyInstance;
  snapshot: TemplateSnapshot;
  projectId: string;
  userId: string;
}) {
  const { fastify, snapshot, projectId, userId } = args;
  const { db } = fastify;

  const designFeatures = snapshot.designFeatures ?? [];
  const regenEvents = snapshot.regenerationEvents ?? [];
  const relationships = snapshot.projectRelationships ?? [];

  // ── 1) Design features: ST_Translate from canon-centroid-normalized
  //     geometry to visitor centroid. Build label → new uuid map for
  //     the relationship resolver below.
  const labelToId = new Map<string, string>();
  if (designFeatures.length > 0) {
    // We compute the visitor centroid once via PostGIS; cheaper than a
    // round-trip per feature.
    const centroidRows = await db<{ cx: number; cy: number }[]>`
      SELECT ST_X(centroid) AS cx, ST_Y(centroid) AS cy
      FROM projects WHERE id = ${projectId}
    `;
    const cx = centroidRows[0]?.cx;
    const cy = centroidRows[0]?.cy;
    if (cx == null || cy == null) return;

    for (let i = 0; i < designFeatures.length; i++) {
      const df = designFeatures[i]!;
      const geomStr = JSON.stringify(df.relativeGeometry);
      const props = (df.properties ?? {}) as Record<string, unknown>;
      const [row] = await db<{ id: string }[]>`
        INSERT INTO design_features (
          project_id, feature_type, subtype,
          geometry, label, properties, sort_order, created_by
        ) VALUES (
          ${projectId},
          'zone',
          ${df.kind},
          ST_Translate(ST_GeomFromGeoJSON(${geomStr}), ${cx}, ${cy}),
          ${df.name},
          ${db.json(props as never)},
          ${i},
          ${userId}
        )
        RETURNING id
      `;
      if (row?.id) labelToId.set(df.name, row.id);
    }
  }

  // ── 2) Regeneration events: relativeDateDays → project.created_at + N days.
  if (regenEvents.length > 0) {
    for (const ev of regenEvents) {
      const obs = (ev.observations ?? {}) as Record<string, unknown>;
      await db`
        INSERT INTO regeneration_events (
          project_id, author_id,
          event_type, phase, progress,
          title, notes,
          event_date, observations
        ) VALUES (
          ${projectId},
          ${SYSTEM_USER_ID},
          ${ev.eventType},
          ${ev.phase ?? null},
          'observed',
          ${ev.title},
          ${ev.description ?? null},
          (SELECT (created_at + (${ev.relativeDateDays} || ' days')::interval)::date
             FROM projects WHERE id = ${projectId}),
          ${db.json(obs as never)}
        )
      `;
    }
  }

  // ── 3) Project relationships: resolve sourceName / targetName via the
  //     label → new-uuid map built during the design-features pass.
  if (relationships.length > 0 && labelToId.size > 0) {
    for (const rel of relationships) {
      const fromId = labelToId.get(rel.sourceName);
      const toId = labelToId.get(rel.targetName);
      if (!fromId || !toId || fromId === toId) continue;

      // The snapshot encodes kind as "from_output→to_input"; split it back
      // out. Fall back to the snapshot's restricted-vocab default if the
      // split fails for any reason.
      const [fromOutput, toInput] = rel.kind.split('→');
      if (!fromOutput || !toInput) continue;

      await db`
        INSERT INTO project_relationships (
          project_id, created_by, from_id, from_output, to_id, to_input
        ) VALUES (
          ${projectId}, ${userId}, ${fromId}, ${fromOutput}, ${toId}, ${toInput}
        )
        ON CONFLICT (project_id, from_id, from_output, to_id, to_input) DO NOTHING
      `;
    }
  }
}
