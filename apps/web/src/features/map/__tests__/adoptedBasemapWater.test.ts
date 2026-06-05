// Coverage gap: `findWaterPolygonLayerIds` and `findWaterwayLineLayerIds`
// wrap `map.getStyle()` and are intentionally not covered — mocking the
// full MapLibre style API for what is effectively a one-line
// source-layer filter would over-invest relative to the precedent set
// by `adoptedBasemapBuildings.ts` (no test file). Real-world coverage
// for the discovery helpers comes from the in-browser smoke walk.

import { describe, it, expect } from 'vitest';
import {
  inferWaterbodyKind,
  inferWatercourseKind,
} from '../adoptedBasemapWater.js';

describe('inferWaterbodyKind', () => {
  it('maps OMT class=lake to lake', () => {
    expect(inferWaterbodyKind({ class: 'lake' })).toBe('lake');
  });

  it('maps OMT class=pond to pond', () => {
    expect(inferWaterbodyKind({ class: 'pond' })).toBe('pond');
  });

  it('maps OMT class=wetland to wetland', () => {
    expect(inferWaterbodyKind({ class: 'wetland' })).toBe('wetland');
  });

  it('collapses OMT class=swamp to wetland', () => {
    expect(inferWaterbodyKind({ class: 'swamp' })).toBe('wetland');
  });

  it('maps OMT class=reservoir to reservoir', () => {
    expect(inferWaterbodyKind({ class: 'reservoir' })).toBe('reservoir');
  });

  it('collapses OMT class=basin to reservoir', () => {
    expect(inferWaterbodyKind({ class: 'basin' })).toBe('reservoir');
  });

  it('returns other for an unknown class', () => {
    expect(inferWaterbodyKind({ class: 'ocean' })).toBe('other');
  });

  it('returns other for null/undefined/non-string class', () => {
    expect(inferWaterbodyKind(null)).toBe('other');
    expect(inferWaterbodyKind(undefined)).toBe('other');
    expect(inferWaterbodyKind({})).toBe('other');
    expect(inferWaterbodyKind({ class: 123 })).toBe('other');
  });
});

describe('inferWatercourseKind', () => {
  it('maps OMT class=stream to stream', () => {
    expect(inferWatercourseKind({ class: 'stream' })).toBe('stream');
  });

  it('collapses OMT class=river to stream', () => {
    expect(inferWatercourseKind({ class: 'river' })).toBe('stream');
  });

  it('collapses canal/drain/ditch to ditch', () => {
    expect(inferWatercourseKind({ class: 'canal' })).toBe('ditch');
    expect(inferWatercourseKind({ class: 'drain' })).toBe('ditch');
    expect(inferWatercourseKind({ class: 'ditch' })).toBe('ditch');
  });

  it('returns other for unknown / missing class', () => {
    expect(inferWatercourseKind({ class: 'tidal-channel' })).toBe('other');
    expect(inferWatercourseKind(null)).toBe('other');
    expect(inferWatercourseKind(undefined)).toBe('other');
    expect(inferWatercourseKind({})).toBe('other');
  });
});
