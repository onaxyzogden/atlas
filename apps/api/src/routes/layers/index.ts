import type { FastifyInstance } from 'fastify';
import { NotFoundError } from '../../lib/errors.js';
import type { LayerType } from '@ogden/shared';

export default async function layerRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole } = fastify;

  // GET /layers/project/:projectId — all layers for a project
  fastify.get<{ Params: { projectId: string } }>(
    '/project/:projectId',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const layers = await db`
        SELECT
          pl.id, pl.project_id, pl.layer_type, pl.source_api,
          pl.fetch_status, pl.confidence, pl.data_date, pl.attribution_text,
          pl.geojson_data, pl.summary_data, pl.raster_url, pl.wms_url, pl.wms_layers,
          pl.metadata, pl.fetched_at
        FROM project_layers pl
        WHERE pl.project_id = ${req.projectId}
        ORDER BY pl.layer_type
      `;
      return { data: layers, meta: { total: layers.length }, error: null };
    },
  );

  // GET /layers/project/:projectId/:layerType — single layer data
  fastify.get<{ Params: { projectId: string; layerType: LayerType } }>(
    '/project/:projectId/:layerType',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const [layer] = await db`
        SELECT pl.*
        FROM project_layers pl
        WHERE pl.project_id = ${req.projectId}
          AND pl.layer_type = ${req.params.layerType}
      `;
      if (!layer) throw new NotFoundError('Layer', req.params.layerType);
      return { data: layer, meta: undefined, error: null };
    },
  );

  // POST /layers/project/:projectId/:layerType/refresh — re-fetch from source API
  fastify.post<{ Params: { projectId: string; layerType: LayerType } }>(
    '/project/:projectId/:layerType/refresh',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req, reply) => {
      // Reset layer status and re-enqueue
      await db`
        UPDATE project_layers
        SET fetch_status = 'pending', fetched_at = NULL
        WHERE project_id = ${req.projectId}
          AND layer_type = ${req.params.layerType}
      `;

      // Skip if a job is already queued or running for this project
      const [existingJob] = await db`
        SELECT id FROM data_pipeline_jobs
        WHERE project_id = ${req.projectId}
          AND job_type = 'fetch_tier1'
          AND status IN ('queued', 'running')
        LIMIT 1
      `;

      if (existingJob) {
        reply.code(202);
        return { data: { jobId: existingJob.id, deduplicated: true }, meta: undefined, error: null };
      }

      const [job] = await db`
        INSERT INTO data_pipeline_jobs (project_id, job_type, status)
        VALUES (${req.projectId}, 'fetch_tier1', 'queued')
        RETURNING id
      `;

      if (fastify.pipeline) {
        await fastify.pipeline.enqueueTier1Fetch(req.projectId);
      }

      reply.code(202);
      return { data: { jobId: job!.id }, meta: undefined, error: null };
    },
  );
}
