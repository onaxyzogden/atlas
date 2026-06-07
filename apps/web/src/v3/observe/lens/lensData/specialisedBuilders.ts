// specialisedBuilders.ts -- the read-side "compiler" that turns captured proof
// items into the lens specialised visualization payloads.
//
// A proof SLOT declares (design-time) which lens viz field its captures feed,
// via `measurementBinding` (packages/shared .../proofSchema.schema.ts). A proof
// ITEM (runtime) carries the row in `loggedResult` and points back at the slot
// by `slotId`. These pure functions resolve slotId -> slot -> binding, parse
// each row against its vizField payload schema, aggregate where the viz needs
// it (wind rose histogram, slope area share), and compute the presentation-only
// fields the renderers expect (colour, the layout `x`, the derived status band)
// from the captured numbers -- never fabricating a measurement.
//
// PURE: no React, no stores. The slot resolver is injected as a parameter
// (`getSlot`) so this module is fully unit-testable; the live hook passes the
// shared catalogue resolver (`getMeasurementSlot`).
//
// A lens emits its real Specialised member as soon as >=1 bound row exists for
// any of its viz fields; otherwise it keeps the honest { type: 'none' }
// empty-state. Secondary viz fields with no captures degrade to [] (the
// renderers already map over empty arrays).

import {
  InfiltrationReadingSchema,
  WaterSourceReadingSchema,
  SoilPhReadingSchema,
  ElevationZoneReadingSchema,
  SlopeReadingSchema,
  WindObservationSchema,
  MicroclimateReadingSchema,
  CapacityReadingSchema,
  ConsentReadingSchema,
  SuggestedTaskReadingSchema,
  type MeasurementVizField as MeasurementVizFieldT,
  type MeasurementBinding,
  type FieldActionProofItem,
  type ProofSchemaSlot,
  type ObserveLensId,
} from '@ogden/shared';
import type {
  Specialised,
  HydrologyData,
  InfiltrationRow,
  WaterSource,
  SoilData,
  PhRow,
  TopographyData,
  ElevationZone,
  SlopeRow,
  ClimateData,
  WindDir,
  Microclimate,
  HumanData,
  CapacityBar,
  ConsentItem,
  InfraEmptyData,
  SuggestedTask,
  Confidence,
} from '../types.js';

/** Resolve a slot (with its measurementBinding) by slotId. Injected so the
 *  builders stay store-free. The live hook passes `getMeasurementSlot`. */
export type SlotResolver = (slotId: string) => ProofSchemaSlot | undefined;

// One captured row routed to a viz field: the parsed-from binding plus its raw
// loggedResult payload and a stable sort key.
interface BoundRow {
  binding: MeasurementBinding;
  loggedResult: Record<string, unknown>;
  order: number;
}

// ── presentation ramps (read-side only) ─────────────────────────────────────
const ELEVATION_RAMP = ['#9E7A4A', '#B08D5A', '#C4A06A', '#D4B37A', '#E0C58E'];
const SLOPE_RAMP = ['#5AAF72', '#7FB85E', '#D4944A', '#C45A4A', '#A04438'];
const GREEN = '#5AAF72';
const AMBER = '#D4944A';
const RED = '#C45A4A';

const WIND_ORDER = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

function capacityColor(pct: number): string {
  if (pct >= 70) return GREEN;
  if (pct >= 40) return AMBER;
  return RED;
}

function infiltrationStatus(rate: number): InfiltrationRow['status'] {
  if (rate >= 40) return 'good';
  if (rate >= 20) return 'moderate';
  return 'risk';
}

function formatArea(areaM2: number): string {
  if (areaM2 >= 10_000) return `${(areaM2 / 10_000).toFixed(1)} ha`;
  return `${Math.round(areaM2)} m2`;
}

// ── collection: proof items -> rows grouped by viz field ─────────────────────

/**
 * Group a lens's proof items by the viz field their slot binding targets.
 * Items whose slot has no binding (or no slotId) are ignored. Order key falls
 * back to encounter order when the binding omits `order`.
 */
function collectByVizField(
  items: readonly FieldActionProofItem[],
  getSlot: SlotResolver,
): Map<MeasurementVizFieldT, BoundRow[]> {
  const out = new Map<MeasurementVizFieldT, BoundRow[]>();
  items.forEach((item, i) => {
    if (!item.slotId) return;
    const slot = getSlot(item.slotId);
    const binding = slot?.measurementBinding;
    if (!binding) return;
    const loggedResult =
      item.loggedResult && typeof item.loggedResult === 'object'
        ? (item.loggedResult as Record<string, unknown>)
        : {};
    const row: BoundRow = { binding, loggedResult, order: binding.order ?? i };
    const bucket = out.get(binding.vizField);
    if (bucket) bucket.push(row);
    else out.set(binding.vizField, [row]);
  });
  return out;
}

function rowsFor(
  byField: Map<MeasurementVizFieldT, BoundRow[]>,
  field: MeasurementVizFieldT,
): BoundRow[] {
  return (byField.get(field) ?? []).slice().sort((a, b) => a.order - b.order);
}

// ── per-viz builders ─────────────────────────────────────────────────────────

function parseRows<T>(
  rows: BoundRow[],
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } },
): T[] {
  return rows.flatMap((r) => {
    const p = schema.safeParse(r.loggedResult);
    return p.success ? [p.data] : [];
  });
}

function buildInfiltration(rows: BoundRow[]): InfiltrationRow[] {
  const parsed = parseRows(rows, InfiltrationReadingSchema);
  if (parsed.length === 0) return [];
  const rates = parsed.map((p) => p.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const span = max - min;
  return parsed.map((p) => ({
    zone: p.zone,
    rate: p.rate,
    status: infiltrationStatus(p.rate),
    x: span > 0 ? (p.rate - min) / span : 0.5,
  }));
}

function buildWaterSources(rows: BoundRow[]): WaterSource[] {
  return parseRows(rows, WaterSourceReadingSchema).map((d) => ({
    label: d.label,
    type: d.sourceType,
    status: d.status,
    confidence: d.confidence as Confidence,
    ...(d.divergence !== undefined ? { divergence: d.divergence } : {}),
  }));
}

function buildPhData(rows: BoundRow[]): PhRow[] {
  // om / compaction are optional captures -> left undefined when absent; the
  // renderer guards those spans (partial degrade).
  return parseRows(rows, SoilPhReadingSchema).map((d) => ({
    zone: d.zone,
    ph: d.ph,
    ...(d.om !== undefined ? { om: d.om } : {}),
    ...(d.compaction !== undefined ? { compaction: d.compaction } : {}),
  }));
}

function buildElevationZones(rows: BoundRow[]): ElevationZone[] {
  return parseRows(rows, ElevationZoneReadingSchema).map((d, i) => ({
    label: d.label,
    area: formatArea(d.areaM2),
    aspect: d.aspect,
    use: d.use,
    color: ELEVATION_RAMP[i % ELEVATION_RAMP.length]!,
  }));
}

function buildSlopeBreakdown(rows: BoundRow[]): SlopeRow[] {
  const parsed = parseRows(rows, SlopeReadingSchema);
  if (parsed.length === 0) return [];
  const total = parsed.reduce((n, p) => n + p.areaM2, 0) || 1;
  return parsed.map((p, i) => ({
    label: p.band,
    pct: Math.round((p.areaM2 / total) * 100),
    color: SLOPE_RAMP[i % SLOPE_RAMP.length]!,
  }));
}

function buildWindRose(rows: BoundRow[]): WindDir[] {
  const bins = new Map<string, { count: number; sumMs: number }>();
  for (const r of rows) {
    const p = WindObservationSchema.safeParse(r.loggedResult);
    if (!p.success) continue;
    const b = bins.get(p.data.dir) ?? { count: 0, sumMs: 0 };
    b.count += 1;
    b.sumMs += p.data.speedMs;
    bins.set(p.data.dir, b);
  }
  if (bins.size === 0) return [];
  // Always emit all 8 compass points in canonical order so the rose renders by
  // index; unobserved directions are zero-frequency petals.
  return WIND_ORDER.map((dir) => {
    const b = bins.get(dir);
    return {
      dir,
      freq: b ? b.count : 0,
      speed: b ? Math.round((b.sumMs / b.count) * 3.6) : 0, // m/s -> km/h
    };
  });
}

function buildMicroclimates(rows: BoundRow[]): Microclimate[] {
  return parseRows(rows, MicroclimateReadingSchema).map((d) => ({
    label: d.label,
    size: d.sizeHa !== undefined ? `${d.sizeHa} ha` : '--',
    character: d.character,
    risk: d.risk,
  }));
}

function buildCapacityBars(rows: BoundRow[]): CapacityBar[] {
  return parseRows(rows, CapacityReadingSchema).map((d) => ({
    label: d.label,
    pct: d.pct,
    color: capacityColor(d.pct),
  }));
}

function buildConsentItems(rows: BoundRow[]): ConsentItem[] {
  return parseRows(rows, ConsentReadingSchema).map((d) => ({
    label: d.label,
    status: d.status,
    weeks: d.weeks ?? '',
  }));
}

function buildSuggestedTasks(rows: BoundRow[]): SuggestedTask[] {
  return parseRows(rows, SuggestedTaskReadingSchema).map((d) => ({
    label: d.label,
    domain: d.domain,
    priority: d.priority,
  }));
}

// ── lens dispatcher ────────────────────────────────────────────────────────────

const NONE: Specialised = { type: 'none' };

/**
 * Assemble the Specialised payload for one lens from its captured proof items.
 * Returns the lens's real union member when at least one of its viz fields has
 * captures, else the honest { type: 'none' } empty-state.
 */
export function buildSpecialisedForLens(
  lensId: ObserveLensId,
  proofItems: readonly FieldActionProofItem[],
  getSlot: SlotResolver,
): Specialised {
  const byField = collectByVizField(proofItems, getSlot);
  const has = (...fields: MeasurementVizFieldT[]) =>
    fields.some((f) => (byField.get(f)?.length ?? 0) > 0);

  switch (lensId) {
    case 'water': {
      if (!has('water.infiltrationData', 'water.sources')) return NONE;
      const data: HydrologyData = {
        type: 'hydrology',
        infiltrationData: buildInfiltration(rowsFor(byField, 'water.infiltrationData')),
        sources: buildWaterSources(rowsFor(byField, 'water.sources')),
      };
      return data;
    }
    case 'living': {
      if (!has('soil.phData')) return NONE;
      const data: SoilData = {
        type: 'soil',
        phData: buildPhData(rowsFor(byField, 'soil.phData')),
      };
      return data;
    }
    case 'foundation': {
      if (!has('topography.elevationZones', 'topography.slopeBreakdown')) return NONE;
      const data: TopographyData = {
        type: 'topography',
        elevationZones: buildElevationZones(rowsFor(byField, 'topography.elevationZones')),
        slopeBreakdown: buildSlopeBreakdown(rowsFor(byField, 'topography.slopeBreakdown')),
      };
      return data;
    }
    case 'climate': {
      if (!has('climate.windRose', 'climate.microclimates')) return NONE;
      const data: ClimateData = {
        type: 'climate',
        windRose: buildWindRose(rowsFor(byField, 'climate.windRose')),
        microclimates: buildMicroclimates(rowsFor(byField, 'climate.microclimates')),
      };
      return data;
    }
    case 'human': {
      if (!has('human.capacityBars', 'human.consentItems')) return NONE;
      const data: HumanData = {
        type: 'human',
        capacityBars: buildCapacityBars(rowsFor(byField, 'human.capacityBars')),
        consentItems: buildConsentItems(rowsFor(byField, 'human.consentItems')),
      };
      return data;
    }
    case 'infrastructure': {
      if (!has('infrastructure.suggestedTasks')) return NONE;
      const data: InfraEmptyData = {
        type: 'infrastructure_empty',
        suggestedTasks: buildSuggestedTasks(rowsFor(byField, 'infrastructure.suggestedTasks')),
      };
      return data;
    }
    default:
      return NONE;
  }
}
