/**
 * usePlacedFeatures — unified read of every feature the steward has
 * placed on the map for a project, scoped to the active stage.
 *
 * Three stores, one display model:
 *   - builtEnvironmentStoreV2  → buildings, wells, fences, utilities, …
 *   - landDesignStore          → paddocks, swales, ponds, paths, …
 *   - zoneStore                → custom land-use zones
 *
 * Stage scoping (mirrors the rail/tooling split):
 *   - 'observe' → built where state==='existing' + zones
 *   - 'plan'    → built where state==='proposed' + design elements + zones
 *
 * The hook returns a derived `PlacedFeatureRow[]` plus per-source `remove`
 * callbacks. Geometry → centroid is computed here (Point / LineString /
 * Polygon / MultiPolygon) so consumers can wire fly-to without reaching
 * back into raw GeoJSON.
 */

import { useMemo } from 'react';
import {
  useBuiltEnvironmentStoreV2,
  type BuiltEnvironmentV2State,
} from '../../../store/builtEnvironmentStoreV2.js';
import { useLandDesignStore } from '../../../store/landDesignStore.js';
import {
  useZoneStore,
  ZONE_CATEGORY_CONFIG,
  type LandZone,
} from '../../../store/zoneStore.js';
import type { DesignElement } from '../../../store/designElementsStore.js';
import {
  getBuiltEnvironmentKind,
  type BuiltEnvironmentEntity,
} from '@ogden/shared';
import { findElementSpec } from '../../../v3/plan/canvas/elementCatalog.js';

export type PlacedFeatureStage = 'observe' | 'plan';
export type PlacedFeatureSource = 'built' | 'design' | 'zone';

export interface PlacedFeatureRow {
  /** Composite key — stable across renders and unique across all three stores. */
  rowKey: string;
  /** Raw store id (NOT unique across sources — use rowKey for React keys). */
  id: string;
  source: PlacedFeatureSource;
  /** Canonical kind id (`building`, `paddock`, …) or zone category for zones. */
  kind: string;
  /** Group bucket label, e.g. "Buildings", "Paddocks", "Zones — Habitation". */
  groupLabel: string;
  /** User-given name when present, otherwise the kind label. */
  label: string;
  /** Hex fill colour from the source's spec. */
  color: string;
  /** Optional second-line meta, e.g. "1.2 ha" or "230 m". */
  meta?: string;
  /** Centroid for fly-to. Null when the geometry is unrecognised. */
  centroid: [number, number] | null;
  /** Steward toggled this feature off on the canvas. Row still appears
   *  in the card (dimmed) so it can be toggled back. */
  hidden: boolean;
}

interface UsePlacedFeaturesResult {
  rows: PlacedFeatureRow[];
  /** Per-source removers — the card resolves the right one from the row. */
  removeBuilt: (id: string) => void;
  removeDesign: (id: string) => void;
  removeZone: (id: string) => void;
  /** Per-source visibility setters — write `hidden` on the underlying
   *  entity. Hidden rows still appear in the inventory (dimmed). */
  setBuiltHidden: (id: string, hidden: boolean) => void;
  setDesignHidden: (id: string, hidden: boolean) => void;
  setZoneHidden: (id: string, hidden: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────────────
// Geometry helpers — exported for unit tests
// ─────────────────────────────────────────────────────────────────────────

export function centroidOf(g: GeoJSON.Geometry | undefined | null): [number, number] | null {
  if (!g) return null;
  switch (g.type) {
    case 'Point': {
      const [lng, lat] = g.coordinates;
      if (typeof lng !== 'number' || typeof lat !== 'number') return null;
      return [lng, lat];
    }
    case 'LineString': {
      const coords = g.coordinates;
      if (coords.length === 0) return null;
      const mid = coords[Math.floor(coords.length / 2)];
      if (!mid) return null;
      const [lng, lat] = mid;
      if (typeof lng !== 'number' || typeof lat !== 'number') return null;
      return [lng, lat];
    }
    case 'Polygon': {
      const ring = g.coordinates[0];
      if (!ring || ring.length === 0) return null;
      return averageRing(ring);
    }
    case 'MultiPolygon': {
      const ring = g.coordinates[0]?.[0];
      if (!ring || ring.length === 0) return null;
      return averageRing(ring);
    }
    default:
      return null;
  }
}

function averageRing(ring: number[][]): [number, number] | null {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const c of ring) {
    const lng = c[0];
    const lat = c[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    x += lng;
    y += lat;
    n += 1;
  }
  if (n === 0) return null;
  return [x / n, y / n];
}

function formatArea(m2: number | undefined): string | undefined {
  if (typeof m2 !== 'number' || !isFinite(m2) || m2 <= 0) return undefined;
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2)} ha`;
  return `${Math.round(m2)} m²`;
}

function formatLength(m: number | undefined): string | undefined {
  if (typeof m !== 'number' || !isFinite(m) || m <= 0) return undefined;
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

function formatAcres(ac: number | undefined): string | undefined {
  if (typeof ac !== 'number' || !isFinite(ac) || ac <= 0) return undefined;
  return `${ac.toFixed(2)} ac`;
}

// ─────────────────────────────────────────────────────────────────────────
// Row builders
// ─────────────────────────────────────────────────────────────────────────

export function builtToRow(e: BuiltEnvironmentEntity): PlacedFeatureRow {
  const spec = getBuiltEnvironmentKind(e.kind);
  const kindLabel = spec?.label ?? e.kind;
  const groupLabel = `${kindLabel}${pluralSuffix(kindLabel)}`;
  const meta =
    formatArea(e.existing?.areaM2) ??
    formatLength(e.existing?.lengthM) ??
    undefined;
  return {
    rowKey: `built:${e.id}`,
    id: e.id,
    source: 'built',
    kind: e.kind,
    groupLabel,
    label: e.label?.trim() || kindLabel,
    color: spec?.color ?? '#8a8e94',
    meta,
    centroid: centroidOf(e.geometry as GeoJSON.Geometry),
    hidden: e.hidden ?? false,
  };
}

export function designToRow(el: DesignElement): PlacedFeatureRow {
  const spec = findElementSpec(el.kind);
  const kindLabel = spec?.label ?? el.kind;
  const groupLabel = `${kindLabel}${pluralSuffix(kindLabel)}`;
  return {
    rowKey: `design:${el.id}`,
    id: el.id,
    source: 'design',
    kind: el.kind,
    groupLabel,
    label: el.label?.trim() || kindLabel,
    color: spec?.color ?? '#7aa86a',
    meta: formatAcres(el.acreage),
    centroid: centroidOf(el.geometry),
    hidden: el.hidden ?? false,
  };
}

export function zoneToRow(z: LandZone): PlacedFeatureRow {
  const catCfg = ZONE_CATEGORY_CONFIG[z.category];
  const catLabel = catCfg?.label ?? z.category;
  return {
    rowKey: `zone:${z.id}`,
    id: z.id,
    source: 'zone',
    kind: z.category,
    groupLabel: `Zones — ${catLabel}`,
    label: z.name?.trim() || catLabel,
    color: z.color || catCfg?.color || '#7e8a6f',
    meta: formatArea(z.areaM2),
    centroid: centroidOf(z.geometry),
    hidden: z.hidden ?? false,
  };
}

function pluralSuffix(label: string): string {
  // Cheap English-ish pluralisation good enough for kind labels in the rail.
  if (/s$|x$|z$|ch$|sh$/i.test(label)) return 'es';
  if (/y$/i.test(label) && !/[aeiou]y$/i.test(label)) {
    return ''; // handled by replacement at caller — keep simple, return ''
  }
  return 's';
}

// ─────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────

export function usePlacedFeatures(
  stage: PlacedFeatureStage,
  projectId: string | null,
): UsePlacedFeaturesResult {
  // Built environment — raw entities; filtered + mapped in useMemo.
  const builtEntities = useBuiltEnvironmentStoreV2((s) => s.entities);
  const removeBuilt = useBuiltEnvironmentStoreV2(
    (s: BuiltEnvironmentV2State) => s.delete,
  );
  const setBuiltHidden = useBuiltEnvironmentStoreV2(
    (s: BuiltEnvironmentV2State) => s.setHidden,
  );

  // Land design — raw byProject map; pick this project's slice in useMemo.
  const designByProject = useLandDesignStore((s) => s.byProject);
  const removeDesignAction = useLandDesignStore((s) => s.remove);
  const updateDesign = useLandDesignStore((s) => s.update);

  // Zones — raw array; per-project filter in useMemo (the store warns against
  // doing this inside a selector).
  const zones = useZoneStore((s) => s.zones);
  const deleteZone = useZoneStore((s) => s.deleteZone);
  const updateZone = useZoneStore((s) => s.updateZone);

  const rows = useMemo<PlacedFeatureRow[]>(() => {
    if (!projectId) return [];
    const out: PlacedFeatureRow[] = [];

    const desiredBuiltState = stage === 'observe' ? 'existing' : 'proposed';
    for (const e of builtEntities) {
      if (e.projectId !== projectId) continue;
      if (e.state !== desiredBuiltState) continue;
      out.push(builtToRow(e));
    }

    if (stage === 'plan') {
      const list = designByProject[projectId] ?? [];
      for (const el of list) {
        if (el.draft) continue; // hide auto-design drafts from the inventory
        out.push(designToRow(el));
      }
    }

    for (const z of zones) {
      if (z.projectId !== projectId) continue;
      out.push(zoneToRow(z));
    }

    // Stable sort: groupLabel asc, then label asc.
    out.sort((a, b) => {
      if (a.groupLabel !== b.groupLabel) {
        return a.groupLabel.localeCompare(b.groupLabel);
      }
      return a.label.localeCompare(b.label);
    });

    return out;
  }, [stage, projectId, builtEntities, designByProject, zones]);

  return {
    rows,
    removeBuilt,
    removeDesign: (id: string) => {
      if (projectId) removeDesignAction(projectId, id);
    },
    removeZone: deleteZone,
    setBuiltHidden,
    setDesignHidden: (id: string, hidden: boolean) => {
      if (projectId) updateDesign(projectId, id, { hidden });
    },
    setZoneHidden: (id: string, hidden: boolean) => {
      updateZone(id, { hidden });
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Rollup — exported for the card header + tests
// ─────────────────────────────────────────────────────────────────────────

export interface PlacedFeatureRollup {
  total: number;
  /** Group-label → count, in display order. */
  perGroup: Array<{ groupLabel: string; count: number }>;
}

export function rollupRows(rows: PlacedFeatureRow[]): PlacedFeatureRollup {
  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.groupLabel, (counts.get(r.groupLabel) ?? 0) + 1);
  }
  const perGroup = Array.from(counts.entries())
    .map(([groupLabel, count]) => ({ groupLabel, count }))
    .sort((a, b) => b.count - a.count || a.groupLabel.localeCompare(b.groupLabel));
  return { total: rows.length, perGroup };
}
