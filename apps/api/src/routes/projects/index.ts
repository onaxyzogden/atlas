import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectSummary,
  ParcelBoundaryGeojson,
  extractPolygonalGeometry,
  toCamelCase,
  SetOperationalRoleDefsInput,
} from '@ogden/shared';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors.js';
import { getLatestAiOutputsForProject } from '../../services/ai/AiOutputWriter.js';

const BUILTIN_PROJECT_ID = '00000000-0000-0000-0000-0000005a3791';

export default async function projectRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // Builtin sample projects (migration 017) are read-only for everyone.
  const refuseIfBuiltin = async (projectId: string) => {
    const [row] = await db`
      SELECT is_builtin FROM projects WHERE id = ${projectId}
    `;
    if (row?.is_builtin) {
      throw new ForbiddenError('Builtin sample projects are read-only.');
    }
  };

  // GET /projects/builtins — public list of system-owned sample projects.
  // No auth required. Each row embeds its `project_layers` summaries.
  fastify.get('/builtins', async () => {
    const rows = await db`
      SELECT
        p.id, p.name, p.description, p.status, p.project_type,
        p.country, p.province_state, p.conservation_auth_id,
        p.address, p.parcel_id,
        p.acreage::float8 AS acreage,
        p.data_completeness_score::float8 AS data_completeness_score,
        (p.parcel_boundary IS NOT NULL) AS has_parcel_boundary,
        ST_AsGeoJSON(p.parcel_boundary)::jsonb AS parcel_boundary_geojson,
        p.is_builtin,
        p.created_at, p.updated_at
      FROM projects p
      WHERE p.is_builtin = true
      ORDER BY p.created_at
    `;

    const layerRows = rows.length
      ? await db`
        SELECT project_id, layer_type, source_api, fetch_status, confidence,
               data_date, attribution_text, summary_data
        FROM project_layers
        WHERE project_id IN ${db(rows.map((r) => r.id))}
        ORDER BY project_id, layer_type
      `
      : [];

    const layersByProject = new Map<string, Array<Record<string, unknown>>>();
    for (const l of layerRows) {
      const list = layersByProject.get(l.project_id) ?? [];
      list.push({
        layerType: l.layer_type,
        sourceApi: l.source_api,
        fetchStatus: l.fetch_status,
        confidence: l.confidence,
        dataDate: l.data_date,
        attribution: l.attribution_text,
        summary: l.summary_data ?? {},
      });
      layersByProject.set(l.project_id, list);
    }

    return {
      data: rows.map((r) => ({
        ...ProjectSummary.parse(toCamelCase(r)),
        parcelBoundaryGeojson: r.parcel_boundary_geojson ?? null,
        layers: layersByProject.get(r.id) ?? [],
      })),
      meta: { total: rows.length },
      error: null,
    };
  });

  // GET /projects/builtins/assessment — public; returns the 351 House site assessment + terrain.
  fastify.get('/builtins/assessment', async () => {
    const [assessment] = await db`
      SELECT
        sa.id, sa.project_id, sa.version, sa.is_current,
        sa.confidence,
        sa.overall_score::float8  AS overall_score,
        sa.score_breakdown,
        sa.flags,
        sa.needs_site_visit,
        sa.data_sources_used,
        sa.computed_at
      FROM site_assessments sa
      WHERE sa.project_id = ${BUILTIN_PROJECT_ID} AND sa.is_current = true
    `;
    if (!assessment) return { data: null, error: null };

    const [terrain] = await db`
      SELECT * FROM terrain_analysis
      WHERE project_id = ${BUILTIN_PROJECT_ID}
    `;

    const terrainAnalysis = terrain ? {
      curvature: {
        profileMean: terrain.curvature_profile_mean,
        planMean: terrain.curvature_plan_mean,
        classification: terrain.curvature_classification,
        confidence: terrain.confidence,
        dataSources: terrain.data_sources ?? [],
        computedAt: terrain.computed_at,
      },
      viewshed: {
        visiblePct: terrain.viewshed_visible_pct,
        confidence: terrain.confidence,
        dataSources: terrain.data_sources ?? [],
        computedAt: terrain.computed_at,
      },
      frostPocket: {
        areaPct: terrain.frost_pocket_area_pct,
        severity: terrain.frost_pocket_severity,
        confidence: terrain.confidence,
        dataSources: terrain.data_sources ?? [],
        computedAt: terrain.computed_at,
      },
      coldAirDrainage: {
        riskRating: terrain.cold_air_risk_rating,
        confidence: terrain.confidence,
        dataSources: terrain.data_sources ?? [],
        computedAt: terrain.computed_at,
      },
      tpi: {
        classification: terrain.tpi_classification,
        dominantClass: terrain.tpi_dominant_class,
        confidence: terrain.confidence,
        dataSources: terrain.data_sources ?? [],
        computedAt: terrain.computed_at,
      },
      twi: {
        mean: terrain.twi_mean,
        dominantClass: terrain.twi_dominant_class,
        classification: terrain.twi_classification,
        confidence: terrain.confidence,
        dataSources: terrain.data_sources ?? [],
        computedAt: terrain.computed_at,
      },
      elevation: {
        minM: terrain.elevation_min_m,
        maxM: terrain.elevation_max_m,
        meanM: terrain.elevation_mean_m,
      },
      slope: {
        minDeg: terrain.slope_min_deg,
        maxDeg: terrain.slope_max_deg,
        meanDeg: terrain.slope_mean_deg,
      },
      aspectDominant: terrain.aspect_dominant,
      erosion: {
        meanTHaYr: terrain.erosion_mean_t_ha_yr,
        maxTHaYr: terrain.erosion_max_t_ha_yr,
        dominantClass: terrain.erosion_dominant_class,
        confidence: terrain.erosion_confidence,
      },
      sourceApi: terrain.source_api,
    } : null;

    return { data: { ...(toCamelCase(assessment) as Record<string, unknown>), terrainAnalysis }, error: null };
  });

  // GET /projects — list current user's projects (owned + shared) plus builtin samples.
  // ?status=active (default) | archived | all
  fastify.get<{ Querystring: { status?: string } }>(
    '/',
    { preHandler: [authenticate] },
    async (req) => {
      const statusFilter = req.query?.status === 'archived'
        ? 'archived'
        : req.query?.status === 'all'
          ? 'all'
          : 'active';
      const rows = await db`
        SELECT DISTINCT ON (p.id)
          p.id, p.name, p.description, p.status, p.project_type,
          p.country, p.province_state, p.conservation_auth_id,
          p.address, p.parcel_id,
          p.acreage::float8 AS acreage,
          p.data_completeness_score::float8 AS data_completeness_score,
          (p.parcel_boundary IS NOT NULL) AS has_parcel_boundary,
          p.is_builtin,
          p.created_at, p.updated_at
        FROM projects p
        LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ${req.userId}
        WHERE (p.owner_id = ${req.userId} OR pm.user_id IS NOT NULL OR p.is_builtin = true)
          AND ${
            statusFilter === 'archived'
              ? db`p.status = 'archived'`
              : statusFilter === 'all'
                ? db`TRUE`
                : db`p.status != 'archived'`
          }
        ORDER BY p.id, p.updated_at DESC
      `;
      return { data: rows.map((r) => ProjectSummary.parse(toCamelCase(r))), meta: { total: rows.length }, error: null };
    },
  );

  // GET /projects/my-roles - bulk role map for the signed-in user across all
  // their non-builtin projects (owned + shared). Powers the Portfolio role
  // badge and the Per-Project Home access gate (Slice 5.5a). Declared as a
  // static route; Fastify matches it ahead of the `/:id/...` param routes, so
  // "my-roles" is never treated as a project id.
  fastify.get('/my-roles', { preHandler: [authenticate] }, async (req) => {
    const rows = await db`
      SELECT p.id AS project_id,
             CASE WHEN p.owner_id = ${req.userId} THEN 'owner' ELSE pm.role END AS role
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ${req.userId}
      WHERE (p.owner_id = ${req.userId} OR pm.user_id IS NOT NULL)
        AND p.is_builtin = false
    `;
    return {
      data: rows.map((r) => ({ projectId: r.project_id, role: r.role })),
      meta: { total: rows.length },
      error: null,
    };
  });

  // POST /projects — create a new project and enqueue Tier 1 data pipeline
  fastify.post('/', { preHandler: [authenticate] }, async (req, reply) => {
    const body = CreateProjectInput.parse(req.body);

    // Phase 4.5 — resolve workspace (org) for project attach.
    // Migration 036 made projects.org_id NOT NULL. The client may pass
    // body.orgId explicitly (e.g. via OrganizationSwitcherModal); otherwise
    // we fall back to the caller's oldest owner-role membership (the
    // personal default org created at register-time by Prong 1).
    let orgId: string | null = null;
    if (body.orgId) {
      const [member] = await db`
        SELECT 1 FROM organization_members
        WHERE org_id = ${body.orgId} AND user_id = ${req.userId}
      `;
      if (!member) {
        throw new ForbiddenError(
          'You are not a member of the requested workspace.',
        );
      }
      orgId = body.orgId;
    } else {
      const [defaultOrg] = await db`
        SELECT org_id FROM organization_members
        WHERE user_id = ${req.userId} AND role = 'owner'
        ORDER BY joined_at ASC
        LIMIT 1
      `;
      if (!defaultOrg) {
        throw new ValidationError(
          'No workspace is available for this account. Create a workspace first.',
        );
      }
      orgId = defaultOrg.org_id;
    }

    // Idempotent create (migration 058). The web client sends its stable local
    // row id as client_local_id; a retried or raced create then upserts on
    // (owner_id, client_local_id) via the partial unique index instead of
    // minting a duplicate. The ON CONFLICT WHERE predicate MUST match the
    // index predicate exactly or PG rejects the statement. Legacy/pull callers
    // send no key -> NULL, which the partial index excludes, so DO NOTHING
    // never fires and the INSERT always returns its row (unchanged behavior).
    const [created] = await db`
      INSERT INTO projects (
        owner_id, org_id, name, description, project_type,
        country, province_state, units, metadata, client_local_id
      ) VALUES (
        ${req.userId}, ${orgId}, ${body.name}, ${body.description ?? null},
        ${body.projectType ?? null}, ${body.country}, ${body.provinceState ?? null},
        ${body.units}, ${db.json((body.metadata ?? {}) as never)}, ${body.clientLocalId ?? null}
      )
      ON CONFLICT (owner_id, client_local_id) WHERE client_local_id IS NOT NULL
        DO NOTHING
      RETURNING id, name, description, status, project_type, country, province_state,
                conservation_auth_id, address, parcel_id,
                acreage::float8 AS acreage,
                data_completeness_score::float8 AS data_completeness_score,
                parcel_boundary IS NOT NULL AS has_parcel_boundary,
                metadata, created_at, updated_at
    `;

    if (!created) {
      // Idempotent replay: a project with this (owner_id, client_local_id)
      // already exists. Return it unchanged with 200 (not 201) and do NOT
      // enqueue a second Tier 1 pipeline job. clientLocalId is guaranteed
      // non-null here — a NULL key can never conflict against the partial index.
      const [existing] = await db`
        SELECT id, name, description, status, project_type, country, province_state,
               conservation_auth_id, address, parcel_id,
               acreage::float8 AS acreage,
               data_completeness_score::float8 AS data_completeness_score,
               parcel_boundary IS NOT NULL AS has_parcel_boundary,
               metadata, created_at, updated_at
        FROM projects
        WHERE owner_id = ${req.userId} AND client_local_id = ${body.clientLocalId ?? null}
      `;
      reply.code(200);
      return { data: ProjectSummary.parse(toCamelCase(existing)), meta: undefined, error: null };
    }

    // Enqueue Tier 1 data pipeline job (will run once boundary is set)
    await db`
      INSERT INTO data_pipeline_jobs (project_id, job_type, status)
      VALUES (${created.id}, 'fetch_tier1', 'queued')
    `;
    if (fastify.pipeline) {
      await fastify.pipeline.enqueueTier1Fetch(created.id);
    }

    reply.code(201);
    return { data: ProjectSummary.parse(toCamelCase(created)), meta: undefined, error: null };
  });

  // GET /projects/:id — fetch single project (any role)
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const [project] = await db`
        SELECT
          p.id, p.name, p.description, p.status, p.project_type,
          p.country, p.province_state, p.conservation_auth_id,
          p.address, p.parcel_id,
          p.acreage::float8 AS acreage,
          p.data_completeness_score::float8 AS data_completeness_score,
          (p.parcel_boundary IS NOT NULL) AS has_parcel_boundary,
          ST_AsGeoJSON(p.parcel_boundary)::jsonb AS parcel_boundary_geojson,
          p.is_builtin,
          p.owner_notes, p.zoning_notes, p.access_notes, p.water_rights_notes,
          p.metadata,
          p.created_at, p.updated_at
        FROM projects p
        WHERE p.id = ${req.projectId}
      `;
      if (!project) throw new NotFoundError('Project', req.projectId);
      return { data: toCamelCase(project), meta: undefined, error: null };
    },
  );

  // PATCH /projects/:id — update metadata (owner only)
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner')] },
    async (req) => {
      await refuseIfBuiltin(req.projectId);
      const body = UpdateProjectInput.parse(req.body);

      const [updated] = await db`
        UPDATE projects SET
          name                  = COALESCE(${body.name ?? null}, name),
          description           = COALESCE(${body.description ?? null}, description),
          project_type          = COALESCE(${body.projectType ?? null}, project_type),
          address               = COALESCE(${body.address ?? null}, address),
          parcel_id             = COALESCE(${body.parcelId ?? null}, parcel_id),
          owner_notes           = COALESCE(${body.ownerNotes ?? null}, owner_notes),
          zoning_notes          = COALESCE(${body.zoningNotes ?? null}, zoning_notes),
          access_notes          = COALESCE(${body.accessNotes ?? null}, access_notes),
          water_rights_notes    = COALESCE(${body.waterRightsNotes ?? null}, water_rights_notes),
          metadata              = metadata || COALESCE(
                                    ${body.metadata ? db.json(body.metadata as never) : null}::jsonb,
                                    '{}'::jsonb
                                  )
        WHERE id = ${req.projectId}
        RETURNING id, name, description, status, project_type, country, province_state,
                  conservation_auth_id, address, parcel_id,
                  acreage::float8 AS acreage,
                  data_completeness_score::float8 AS data_completeness_score,
                  parcel_boundary IS NOT NULL AS has_parcel_boundary,
                  created_at, updated_at
      `;
      return { data: ProjectSummary.parse(toCamelCase(updated)), meta: undefined, error: null };
    },
  );

  // PATCH /projects/:id/operational-role-defs — rename + re-scope the six
  // built-in operational roles for THIS project (ADR 2026-06-24 Option C). A
  // governance act: gated to owner / primary_steward (requireRole('owner')
  // admits primary_steward via the role alias), distinct from manage_members
  // (which governs ASSIGNING people to roles). Overrides ride projects.metadata
  // (open jsonb); members still store only the six built-in slugs, so no
  // migration / enum / CHECK change. The full desired set is sent each time
  // (idempotent replace); an empty array resets every role to its built-in def.
  fastify.patch<{ Params: { id: string } }>(
    '/:id/operational-role-defs',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner')] },
    async (req) => {
      await refuseIfBuiltin(req.projectId);
      const { operationalRoleDefs } = SetOperationalRoleDefsInput.parse(req.body);

      // Shallow jsonb merge replaces the operationalRoleDefs key wholesale —
      // same idempotent-replace pattern as members operational-roles.
      const [updated] = await db`
        UPDATE projects
        SET metadata = metadata || ${db.json({ operationalRoleDefs })}::jsonb
        WHERE id = ${req.projectId}
        RETURNING id, name, description, status, project_type, country, province_state,
                  conservation_auth_id, address, parcel_id,
                  acreage::float8 AS acreage,
                  data_completeness_score::float8 AS data_completeness_score,
                  parcel_boundary IS NOT NULL AS has_parcel_boundary,
                  metadata,
                  created_at, updated_at
      `;
      // Return raw (camelCased) row incl. metadata — like GET /:id, NOT
      // ProjectSummary.parse (which strips metadata). The slug survives
      // toCamelCase because it is a string value, not an object key.
      return { data: toCamelCase(updated), meta: undefined, error: null };
    },
  );

  // POST /projects/:id/archive — soft-delete via status flip (owner only)
  fastify.post<{ Params: { id: string } }>(
    '/:id/archive',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner')] },
    async (req) => {
      await refuseIfBuiltin(req.projectId);
      const [updated] = await db`
        UPDATE projects SET status = 'archived'
        WHERE id = ${req.projectId}
        RETURNING id, name, description, status, project_type, country, province_state,
                  conservation_auth_id, address, parcel_id,
                  acreage::float8 AS acreage,
                  data_completeness_score::float8 AS data_completeness_score,
                  parcel_boundary IS NOT NULL AS has_parcel_boundary,
                  created_at, updated_at
      `;
      if (!updated) throw new NotFoundError('Project', req.projectId);
      return { data: ProjectSummary.parse(toCamelCase(updated)), meta: undefined, error: null };
    },
  );

  // POST /projects/:id/unarchive — restore from archived (owner only)
  fastify.post<{ Params: { id: string } }>(
    '/:id/unarchive',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner')] },
    async (req) => {
      await refuseIfBuiltin(req.projectId);
      const [updated] = await db`
        UPDATE projects SET status = 'active'
        WHERE id = ${req.projectId}
        RETURNING id, name, description, status, project_type, country, province_state,
                  conservation_auth_id, address, parcel_id,
                  acreage::float8 AS acreage,
                  data_completeness_score::float8 AS data_completeness_score,
                  parcel_boundary IS NOT NULL AS has_parcel_boundary,
                  created_at, updated_at
      `;
      if (!updated) throw new NotFoundError('Project', req.projectId);
      return { data: ProjectSummary.parse(toCamelCase(updated)), meta: undefined, error: null };
    },
  );

  // POST /projects/:id/boundary — set or replace parcel boundary (owner only)
  fastify.post<{ Params: { id: string } }>(
    '/:id/boundary',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner')] },
    async (req) => {
      await refuseIfBuiltin(req.projectId);
      const body = z.object({ geojson: ParcelBoundaryGeojson }).parse(req.body);
      // PostGIS ST_GeomFromGeoJSON accepts only a bare Geometry; the client
      // sends a FeatureCollection. Normalize, and refuse rather than write a
      // confident acreage 0 when no polygonal geometry can be extracted.
      const geom = extractPolygonalGeometry(body.geojson);
      if (!geom) {
        throw new ValidationError(
          'Parcel boundary contains no Polygon/MultiPolygon geometry.',
        );
      }
      const geojsonStr = JSON.stringify(geom);

      const [updated] = await db`
        UPDATE projects SET
          parcel_boundary = ST_Multi(ST_GeomFromGeoJSON(${geojsonStr})),
          centroid        = ST_Centroid(ST_GeomFromGeoJSON(${geojsonStr})),
          acreage         = ST_Area(
            ST_GeomFromGeoJSON(${geojsonStr})::geography
          ) / 4046.86
        WHERE id = ${req.projectId}
        RETURNING id,
                  acreage::float8 AS acreage,
                  ST_AsGeoJSON(centroid)::jsonb AS centroid_geojson,
                  parcel_boundary IS NOT NULL AS has_parcel_boundary
      `;

      // Re-enqueue Tier 1 data fetch now that boundary is set
      await db`
        INSERT INTO data_pipeline_jobs (project_id, job_type, status)
        VALUES (${req.projectId}, 'fetch_tier1', 'queued')
      `;
      if (fastify.pipeline) {
        await fastify.pipeline.enqueueTier1Fetch(req.projectId);
      }

      return { data: updated, meta: undefined, error: null };
    },
  );

  // GET /projects/:id/assessment — site assessment + terrain (any role)
  fastify.get<{ Params: { id: string } }>(
    '/:id/assessment',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const [assessment] = await db`
        SELECT sa.*
        FROM site_assessments sa
        WHERE sa.project_id = ${req.projectId}
          AND sa.is_current = true
      `;
      if (!assessment) {
        return {
          data: null,
          meta: undefined,
          error: { code: 'NOT_READY', message: 'Assessment not yet computed. Data pipeline may still be running.' },
        };
      }

      // Fetch terrain analysis (Tier 3)
      const [terrain] = await db`
        SELECT * FROM terrain_analysis
        WHERE project_id = ${req.projectId}
      `;

      const terrainAnalysis = terrain ? {
        curvature: {
          profileMean: terrain.curvature_profile_mean,
          planMean: terrain.curvature_plan_mean,
          classification: terrain.curvature_classification,
          geojson: terrain.curvature_geojson,
          confidence: terrain.confidence,
          dataSources: terrain.data_sources ?? [],
          computedAt: terrain.computed_at,
        },
        viewshed: {
          visiblePct: terrain.viewshed_visible_pct,
          observerPoint: terrain.viewshed_observer_point,
          geojson: terrain.viewshed_geojson,
          confidence: terrain.confidence,
          dataSources: terrain.data_sources ?? [],
          computedAt: terrain.computed_at,
        },
        frostPocket: {
          areaPct: terrain.frost_pocket_area_pct,
          severity: terrain.frost_pocket_severity,
          geojson: terrain.frost_pocket_geojson,
          confidence: terrain.confidence,
          dataSources: terrain.data_sources ?? [],
          computedAt: terrain.computed_at,
        },
        coldAirDrainage: {
          flowPaths: terrain.cold_air_drainage_paths,
          poolingZones: terrain.cold_air_pooling_zones,
          riskRating: terrain.cold_air_risk_rating,
          confidence: terrain.confidence,
          dataSources: terrain.data_sources ?? [],
          computedAt: terrain.computed_at,
        },
        tpi: {
          classification: terrain.tpi_classification,
          dominantClass: terrain.tpi_dominant_class,
          geojson: terrain.tpi_geojson,
          confidence: terrain.confidence,
          dataSources: terrain.data_sources ?? [],
          computedAt: terrain.computed_at,
        },
        elevation: {
          minM: terrain.elevation_min_m,
          maxM: terrain.elevation_max_m,
          meanM: terrain.elevation_mean_m,
        },
        sourceApi: terrain.source_api,
      } : null;

      return {
        data: { ...assessment, terrainAnalysis },
        meta: undefined,
        error: null,
      };
    },
  );

  // GET /projects/:id/ai-outputs — latest server-generated AI outputs (any role)
  fastify.get<{ Params: { id: string } }>(
    '/:id/ai-outputs',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const outputs = await getLatestAiOutputsForProject(db, req.projectId);
      return { data: outputs, meta: undefined, error: null };
    },
  );

  // DELETE /projects/:id — permanently delete (owner only, cascades)
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner')] },
    async (req, reply) => {
      await refuseIfBuiltin(req.projectId);
      await db`DELETE FROM projects WHERE id = ${req.projectId}`;
      reply.code(204);
      return '';
    },
  );

  // GET /projects/:id/completeness — data completeness (any role)
  fastify.get<{ Params: { id: string } }>(
    '/:id/completeness',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const layers = await db`
        SELECT layer_type, fetch_status, confidence, data_date, fetched_at
        FROM project_layers
        WHERE project_id = ${req.projectId}
        ORDER BY layer_type
      `;
      const [scoreRow] = await db`
        SELECT data_completeness_score AS score
        FROM projects
        WHERE id = ${req.projectId}
      `;
      return { data: { score: (scoreRow?.score as number | null) ?? null, layers }, meta: undefined, error: null };
    },
  );

  // GET /projects/:id/my-role — current user's role on this project
  fastify.get<{ Params: { id: string } }>(
    '/:id/my-role',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      return { data: { role: req.projectRole }, meta: undefined, error: null };
    },
  );
}
