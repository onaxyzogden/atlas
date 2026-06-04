/**
 * uploadProofFile - upload a binary proof (photo/video/document/...) via the
 * existing project-files endpoint and return its storage URL, ready to be
 * written into ProofRecord.fileUri. Addressed by the SERVER project id.
 *
 * Reuses api.files.upload (multipart -> S3/local + project_files row + EXIF/geo
 * parsing) rather than introducing a proof-specific upload route.
 */
import { api } from '../../../lib/apiClient.js';

export async function uploadProofFile(serverId: string, file: File): Promise<string> {
  const env = await api.files.upload(serverId, file);
  if (env.error) throw new Error(env.error.message);
  const url = env.data?.storageUrl;
  if (!url) throw new Error('Upload returned no storageUrl');
  return url;
}
