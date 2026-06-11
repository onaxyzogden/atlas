import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Redis } from 'ioredis';
import {
  portalCacheKey,
  getCachedPortal,
  setCachedPortal,
  invalidateCachedPortal,
  type PublicPortalPayload,
} from '../services/portal/portalCache.js';

function makeStubRedis() {
  const store = new Map<string, string>();
  const getMock = vi.fn(async (key: string) => store.get(key) ?? null);
  const setexMock = vi.fn(async (key: string, _ttl: number, value: string) => {
    store.set(key, value);
    return 'OK' as const;
  });
  const delMock = vi.fn(async (key: string) => (store.delete(key) ? 1 : 0));
  return {
    redis: { get: getMock, setex: setexMock, del: delMock } as unknown as Redis,
    store,
    getMock,
    setexMock,
    delMock,
  };
}

const TOKEN = 'share-token-abc123';

const SAMPLE: PublicPortalPayload = {
  id: 'portal-1',
  projectId: 'proj-1',
  shareToken: TOKEN,
  isPublished: true,
  config: { slug: 'test-farm-portal', sections: ['hero'] },
  dataMaskingLevel: 'full',
  publishedAt: '2026-06-11T00:00:00.000Z',
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
  projectName: 'Test Farm',
};

describe('portalCacheKey', () => {
  it('produces a versioned canonical key from the share token', () => {
    expect(portalCacheKey(TOKEN)).toBe(`portal:v1:${TOKEN}`);
  });
});

describe('getCachedPortal / setCachedPortal / invalidateCachedPortal', () => {
  let stub: ReturnType<typeof makeStubRedis>;

  beforeEach(() => {
    stub = makeStubRedis();
  });

  it('round-trips a payload through set → get with 5-min TTL', async () => {
    await setCachedPortal(stub.redis, TOKEN, SAMPLE);
    expect(stub.setexMock).toHaveBeenCalledWith(
      `portal:v1:${TOKEN}`,
      5 * 60,
      JSON.stringify(SAMPLE),
    );
    const got = await getCachedPortal(stub.redis, TOKEN);
    expect(got).toEqual(SAMPLE);
  });

  it('returns null on cache miss', async () => {
    const got = await getCachedPortal(stub.redis, TOKEN);
    expect(got).toBeNull();
  });

  it('invalidate deletes the key so the next get misses', async () => {
    await setCachedPortal(stub.redis, TOKEN, SAMPLE);
    await invalidateCachedPortal(stub.redis, TOKEN);
    expect(stub.delMock).toHaveBeenCalledWith(`portal:v1:${TOKEN}`);
    const got = await getCachedPortal(stub.redis, TOKEN);
    expect(got).toBeNull();
  });

  it('returns null silently when redis.get throws (Redis down)', async () => {
    const broken = {
      get: vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    } as unknown as Redis;
    const got = await getCachedPortal(broken, TOKEN);
    expect(got).toBeNull();
  });

  it('does not throw when redis.setex rejects (cache write best-effort)', async () => {
    const broken = {
      setex: vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    } as unknown as Redis;
    await expect(setCachedPortal(broken, TOKEN, SAMPLE)).resolves.toBeUndefined();
  });

  it('does not throw when redis.del rejects (TTL bounds staleness)', async () => {
    const broken = {
      del: vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    } as unknown as Redis;
    await expect(invalidateCachedPortal(broken, TOKEN)).resolves.toBeUndefined();
  });

  it('returns null on malformed JSON in the cache', async () => {
    stub.store.set(`portal:v1:${TOKEN}`, '{not json');
    const got = await getCachedPortal(stub.redis, TOKEN);
    expect(got).toBeNull();
  });
});
