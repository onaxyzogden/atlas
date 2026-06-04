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
  // Note: api.files.upload currently REJECTS (throws ApiError) on a non-2xx /
  // error response, so that failure mode propagates out of this await directly.
  // The env.error guard below is forward-defensive in case files.upload ever
  // moves to the request()-style envelope contract used elsewhere in apiClient.
  const env = await api.files.upload(serverId, file);
  if (env.error) throw new Error(env.error.message);
  const url = env.data?.storageUrl;
  if (!url) throw new Error('Upload returned no storageUrl');
  return url;
}
