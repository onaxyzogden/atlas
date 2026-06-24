/**
 * seedHomesteadDesign — drawn permaculture design for the Homestead — Atlas
 * Sample (offline demo).
 *
 * This seeds the OPERATOR-CAPTURED geometry — the parcel's permaculture zones
 * 0–5 and the existing homebase structure (Z0) — onto the *canonical builtin*
 * project id (HOMESTEAD_SAMPLE_PROJECT_ID). From there it cascades to the
 * visitor's editable clone via `cascadeCloneProject` (zoneStore + builtEnviron-
 * ment are both cascade-cloned), so the visitor's map renders the design
 * exactly as drawn — no per-clone re-seeding needed.
 *
 * Per the operator's directive the geometry is NOT invented here: it is drawn
 * live in OLOS against a real property (Z0 = an existing dwelling the operator
 * nominates as the homebase), exported from the live stores, and transcribed
 * into HOMESTEAD_DESIGN_CAPTURE below (Phase 4 of the plan). Until that capture
 * lands, HOMESTEAD_DESIGN_CAPTURE.zones is empty and this function is a no-op —
 * the sample still lists, the spine still resolves all objectives, and the only
 * thing missing is the map geometry.
 *
 * Idempotent: skips entirely once any zone exists for the target project, so
 * re-running on hydrate (or after the visitor edits the design) never
 * duplicates or clobbers.
 *
 * Determinism: fixed ids + a fixed timestamp so the seeded design is byte-
 * stable across reloads (matches the rest of the homestead fixture).
 */

import { useZoneStore, ZONE_CATEGORY_CONFIG, defaultCategoryForZ } from '../store/zoneStore.js';
import type { LandZone } from '../store/zoneStore.js';
import { getStructuresForProject } from '../store/builtEnvironmentSelectors.js';
// Type-only — erased at compile, so it introduces NO runtime cycle even though
// projectStore imports this module. The runtime store is read via the live
// `__ogdenProjectStore` window handle inside the capture helper below.
import type { LocalProject } from '../store/projectStore.js';

/** Fixed timestamp for every seeded design entity — byte-stable across reloads. */
const HOMESTEAD_DESIGN_TS = '2026-06-20T00:00:00.000Z';

type PermacultureLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * One operator-captured permaculture zone. The shape mirrors what the
 * Phase-4 console export yields per zone; everything else on `LandZone`
 * (color, ids, timestamps) is derived deterministically below so the bake is
 * pure data-entry.
 */
interface CapturedZone {
  /** Permaculture ring 0–5. Z0 = the existing homebase. */
  z: PermacultureLevel;
  name: string;
  /** Captured polygon (WGS84). */
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  /** Captured / recomputed area in m². */
  areaM2: number;
  primaryUse: string;
  secondaryUse?: string;
  notes?: string;
  /** Optional category override; defaults to `defaultCategoryForZ(z)`. */
  category?: LandZone['category'];
}

/**
 * The operator-captured design. EMPTY until Phase 4 (the operator draws the
 * boundary + zones 0–5 in-app and pastes the export; I transcribe it here).
 * Z0's zone also flips `isHomeCentre` below.
 */
const HOMESTEAD_DESIGN_CAPTURE: { zones: CapturedZone[] } = {
  zones: [],
};

/**
 * Map a captured zone onto a full `LandZone`. Pure + deterministic: id is
 * derived from the project id + ring level, color from the category config,
 * timestamps fixed. Z0 carries `isHomeCentre` so the Mollison ring overlay
 * anchors correctly.
 */
function toLandZone(projectId: string, captured: CapturedZone): LandZone {
  const category = captured.category ?? defaultCategoryForZ(captured.z);
  return {
    id: `homestead-z${captured.z}`,
    projectId,
    name: captured.name,
    category,
    color: ZONE_CATEGORY_CONFIG[category].color,
    primaryUse: captured.primaryUse,
    secondaryUse: captured.secondaryUse ?? '',
    notes: captured.notes ?? '',
    geometry: captured.geometry,
    areaM2: captured.areaM2,
    permacultureZone: captured.z,
    isHomeCentre: captured.z === 0,
    seedProvenance: 'manual',
    createdAt: HOMESTEAD_DESIGN_TS,
    updatedAt: HOMESTEAD_DESIGN_TS,
  };
}

/**
 * Seed the captured permaculture zones onto `projectId` (the canonical builtin).
 * No-op when nothing has been captured yet, or when zones already exist for the
 * project (idempotent). The existing-homebase structure is wired in Phase 4
 * alongside the geometry (see the plan's design-seeder seam).
 */
export function seedHomesteadDesign(projectId: string): void {
  if (HOMESTEAD_DESIGN_CAPTURE.zones.length === 0) return;

  const { getProjectZones, addZone } = useZoneStore.getState();
  if (getProjectZones(projectId).length > 0) return; // already seeded — idempotent

  for (const captured of HOMESTEAD_DESIGN_CAPTURE.zones) {
    addZone(toLandZone(projectId, captured));
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Phase-4 operator capture helper (dev-only console tool)
//
// The operator draws the parcel boundary + permaculture zones 0–5 (Z0 = the
// existing homebase they nominate) on a scratch project in the running app,
// then runs `__ogdenCaptureHomesteadDesign()` in the browser console. It
// bundles the live geometry — boundary + zones (+ any drawn structures) — into
// one JSON payload (copied to the clipboard, and logged as a fallback) that I
// transcribe into HOMESTEAD_SAMPLE_BOUNDARY (projectStore) and
// HOMESTEAD_DESIGN_CAPTURE above. Reading through the same stores the bake
// writes makes the round-trip loss-free. Purely a capture convenience — not
// wired into any UI.
//
// Defaults to the project in the current `/v3/project/<id>/…` route; pass an
// explicit id to override, or it falls back to the most-recently-updated
// non-builtin project.
// ─────────────────────────────────────────────────────────────────────────

interface CapturedDesignPayload {
  projectId: string;
  name: string | null;
  country: string | null;
  provinceState: string | null;
  units: string | null;
  acreage: number | null;
  hasParcelBoundary: boolean;
  boundary: GeoJSON.FeatureCollection | null;
  zones: CapturedZone[];
  structures: ReturnType<typeof getStructuresForProject>;
  warnings: string[];
}

/** Read the live project store via the dev window handle (no runtime import). */
function readProjectStore(): { projects: LocalProject[] } | undefined {
  const handle = (
    window as unknown as {
      __ogdenProjectStore?: { getState(): { projects: LocalProject[] } };
    }
  ).__ogdenProjectStore;
  return handle?.getState();
}

/** Resolve which project to capture: explicit arg → current route → newest non-builtin. */
function activeProjectId(explicit?: string): string | null {
  if (explicit) return explicit;
  const routeMatch =
    typeof location !== 'undefined'
      ? location.pathname.match(/\/project\/([0-9a-f-]{8,})\b/i)
      : null;
  if (routeMatch?.[1]) return routeMatch[1];
  const projects = readProjectStore()?.projects ?? [];
  const candidates = projects
    .filter((p) => !p.isBuiltin)
    .sort((a, b) =>
      String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')),
    );
  return candidates[0]?.id ?? null;
}

/**
 * Bundle the operator's drawn boundary + zones + structures for a project into
 * a single JSON payload, copy it to the clipboard, and return it. Surfaces
 * warnings (missing boundary, unassigned permaculture level, no structures) so
 * the operator can fix the draw before pasting back.
 */
export function captureHomesteadDesign(
  projectId?: string,
): CapturedDesignPayload | null {
  const warnings: string[] = [];
  const pid = activeProjectId(projectId);
  if (!pid) {
    console.warn(
      '[captureHomesteadDesign] no project found — open the scratch project first, or pass its id.',
    );
    return null;
  }

  const project = readProjectStore()?.projects.find((p) => p.id === pid);
  if (!project) {
    console.warn(`[captureHomesteadDesign] project ${pid} not found.`);
    return null;
  }

  const boundary = project.parcelBoundaryGeojson ?? null;
  if (!boundary) {
    warnings.push('No parcel boundary drawn yet (parcelBoundaryGeojson is null).');
  }

  const rawZones = useZoneStore.getState().getProjectZones(pid);
  if (rawZones.length === 0) {
    warnings.push('No zones drawn for this project yet.');
  }

  const zones: CapturedZone[] = rawZones.map((z) => {
    if (z.permacultureZone === undefined) {
      warnings.push(
        `Zone "${z.name}" (${z.id}) has no permaculture level (Z0–5) assigned — set it before capture, or I default it to Z0.`,
      );
    }
    const captured: CapturedZone = {
      z: (z.permacultureZone ?? 0) as PermacultureLevel,
      name: z.name,
      geometry: z.geometry,
      areaM2: z.areaM2,
      primaryUse: z.primaryUse,
      category: z.category,
    };
    if (z.secondaryUse) captured.secondaryUse = z.secondaryUse;
    if (z.notes) captured.notes = z.notes;
    return captured;
  });

  const structures = getStructuresForProject(pid);
  if (structures.length === 0) {
    warnings.push(
      'No structures drawn — the homebase will be synthesized from Z0 unless you draw the dwelling.',
    );
  }

  const payload: CapturedDesignPayload = {
    projectId: pid,
    name: project.name ?? null,
    country: project.country ?? null,
    provinceState: project.provinceState ?? null,
    units: project.units ?? null,
    acreage: project.acreage ?? null,
    hasParcelBoundary: Boolean(project.hasParcelBoundary),
    boundary,
    zones,
    structures,
    warnings,
  };

  const json = JSON.stringify(payload, null, 2);
  try {
    navigator.clipboard?.writeText(json).then(
      () => console.info('[captureHomesteadDesign] payload copied to clipboard ✔'),
      () =>
        console.info(
          '[captureHomesteadDesign] clipboard blocked — copy the JSON logged below.',
        ),
    );
  } catch {
    console.info(
      '[captureHomesteadDesign] clipboard unavailable — copy the JSON logged below.',
    );
  }
  console.log(json);
  if (warnings.length) {
    console.warn(
      '[captureHomesteadDesign] warnings:\n- ' + warnings.join('\n- '),
    );
  }
  return payload;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenCaptureHomesteadDesign = (
    pid?: string,
  ) => captureHomesteadDesign(pid);
}
