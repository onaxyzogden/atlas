// @vitest-environment happy-dom
/**
 * Archetype catalog parity — closes spec OQ1 ("is the planning DB
 * sufficiently populated for all project types?").
 *
 * For each of the six project archetypes, the deterministic sequencing
 * engine run against that archetype's own goal-tree template must select
 * ≥6 distinct interventions. This proves the per-archetype criterion
 * vocabulary actually drives selection (not just that objects exist) and
 * transitively catches a broken prerequisite chain. Plus: every authored
 * (tagged) intervention is covenant-grounded (≥1 Citation); ids are
 * globally unique across the split modules; the universal foundations
 * stay untagged so they remain reachable under every archetype.
 *
 * `regenerativeFarmCatalog.test.ts` is kept unchanged as the legacy
 * non-regression precedent.
 */

import { describe, expect, it } from 'vitest';
import { runSequencingEngine } from '../sequencingEngine.js';
import {
  INTERVENTION_CATALOG,
  getIntervention,
} from '../../../data/interventionCatalog.js';
import { GOAL_TREE_TEMPLATES } from '../../../data/goalTreeTemplates.js';
import type { PlanProjectTypeKey } from '../../../data/planProjectTypeTemplates.js';
import { makeSiteProfile } from '../../autoDesign/__tests__/fixtures.js';

const ARCHETYPE_KEYS: PlanProjectTypeKey[] = [
  'homestead',
  'regenerative_farm',
  'retreat_center',
  'educational_farm',
  'conservation',
  'multi_enterprise',
];

const UNIVERSAL_FOUNDATIONS = [
  'parcel-assessment',
  'keyline-access-track',
  'compost-system',
  'roof-catchment-tanks',
];

describe.each(ARCHETYPE_KEYS)('archetype catalog parity — %s', (key) => {
  const goalTree = GOAL_TREE_TEMPLATES[key];
  const pid = `parity-${key}`;

  it('sequences ≥6 distinct interventions from its own goal tree', () => {
    const res = runSequencingEngine(goalTree, makeSiteProfile(pid, 60), pid);
    const distinct = new Set(res.selected.map((s) => s.intervention.id));
    expect(distinct.size).toBeGreaterThanOrEqual(6);
  });

  it('every selected intervention authored for this archetype is grounded', () => {
    const res = runSequencingEngine(goalTree, makeSiteProfile(pid, 60), pid);
    for (const s of res.selected) {
      const i = s.intervention;
      if (i.projectTypes && i.projectTypes.length > 0) {
        expect(i.projectTypes).toContain(goalTree.archetype);
        expect(i.sources.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('catalog integrity guards', () => {
  it('every tagged intervention carries ≥1 citation', () => {
    for (const i of INTERVENTION_CATALOG) {
      if (i.projectTypes && i.projectTypes.length > 0) {
        expect(
          i.sources.length,
          `${i.id} is tagged but has no sources`,
        ).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('intervention ids are globally unique across split modules', () => {
    const ids = INTERVENTION_CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('universal foundations remain untagged (reachable under every archetype)', () => {
    for (const id of UNIVERSAL_FOUNDATIONS) {
      const i = getIntervention(id);
      expect(i, `${id} missing from catalog`).not.toBeNull();
      expect(i?.projectTypes).toBeUndefined();
    }
  });
});
