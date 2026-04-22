import type { FastifyInstance } from 'fastify';
import {
  CreateTemplateInput,
  InstantiateTemplateInput,
  ProjectMetadata,
  ProjectSummary,
  TemplateSnapshot,
  TemplateSummary,
  toCamelCase,
} from '@ogden/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';

/**
 * Project templates route — Section 1 Gap B.
 *
 * Phase: P2. Gated via fastify.requirePhase('P2'): when
 * ATLAS_PHASE_MAX < P2 the routes 404 to avoid leaking their presence.
 *
 * Snapshots are owner-scoped — templates cannot currently be shared across
 * users. That's Future work (§25 Templates in the feature manifest).
 */
export default async function templateRoutes(fastify: FastifyInstance) {
  const { db, authenticate, requirePhase } = fastify;
  const p2 = requirePhase('P2');

  // GET /templates — list current user's templates
  fastify.get('/', { preHandler: [authenticate, p2] }, async (req) => {
    const rows = await db`
      SELECT id, owner_id, name, source_project_id, created_at
      FROM project_templates
      WHERE owner_id = ${req.userId}
      ORDER BY created_at DESC
    `;
    return {
      data: rows.map((r) => TemplateSummary.parse(toCamelCase(r))),
      meta: { total: rows.length },
      error: null,
    };
  });

  // POST /templates — snapshot a project into a template
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
      RETURNING id, owner_id, name, source_project_id, created_at
    `;

    reply.code(201);
    return { data: TemplateSummary.parse(toCamelCase(tpl)), meta: undefined, error: null };
  });

  // POST /templates/:id/instantiate — create a new project from the snapshot
  fastify.post<{ Params: { id: string } }>(
    '/:id/instantiate',
    { preHandler: [authenticate, p2] },
    async (req, reply) => {
      const body = InstantiateTemplateInput.parse(req.body);

      const [tpl] = await db`
        SELECT id, owner_id, snapshot
        FROM project_templates
        WHERE id = ${req.params.id}
      `;
      if (!tpl) throw new NotFoundError('Template', req.params.id);
      if (tpl.owner_id !== req.userId) {
        throw new ForbiddenError('Template belongs to another user');
      }

      const snapshot = TemplateSnapshot.parse(tpl.snapshot);

      const [project] = await db`
        INSERT INTO projects (
          owner_id, name, description, project_type,
          country, province_state, units, metadata,
          owner_notes, zoning_notes, access_notes, water_rights_notes
        ) VALUES (
          ${req.userId}, ${body.name}, ${snapshot.description},
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

      // If the snapshot carried a boundary, replay the boundary setter so
      // PostGIS computes centroid + acreage from scratch.
      if (snapshot.parcelBoundaryGeojson) {
        const geojsonStr = JSON.stringify(snapshot.parcelBoundaryGeojson);
        await db`
          UPDATE projects SET
            parcel_boundary = ST_Multi(ST_GeomFromGeoJSON(${geojsonStr})),
            centroid        = ST_Centroid(ST_GeomFromGeoJSON(${geojsonStr})),
            acreage         = ST_Area(
              ST_Transform(ST_GeomFromGeoJSON(${geojsonStr}), 26917)
            ) / 4046.86
          WHERE id = ${project!.id}
        `;
      }

      // Queue Tier 1 data pipeline (boundary may or may not be set — same
      // pattern as POST /projects).
      await db`
        INSERT INTO data_pipeline_jobs (project_id, job_type, status)
        VALUES (${project!.id}, 'fetch_tier1', 'queued')
      `;
      if (fastify.pipeline) {
        await fastify.pipeline.enqueueTier1Fetch(project!.id);
      }

      reply.code(201);
      return { data: ProjectSummary.parse(toCamelCase(project)), meta: undefined, error: null };
    },
  );
}
