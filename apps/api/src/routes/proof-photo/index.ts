/**
 * Proof photo stub endpoint — Phase 3 Slice 3.4.
 *
 * POST /api/v1/projects/:id/proof-photo
 *
 * Accepts a multipart upload (file + actionId + slotId fields) and writes
 * the binary to apps/api/data/proof-photos/{projectId}/{actionId}/{slotId}.{ext}.
 * Returns a synthetic `assetUri` of the form `storage://proof-photos/...`.
 *
 * This is the local-first stub backend per the Phase 3 locked decision —
 * a real CDN / S3 path is deferred to a follow-up engineering task. The
 * sync queue drives uploads from the field-action store; the client swaps
 * its `idb://` URI for the returned `storage://` URI on success.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../lib/errors.js';

const PROOF_PHOTO_ROOT = path.resolve(process.cwd(), 'data', 'proof-photos');

const SAFE_SEGMENT = /^[A-Za-z0-9._:-]+$/;

function sanitiseSegment(value: string, field: string): string {
  if (!SAFE_SEGMENT.test(value)) {
    throw new ValidationError(
      `${field} must be alphanumeric (._:- allowed) — got "${value}"`,
    );
  }
  return value;
}

function extensionFor(filename: string | undefined, mimetype: string | undefined): string {
  if (filename) {
    const ext = path.extname(filename).replace(/^\./, '').toLowerCase();
    if (ext && /^[a-z0-9]{1,6}$/.test(ext)) return ext;
  }
  if (mimetype) {
    const subtype = mimetype.split('/')[1]?.split(';')[0]?.toLowerCase() ?? '';
    if (subtype === 'jpeg') return 'jpg';
    if (subtype && /^[a-z0-9]{1,6}$/.test(subtype)) return subtype;
  }
  return 'bin';
}

export default async function proofPhotoRoutes(fastify: FastifyInstance) {
  const { authenticate, resolveProjectRole, requireRole } = fastify;

  fastify.post<{ Params: { id: string } }>(
    '/:id/proof-photo',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer')] },
    async (req, reply) => {
      const multipartFile = await req.file();
      if (!multipartFile) {
        throw new ValidationError('No file uploaded');
      }

      const fields = multipartFile.fields as Record<
        string,
        { value?: string } | undefined
      >;
      const actionIdRaw = fields.actionId?.value;
      const slotIdRaw = fields.slotId?.value;
      if (!actionIdRaw) throw new ValidationError('Missing actionId field');
      if (!slotIdRaw) throw new ValidationError('Missing slotId field');

      const projectId = sanitiseSegment(req.projectId, 'projectId');
      const actionId = sanitiseSegment(actionIdRaw, 'actionId');
      const slotId = sanitiseSegment(slotIdRaw, 'slotId');

      const chunks: Buffer[] = [];
      for await (const chunk of multipartFile.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const ext = extensionFor(multipartFile.filename, multipartFile.mimetype);
      const relativePath = path.posix.join(projectId, actionId, `${slotId}.${ext}`);
      const absoluteDir = path.join(PROOF_PHOTO_ROOT, projectId, actionId);
      const absolutePath = path.join(absoluteDir, `${slotId}.${ext}`);

      await fs.mkdir(absoluteDir, { recursive: true });
      await fs.writeFile(absolutePath, buffer);

      const assetUri = `storage://proof-photos/${relativePath}`;

      reply.code(201);
      return {
        data: {
          assetUri,
          sizeBytes: buffer.length,
          mimetype: multipartFile.mimetype ?? 'application/octet-stream',
        },
        meta: undefined,
        error: null,
      };
    },
  );
}
