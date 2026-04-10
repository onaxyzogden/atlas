/**
 * File upload routes — POST, GET, DELETE for project files.
 * Handles multipart upload, S3 storage, and sync parsing for small geo files.
 */

import type { FastifyInstance } from 'fastify';
import { toCamelCase, FILE_SIZE_LIMITS, type FileType } from '@ogden/shared';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors.js';
import { getStorageProvider } from '../../services/storage/StorageProvider.js';
import {
  classifyFileType,
  isGeoFile,
  parseGeoFile,
  extractExifGeotag,
  parseSoilCSV,
} from '../../services/files/fileProcessor.js';

/** Max size for synchronous geo parsing (10 MB). Larger files would go to BullMQ. */
const SYNC_PARSE_LIMIT = 10 * 1024 * 1024;

export default async function fileRoutes(fastify: FastifyInstance) {
  const { db, authenticate } = fastify;
  const storage = getStorageProvider();

  // ── Helper: verify project ownership ───────────────────────────────────

  async function verifyOwnership(projectId: string, userId: string) {
    const [project] = await db`
      SELECT id, owner_id FROM projects WHERE id = ${projectId}
    `;
    if (!project) throw new NotFoundError('Project', projectId);
    if (project.owner_id !== userId) throw new ForbiddenError('You do not own this project');
    return project;
  }

  // ── POST /projects/:id/files ──────────────────────────────────────────

  fastify.post<{ Params: { id: string } }>(
    '/:id/files',
    { preHandler: [authenticate] },
    async (req, reply) => {
      await verifyOwnership(req.params.id, req.userId);

      // Consume multipart file
      const multipartFile = await req.file();
      if (!multipartFile) {
        throw new ValidationError('No file uploaded');
      }

      const filename = multipartFile.filename;
      const fileType = classifyFileType(filename);

      // Buffer the file (needed for both S3 upload and parsing)
      const chunks: Buffer[] = [];
      for await (const chunk of multipartFile.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const fileSizeBytes = buffer.length;

      // Validate file size per type
      const sizeLimit = FILE_SIZE_LIMITS[fileType as FileType] ?? FILE_SIZE_LIMITS.document;
      if (fileSizeBytes > sizeLimit) {
        throw new ValidationError(
          `File too large: ${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB exceeds the ${(sizeLimit / (1024 * 1024)).toFixed(0)} MB limit for ${fileType} files`,
        );
      }

      // Generate storage key
      const fileId = crypto.randomUUID();
      const sanitizedName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `projects/${req.params.id}/files/${fileId}/${sanitizedName}`;

      // Upload to storage
      const contentType = multipartFile.mimetype || 'application/octet-stream';
      const storageUrl = await storage.upload(storageKey, buffer, contentType);

      // Process file based on type
      let processingStatus = 'pending';
      let processedGeojson: unknown = null;
      let metadata: Record<string, unknown> | null = null;
      let confidence: string | null = null;

      try {
        if (isGeoFile(fileType) && fileSizeBytes <= SYNC_PARSE_LIMIT) {
          // Synchronous geo parsing for small files
          const result = await parseGeoFile(buffer, filename);
          processedGeojson = {
            geojson: result.geojson,
            featureCount: result.featureCount,
            geometryTypes: result.geometryTypes,
            bbox: result.bbox,
          };
          confidence = result.confidence;
          processingStatus = 'complete';
        } else if (fileType === 'photo') {
          // EXIF extraction is fast — always sync
          const exif = await extractExifGeotag(buffer);
          if (exif) {
            metadata = { exif };
            confidence = 'high';
          }
          processingStatus = 'complete';
        } else if (fileType === 'soil_test') {
          // CSV parsing is fast — sync
          const text = buffer.toString('utf-8');
          const soilResult = parseSoilCSV(text);
          if (soilResult) {
            const { confidence: soilConf, ...soilData } = soilResult;
            metadata = { soilTest: soilData };
            confidence = soilConf;
          }
          processingStatus = 'complete';
        } else if (isGeoFile(fileType) && fileSizeBytes > SYNC_PARSE_LIMIT) {
          // Large geo files — stay pending for future BullMQ processing
          processingStatus = 'pending';
        } else {
          // Documents and other types — just stored, no parsing
          processingStatus = 'complete';
        }
      } catch (err) {
        processingStatus = 'failed';
        metadata = { error: (err as Error).message };
      }

      // Insert into database
      const [row] = await db`
        INSERT INTO project_files (
          project_id, uploaded_by, filename, file_type, storage_url,
          file_size_bytes, processing_status, processed_geojson, metadata
        ) VALUES (
          ${req.params.id}, ${req.userId}, ${filename}, ${fileType},
          ${storageUrl}, ${fileSizeBytes}, ${processingStatus},
          ${processedGeojson ? JSON.stringify(processedGeojson) : null}::jsonb,
          ${metadata ? JSON.stringify(metadata) : null}::jsonb
        )
        RETURNING *
      `;

      reply.code(201);
      return {
        data: {
          ...toCamelCase<Record<string, unknown>>(row),
          confidence,
        },
        meta: undefined,
        error: null,
      };
    },
  );

  // ── GET /projects/:id/files ───────────────────────────────────────────

  fastify.get<{ Params: { id: string } }>(
    '/:id/files',
    { preHandler: [authenticate] },
    async (req) => {
      await verifyOwnership(req.params.id, req.userId);

      const rows = await db`
        SELECT * FROM project_files
        WHERE project_id = ${req.params.id}
        ORDER BY created_at DESC
      `;

      // Derive confidence from processed data
      const files = rows.map((row) => {
        let confidence: string | null = null;

        if (row.processed_geojson) {
          // Geo files — infer from feature quality
          confidence = 'medium';
        }
        if (row.metadata) {
          const meta = row.metadata as Record<string, unknown>;
          if (meta.exif && (meta.exif as Record<string, unknown>).lat) {
            confidence = 'high';
          }
          if (meta.soilTest) {
            const soil = meta.soilTest as Record<string, unknown>;
            const found = [soil.ph, soil.organicMatter, soil.texture].filter((v) => v != null).length;
            confidence = found >= 3 ? 'high' : found >= 2 ? 'medium' : 'low';
          }
        }

        return { ...toCamelCase<Record<string, unknown>>(row), confidence };
      });

      return { data: files, meta: { total: files.length }, error: null };
    },
  );

  // ── DELETE /projects/:id/files/:fileId ────────────────────────────────

  fastify.delete<{ Params: { id: string; fileId: string } }>(
    '/:id/files/:fileId',
    { preHandler: [authenticate] },
    async (req, reply) => {
      await verifyOwnership(req.params.id, req.userId);

      // Find the file
      const [file] = await db`
        SELECT id, storage_url FROM project_files
        WHERE id = ${req.params.fileId} AND project_id = ${req.params.id}
      `;
      if (!file) throw new NotFoundError('File', req.params.fileId);

      // Extract storage key from URL and delete from storage
      const storageUrl = file.storage_url as string;
      const keyMatch = storageUrl.match(/projects\/.+/);
      if (keyMatch) {
        try {
          await storage.delete(keyMatch[0]);
        } catch {
          // Storage deletion failure is non-fatal — log and continue
          console.warn(`[Files] Failed to delete storage object: ${keyMatch[0]}`);
        }
      }

      // Delete from database
      await db`DELETE FROM project_files WHERE id = ${req.params.fileId}`;

      reply.code(204);
      return { data: null, error: null };
    },
  );
}
