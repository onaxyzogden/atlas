import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateProjectInput, UpdateProjectInput, ProjectSummary, toCamelCase } from '@ogden/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { getLatestAiOutputsForProject } from '../../services/ai/AiOutputWriter.js';

const BUILTIN_PROJECT_ID = '00000000-0000-0000-0000-0000005a3791';

export default async function projectRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /projects/builtins — public; returns the 351 House demo project (no auth required).
  // Must be registered before /:id to prevent Fastify matching "builtins" as a param value.
  fastify.get('/builtins', async () => {
    const [project] = await db`
      SELECT
        p.id, p.name, p.description, p.status, p.project_type,
        p.country, p.province_state, p.conservation_auth_id,
        p.address, p.parcel_id,
        p.acreage::float8                   AS acreage,
        p.data_completeness_score::float8   AS data_completeness_score,
        (p.parcel_boundary IS NOT NULL)     AS has_parcel_boundary,
        p.metadata,
        p.created_at, p.updated_at
      FROM projects p
      WHERE p.id = ${BUILTIN_PROJECT_ID}
    `;
    if (!project) throw new NotFoundError('Project', BUILTIN_PROJECT_ID);
    return { data: [ProjectSummary.parse(toCamelCase(project))], meta: { total: 1 }, error: null };
  });

  // GET /projects/builtins/assessment — public; returns the 351 House site assessment + terrain (no auth).
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

    return { data: { ...toCamelCase(assessment), terrainAnalysis }, error: null };
  });

  // GET /projects — list current user's projects (owned + shared)
  fastify.get('/', { preHandler: [authenticate] }, async (req) => {
    const rows = await db`
      SELECT DISTINCT ON (p.id)
        p.id, p.name, p.description, p.status, p.project_type,
        p.country, p.province_state, p.conservation_auth_id,
        p.address, p.parcel_id, p.acreage,
        p.data_completeness_score,
        (p.parcel_boundary IS NOT NULL) AS has_parcel_boundary,
        p.created_at, p.updated_at
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ${req.userId}
      WHERE (p.owner_id = ${req.userId} OR pm.user_id IS NOT NULL)
        AND p.status != 'archived'
      ORDER BY p.id, p.updated_at DESC
    `;
    return { data: rows.map((r) => ProjectSummary.parse(toCamelCase(r))), meta: { total: rows.length }, error: null };
  });

  // POST /projects — create a new project and enqueue Tier 1 data pipeline
  fastify.post('/', { preHandler: [authenticate] }, async (req, reply) => {
    const body = CreateProjectInput.parse(req.body);

    const [project] = await db`
      INSERT INTO projects (
        owner_id, name, description, project_type,
        country, province_state, units, metadata
      ) VALUES (
        ${req.userId}, ${body.name}, ${body.description ?? null},
        ${body.projectType ?? null}, ${body.country}, ${body.provinceState ?? null},
        ${body.units}, ${db.json((body.metadata ?? {}) as never)}
      )
      RETURNING id, name, description, status, project_type, country, province_state,
                conservation_auth_id, address, parcel_id, acreage,
                data_completeness_score, parcel_boundary IS NOT NULL AS has_parcel_boundary,
                metadata, created_at, updated_at
    `;

    // Enqueue Tier 1 data pipeline job (will run once boundary is set)
    await db`
      INSERT INTO data_pipeline_jobs (project_id, job_type, status)
      VALUES (${project!.id}, 'fetch_tier1', 'queued')
    `;
    if (fastify.pipeline) {
      await fastify.pipeline.enqueueTier1Fetch(project!.id);
    }

    reply.code(201);
    return { data: ProjectSummary.parse(toCamelCase(project)), meta: undefined, error: null };
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
          p.address, p.parcel_id, p.acreage,
          p.data_completeness_score,
          (p.parcel_boundary IS NOT NULL) AS has_parcel_boundary,
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
                  conservation_auth_id, address, parcel_id, acreage,
                  data_completeness_score, parcel_boundary IS NOT NULL AS has_parcel_boundary,
                  created_at, updated_at
      `;
      return { data: ProjectSummary.parse(toCamelCase(updated)), meta: undefined, error: null };
    },
  );

  // POST /projects/:id/boundary — set or replace parcel boundary (owner only)
  fastify.post<{ Params: { id: string } }>(
    '/:id/boundary',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner')] },
    async (req) => {
      const body = z.object({ geojson: z.unknown() }).parse(req.body);
      const geojsonStr = JSON.stringify(body.geojson);

      const [updated] = await db`
        UPDATE projects SET
          parcel_boundary = ST_Multi(ST_GeomFromGeoJSON(${geojsonStr})),
          centroid        = ST_Centroid(ST_GeomFromGeoJSON(${geojsonStr})),
          acreage         = ST_Area(
            ST_Transform(ST_GeomFromGeoJSON(${geojsonStr}), 26917)
          ) / 4046.86
        WHERE id = ${req.projectId}
        RETURNING id, acreage,
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
