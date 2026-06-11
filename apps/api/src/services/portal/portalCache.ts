/**
 * portalCache — Redis cache for the public portal payload.
 *
 * Key shape: `portal:v1:${shareToken}`. TTL is 5 min as a safety net only —
 * the authenticated mutation routes (`routes/portal/index.ts`) explicitly
 * invalidate on every write, so the TTL just bounds staleness if an
 * invalidation is ever lost (e.g. Redis timeout during the mutation).
 *
 * Only published-success payloads are cached — NEVER cache a 404. Negative
 * caching would (a) delay unpublish, which must take effect immediately, and
 * (b) let an attacker probing random tokens grow the keyspace unbounded.
 *
 * Best-effort: every Redis call is wrapped in a 200 ms timeout + try/catch.
 * Callers must tolerate a `get` returning null and a `set`/`del` silently
 * no-op'ing (the route then simply falls through to PostgreSQL).
 */
import type { Redis } from 'ioredis';

const KEY_PREFIX = 'portal:v1';
const TTL_SECONDS = 5 * 60;
const TIMEOUT_MS = 200;

/** Shape of the public route's `data` payload (camelCase, post-mapping). */
export interface PublicPortalPayload {
  id: unknown;
  projectId: unknown;
  shareToken: unknown;
  isPublished: unknown;
  config: unknown;
  dataMaskingLevel: unknown;
  publishedAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
  projectName: unknown;
}

export function portalCacheKey(shareToken: string): string {
  return `${KEY_PREFIX}:${shareToken}`;
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('redis-timeout')), TIMEOUT_MS),
    ),
  ]);
}

export async function getCachedPortal(
  redis: Redis,
  shareToken: string,
): Promise<PublicPortalPayload | null> {
  try {
    const raw = await withTimeout(redis.get(portalCacheKey(shareToken)));
    if (!raw) return null;
    return JSON.parse(raw) as PublicPortalPayload;
  } catch {
    return null;
  }
}

export async function setCachedPortal(
  redis: Redis,
  shareToken: string,
  value: PublicPortalPayload,
): Promise<void> {
  try {
    await withTimeout(
      redis.setex(portalCacheKey(shareToken), TTL_SECONDS, JSON.stringify(value)),
    );
  } catch {
    /* silent — cache write failures must not surface to callers */
  }
}

export async function invalidateCachedPortal(
  redis: Redis,
  shareToken: string,
): Promise<void> {
  try {
    await withTimeout(redis.del(portalCacheKey(shareToken)));
  } catch {
    /* silent — the 5-min TTL bounds staleness if the del is lost */
  }
}
