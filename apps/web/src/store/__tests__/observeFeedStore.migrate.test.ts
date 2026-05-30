// @vitest-environment happy-dom
/**
 * observeFeedStore - Stratum-rename persistence migration tests (Slice 4.2).
 *
 * The v1 -> v2 `migrate` renumbers each entry's `feedKey` (the parent Plan
 * objective slug, t{n}- -> s{n+1}-, via remapId) and preserves every other
 * field verbatim. Off-pattern feedKeys (a future OLOS {domain}--{stage} id)
 * pass through untouched - the safety backstop proving the five `ogden-olos-*`
 * stores are inert under this remap.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useObserveFeedStore,
  migrateObserveFeed,
  type ObserveFeedEntry,
} from '../observeFeedStore.js';

const PERSIST_KEY = 'ogden-observe-feed';

interface LooseFeedState {
  byProject: Record<string, ObserveFeedEntry[]>;
}

function reset(): void {
  useObserveFeedStore.setState({ byProject: {} });
  window.localStorage.clear();
}

const baseEntry = (over: Partial<ObserveFeedEntry>): ObserveFeedEntry => ({
  id: 'e-0',
  projectId: 'proj-A',
  feedKey: 't0-vision',
  sourceType: 'verified',
  sourceActionId: 'fa-0',
  sourceActionTitle: 'Walk perimeter',
  proofItems: [],
  capturedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('migrateObserveFeed (v1 -> v2): feedKey renumber', () => {
  const v1 = {
    byProject: {
      'proj-A': [
        baseEntry({ id: 'e-1', feedKey: 't0-vision' }),
        baseEntry({
          id: 'e-2',
          feedKey: 'rf-t1-landscape-context',
          sourceType: 'diverged',
          divergenceNote: 'wetter than mapped',
        }),
      ],
    },
  };

  it('renumbers feedKey via remapId on every entry', () => {
    const out = migrateObserveFeed(v1, 1) as unknown as LooseFeedState;
    expect(out.byProject['proj-A']!.map((e) => e.feedKey)).toEqual([
      's1-vision',
      'rf-s2-landscape-context',
    ]);
  });

  it('preserves every other field verbatim (only feedKey changes)', () => {
    const out = migrateObserveFeed(v1, 1) as unknown as LooseFeedState;
    const e2 = out.byProject['proj-A']![1]!;
    expect(e2).toEqual({
      ...baseEntry({
        id: 'e-2',
        sourceType: 'diverged',
        divergenceNote: 'wetter than mapped',
      }),
      feedKey: 'rf-s2-landscape-context',
    });
  });

  it('preserves entry order, count, and projectId keys', () => {
    const out = migrateObserveFeed(v1, 1) as unknown as LooseFeedState;
    expect(Object.keys(out.byProject)).toEqual(['proj-A']);
    expect(out.byProject['proj-A']!).toHaveLength(2);
  });
});

describe('migrateObserveFeed - off-pattern + safety', () => {
  it('passes an OLOS {domain}--{stage} feedKey through untouched', () => {
    const out = migrateObserveFeed(
      { byProject: { p: [baseEntry({ feedKey: 'vision-intent--plan' })] } },
      1,
    ) as unknown as LooseFeedState;
    expect(out.byProject.p![0]!.feedKey).toBe('vision-intent--plan');
  });

  it('is a no-op on already-migrated s{n} feedKeys', () => {
    const out = migrateObserveFeed(
      { byProject: { p: [baseEntry({ feedKey: 's1-vision' })] } },
      1,
    ) as unknown as LooseFeedState;
    expect(out.byProject.p![0]!.feedKey).toBe('s1-vision');
  });

  it('passes v2 input through (version gate) and tolerates null', () => {
    const out = migrateObserveFeed(
      { byProject: { p: [baseEntry({ feedKey: 't0-vision' })] } },
      2,
    ) as unknown as LooseFeedState;
    expect(out.byProject.p![0]!.feedKey).toBe('t0-vision');
    const fromNull = migrateObserveFeed(null, 1) as unknown as LooseFeedState;
    expect(fromNull.byProject).toEqual({});
  });
});

describe('observeFeedStore persist lifecycle: v1 blob -> rehydrate', () => {
  beforeEach(() => reset());

  it('rehydrates so the feed entry routes under the renamed key', async () => {
    window.localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        state: {
          byProject: {
            'proj-A': [baseEntry({ id: 'e-9', feedKey: 't4-water-strategy' })],
          },
        },
        version: 1,
      }),
    );

    await useObserveFeedStore.persist.rehydrate();

    const s = useObserveFeedStore.getState();
    expect(s.countByFeedKey('proj-A', 's5-water-strategy')).toBe(1);
    expect(s.countByFeedKey('proj-A', 't4-water-strategy')).toBe(0);
    expect(s.getByProject('proj-A')).toHaveLength(1);
  });
});
