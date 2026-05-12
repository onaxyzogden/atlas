/**
 * derivations — pure helpers for the v3 Built Environment module.
 *
 * Map raw `builtEnvironmentStore` annotations into the KPI strip,
 * synthesis, sidebar feature counts and module-health figures the
 * dashboard renders.
 */

import * as turf from '@turf/turf';
import type {
  Building,
  BuriedUtility,
  ExistingDriveway,
  Fence,
  Gate,
  PowerLine,
  Septic,
  Well,
} from '../../../../store/builtEnvironmentStore.js';
import {
  getBuiltEnvironmentKind,
  LEGACY_OBSERVE_BE_KINDS,
  type BuiltEnvironmentCategory,
  type BuiltEnvironmentEntity,
} from '@ogden/shared';

export interface BuiltKpiItem {
  iconKey:
    | 'home'
    | 'droplet'
    | 'recycle'
    | 'zap'
    | 'cable'
    | 'fence'
    | 'door-open'
    | 'route'
    // Phase 5.4: V2 category cards
    | 'tent'
    | 'sprout'
    | 'truck'
    | 'flame'
    | 'square';
  label: string;
  value: string;
  pill?: string;
  note: string;
  tone: 'green' | 'gold' | 'blue' | 'red' | 'dim';
}

export interface BuiltFeatureCounts {
  buildings: number;
  wells: number;
  septics: number;
  powerLines: number;
  buriedUtilities: number;
  fences: number;
  gates: number;
  existingDriveways: number;
  total: number;
}

export interface BuiltKpiArgs {
  buildings: Building[];
  wells: Well[];
  septics: Septic[];
  powerLines: PowerLine[];
  buriedUtilities: BuriedUtility[];
  fences: Fence[];
  gates: Gate[];
  existingDriveways: ExistingDriveway[];
}

export function featureCounts(args: BuiltKpiArgs): BuiltFeatureCounts {
  const {
    buildings,
    wells,
    septics,
    powerLines,
    buriedUtilities,
    fences,
    gates,
    existingDriveways,
  } = args;
  return {
    buildings: buildings.length,
    wells: wells.length,
    septics: septics.length,
    powerLines: powerLines.length,
    buriedUtilities: buriedUtilities.length,
    fences: fences.length,
    gates: gates.length,
    existingDriveways: existingDriveways.length,
    total:
      buildings.length +
      wells.length +
      septics.length +
      powerLines.length +
      buriedUtilities.length +
      fences.length +
      gates.length +
      existingDriveways.length,
  };
}

export function dominantKind<T>(
  rows: T[],
  field: keyof T,
): { kind: string | null; share: number } {
  if (rows.length === 0) return { kind: null, share: 0 };
  const tally = new Map<string, number>();
  for (const row of rows) {
    const raw = row[field];
    if (raw == null) continue;
    const key = String(raw);
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  if (tally.size === 0) return { kind: null, share: 0 };
  let bestKind: string | null = null;
  let bestCount = -1;
  for (const [key, count] of tally) {
    if (
      count > bestCount ||
      (count === bestCount && bestKind != null && key < bestKind)
    ) {
      bestKind = key;
      bestCount = count;
    }
  }
  return { kind: bestKind, share: bestKind ? bestCount / rows.length : 0 };
}

export function totalLengthM(rows: { lengthM: number }[]): number {
  return rows.reduce((acc, r) => acc + (r.lengthM ?? 0), 0);
}

export function totalAreaM2(rows: { areaM2?: number }[]): number {
  return rows.reduce((acc, r) => acc + (r.areaM2 ?? 0), 0);
}

export function formatLength(m: number): string {
  if (!m || m <= 0) return '0 m';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

export function formatArea(m2: number): string {
  if (!m2 || m2 <= 0) return '0 m²';
  return m2 >= 10000
    ? `${(m2 / 10000).toFixed(2)} ha`
    : `${Math.round(m2)} m²`;
}

const ROTATION: Array<BuiltKpiItem['tone']> = [
  'green',
  'gold',
  'blue',
  'green',
  'gold',
  'blue',
  'green',
  'gold',
];

function tone(index: number, count: number): BuiltKpiItem['tone'] {
  if (count === 0) return 'dim';
  return ROTATION[index] ?? 'green';
}

function plural(n: number, singular: string, pluralStr?: string): string {
  return `${n} ${n === 1 ? singular : (pluralStr ?? `${singular}s`)}`;
}

export function builtEnvironmentKpis(args: BuiltKpiArgs): BuiltKpiItem[] {
  const {
    buildings,
    wells,
    septics,
    powerLines,
    buriedUtilities,
    fences,
    gates,
    existingDriveways,
  } = args;

  // Buildings
  const bSubtype = dominantKind(buildings, 'subtype');
  const bArea = totalAreaM2(buildings);

  // Wells
  const wKind = dominantKind(wells, 'kind');
  const wellsWithDepth = wells.filter((w) => typeof w.depthM === 'number');
  const meanDepth =
    wellsWithDepth.length > 0
      ? wellsWithDepth.reduce((acc, w) => acc + (w.depthM ?? 0), 0) /
        wellsWithDepth.length
      : null;

  // Septics
  const sKind = dominantKind(septics, 'kind');
  const sArea = totalAreaM2(septics);

  // Power line
  const pPlacement = dominantKind(powerLines, 'placement');
  const pTotal = totalLengthM(powerLines);

  // Buried utility
  const bUKind = dominantKind(buriedUtilities, 'kind');
  const bUTotal = totalLengthM(buriedUtilities);

  // Fences
  const fKind = dominantKind(fences, 'kind');
  const fTotal = totalLengthM(fences);

  // Driveways
  const dSurface = dominantKind(existingDriveways, 'surface');
  const dTotal = totalLengthM(existingDriveways);

  return [
    {
      iconKey: 'home',
      label: 'Buildings',
      value: String(buildings.length),
      pill: buildings.length > 0 && bSubtype.kind ? bSubtype.kind : undefined,
      note:
        buildings.length === 0
          ? 'Trace existing structures to anchor the design.'
          : `Total area ${formatArea(bArea)}.`,
      tone: tone(0, buildings.length),
    },
    {
      iconKey: 'droplet',
      label: 'Wells',
      value: String(wells.length),
      pill: wells.length > 0 && wKind.kind ? wKind.kind : undefined,
      note:
        wells.length === 0
          ? 'Pin wells to size the irrigation budget.'
          : meanDepth != null
            ? `Mean depth ${meanDepth.toFixed(1)} m.`
            : 'No depth recorded.',
      tone: tone(1, wells.length),
    },
    {
      iconKey: 'recycle',
      label: 'Septic',
      value: String(septics.length),
      pill: septics.length > 0 && sKind.kind ? sKind.kind : undefined,
      note:
        septics.length === 0
          ? 'Trace septic footprints — they veto plantings.'
          : sArea > 0
            ? `Total area ${formatArea(sArea)}.`
            : 'No area recorded.',
      tone: tone(2, septics.length),
    },
    {
      iconKey: 'zap',
      label: 'Power line',
      value: formatLength(pTotal),
      pill:
        powerLines.length > 0 && pPlacement.kind
          ? pPlacement.kind
          : undefined,
      note:
        powerLines.length === 0
          ? 'Trace power runs to keep design clear of fall zones.'
          : plural(powerLines.length, 'run'),
      tone: tone(3, powerLines.length),
    },
    {
      iconKey: 'cable',
      label: 'Buried utility',
      value: formatLength(bUTotal),
      pill:
        buriedUtilities.length > 0 && bUKind.kind ? bUKind.kind : undefined,
      note:
        buriedUtilities.length === 0
          ? 'Mark buried lines — they veto earthworks.'
          : plural(buriedUtilities.length, 'line'),
      tone: tone(4, buriedUtilities.length),
    },
    {
      iconKey: 'fence',
      label: 'Fences',
      value: formatLength(fTotal),
      pill: fences.length > 0 && fKind.kind ? fKind.kind : undefined,
      note:
        fences.length === 0
          ? 'Walk the fence lines — they define livestock options.'
          : plural(fences.length, 'segment'),
      tone: tone(5, fences.length),
    },
    {
      iconKey: 'door-open',
      label: 'Gates',
      value: String(gates.length),
      note:
        gates.length === 0
          ? 'Drop pins for entry points.'
          : plural(gates.length, 'gate'),
      tone: tone(6, gates.length),
    },
    {
      iconKey: 'route',
      label: 'Driveway',
      value: formatLength(dTotal),
      pill:
        existingDriveways.length > 0 && dSurface.kind
          ? dSurface.kind
          : undefined,
      note:
        existingDriveways.length === 0
          ? 'Trace existing access routes.'
          : plural(existingDriveways.length, 'run'),
      tone: tone(7, existingDriveways.length),
    },
  ];
}

/**
 * Phase 5.4: widened to include V2 entities alongside the legacy 8.
 *
 * Legacy contribution: `counts.total * 8 + kindsPresent * 4` (kindsPresent
 * is the number of legacy-8 slots with at least one entity).
 *
 * V2 contribution: `v2.entityCount * 8 + v2.kindsPresent * 4`. Treats each
 * canonical V2 kind (e.g. cabin, greenhouse, water-tank) as an additional
 * "slot" so a project that has only V2-class entities (no legacy buildings
 * or wells) still moves the health bar.
 *
 * `v2` is optional so existing call sites keep their behaviour; the
 * dashboard passes it explicitly.
 */
export function moduleHealthPct(
  counts: BuiltFeatureCounts,
  v2?: { entityCount: number; kindsPresent: number },
): number {
  const legacyKindsPresent = [
    counts.buildings,
    counts.wells,
    counts.septics,
    counts.powerLines,
    counts.buriedUtilities,
    counts.fences,
    counts.gates,
    counts.existingDriveways,
  ].filter((c) => c > 0).length;
  const legacyContribution = counts.total * 8 + legacyKindsPresent * 4;
  const v2Contribution = v2
    ? v2.entityCount * 8 + v2.kindsPresent * 4
    : 0;
  return Math.max(0, Math.min(100, legacyContribution + v2Contribution));
}

export function healthLabel(pct: number): 'Empty' | 'Forming' | 'Good' {
  if (pct < 40) return 'Empty';
  if (pct < 70) return 'Forming';
  return 'Good';
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 5.4: V2 category KPI cards for the 23 non-legacy BE kinds
// ─────────────────────────────────────────────────────────────────────────

export interface BuiltV2KpiArgs {
  entities: BuiltEnvironmentEntity[];
  projectId: string;
}

interface CategorySpec {
  category: BuiltEnvironmentCategory;
  label: string;
  iconKey: BuiltKpiItem['iconKey'];
  emptyHint: string;
  toneIndex: number;
}

/**
 * Stable card order for the V2 category strip. We deliberately skip
 * `infrastructure` — it's fully covered by the legacy power-line / buried-
 * utility / fence / gate / driveway cards above, so adding a 6th category
 * card would double-count those features (and the only non-legacy
 * infrastructure kind today is `road`, which isn't yet in the registry).
 *
 * Tone indices continue from 8 onward so the new cards extend the existing
 * green/gold/blue palette rotation in `ROTATION` rather than repeating it.
 */
const V2_CATEGORY_SPECS: ReadonlyArray<CategorySpec> = [
  {
    category: 'building',
    label: 'Habitable structures',
    iconKey: 'tent',
    emptyHint: 'Trace cabins, yurts, classrooms and other places people gather.',
    toneIndex: 8,
  },
  {
    category: 'agricultural',
    label: 'Agricultural',
    iconKey: 'sprout',
    emptyHint: 'Trace barns, greenhouses, sheds, animal shelters, compost.',
    toneIndex: 9,
  },
  {
    category: 'utility',
    label: 'Utility (extended)',
    iconKey: 'droplet',
    emptyHint: 'Trace water tanks, pump houses, solar arrays.',
    toneIndex: 10,
  },
  {
    category: 'machinery',
    label: 'Machinery',
    iconKey: 'truck',
    emptyHint: 'Trace machinery sheds, fuel stations, equipment yards.',
    toneIndex: 11,
  },
  {
    category: 'amenity',
    label: 'Amenity',
    iconKey: 'flame',
    emptyHint: 'Trace fire circles, parking, gathering points.',
    toneIndex: 12,
  },
];

/** Extension of the local `ROTATION` for indices ≥ 8 (V2 cards). */
function v2Tone(toneIndex: number, count: number): BuiltKpiItem['tone'] {
  if (count === 0) return 'dim';
  const palette: Array<BuiltKpiItem['tone']> = ['blue', 'green', 'gold', 'blue', 'green'];
  return palette[toneIndex - 8] ?? 'green';
}

/** Geometry-aware secondary metric. Bucket all kinds in the category to
 *  determine whether to surface area (polygon majority), length (line
 *  majority), or just count (point majority / mixed). */
function bucketGeometryMetric(
  bucket: BuiltEnvironmentEntity[],
): { kind: 'area' | 'length' | 'count'; value: number } {
  let polyCount = 0;
  let lineCount = 0;
  let pointCount = 0;
  let areaSum = 0;
  let lengthSum = 0;
  for (const e of bucket) {
    if (e.geometry.type === 'Polygon') {
      polyCount += 1;
      try {
        areaSum += turf.area(e.geometry);
      } catch {
        /* malformed geometry — skip */
      }
    } else if (e.geometry.type === 'LineString') {
      lineCount += 1;
      try {
        lengthSum += turf.length(
          { type: 'Feature', geometry: e.geometry, properties: {} },
          { units: 'meters' },
        );
      } catch {
        /* malformed geometry — skip */
      }
    } else if (e.geometry.type === 'Point') {
      pointCount += 1;
    }
  }
  if (polyCount >= lineCount && polyCount >= pointCount && polyCount > 0) {
    return { kind: 'area', value: areaSum };
  }
  if (lineCount >= pointCount && lineCount > 0) {
    return { kind: 'length', value: lengthSum };
  }
  return { kind: 'count', value: bucket.length };
}

/**
 * Per-category KPI cards for V2 entities (the 23 non-legacy kinds).
 * Filters by projectId AND state==='existing' AND not in
 * `LEGACY_OBSERVE_BE_KINDS`. Returns 5 stable cards (one per category in
 * `V2_CATEGORY_SPECS`); `dim` tone when bucket empty.
 */
export function builtEnvironmentV2CategoryKpis(
  args: BuiltV2KpiArgs,
): BuiltKpiItem[] {
  const { entities, projectId } = args;

  const eligible = entities.filter(
    (e) =>
      e.projectId === projectId &&
      e.state === 'existing' &&
      !LEGACY_OBSERVE_BE_KINDS.has(e.kind),
  );

  const byCategory = new Map<BuiltEnvironmentCategory, BuiltEnvironmentEntity[]>();
  for (const e of eligible) {
    const spec = getBuiltEnvironmentKind(e.kind);
    if (!spec) continue;
    const list = byCategory.get(spec.category) ?? [];
    list.push(e);
    byCategory.set(spec.category, list);
  }

  return V2_CATEGORY_SPECS.map((c) => {
    const bucket = byCategory.get(c.category) ?? [];
    const count = bucket.length;
    const kindsPresent = new Set(bucket.map((e) => e.kind)).size;
    const dom = dominantKind(bucket, 'kind' as keyof BuiltEnvironmentEntity);
    const metric = bucketGeometryMetric(bucket);

    const value =
      metric.kind === 'area'
        ? formatArea(metric.value)
        : metric.kind === 'length'
          ? formatLength(metric.value)
          : String(count);

    let pill: string | undefined;
    if (count > 0 && dom.kind) {
      const spec = getBuiltEnvironmentKind(dom.kind);
      pill = spec?.label ?? dom.kind;
    }

    let note: string;
    if (count === 0) {
      note = c.emptyHint;
    } else if (metric.kind === 'count') {
      note = `${plural(count, 'item')} across ${plural(kindsPresent, 'kind')}.`;
    } else {
      note = `${plural(count, 'item')} across ${plural(kindsPresent, 'kind')}.`;
    }

    return {
      iconKey: c.iconKey,
      label: c.label,
      value,
      pill,
      note,
      tone: v2Tone(c.toneIndex, count),
    };
  });
}

/**
 * Minimal export-ready entity shape for the `built_environment_report`
 * V2 entities slice. Computes geometry-aware areaM2 / lengthM on demand.
 */
export interface BuiltV2EntityExport {
  id: string;
  kind: string;
  state: 'existing' | 'proposed';
  category: BuiltEnvironmentCategory;
  createdAt?: string;
  label?: string;
  notes?: string;
  areaM2?: number;
  lengthM?: number;
}

export function builtV2EntitiesForExport(
  entities: BuiltEnvironmentEntity[],
  projectId: string,
): BuiltV2EntityExport[] {
  return entities
    .filter(
      (e) =>
        e.projectId === projectId &&
        e.state === 'existing' &&
        !LEGACY_OBSERVE_BE_KINDS.has(e.kind),
    )
    .map((e) => {
      const spec = getBuiltEnvironmentKind(e.kind);
      const out: BuiltV2EntityExport = {
        id: e.id,
        kind: e.kind,
        state: e.state,
        category: spec?.category ?? 'building',
        createdAt: e.createdAt,
      };
      if (e.label) out.label = e.label;
      if (e.notes) out.notes = e.notes;
      if (e.geometry.type === 'Polygon') {
        try {
          out.areaM2 = turf.area(e.geometry);
        } catch {
          /* skip */
        }
      } else if (e.geometry.type === 'LineString') {
        try {
          out.lengthM = turf.length(
            { type: 'Feature', geometry: e.geometry, properties: {} },
            { units: 'meters' },
          );
        } catch {
          /* skip */
        }
      }
      return out;
    });
}

/** V2 entity counts grouped by category (export payload supplement). */
export interface BuiltV2Counts {
  total: number;
  byCategory: Partial<Record<BuiltEnvironmentCategory, number>>;
}

export function builtV2Counts(
  entities: BuiltEnvironmentEntity[],
  projectId: string,
): BuiltV2Counts {
  const eligible = entities.filter(
    (e) =>
      e.projectId === projectId &&
      e.state === 'existing' &&
      !LEGACY_OBSERVE_BE_KINDS.has(e.kind),
  );
  const byCategory: Partial<Record<BuiltEnvironmentCategory, number>> = {};
  for (const e of eligible) {
    const spec = getBuiltEnvironmentKind(e.kind);
    if (!spec) continue;
    byCategory[spec.category] = (byCategory[spec.category] ?? 0) + 1;
  }
  return { total: eligible.length, byCategory };
}
