/**
 * StorageProvider — abstraction for file storage.
 * S3 in production, local filesystem in development when S3_BUCKET is not set.
 */

import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { config } from '../../lib/config.js';

// ─── Interface ──────────────────────────────────────────────────────────────

export interface StorageProvider {
  /** Upload a file and return its public/accessible URL. */
  upload(key: string, body: Buffer, contentType: string): Promise<string>;
  /** Delete a file by key. */
  delete(key: string): Promise<void>;
  /** Get the URL for a stored file. */
  getUrl(key: string): string;
}

// ─── S3 Implementation ─────────────────────────────────────────────────────

class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private region: string;
  private endpoint: string | undefined;

  constructor() {
    this.bucket = config.S3_BUCKET!;
    this.region = config.S3_REGION;
    this.endpoint = config.S3_ENDPOINT ?? undefined;

    this.client = new S3Client({
      region: this.region,
      ...(this.endpoint ? { endpoint: this.endpoint, forcePathStyle: true } : {}),
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  getUrl(key: string): string {
    if (this.endpoint) {
      // MinIO or custom endpoint — use path-style URL
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

// ─── Local Filesystem Implementation ────────────────────────────────────────

class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    // Store uploads relative to the API working directory
    this.baseDir = join(process.cwd(), 'data', 'uploads');
  }

  async upload(key: string, body: Buffer, _contentType: string): Promise<string> {
    const filePath = join(this.baseDir, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.baseDir, key);
    try {
      await unlink(filePath);
    } catch {
      // File may already be deleted — ignore
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

let instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!instance) {
    if (config.S3_BUCKET) {
      console.log(`[Storage] Using S3 bucket: ${config.S3_BUCKET}`);
      instance = new S3StorageProvider();
    } else {
      console.log('[Storage] S3_BUCKET not set — using local filesystem');
      instance = new LocalStorageProvider();
    }
  }
  return instance;
}
