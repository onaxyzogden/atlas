/**
 * bufferBboxKm — unit tests covering the latitude-aware longitude buffer.
 */

import { describe, it, expect } from 'vitest';
import { bufferBboxKm, BUFFER_COSLAT_FLOOR, KM_PER_DEG_LAT } from './bufferBboxKm.js';

describe('bufferBboxKm', () => {
  it('latitude buffer is bufferKm / 111 regardless of latitude', () => {
    const eq = bufferBboxKm({ minLng: 0, minLat: 0, maxLng: 1, maxLat: 1 }, 11.1);
    const hi = bufferBboxKm({ minLng: 0, minLat: 60, maxLng: 1, maxLat: 60.5 }, 11.1);
    const eqLatBuf = (eq.maxLat - 1);
    const hiLatBuf = (hi.maxLat - 60.5);
    expect(eqLatBuf).toBeCloseTo(11.1 / KM_PER_DEG_LAT, 8);
    expect(hiLatBuf).toBeCloseTo(11.1 / KM_PER_DEG_LAT, 8);
  });

  it('longitude buffer at the equator equals latitude buffer', () => {
    const out = bufferBboxKm({ minLng: 0, minLat: 0, maxLng: 1, maxLat: 0 }, 11.1);
    const lngBuf = (out.maxLng - 1);
    const latBuf = (out.maxLat - 0);
    expect(lngBuf).toBeCloseTo(latBuf, 8);
  });

  it('longitude buffer at 60° N is ~2× the latitude buffer (cos 60° = 0.5)', () => {
    const out = bufferBboxKm({ minLng: 0, minLat: 60, maxLng: 1, maxLat: 60 }, 11.1);
    const lngBuf = (out.maxLng - 1);
    const latBuf = (out.maxLat - 60);
    expect(lngBuf / latBuf).toBeCloseTo(2, 4);
  });

  it('floors cosLat at 0.1 near the poles to cap longitude expansion at 10×', () => {
    // At 89° latitude, cos ≈ 0.017 — well below the floor.
    const out = bufferBboxKm({ minLng: 0, minLat: 89, maxLng: 1, maxLat: 89 }, 11.1);
    const lngBuf = (out.maxLng - 1);
    const latBuf = (out.maxLat - 89);
    // Without the floor, lngBuf/latBuf would be ~57; with floor it's exactly 1/0.1 = 10.
    expect(lngBuf / latBuf).toBeCloseTo(1 / BUFFER_COSLAT_FLOOR, 4);
  });

  it('does not mutate the input bbox', () => {
    const input = { minLng: -80, minLat: 40, maxLng: -79, maxLat: 41 };
    const before = { ...input };
    bufferBboxKm(input, 5);
    expect(input).toEqual(before);
  });

  it('uses mean of minLat/maxLat for the cosine factor', () => {
    // Bbox spanning lat 50..70: meanLat = 60 → cos = 0.5 → lng buffer = 2× lat
    const out = bufferBboxKm({ minLng: 0, minLat: 50, maxLng: 0, maxLat: 70 }, 11.1);
    const lngBuf = out.maxLng - 0;
    const latBuf = out.maxLat - 70;
    expect(lngBuf / latBuf).toBeCloseTo(2, 3);
  });

  it('zero bufferKm returns the input bbox unchanged', () => {
    const input = { minLng: -80, minLat: 40, maxLng: -79, maxLat: 41 };
    const out = bufferBboxKm(input, 0);
    expect(out).toEqual(input);
  });
});
