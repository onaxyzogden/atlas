import type { FastifyInstance } from 'fastify';
import { NotFoundError } from '../../lib/errors.js';

export default async function pipelineRoutes(fastify: FastifyInstance) {
  const { db, authenticate } = fastify;

  // GET /pipeline/jobs/:projectId — all jobs for a project
  fastify.get<{ Params: { projectId: string } }>(
    '/jobs/:projectId',
    { preHandler: [authenticate] },
    async (req) => {
      const jobs = await db`
        SELECT j.id, j.job_type, j.status, j.attempt_count,
               j.error_message, j.result_summary,
               j.started_at, j.completed_at, j.created_at
        FROM data_pipeline_jobs j
        JOIN projects p ON p.id = j.project_id
        WHERE j.project_id = ${req.params.projectId}
          AND p.owner_id = ${req.userId}
        ORDER BY j.created_at DESC
        LIMIT 50
      `;
      return { data: jobs, meta: { total: jobs.length }, error: null };
    },
  );

  // GET /pipeline/job/:jobId — single job status (for polling)
  fastify.get<{ Params: { jobId: string } }>(
    '/job/:jobId',
    { preHandler: [authenticate] },
    async (req) => {
      const [job] = await db`
        SELECT j.id, j.job_type, j.status, j.attempt_count,
               j.error_message, j.result_summary,
               j.started_at, j.completed_at, j.created_at
        FROM data_pipeline_jobs j
        JOIN projects p ON p.id = j.project_id
        WHERE j.id = ${req.params.jobId}
          AND p.owner_id = ${req.userId}
      `;
      if (!job) throw new NotFoundError('Job', req.params.jobId);
      return { data: job, meta: undefined, error: null };
    },
  );
}
