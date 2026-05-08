/**
 * derivations — pure helpers for the v3 Built Environment module.
 *
 * Map raw `builtEnvironmentStore` annotations into the KPI strip,
 * synthesis, sidebar feature counts and module-health figures the
 * dashboard renders.
 */

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

export interface BuiltKpiItem {
  iconKey:
    | 'home'
    | 'droplet'
    | 'recycle'
    | 'zap'
    | 'cable'
    | 'fence'
    | 'door-open'
    | 'route';
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

export function moduleHealthPct(counts: BuiltFeatureCounts): number {
  const kindsPresent = [
    counts.buildings,
    counts.wells,
    counts.septics,
    counts.powerLines,
    counts.buriedUtilities,
    counts.fences,
    counts.gates,
    counts.existingDriveways,
  ].filter((c) => c > 0).length;
  const raw = counts.total * 8 + kindsPresent * 4;
  return Math.max(0, Math.min(100, raw));
}

export function healthLabel(pct: number): 'Empty' | 'Forming' | 'Good' {
  if (pct < 40) return 'Empty';
  if (pct < 70) return 'Forming';
  return 'Good';
}
