/**
 * Phase 5 — per-kind action registry coverage.
 *
 * `PLAN_FEATURE_ACTIONS` is the single source of truth behind
 * `PlanSelectionFloater`. The `Record<PlanSelectionKind, …>` type already makes
 * completeness a compile-time guarantee; these runtime checks pin the *shape*
 * of each entry and that baseline actions resolve without throwing — catching a
 * mis-wired store method (e.g. calling a delete that doesn't exist) that the
 * type system can't see through the `getState()` indirection.
 */

import { describe, it, expect } from 'vitest';
import {
  PLAN_FEATURE_ACTIONS,
  supportsVertexEditing,
  type FeatureActionConfig,
} from '../planFeatureActions.js';
import type { PlanSelectionKind } from '../../../store/planSelectionStore.js';

// The full set of selectable Plan kinds. Doubles as a change-detector: adding a
// kind to the union forces an entry in the registry (compile time) AND a line
// here (this test) — so coverage can't silently drift.
const EXPECTED_KINDS: PlanSelectionKind[] = [
  'guild',
  'guild-member',
  'zone',
  'crop',
  'paddock',
  'path',
  'structure',
  'fertility',
  'water',
  'utility',
  'utility-point',
  'setback',
  'flow',
  'transect',
  'design-element',
  'fence',
  'note',
  'slaughter-point',
  'cold-chain',
  'market-node',
  'slope-gradient',
];

/** Kinds whose floating bar must carry a Rename quick action (the formerly
 *  unselectable simple point/line features). */
const RENAME_KINDS: PlanSelectionKind[] = [
  'fence',
  'note',
  'slaughter-point',
  'cold-chain',
  'market-node',
];

describe('PLAN_FEATURE_ACTIONS registry (Phase 5)', () => {
  it('has exactly one entry per selectable kind, no more, no less', () => {
    const keys = Object.keys(PLAN_FEATURE_ACTIONS).sort();
    expect(keys).toEqual([...EXPECTED_KINDS].sort());
  });

  it('every entry is well-formed (label, remove fn, valid supportsVertexEdit)', () => {
    for (const kind of EXPECTED_KINDS) {
      const cfg: FeatureActionConfig = PLAN_FEATURE_ACTIONS[kind];
      expect(typeof cfg.label, kind).toBe('string');
      expect(cfg.label.length, kind).toBeGreaterThan(0);
      expect(typeof cfg.remove, kind).toBe('function');
      expect(['polygon', 'line', false], kind).toContain(cfg.supportsVertexEdit);
    }
  });

  it('every remove() resolves (no throw) for an absent id', () => {
    for (const kind of EXPECTED_KINDS) {
      const cfg = PLAN_FEATURE_ACTIONS[kind];
      expect(
        () =>
          cfg.remove({
            kind,
            id: '__does_not_exist__',
            projectId: '__does_not_exist__',
          }),
        kind,
      ).not.toThrow();
    }
  });

  it('the simple new kinds expose a Rename quick action', () => {
    for (const kind of RENAME_KINDS) {
      const cfg = PLAN_FEATURE_ACTIONS[kind];
      expect(typeof cfg.quickActions, kind).toBe('function');
      // No record exists for a bogus id → empty list, but the resolver must not
      // throw and must return an array.
      const actions = cfg.quickActions!({ kind, id: '__nope__' });
      expect(Array.isArray(actions), kind).toBe(true);
    }
  });

  it('paddock and design-element carry rich count-label editors', () => {
    expect(typeof PLAN_FEATURE_ACTIONS.paddock.getEditHandler).toBe('function');
    expect(typeof PLAN_FEATURE_ACTIONS['design-element'].getEditHandler).toBe(
      'function',
    );
    // Paddock always offers an editor (the run defers the lookup); a missing
    // record is a safe no-op rather than a null handler.
    const handler = PLAN_FEATURE_ACTIONS.paddock.getEditHandler!({
      kind: 'paddock',
      id: '__nope__',
    });
    expect(handler).not.toBeNull();
    expect(typeof handler!.run).toBe('function');
    expect(() => handler!.run()).not.toThrow();
  });

  it('slope-gradient is a reshape+reclassify polygon kind (Delete via store)', () => {
    const cfg = PLAN_FEATURE_ACTIONS['slope-gradient'];
    expect(cfg.supportsVertexEdit).toBe('polygon');
    expect(typeof cfg.getEditHandler).toBe('function');
    // Reclassify handler resolves (stale id → safe no-op, never null/throw).
    const handler = cfg.getEditHandler!({
      kind: 'slope-gradient',
      id: '__nope__',
      projectId: '__nope__',
    });
    expect(handler).not.toBeNull();
    expect(() => handler!.run()).not.toThrow();
    // Delete with a projectId-bearing item is a no-op for an absent feature.
    expect(() =>
      cfg.remove({ kind: 'slope-gradient', id: '__nope__', projectId: 'p' }),
    ).not.toThrow();
    // Slope polygons are always polygons → vertex editing applies.
    expect(
      supportsVertexEditing({ kind: 'slope-gradient', id: 'x', projectId: 'p' }),
    ).toBe(true);
  });

  it('supportsVertexEditing matches the prior polygon-only rule', () => {
    // Static polygon kinds qualify without a projectId.
    for (const kind of ['zone', 'crop', 'paddock', 'structure'] as const) {
      expect(supportsVertexEditing({ kind, id: 'x' }), kind).toBe(true);
    }
    // Non-polygon kinds never qualify.
    for (const kind of ['path', 'water', 'fence', 'note', 'market-node'] as const) {
      expect(supportsVertexEditing({ kind, id: 'x' }), kind).toBe(false);
    }
    // design-element needs a projectId + a resolvable Polygon geometry; with
    // neither it must not throw and must be false.
    expect(supportsVertexEditing({ kind: 'design-element', id: 'x' })).toBe(false);
  });
});
