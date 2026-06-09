/**
 * forageZoneSync -- pure, store-free adapter.
 *
 * Converts a list of ForageZone records (from the ForageCapture register) into
 * a diff { upserts, deleteIds } that the caller can apply to the livestock
 * store.  The adapter ONLY touches paddocks whose generationId starts with
 * "forage:" -- all other paddocks are invisible to the diff.
 *
 * Exports:
 *   - DSE_PRESETS      -- verbatim DSE/ha preset table (14 entries)
 *   - ConditionClass   -- string-literal union of all preset keys
 *   - ForageZone       -- minimal input shape
 *   - diffForagePaddocks -- the pure diff function
 */

import type { Paddock, LivestockSpecies } from "../../../store/livestockStore.js";

// ---------------------------------------------------------------------------
// DSE_PRESETS
// ---------------------------------------------------------------------------

export type ConditionClass =
  | "improved-excellent"
  | "improved-good"
  | "improved-fair"
  | "improved-poor"
  | "native-good"
  | "native-fair"
  | "native-poor"
  | "mixed-good"
  | "mixed-fair"
  | "riparian-good"
  | "riparian-fair"
  | "riparian-browse"
  | "riparian-bare"
  | "degraded";

export const DSE_PRESETS: Record<ConditionClass, number> = {
  "improved-excellent": 15,
  "improved-good":      10,
  "improved-fair":       6,
  "improved-poor":       3,
  "native-good":         6,
  "native-fair":         3,
  "native-poor":         1.5,
  "mixed-good":          8,
  "mixed-fair":          4,
  "riparian-good":       2,
  "riparian-fair":       1,
  "riparian-browse":     1.5,
  "riparian-bare":       0.5,
  "degraded":            0.8,
};

// ---------------------------------------------------------------------------
// ForageZone interface
// ---------------------------------------------------------------------------

export interface ForageZone {
  /** Stable per-zone id assigned by the RegisterList. */
  id: string;
  /** Zone label, e.g. "North flat". */
  name: string;
  /** Hectares as a raw string; "0" / "" means no area. */
  areaHa: string;
  /** Optional condition class; available to enrich paddock notes. */
  conditionClass?: ConditionClass;
  /** Optional free-text forage type. */
  forageType?: string;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Parse a raw string value to a finite number.
 * Returns 0 for empty, non-finite, or NaN input.
 * Mirrors the CarryingCapacity convention.
 */
function num(s: string | null | undefined): number {
  const n = parseFloat(String(s ?? ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * A degenerate-but-schema-valid closed GeoJSON Polygon ring.
 * A near-zero-area square at the origin; 5 positions (4 corners + closing).
 * Area is stored via areaM2, NOT derived from this ring.
 */
const DEGENERATE_RING: GeoJSON.Position[] = [
  [0, 0],
  [0, 0.00001],
  [0.00001, 0.00001],
  [0.00001, 0],
  [0, 0],
];

const DEGENERATE_POLYGON: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [DEGENERATE_RING],
};

// ---------------------------------------------------------------------------
// diffForagePaddocks
// ---------------------------------------------------------------------------

export function diffForagePaddocks(
  zones: ForageZone[],
  existing: Paddock[],
  projectId: string,
  candidateSpecies: LivestockSpecies[],
): { upserts: Paddock[]; deleteIds: string[] } {
  const now = new Date().toISOString();

  // Compute upserts: one Paddock per zone with positive area.
  const upserts: Paddock[] = [];
  const upsertIds = new Set<string>();

  for (const zone of zones) {
    const ha = num(zone.areaHa);
    if (ha <= 0) {
      // Zero-area zones are intentionally skipped to prevent the carrying-
      // capacity formula from being spuriously satisfied.
      continue;
    }

    const id = `forage-${projectId}-${zone.id}`;
    upsertIds.add(id);

    const paddock: Paddock = {
      id,
      projectId,
      name: zone.name.trim() !== "" ? zone.name : "Forage zone",
      color: "#7cb342",
      geometry: DEGENERATE_POLYGON,
      areaM2: ha * 10000,
      grazingCellGroup: null,
      species: candidateSpecies,
      stockingDensity: null,
      fencing: "none",
      guestSafeBuffer: false,
      waterPointNote: "",
      shelterNote: "",
      phase: "soil",
      notes: `[forage-survey] ${zone.name}`,
      draft: true,
      generationId: `forage:${projectId}`,
      createdAt: now,
      updatedAt: now,
    };

    upserts.push(paddock);
  }

  // Compute deleteIds: forage-owned rows whose id is NOT in the upsert set.
  const deleteIds: string[] = [];
  for (const p of existing) {
    if (typeof p.generationId === "string" && p.generationId.startsWith("forage:")) {
      if (!upsertIds.has(p.id)) {
        deleteIds.push(p.id);
      }
    }
    // All other rows (undefined generationId, other-generation, canonical) are
    // invisible -- never added to deleteIds or upserts.
  }

  return { upserts, deleteIds };
}
