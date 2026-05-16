/**
 * regenerationTimeline — pure projection math for the RegenerationPlanCard's
 * multi-year SVG. Lays the steward-selected pathway methods onto a year
 * timeline: the sequential "spine" (ripping → cover-crop → amendment) sets
 * the critical path to productive use; conditional methods (managed grazing,
 * biochar) run concurrently inside the cover-crop window and must NOT extend
 * the total timeline — exactly mirroring buildRegenerationPathway's
 * critical-path semantics in v3/plan/data/regenerationPathway.ts.
 */

import { describe, it, expect } from 'vitest';
import {
  buildRegenerationTimeline,
  buildCanopyTrack,
} from '../regenerationTimeline.js';
import { buildRegenerationPathway } from '../../../v3/plan/data/regenerationPathway.js';
import { canopyAtAge } from '@ogden/shared';

describe('buildRegenerationTimeline', () => {
  it('returns an empty timeline for no selected methods', () => {
    const t = buildRegenerationTimeline([]);
    expect(t.segments).toEqual([]);
    expect(t.totalYears).toBe(0);
    expect(t.productiveYearOffset).toBe(0);
  });

  it('lays a single spine method from year 0 to its duration', () => {
    const t = buildRegenerationTimeline(['cover-crop-rebuild']);
    expect(t.segments).toHaveLength(1);
    const seg = t.segments[0];
    expect(seg?.id).toBe('cover-crop-rebuild');
    expect(seg?.startYear).toBe(0);
    expect(seg?.endYear).toBe(3);
    expect(seg?.concurrent).toBe(false);
    expect(t.totalYears).toBe(3);
  });

  it('lays the sequential core spine end-to-end (keyline → cover → compost)', () => {
    const t = buildRegenerationTimeline([
      'compost-amendment',
      'keyline-subsoiling',
      'cover-crop-rebuild',
    ]);
    // Sorted by method `order` regardless of input order.
    expect(t.segments.map((s) => s.id)).toEqual([
      'keyline-subsoiling',
      'cover-crop-rebuild',
      'compost-amendment',
    ]);
    const [rip, cover, compost] = t.segments;
    expect(rip?.startYear).toBe(0);
    expect(rip?.endYear).toBe(1);
    expect(cover?.startYear).toBe(1);
    expect(cover?.endYear).toBe(4);
    expect(compost?.startYear).toBe(4);
    expect(compost?.endYear).toBe(5);
    expect(t.totalYears).toBe(5);
    expect(t.productiveYearOffset).toBe(5);
  });

  it('matches buildRegenerationPathway critical-path total for the full high-compaction set', () => {
    const pathway = buildRegenerationPathway('high');
    const t = buildRegenerationTimeline(pathway.methods.map((m) => m.id));
    expect(t.totalYears).toBe(pathway.timelineToProductiveYears);
  });

  it('runs managed grazing concurrently — it does not extend the total timeline', () => {
    const spineOnly = buildRegenerationTimeline([
      'keyline-subsoiling',
      'cover-crop-rebuild',
      'compost-amendment',
    ]);
    const withGrazing = buildRegenerationTimeline([
      'keyline-subsoiling',
      'cover-crop-rebuild',
      'compost-amendment',
      'managed-grazing-compaction',
    ]);
    expect(withGrazing.totalYears).toBe(spineOnly.totalYears);
    const grazing = withGrazing.segments.find(
      (s) => s.id === 'managed-grazing-compaction',
    );
    expect(grazing?.concurrent).toBe(true);
    // Anchored to the cover-crop window (biology needs living cover first).
    expect(grazing?.startYear).toBe(1);
  });

  it('runs biochar concurrently within the spine, not appended after it', () => {
    const t = buildRegenerationTimeline([
      'keyline-subsoiling',
      'cover-crop-rebuild',
      'compost-amendment',
      'biochar-amendment',
    ]);
    const biochar = t.segments.find((s) => s.id === 'biochar-amendment');
    expect(biochar?.concurrent).toBe(true);
    expect(biochar?.endYear).toBeLessThanOrEqual(t.totalYears);
    expect(t.totalYears).toBe(5);
  });

  it('ignores unknown method ids', () => {
    const t = buildRegenerationTimeline(['cover-crop-rebuild', 'not-a-method']);
    expect(t.segments.map((s) => s.id)).toEqual(['cover-crop-rebuild']);
    expect(t.totalYears).toBe(3);
  });
});

describe('buildCanopyTrack', () => {
  const config = {
    speciesId: 'oak-tree',
    targetCanopyM: 8,
    plantingYearOffset: 2,
  };

  it('samples one point per year from the planting offset through totalYears', () => {
    const track = buildCanopyTrack(config, 10);
    expect(track.points[0]?.year).toBe(2);
    expect(track.points[track.points.length - 1]?.year).toBe(10);
    expect(track.points.map((p) => p.year)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it('canopy at the planting year is the species canopy at age 0', () => {
    const track = buildCanopyTrack(config, 10);
    expect(track.points[0]?.canopyM).toBeCloseTo(
      canopyAtAge('oak-tree', 0).canopyM,
      6,
    );
  });

  it('canopy at a later year reflects canopyAtAge(age = year - plantingYearOffset)', () => {
    const track = buildCanopyTrack(config, 10);
    const atY7 = track.points.find((p) => p.year === 7);
    expect(atY7?.canopyM).toBeCloseTo(canopyAtAge('oak-tree', 5).canopyM, 6);
  });

  it('is non-decreasing across years (growth never goes backward)', () => {
    const track = buildCanopyTrack(config, 12);
    for (let i = 1; i < track.points.length; i += 1) {
      expect(track.points[i]!.canopyM).toBeGreaterThanOrEqual(
        track.points[i - 1]!.canopyM,
      );
    }
  });

  it('returns no points when the planting offset is past the timeline end', () => {
    const track = buildCanopyTrack({ ...config, plantingYearOffset: 11 }, 10);
    expect(track.points).toEqual([]);
  });
});
