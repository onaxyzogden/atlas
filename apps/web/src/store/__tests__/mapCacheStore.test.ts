import { describe, it, expect, beforeEach } from 'vitest';
import { useMapCacheStore } from '../mapCacheStore.js';

const P = 'proj-1';
const TS = '2026-06-15T10:00:00.000Z';
const TS2 = '2026-06-15T12:00:00.000Z';

beforeEach(() => {
  useMapCacheStore.setState({ byProject: {} });
});

describe('mapCacheStore — status transitions', () => {
  it('setBasemapStatus creates an entry and updates status without losing count', () => {
    const st = useMapCacheStore.getState();
    st.setBasemapStatus(P, 'topographic', 'caching');
    expect(st.getBasemapEntry(P, 'topographic')).toEqual({
      status: 'caching',
      tilesCached: 0,
      lastCachedAt: null,
    });

    st.recordCacheResult(P, 'topographic', 120, TS);
    st.setBasemapStatus(P, 'topographic', 'error');
    // Count + timestamp survive a later status-only update.
    expect(st.getBasemapEntry(P, 'topographic')).toEqual({
      status: 'error',
      tilesCached: 120,
      lastCachedAt: TS,
    });
  });

  it('recordCacheResult marks ready with count + timestamp', () => {
    const st = useMapCacheStore.getState();
    st.recordCacheResult(P, 'satellite', 300, TS);
    expect(st.getBasemapEntry(P, 'satellite')).toEqual({
      status: 'ready',
      tilesCached: 300,
      lastCachedAt: TS,
    });
  });

  it('getBasemapEntry returns undefined for an unknown project/basemap', () => {
    const st = useMapCacheStore.getState();
    expect(st.getBasemapEntry('nope', 'street')).toBeUndefined();
  });
});

describe('mapCacheStore — getProjectStatus rollup', () => {
  it('returns the empty rollup for a project with no entries', () => {
    const st = useMapCacheStore.getState();
    expect(st.getProjectStatus('empty')).toEqual({
      allReady: false,
      anyCaching: false,
      anyReady: false,
      totalTiles: 0,
      oldestCachedAt: null,
    });
  });

  it('aggregates counts, flags, and the oldest ready timestamp', () => {
    const st = useMapCacheStore.getState();
    st.recordCacheResult(P, 'satellite', 200, TS2);
    st.recordCacheResult(P, 'topographic', 100, TS);
    st.setBasemapStatus(P, 'street', 'caching');

    const roll = st.getProjectStatus(P);
    expect(roll.totalTiles).toBe(300);
    expect(roll.anyReady).toBe(true);
    expect(roll.anyCaching).toBe(true);
    expect(roll.allReady).toBe(false); // street is still caching
    expect(roll.oldestCachedAt).toBe(TS); // earlier of the two ready stamps
  });

  it('allReady is true only when every entry is ready', () => {
    const st = useMapCacheStore.getState();
    st.recordCacheResult(P, 'satellite', 10, TS);
    st.recordCacheResult(P, 'hybrid', 20, TS2);
    expect(st.getProjectStatus(P).allReady).toBe(true);
  });
});
