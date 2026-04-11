/**
 * Export routes — PDF export generation and listing.
 *
 * POST /:id/exports — generate a new PDF export
 * GET  /:id/exports — list previous exports for a project
 */

import type { FastifyInstance } from 'fastify';
import { CreateExportInput } from '@ogden/shared';
import { PdfExportService } from '../../services/pdf/PdfExportService.js';
import { logActivity } from '../../lib/activityLog.js';

export default async function exportRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // POST /projects/:id/exports — generate a PDF export
  fastify.post<{ Params: { id: string } }>(
    '/:id/exports',
    {
      preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer')],
      bodyLimit: 50 * 1024 * 1024, // 50 MB for embedded photos in field notes
    },
    async (req, reply) => {
      const body = CreateExportInput.parse(req.body);
      const service = new PdfExportService(db, req.userId);
      const result = await service.generate(req.projectId, body.exportType, body.payload);

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'export_generated',
        entityType: 'export',
        entityId: (result as unknown as Record<string, unknown>).id as string,
        metadata: { exportType: body.exportType },
      });

      // Broadcast to other project members via WebSocket
      const exportResult = result as unknown as Record<string, unknown>;
      fastify.wsBroadcast(req.projectId, {
        type: 'export_ready',
        payload: {
          id: exportResult.id,
          exportType: body.exportType,
          storageUrl: exportResult.storageUrl ?? exportResult.storage_url ?? null,
        },
        userId: req.userId,
        userName: null,
        timestamp: new Date().toISOString(),
      }, req.userId);

      reply.code(201);
      return { data: result, meta: undefined, error: null };
    },
  );

  // GET /projects/:id/exports — list previous exports
  fastify.get<{ Params: { id: string } }>(
    '/:id/exports',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const rows = await db`
        SELECT
          pe.id, pe.project_id, pe.export_type,
          pe.storage_url, pe.generated_at
        FROM project_exports pe
        WHERE pe.project_id = ${req.projectId}
        ORDER BY pe.generated_at DESC
      `;

      return {
        data: rows.map((r) => ({
          id: r.id,
          projectId: r.project_id,
          exportType: r.export_type,
          storageUrl: r.storage_url,
          generatedAt: r.generated_at,
        })),
        meta: { total: rows.length },
        error: null,
      };
    },
  );
}
