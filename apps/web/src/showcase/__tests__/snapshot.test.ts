import { describe, it, expect } from 'vitest';
import { loadSnapshot, type ShowcaseSnapshot } from '../data/snapshot';

describe('loadSnapshot', () => {
  it('parses the static JSON shape', async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({
        project: { id: 'p1', name: 'Three Streams Farm' },
        layers: [], designFeatures: [], regenerationEvents: [],
        spiritualZones: [], relationships: [],
      }),
    });
    const snap: ShowcaseSnapshot = await loadSnapshot({ fetchImpl: fakeFetch as any });
    expect(snap.project.name).toContain('Three Streams');
  });
});
