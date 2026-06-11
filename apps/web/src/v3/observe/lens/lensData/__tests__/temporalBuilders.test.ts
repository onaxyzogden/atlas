// temporalBuilders.test.ts -- the read-side Timeline series builder.
//
// Pure function only (no React, no stores): we hand-build ObserveDataPoints
// carrying proof items, plus a fixture slot resolver, and assert (a) bound
// logged_result rows chart as a series with cycle labels / dates / zones in
// ascending capture order, (b) bound scalar measurements chart with the
// slot-label + unit metric and the domain-label location, (c) the honest
// null degrade (< 2 points, unbound items), and (d) series selection (most
// points wins; tie -> earliest first capture).
//
// Run BOUNDED on Windows (pool:'forks' + explicit timeout); never unbounded.
import { describe, it, expect } from 'vitest';

import {
  UNIVERSAL_DOMAIN_LABELS,
  type FieldActionProofItem,
  type MeasurementBinding,
  type ObserveDataPoint,
  type ProofSchemaSlot,
} from '@ogden/shared';
import { buildTemporalForLens } from '../temporalBuilders.js';
import type { SlotResolver } from '../specialisedBuilders.js';

// ── fixtures ────────────────────────────────────────────────────────────────

// Slot table: logged_result slots carry a measurementBinding; measurement
// slots carry a label + unit (what the scalar metric is built from).
function makeGetSlot(
  table: Record<
    string,
    | { kind: 'logged'; binding: MeasurementBinding }
    | { kind: 'scalar'; label: string; unit?: string }
  >,
): SlotResolver {
  const slots = new Map<string, ProofSchemaSlot>();
  for (const [id, def] of Object.entries(table)) {
    slots.set(
      id,
      def.kind === 'logged'
        ? ({
            id,
            proofType: 'logged_result',
            label: id,
            required: false,
            measurementBinding: def.binding,
          } as ProofSchemaSlot)
        : ({
            id,
            proofType: 'measurement',
            label: def.label,
            required: false,
            measurementUnit: def.unit,
          } as ProofSchemaSlot),
    );
  }
  return (slotId: string) => slots.get(slotId);
}

let seq = 0;
function logged(
  slotId: string,
  loggedResult: Record<string, unknown>,
  capturedAt: string,
): FieldActionProofItem {
  seq += 1;
  return {
    id: `proof-${seq}`,
    slotId,
    proofType: 'logged_result',
    capturedAt,
    loggedResult,
  } as FieldActionProofItem;
}
function scalar(
  slotId: string,
  measurementValue: number,
  capturedAt: string,
): FieldActionProofItem {
  seq += 1;
  return {
    id: `proof-${seq}`,
    slotId,
    proofType: 'measurement',
    capturedAt,
    measurementValue,
  } as FieldActionProofItem;
}

function mkPoint(over: Partial<ObserveDataPoint>): ObserveDataPoint {
  seq += 1;
  return {
    id: `pt-${seq}`,
    projectId: 'test',
    domainId: 'soil',
    sourceType: 'manual_observation',
    sourceActionId: null,
    sourceFeedEntryId: null,
    sourceObjectiveId: null,
    sourceFeatureRef: null,
    locationGeometry: null,
    cycleId: 0,
    isSuperseded: false,
    supersededBy: null,
    statusOutput: 'clear',
    measurementValue: null,
    proofItems: [],
    capturedAt: '2026-01-05T10:00:00.000Z',
    capturedBy: 'test',
    ...over,
  } as ObserveDataPoint;
}

const PH_SLOTS = makeGetSlot({
  ph: { kind: 'logged', binding: { lens: 'living', vizField: 'soil.phData' } },
});

// ── logged_result series ─────────────────────────────────────────────────────

describe('buildTemporalForLens -- bound logged_result series', () => {
  it('charts soil pH across cycles with labels, zones, ascending order', () => {
    const baseline = mkPoint({
      cycleId: 0,
      proofItems: [
        // Deliberately out of capture order to prove the ascending sort.
        logged('ph', { zone: 'Zone 2', ph: 5.4 }, '2026-01-06T10:00:00.000Z'),
        logged('ph', { zone: 'Zone 1', ph: 5.2 }, '2026-01-05T10:00:00.000Z'),
      ],
    });
    const cycle1 = mkPoint({
      cycleId: 1,
      proofItems: [logged('ph', { zone: 'Zone 3', ph: 6.1 }, '2026-04-10T10:00:00.000Z')],
    });

    const series = buildTemporalForLens('living', [cycle1, baseline], PH_SLOTS);
    expect(series).not.toBeNull();
    expect(series!.metric).toBe('Soil pH');
    expect(series!.points).toEqual([
      { cycle: 'Baseline', date: 'Jan 26', value: 5.2, location: 'Zone 1' },
      { cycle: 'Baseline', date: 'Jan 26', value: 5.4, location: 'Zone 2' },
      { cycle: 'Cycle 1', date: 'Apr 26', value: 6.1, location: 'Zone 3' },
    ]);
  });

  it('converts wind speed m/s -> whole km/h like the specialised rose', () => {
    const getSlot = makeGetSlot({
      wind: { kind: 'logged', binding: { lens: 'climate', vizField: 'climate.windRose' } },
    });
    const pt = mkPoint({
      domainId: 'climate',
      proofItems: [
        logged('wind', { dir: 'SW', speedMs: 5 }, '2026-01-05T10:00:00.000Z'),
        logged('wind', { dir: 'W', speedMs: 3.2 }, '2026-02-05T10:00:00.000Z'),
      ],
    });
    const series = buildTemporalForLens('climate', [pt], getSlot);
    expect(series!.metric).toBe('Wind speed (km/h)');
    expect(series!.points.map((p) => p.value)).toEqual([18, 12]);
    expect(series!.points.map((p) => p.location)).toEqual(['SW', 'W']);
  });

  it('ignores rows that fail the viz-field row schema', () => {
    const pt = mkPoint({
      proofItems: [
        logged('ph', { zone: 'Zone 1', ph: 5.2 }, '2026-01-05T10:00:00.000Z'),
        logged('ph', { zone: 'Zone 2' /* missing ph */ }, '2026-01-06T10:00:00.000Z'),
      ],
    });
    // Only one valid row -> below the 2-point floor -> null.
    expect(buildTemporalForLens('living', [pt], PH_SLOTS)).toBeNull();
  });
});

// ── scalar measurement series ────────────────────────────────────────────────

describe('buildTemporalForLens -- bound scalar measurements', () => {
  const getSlot = makeGetSlot({
    depth: { kind: 'scalar', label: 'Water table depth', unit: 'cm' },
  });

  it('charts bound scalars with slot label + unit and domain location', () => {
    const baseline = mkPoint({
      domainId: 'hydrology',
      cycleId: 0,
      proofItems: [scalar('depth', 120, '2026-01-05T10:00:00.000Z')],
    });
    const cycle1 = mkPoint({
      domainId: 'hydrology',
      cycleId: 1,
      proofItems: [scalar('depth', 95, '2026-04-10T10:00:00.000Z')],
    });
    const series = buildTemporalForLens('water', [baseline, cycle1], getSlot);
    expect(series!.metric).toBe('Water table depth (cm)');
    expect(series!.points).toEqual([
      {
        cycle: 'Baseline',
        date: 'Jan 26',
        value: 120,
        location: UNIVERSAL_DOMAIN_LABELS.hydrology,
      },
      {
        cycle: 'Cycle 1',
        date: 'Apr 26',
        value: 95,
        location: UNIVERSAL_DOMAIN_LABELS.hydrology,
      },
    ]);
  });

  it('skips unbound measurement items (slot does not resolve)', () => {
    const noSlots: SlotResolver = () => undefined;
    const pt = mkPoint({
      domainId: 'hydrology',
      proofItems: [
        scalar('depth', 120, '2026-01-05T10:00:00.000Z'),
        scalar('depth', 95, '2026-02-05T10:00:00.000Z'),
      ],
    });
    expect(buildTemporalForLens('water', [pt], noSlots)).toBeNull();
  });
});

// ── degrade + selection ──────────────────────────────────────────────────────

describe('buildTemporalForLens -- degrade and series selection', () => {
  it('returns null with no points and with a single reading', () => {
    expect(buildTemporalForLens('living', [], PH_SLOTS)).toBeNull();
    const one = mkPoint({
      proofItems: [logged('ph', { zone: 'Zone 1', ph: 5.2 }, '2026-01-05T10:00:00.000Z')],
    });
    expect(buildTemporalForLens('living', [one], PH_SLOTS)).toBeNull();
  });

  it('picks the metric with the most points', () => {
    const getSlot = makeGetSlot({
      inf: { kind: 'logged', binding: { lens: 'water', vizField: 'water.infiltrationData' } },
      depth: { kind: 'scalar', label: 'Water table depth', unit: 'cm' },
    });
    const pt = mkPoint({
      domainId: 'hydrology',
      proofItems: [
        logged('inf', { zone: 'Zone A', rate: 28 }, '2026-02-05T10:00:00.000Z'),
        logged('inf', { zone: 'Zone B', rate: 41 }, '2026-02-06T10:00:00.000Z'),
        logged('inf', { zone: 'Zone C', rate: 35 }, '2026-02-07T10:00:00.000Z'),
        scalar('depth', 120, '2026-01-05T10:00:00.000Z'),
        scalar('depth', 95, '2026-01-06T10:00:00.000Z'),
      ],
    });
    const series = buildTemporalForLens('water', [pt], getSlot);
    expect(series!.metric).toBe('Infiltration rate (mm/hr)');
    expect(series!.points).toHaveLength(3);
  });

  it('breaks point-count ties by earliest first capture', () => {
    const getSlot = makeGetSlot({
      inf: { kind: 'logged', binding: { lens: 'water', vizField: 'water.infiltrationData' } },
      depth: { kind: 'scalar', label: 'Water table depth', unit: 'cm' },
    });
    const pt = mkPoint({
      domainId: 'hydrology',
      proofItems: [
        // Scalar series starts earlier -> wins the 2 vs 2 tie.
        scalar('depth', 120, '2026-01-05T10:00:00.000Z'),
        scalar('depth', 95, '2026-03-05T10:00:00.000Z'),
        logged('inf', { zone: 'Zone A', rate: 28 }, '2026-02-05T10:00:00.000Z'),
        logged('inf', { zone: 'Zone B', rate: 41 }, '2026-02-06T10:00:00.000Z'),
      ],
    });
    const series = buildTemporalForLens('water', [pt], getSlot);
    expect(series!.metric).toBe('Water table depth (cm)');
  });
});
