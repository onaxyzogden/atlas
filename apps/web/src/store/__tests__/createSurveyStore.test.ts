// @vitest-environment happy-dom
/**
 * createSurveyStore -- the domain-neutral byProject survey-store factory behind
 * the five Plan-stage reception (Stratum-3) surveys. Exercises the slope-store
 * surface lifted into the factory:
 *   - byProject CRUD (addFeature id/createdAt defaults, updateGeometry,
 *     updateClass, removeFeature, listForProject insertion order),
 *   - findFeatureGlobal across projects,
 *   - ephemeral takeover slice (active/open/close, not persisted),
 *   - the derived palette/tool/kind maps the layer + draw host read,
 *   - selectSurveyTotals (per-class measure/pct/count + featureCount +
 *     unclassified remainder).
 *
 * A throwaway test store keeps the factory under test in isolation from the five
 * production singletons (those are registration-checked in receptionSurveys.test).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSurveyStore,
  selectSurveyTotals,
  type SurveyClassDef,
  type SurveyFeature,
} from '../createSurveyStore.js';

type TestClass = 'wet' | 'dry' | 'path';

const TEST_CLASSES: readonly SurveyClassDef<TestClass>[] = [
  { key: 'wet', label: 'Wet zone', color: '#4a90d9', kind: 'poly' },
  { key: 'dry', label: 'Dry zone', color: '#d9b365', kind: 'poly' },
  { key: 'path', label: 'Flow path', color: '#2c7bb6', kind: 'line' },
];

const SURVEY = createSurveyStore<TestClass>({
  persistName: 'ogden-test-survey',
  idPrefix: 'test-survey',
  toolPrefix: 'plan.test.survey',
  sourceObjectiveId: 's3-test',
  classes: TEST_CLASSES,
});

const { useStore } = SURVEY;

const SQUARE: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
  ],
};

const SQUARE2: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [2, 2],
      [2, 4],
      [4, 4],
      [4, 2],
      [2, 2],
    ],
  ],
};

function seed(
  surveyClass: TestClass,
  measure: number,
  kind: SurveyFeature<TestClass>['kind'] = 'poly',
) {
  return { surveyClass, kind, geometry: SQUARE, measure };
}

function reset(): void {
  useStore.setState({ byProject: {}, active: false, activeProjectId: null });
}

describe('createSurveyStore -- derived maps', () => {
  it('builds palette/tool/kind maps from the class list', () => {
    expect(SURVEY.classKeys).toEqual(['wet', 'dry', 'path']);
    expect(SURVEY.CLASS_COLORS.wet).toBe('#4a90d9');
    expect(SURVEY.CLASS_LABELS.path).toBe('Flow path');
    expect(SURVEY.TOOL_BY_CLASS.wet).toBe('plan.test.survey-wet');
    expect(SURVEY.CLASS_BY_TOOL['plan.test.survey-path']).toBe('path');
    expect(SURVEY.KIND_BY_CLASS.path).toBe('line');
    expect(SURVEY.KIND_BY_CLASS.wet).toBe('poly');
  });

  it('exposes the distinct geometry kinds (deduped, authored order)', () => {
    expect(SURVEY.kinds).toEqual(['poly', 'line']);
  });

  it('carries the config through for registry use', () => {
    expect(SURVEY.config.sourceObjectiveId).toBe('s3-test');
    expect(SURVEY.config.persistName).toBe('ogden-test-survey');
  });
});

describe('createSurveyStore -- byProject CRUD', () => {
  beforeEach(reset);

  it('addFeature fills id + createdAt and isolates by project', () => {
    const a = useStore.getState().addFeature('p1', seed('wet', 3));
    expect(a.id).toMatch(/^test-survey-/);
    expect(a.createdAt).toBeTruthy();
    expect(a.surveyClass).toBe('wet');

    useStore.getState().addFeature('p2', seed('dry', 5));
    expect(useStore.getState().listForProject('p1')).toHaveLength(1);
    expect(useStore.getState().listForProject('p2')).toHaveLength(1);
    expect(useStore.getState().listForProject('p3')).toHaveLength(0);
  });

  it('honours a caller-supplied id + createdAt (round-trip / sync restore)', () => {
    const f = useStore
      .getState()
      .addFeature('p1', { ...seed('wet', 2), id: 'fixed-1', createdAt: '2026-06-16' });
    expect(f.id).toBe('fixed-1');
    expect(f.createdAt).toBe('2026-06-16');
  });

  it('listForProject preserves insertion order', () => {
    useStore.getState().addFeature('p1', { ...seed('wet', 1), id: 'a' });
    useStore.getState().addFeature('p1', { ...seed('dry', 1), id: 'b' });
    useStore.getState().addFeature('p1', { ...seed('path', 1, 'line'), id: 'c' });
    expect(useStore.getState().listForProject('p1').map((f) => f.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('updateGeometry replaces geometry + measure, leaves class', () => {
    const a = useStore.getState().addFeature('p1', seed('wet', 3));
    useStore.getState().updateGeometry('p1', a.id, SQUARE2, 9);
    const row = useStore.getState().listForProject('p1')[0]!;
    expect(row.measure).toBe(9);
    expect(row.geometry).toEqual(SQUARE2);
    expect(row.surveyClass).toBe('wet');
  });

  it('updateClass reclassifies, leaves geometry + measure', () => {
    const a = useStore.getState().addFeature('p1', seed('wet', 3));
    useStore.getState().updateClass('p1', a.id, 'dry');
    const row = useStore.getState().listForProject('p1')[0]!;
    expect(row.surveyClass).toBe('dry');
    expect(row.measure).toBe(3);
    expect(row.geometry).toEqual(SQUARE);
  });

  it('removeFeature drops just that feature', () => {
    const a = useStore.getState().addFeature('p1', { ...seed('wet', 3), id: 'a' });
    useStore.getState().addFeature('p1', { ...seed('dry', 3), id: 'b' });
    useStore.getState().removeFeature('p1', a.id);
    expect(useStore.getState().listForProject('p1').map((f) => f.id)).toEqual(['b']);
  });

  it('mutators are safe no-ops for an absent feature/project', () => {
    expect(() =>
      useStore.getState().updateClass('p1', '__nope__', 'dry'),
    ).not.toThrow();
    expect(() =>
      useStore.getState().updateGeometry('p1', '__nope__', SQUARE2, 1),
    ).not.toThrow();
    expect(() =>
      useStore.getState().removeFeature('__noproj__', '__nope__'),
    ).not.toThrow();
    expect(useStore.getState().listForProject('p1')).toHaveLength(0);
  });
});

describe('createSurveyStore -- findFeatureGlobal', () => {
  beforeEach(reset);

  it('resolves a known id to its project + feature', () => {
    useStore.getState().addFeature('p1', { ...seed('wet', 1), id: 'g-a' });
    useStore.getState().addFeature('p2', { ...seed('dry', 1), id: 'g-b' });
    const hit = useStore.getState().findFeatureGlobal('g-b');
    expect(hit).not.toBeNull();
    expect(hit!.projectId).toBe('p2');
    expect(hit!.feature.surveyClass).toBe('dry');
  });

  it('returns null for an unknown id', () => {
    useStore.getState().addFeature('p1', { ...seed('wet', 1), id: 'g-a' });
    expect(useStore.getState().findFeatureGlobal('__nope__')).toBeNull();
  });
});

describe('createSurveyStore -- ephemeral takeover slice', () => {
  beforeEach(reset);

  it('open sets active + project, close clears both', () => {
    expect(useStore.getState().active).toBe(false);
    useStore.getState().open('p1');
    expect(useStore.getState().active).toBe(true);
    expect(useStore.getState().activeProjectId).toBe('p1');
    useStore.getState().close();
    expect(useStore.getState().active).toBe(false);
    expect(useStore.getState().activeProjectId).toBeNull();
  });
});

describe('selectSurveyTotals', () => {
  it('sums per-class measure + count and computes % of site', () => {
    const features: SurveyFeature<TestClass>[] = [
      { id: '1', surveyClass: 'wet', kind: 'poly', geometry: SQUARE, measure: 10, createdAt: 'x' },
      { id: '2', surveyClass: 'wet', kind: 'poly', geometry: SQUARE, measure: 5, createdAt: 'x' },
      { id: '3', surveyClass: 'dry', kind: 'poly', geometry: SQUARE, measure: 5, createdAt: 'x' },
    ];
    const totals = selectSurveyTotals(features, 100);
    expect(totals.totalMeasure).toBe(20);
    expect(totals.featureCount).toBe(3);
    expect(totals.byClass.wet!.measure).toBe(15);
    expect(totals.byClass.wet!.count).toBe(2);
    expect(totals.byClass.wet!.pct).toBeCloseTo(15);
    expect(totals.byClass.dry!.pct).toBeCloseTo(5);
    expect(totals.unclassifiedPct).toBeCloseTo(80);
  });

  it('treats non-finite/negative measures as zero', () => {
    const features: SurveyFeature<TestClass>[] = [
      { id: '1', surveyClass: 'wet', kind: 'poly', geometry: SQUARE, measure: Number.NaN, createdAt: 'x' },
      { id: '2', surveyClass: 'wet', kind: 'poly', geometry: SQUARE, measure: -4, createdAt: 'x' },
    ];
    const totals = selectSurveyTotals(features, 100);
    expect(totals.totalMeasure).toBe(0);
    expect(totals.featureCount).toBe(2);
    expect(totals.byClass.wet!.measure).toBe(0);
    expect(totals.unclassifiedPct).toBe(100);
  });

  it('yields zero pct when site acres is zero (line/point surveys)', () => {
    const features: SurveyFeature<TestClass>[] = [
      { id: '1', surveyClass: 'path', kind: 'line', geometry: SQUARE, measure: 250, createdAt: 'x' },
    ];
    const totals = selectSurveyTotals(features, 0);
    expect(totals.totalMeasure).toBe(250);
    expect(totals.byClass.path!.pct).toBe(0);
    expect(totals.unclassifiedPct).toBe(100);
  });
});
