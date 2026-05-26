import { describe, it, expect } from 'vitest';
import type { LayerFieldVerification } from '@ogden/shared';
import {
  buildAutoNeed,
  detectCoverageGapNeeds,
  detectStaleNeeds,
  meanCenter,
  isDismissedAutoNeed,
  SITE_FALLBACK_CENTER,
  type CoverageRow,
} from '../autoObservationNeeds.js';
import { evaluateObservationRecorded, emptyObservationNeedRun } from '../observationNeed.js';

const CENTER: [number, number] = [-78.2, 44.5];

const rows = (overrides: Partial<CoverageRow>[] = []): CoverageRow[] => [
  { key: 'water', label: 'Water systems', module: 'hydrology', n: 0 },
  { key: 'swot', label: 'SWOT entries', module: 'monitoring-records', n: 3 },
  ...(overrides as CoverageRow[]),
];

const layer = (
  layerType: LayerFieldVerification['layerType'],
  level: LayerFieldVerification['level'],
): LayerFieldVerification => ({
  layerType,
  level,
  weight: level === 'unverified' ? 0.2 : 1,
  observationCount: 1,
  lastObservedAt: '2020-01-01T00:00:00.000Z',
});

describe('buildAutoNeed', () => {
  it('mints an auto-origin need with the supplied deterministic id', () => {
    const need = buildAutoNeed({
      id: 'auto-gap-water-mtc',
      projectId: 'mtc',
      module: 'hydrology',
      target: { center: CENTER },
      title: 'Start observing: Water systems',
      reason: 'No water systems recorded yet.',
    });
    expect(need.id).toBe('auto-gap-water-mtc');
    expect(need.origin).toBe('auto');
    expect(need.module).toBe('hydrology');
    expect(need.priority).toBe('medium');
    expect(need.target.center).toEqual(CENTER);
  });

  it('is not instantly recordable — opens with one required summary note', () => {
    const need = buildAutoNeed({
      id: 'auto-gap-water-mtc',
      projectId: 'mtc',
      module: 'hydrology',
      target: { center: CENTER },
      title: 'x',
      reason: 'y',
    });
    expect(need.checklist).toHaveLength(0);
    expect(need.evidence).toEqual([
      { id: 'summary', kind: 'note', label: 'Summary note', required: true },
    ]);
    expect(
      evaluateObservationRecorded(need, emptyObservationNeedRun()).canRecord,
    ).toBe(false);
  });
});

describe('detectCoverageGapNeeds', () => {
  it('raises exactly one auto-need per zero-count row and skips covered rows', () => {
    const needs = detectCoverageGapNeeds('mtc', rows(), CENTER);
    expect(needs).toHaveLength(1);
    expect(needs[0]?.id).toBe('auto-gap-water-mtc');
    expect(needs[0]?.module).toBe('hydrology');
    expect(needs[0]?.origin).toBe('auto');
  });

  it('raises nothing when every row has records', () => {
    const covered = rows().map((r) => ({ ...r, n: r.n + 1 }));
    expect(detectCoverageGapNeeds('mtc', covered, CENTER)).toHaveLength(0);
  });
});

describe('detectStaleNeeds', () => {
  it('raises one stale need per unverified layer only', () => {
    const perLayer = [
      layer('soils', 'unverified'),
      layer('watershed', 'corroborated'),
      layer('land_cover', 'verified'),
    ];
    const needs = detectStaleNeeds('mtc', perLayer, CENTER);
    expect(needs).toHaveLength(1);
    expect(needs[0]?.id).toBe('auto-stale-soils-mtc');
    expect(needs[0]?.module).toBe('hydrology');
  });

  it('raises nothing when no layer is unverified', () => {
    const perLayer = [layer('soils', 'verified'), layer('watershed', 'corroborated')];
    expect(detectStaleNeeds('mtc', perLayer, CENTER)).toHaveLength(0);
  });
});

describe('meanCenter', () => {
  it('averages the centres of the given needs', () => {
    const c = meanCenter([
      { target: { center: [0, 0] } },
      { target: { center: [2, 4] } },
    ]);
    expect(c).toEqual([1, 2]);
  });

  it('falls back to the site centre when there are no needs', () => {
    expect(meanCenter([])).toEqual(SITE_FALLBACK_CENTER);
  });
});

describe('isDismissedAutoNeed', () => {
  it('is true for an auto need that is recorded or resolved', () => {
    expect(
      isDismissedAutoNeed({ objective: { origin: 'auto' }, run: { status: 'recorded' } }),
    ).toBe(true);
    expect(
      isDismissedAutoNeed({ objective: { origin: 'auto' }, run: { status: 'resolved' } }),
    ).toBe(true);
  });

  it('is false for an open auto need', () => {
    expect(
      isDismissedAutoNeed({ objective: { origin: 'auto' }, run: { status: 'open' } }),
    ).toBe(false);
  });

  it('is false for a non-auto need regardless of status', () => {
    expect(
      isDismissedAutoNeed({ objective: { origin: 'seed' }, run: { status: 'recorded' } }),
    ).toBe(false);
    expect(
      isDismissedAutoNeed({ objective: { origin: 'manual' }, run: { status: 'resolved' } }),
    ).toBe(false);
  });
});
