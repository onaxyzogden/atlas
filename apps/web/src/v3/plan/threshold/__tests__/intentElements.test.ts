import { describe, it, expect } from 'vitest';
import type { VisionProfile } from '@ogden/shared';
import type { ClassifyValue } from '../../../act/tier-shell/VisionClassifyCapture';
import type { ConstraintsModel } from '../../../act/tier-shell/ConstraintsCapture';
import {
  deriveIntentElements,
  deriveIntentElementsFromProfile,
  type IntentElement,
} from '../intentElements';

const classify = (committed: string[], aspirational: string[]): ClassifyValue => ({
  committed,
  aspirational,
});

const constraints = (
  rows: Array<{ text: string; severity: 'nn' | 'hc' }>,
): ConstraintsModel => ({
  constraints: rows.map((r, i) => ({
    id: `c${i}`,
    text: r.text,
    severity: r.severity,
    note: '',
  })),
});

const byType = (els: IntentElement[], type: IntentElement['type']): string[] =>
  els.filter((e) => e.type === type).map((e) => e.text);

describe('deriveIntentElements -- captures (primary path)', () => {
  it('projects nn constraints to non-negotiable, committed/aspirational verbatim', () => {
    const els = deriveIntentElements({
      classify: classify(['Water security', 'Food production'], ['Pond for swimming']),
      constraints: constraints([{ text: 'No riba financing', severity: 'nn' }]),
    });

    expect(byType(els, 'non-negotiable')).toEqual(['No riba financing']);
    expect(byType(els, 'committed')).toEqual(['Water security', 'Food production']);
    expect(byType(els, 'aspirational')).toEqual(['Pond for swimming']);

    // text is verbatim (no humanising) on the captures path.
    expect(els.find((e) => e.type === 'committed')?.text).toBe('Water security');
    // source tagging
    expect(els.find((e) => e.type === 'non-negotiable')?.source).toBe('constraints');
    expect(els.find((e) => e.type === 'committed')?.source).toBe('classify');
  });

  it('orders by type severity: non-negotiable, then committed, then aspirational', () => {
    const els = deriveIntentElements({
      classify: classify(['Committed A'], ['Aspirational A']),
      constraints: constraints([{ text: 'Non-neg A', severity: 'nn' }]),
    });
    expect(els.map((e) => e.type)).toEqual([
      'non-negotiable',
      'committed',
      'aspirational',
    ]);
  });

  it('excludes hard-constraint (hc) rows -- only nn becomes non-negotiable', () => {
    const els = deriveIntentElements({
      classify: classify(['Keep'], []),
      constraints: constraints([
        { text: 'Hard cap on opex', severity: 'hc' },
        { text: 'Faith-aligned governance', severity: 'nn' },
      ]),
    });
    expect(byType(els, 'non-negotiable')).toEqual(['Faith-aligned governance']);
    expect(els.some((e) => e.text === 'Hard cap on opex')).toBe(false);
  });

  it('drops empty / whitespace-only entries', () => {
    const els = deriveIntentElements({
      classify: classify(['  ', 'Real'], ['']),
      constraints: constraints([{ text: '   ', severity: 'nn' }]),
    });
    expect(els.map((e) => e.text)).toEqual(['Real']);
  });

  it('dedupes identical (type, text) entries to a single element', () => {
    const els = deriveIntentElements({
      classify: classify(['Water security', 'Water security'], []),
    });
    expect(byType(els, 'committed')).toEqual(['Water security']);
  });
});

describe('deriveIntentElements -- ids', () => {
  it('is idempotent: same input yields identical ids and order', () => {
    const input = {
      classify: classify(['A', 'B'], ['C']),
      constraints: constraints([{ text: 'D', severity: 'nn' as const }]),
    };
    expect(deriveIntentElements(input)).toEqual(deriveIntentElements(input));
  });

  it('id is stable across whitespace/case differences of the same text', () => {
    const a = deriveIntentElements({ classify: classify(['Water security'], []) });
    const b = deriveIntentElements({
      classify: classify(['  WATER   security '], []),
    });
    expect(a[0]!.id).toBe(b[0]!.id);
    // ...but the displayed text preserves the original (trimmed) form.
    expect(a[0]!.text).toBe('Water security');
    expect(b[0]!.text).toBe('WATER   security');
  });

  it('different types of the same text get different ids (kept separately)', () => {
    const els = deriveIntentElements({
      classify: classify(['Resilience'], []),
      constraints: constraints([{ text: 'Resilience', severity: 'nn' }]),
    });
    expect(els).toHaveLength(2);
    expect(new Set(els.map((e) => e.id)).size).toBe(2);
  });
});

describe('deriveIntentElements -- VisionProfile fallback', () => {
  const profile: VisionProfile = {
    nonNegotiablesAvoid: ['debt_financing', 'chemical_inputs'],
    successDefinition: ['food_security'],
    primaryOutcomes: ['regenerate_land'],
    systemsInScope: { food: ['market_garden'], animals: ['silvopasture'] },
    landIdentity: ['productive_farmstead'],
    values: ['stewardship'],
    // economic axis -- must be ignored
    incomeStreams: ['csa_boxes', 'farm_subscription'],
    economicStyle: 'commercial',
    economicIntentLevel: 'high',
  };

  it('fires ONLY when both captures are empty', () => {
    // captures present -> profile ignored
    const withCaptures = deriveIntentElements({
      classify: classify(['Real intent'], []),
      visionProfile: profile,
    });
    expect(withCaptures.map((e) => e.text)).toEqual(['Real intent']);

    // both empty -> fallback
    const fallback = deriveIntentElements({
      classify: classify([], []),
      constraints: constraints([]),
      visionProfile: profile,
    });
    expect(fallback.length).toBeGreaterThan(0);
    expect(fallback.every((e) => e.source === 'vision-profile')).toBe(true);
  });

  it('maps fields to the correct types and humanises ids', () => {
    const els = deriveIntentElementsFromProfile(profile);

    expect(byType(els, 'non-negotiable')).toEqual([
      'Avoid debt financing',
      'Avoid chemical inputs',
    ]);
    expect(byType(els, 'committed')).toEqual([
      'Food security',
      'Regenerate land',
      'Market garden',
      'Silvopasture',
    ]);
    expect(byType(els, 'aspirational')).toEqual([
      'Productive farmstead',
      'Stewardship',
    ]);
  });

  it('never seeds from the economic axis (Amanah)', () => {
    const els = deriveIntentElementsFromProfile(profile);
    const text = els.map((e) => e.text.toLowerCase()).join(' | ');
    expect(text).not.toMatch(/csa|subscription|income|economic/);
  });

  it('returns empty for a null/empty profile', () => {
    expect(deriveIntentElementsFromProfile(null)).toEqual([]);
    expect(deriveIntentElementsFromProfile({})).toEqual([]);
    expect(
      deriveIntentElements({ classify: classify([], []), visionProfile: null }),
    ).toEqual([]);
  });
});
