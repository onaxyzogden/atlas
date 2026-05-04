/**
 * useFieldFlags — Phase 5.2 PR3.
 *
 * Single read path for the Operate page's `FieldFlag[]`. Derives live flags
 * from the v2 stores (livestock paddocks, water storage infrastructure) and
 * unions them with any brief-fixture fallback flags so the MTC dev project
 * keeps rendering its hand-authored pins.
 *
 * Per the Operate field-map ADR (`wiki/decisions/2026-04-30-v3-operate-
 * field-map-scoping.md`) only point-like signals become flags. Earthwork
 * line geometry is intentionally omitted — those will render as a dedicated
 * line layer in a later PR rather than as marker pins.
 *
 * De-dupe rule: a derived flag wins over any brief flag with the same id.
 * Brief flags whose `source.store === "brief"` (or whose source is absent)
 * are passed through untouched as long as their id does not collide.
 */

import { useMemo } from "react";
import { useLivestockStore, type Paddock } from "../../store/livestockStore.js";
import {
  useWaterSystemsStore,
  type StorageInfra,
} from "../../store/waterSystemsStore.js";
import type { FieldFlag, OpsTone } from "../types.js";

function polygonCentroid(poly: GeoJSON.Polygon): [number, number] | null {
  const ring = poly.coordinates[0];
  if (!ring || ring.length === 0) return null;
  // Skip the closing duplicate vertex when present.
  const last = ring[ring.length - 1];
  const first = ring[0];
  const closed =
    !!last &&
    !!first &&
    last[0] === first[0] &&
    last[1] === first[1];
  const verts = closed ? ring.slice(0, -1) : ring;
  let lng = 0;
  let lat = 0;
  let n = 0;
  for (const pt of verts) {
    const x = pt[0];
    const y = pt[1];
    if (x === undefined || y === undefined) continue;
    lng += x;
    lat += y;
    n += 1;
  }
  if (n === 0) return null;
  return [lng / n, lat / n];
}

function paddockTone(p: Paddock): OpsTone {
  // Density bands: ADR carries no thresholds yet — use the v2 livestock
  // grading bands as a proxy until Sprint BL fuzzy-density rollup lands.
  const d = p.stockingDensity;
  if (d === null || d === undefined) return "neutral";
  if (d > 8) return "warning";
  if (d > 4) return "watch";
  return "good";
}

function paddockToFlag(p: Paddock): FieldFlag | null {
  const c = polygonCentroid(p.geometry);
  if (!c) return null;
  const speciesLabel =
    p.species.length === 0
      ? "no species assigned"
      : p.species.join(", ").replaceAll("_", " ");
  return {
    id: `livestock:${p.id}`,
    kind: "livestock",
    position: c,
    label: p.name,
    detail: `${speciesLabel}${
      p.stockingDensity ? ` · ${p.stockingDensity} head/ha` : ""
    }`,
    tone: paddockTone(p),
    source: { store: "livestock", refId: p.id },
    observedAt: p.updatedAt,
  };
}

function storageToFlag(s: StorageInfra): FieldFlag {
  const typeLabel =
    s.type === "rain_garden" ? "rain garden" : s.type;
  const capacity = s.capacityL ? ` · ${s.capacityL.toLocaleString()} L` : "";
  return {
    id: `water:${s.id}`,
    kind: "water",
    position: s.center,
    label: typeLabel.replace(/^./, (c) => c.toUpperCase()),
    detail: `${typeLabel}${capacity}`,
    tone: "neutral",
    source: { store: "waterSystems", refId: s.id },
    observedAt: s.createdAt,
  };
}

export interface UseFieldFlagsOptions {
  /**
   * Brief-fixture fallback flags. Their `source.store === "brief"` entries
   * (and any source-less entries) pass through unless a derived flag has the
   * same id.
   */
  briefFlags?: FieldFlag[];
}

export function useFieldFlags(
  projectId: string | undefined,
  options?: UseFieldFlagsOptions,
): FieldFlag[] {
  const paddocks = useLivestockStore((s) => s.paddocks);
  const storageInfra = useWaterSystemsStore((s) => s.storageInfra);
  const briefFlags = options?.briefFlags;

  return useMemo(() => {
    if (!projectId) return briefFlags ?? [];

    const derived: FieldFlag[] = [];
    for (const p of paddocks) {
      if (p.projectId !== projectId) continue;
      const f = paddockToFlag(p);
      if (f) derived.push(f);
    }
    for (const s of storageInfra) {
      if (s.projectId !== projectId) continue;
      derived.push(storageToFlag(s));
    }

    if (!briefFlags || briefFlags.length === 0) return derived;

    const seen = new Set(derived.map((f) => f.id));
    const merged = [...derived];
    for (const bf of briefFlags) {
      if (seen.has(bf.id)) continue;
      merged.push(bf);
    }
    return merged;
  }, [projectId, paddocks, storageInfra, briefFlags]);
}
