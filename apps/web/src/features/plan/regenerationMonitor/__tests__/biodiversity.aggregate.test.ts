/**
 * Domain-isolation tests for the A3 Biodiversity Outcome Monitor.
 *
 * The Regeneration Monitor (A1) and Biodiversity Monitor (A3) share one
 * `regeneration_events` stream and one `MONITORED_METRICS` registry; the
 * `domain` discriminator is the only thing keeping each dashboard from
 * rendering the other's series. These tests pin that boundary plus the
 * lower-is-better verdict for invasive pressure.
 */

import { describe, it, expect } from 'vitest';
import type { RegenerationEvent } from '@ogden/shared';
import { buildTrajectories, type GoalTargetLookup } from '../aggregate.js';

function ev(
  eventDate: string,
  observations: Record<string, unknown>,
): RegenerationEvent {
  return {
    id: `00000000-0000-0000-0000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
    projectId: '00000000-0000-0000-0000-000000000001',
    authorId: '00000000-0000-0000-0000-000000000002',
    eventType: 'observation',
    interventionType: null,
    phase: null,
    progress: 'observed',
    title: 'sample',
    notes: null,
    eventDate,
    location: null,
    areaHa: null,
    observations,
    mediaUrls: [],
    parentEventId: null,
    createdAt: eventDate,
    updatedAt: eventDate,
  };
}

const REGEN_KEYS = [
  'soil_om_pct',
  'living_cover_pct',
  'infiltration_pct',
  'microbial_biomass_index',
  'water_stable_aggregate_pct',
  'bulk_density',
].sort();

const BIO_KEYS = [
  'native_veg_cover_pct',
  'invasive_pressure_pct',
  'bird_pollinator_species_count',
  'beneficial_predator_index',
].sort();

// A mixed-domain event stream — both families present on the same events.
const MIXED = [
  ev('2020-01-01', { soil_om_pct: 2, native_veg_cover_pct: 20, invasive_pressure_pct: 40 }),
  ev('2024-01-01', { soil_om_pct: 3, native_veg_cover_pct: 45, invasive_pressure_pct: 12 }),
];

describe('buildTrajectories domain isolation', () => {
  it("'regeneration' returns only the 6 regen keys even with bio observations present", () => {
    const trajs = buildTrajectories(MIXED, {}, 'regeneration');
    expect(trajs.map((t) => t.key).sort()).toEqual(REGEN_KEYS);
  });

  it("'biodiversity' returns only the 4 bio keys even with regen observations present", () => {
    const trajs = buildTrajectories(MIXED, {}, 'biodiversity');
    expect(trajs.map((t) => t.key).sort()).toEqual(BIO_KEYS);
  });

  it('no-domain default preserves all-keys behaviour (10 metrics)', () => {
    const trajs = buildTrajectories(MIXED, {});
    expect(trajs).toHaveLength(10);
  });

  it('a falling invasive-pressure curve is on-track (higherIsBetter:false)', () => {
    const goal: GoalTargetLookup = {
      'bio-invasive-pressure': { target: 5, deadlineYear: 5 },
    };
    const t = buildTrajectories(MIXED, goal, 'biodiversity').find(
      (x) => x.key === 'invasive_pressure_pct',
    )!;
    expect(t.higherIsBetter).toBe(false);
    // baseline 40 → target 5 over 5yr; after 4yr expected ≈ 12, latest 12 ⇒ on-track.
    expect(t.verdict).toBe('on-track');
  });

  it('native cover is scored against its goal-tree criterion', () => {
    const goal: GoalTargetLookup = {
      'bio-native-cover': { target: 60, deadlineYear: 7 },
    };
    const t = buildTrajectories(MIXED, goal, 'biodiversity').find(
      (x) => x.key === 'native_veg_cover_pct',
    )!;
    expect(t.higherIsBetter).toBe(true);
    expect(t.target).toBe(60);
    expect(t.verdict === 'on-track' || t.verdict === 'lagging').toBe(true);
  });
});
