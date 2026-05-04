/**
 * One-time migrator: legacy `ogden-site-annotations` v3 blob → 7 Scholar-aligned
 * namespace stores.
 *
 * Runs synchronously at app boot before any of the new stores rehydrate.
 * Idempotent — re-running is a no-op because the legacy key is gone.
 * The legacy blob is archived as `ogden-site-annotations.archived-v3` (not
 * deleted) so a steward can roll back manually if a regression slips through.
 *
 * See ADR 2026-04-30-site-annotations-store-scholar-aligned-namespaces.md.
 */

import type {
  HazardEvent,
  SectorArrow,
  EcologyObservation,
  SuccessionStage,
  SwotEntry,
  Earthwork,
  StorageInfra,
  FertilityInfra,
  Guild,
  WasteVector,
  WasteVectorRun,
  SpeciesPick,
  Transect,
  TransectVerticalRef,
  VerticalElementType,
} from './site-annotations.js';

interface LegacyVerticalElement {
  id: string;
  type: VerticalElementType;
  distanceAlongTransectM: number;
  heightM: number;
  label?: string;
}

interface LegacyTransect extends Omit<Transect, 'verticalRefs'> {
  verticalElements?: LegacyVerticalElement[];
}

interface LegacyV3State {
  hazards?: HazardEvent[];
  transects?: LegacyTransect[];
  sectors?: SectorArrow[];
  ecology?: EcologyObservation[];
  successionStageByProject?: Record<string, SuccessionStage>;
  swot?: SwotEntry[];
  earthworks?: Earthwork[];
  storageInfra?: StorageInfra[];
  fertilityInfra?: FertilityInfra[];
  guilds?: Guild[];
  wasteVectors?: WasteVector[];
  species?: SpeciesPick[];
  wasteVectorRuns?: WasteVectorRun[];
}

interface LegacyBlob {
  state: LegacyV3State;
  version: number;
}

const LEGACY_KEY = 'ogden-site-annotations';
const ARCHIVE_KEY = 'ogden-site-annotations.archived-v3';

export function migrateLegacyBlob(storage: Storage = localStorage): void {
  const raw = storage.getItem(LEGACY_KEY);
  if (raw === null) return;
  let parsed: LegacyBlob;
  try {
    parsed = JSON.parse(raw) as LegacyBlob;
  } catch {
    // Corrupt blob — leave it alone; new stores rehydrate empty.
    return;
  }
  if (parsed?.version !== 3) return; // safety: don't touch non-v3 blobs
  const s = parsed.state ?? {};

  seed(storage, 'ogden-external-forces', {
    hazards: s.hazards ?? [],
    sectors: s.sectors ?? [],
  });
  seed(storage, 'ogden-topography', {
    transects: (s.transects ?? []).map(migrateTransect),
  });
  seed(storage, 'ogden-ecology', {
    ecology: s.ecology ?? [],
    successionStageByProject: s.successionStageByProject ?? {},
  });
  seed(storage, 'ogden-water-systems', {
    earthworks: s.earthworks ?? [],
    storageInfra: s.storageInfra ?? [],
  });
  seed(storage, 'ogden-polyculture', {
    guilds: s.guilds ?? [],
    species: s.species ?? [],
  });
  seed(storage, 'ogden-closed-loop', {
    wasteVectors: s.wasteVectors ?? [],
    wasteVectorRuns: s.wasteVectorRuns ?? [],
    fertilityInfra: s.fertilityInfra ?? [],
  });
  seed(storage, 'ogden-swot', { swot: s.swot ?? [] });

  // Archive — don't delete — for rollback safety.
  storage.setItem(ARCHIVE_KEY, raw);
  storage.removeItem(LEGACY_KEY);
}

/**
 * Remove the `ogden-site-annotations.archived-v3` blob created by
 * `migrateLegacyBlob()`. Called from `main.tsx` *after* the migrator on every
 * boot. Idempotent — a no-op once the archive is gone.
 *
 * The archive served as a one-release-cycle rollback hatch after the
 * 2026-04-30 namespace consolidation. The migrator + 7 new namespace
 * stores have shipped, been verified end-to-end (tsc + vite build + 8/8
 * vitest spec), and the follow-up resolver ADR landed without
 * regressions, so the rollback hatch is now obsolete.
 *
 * Returns `true` if the archive was present and removed, `false` if it
 * was already absent.
 *
 * See ADR 2026-04-30-archive-v3-blob-cleanup.md.
 */
export function cleanupArchivedV3(storage: Storage = localStorage): boolean {
  if (storage.getItem(ARCHIVE_KEY) === null) return false;
  storage.removeItem(ARCHIVE_KEY);
  return true;
}

function seed(storage: Storage, key: string, state: unknown): void {
  // Only seed if the per-namespace key is empty — never overwrite a store
  // that has already rehydrated (idempotent + safe on partial rollouts).
  if (storage.getItem(key) !== null) return;
  storage.setItem(key, JSON.stringify({ state, version: 1 }));
}

function migrateTransect(t: LegacyTransect): Transect {
  const { verticalElements, ...rest } = t;
  if (!verticalElements?.length) {
    return { ...rest };
  }
  const verticalRefs: TransectVerticalRef[] = verticalElements.map((ve) => ({
    id: ve.id,
    distanceAlongTransectM: ve.distanceAlongTransectM,
    kind: 'standalone' as const,
    standalone: {
      type: ve.type,
      heightM: ve.heightM,
      ...(ve.label !== undefined ? { label: ve.label } : {}),
    },
  }));
  return { ...rest, verticalRefs };
}
