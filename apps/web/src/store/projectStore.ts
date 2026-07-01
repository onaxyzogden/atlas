/**
 * Project store — manages all projects client-side with localStorage persistence.
 * In Sprint 3+ this will sync with the API. For now, everything is local.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import {
  ProjectType,
  getActiveTensions,
  isCompatibleSecondary,
  computeObjectivesDelta,
  resolveProjectObjectives,
  computeAllObjectiveStatuses,
  findProjectType,
  HOMESTEAD_SAMPLE_PROJECT_ID,
  type CreateProjectInput,
  type ProjectMetadata,
  type QueuedTeamInvite,
  type ProjectTypeId,
  type ProjectTypeRecord,
  type ProjectTypeVersion,
  type TensionAck,
  type ReopeningAck,
} from '@ogden/shared';
import { cascadeDeleteProject } from './cascadeDelete.js';
import { cascadeCloneProject } from './cascadeClone.js';
import { geodataCache } from '../lib/geodataCache.js';
import { api } from '../lib/apiClient.js';
import { ARCHETYPE_TO_PROJECT_TYPE } from '../v3/true-north/trueNorthConfig.js';
import {
  seedBuiltinObserveData,
  BUILTIN_PROJECT_NARRATIVE,
} from '../data/builtinSampleObserveData.js';
import { useSiteDataStore } from './siteDataStore.js';
import {
  usePlanStratumProgressStore,
  selectProjectProgress,
  toProgressMap,
  selectDeferredObjectives,
  toDeferredSet,
} from './planStratumStore.js';
import { seedCuratedMtcActionsIfEmpty } from '../v3/act/field-action/seedCuratedMtcActions.js';
import { seedMtcObserveDataPoints } from '../data/builtinObserveDataPoints.js';
import { seedHomesteadDesign } from '../dev/seedHomesteadDesign.js';
import type { MockLayerResult } from '@ogden/shared/scoring';

// ─── Local project type (extends CreateProjectInput with runtime fields) ───

export interface LocalProject {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived' | 'shared' | 'candidate';
  projectType: string | null;
  country: string; // ISO country code — 'US' and 'CA' are the fully-wired jurisdictions; others use Sprint BG global fallbacks (Copernicus DEM, OpenMeteo/WorldClim, ESA WorldCover, WDPA, SoilGrids)
  provinceState: string | null;
  conservationAuthId: string | null;
  address: string | null;
  parcelId: string | null;
  acreage: number | null;
  dataCompletenessScore: number | null;
  hasParcelBoundary: boolean;
  /** True for system-owned builtin sample projects (migration 017). Read-only. */
  isBuiltin?: boolean;
  createdAt: string;
  updatedAt: string;
  // Sprint 2 additions
  parcelBoundaryGeojson: GeoJSON.FeatureCollection | null;
  ownerNotes: string | null;
  zoningNotes: string | null;
  accessNotes: string | null;
  waterRightsNotes: string | null;
  visionStatement: string | null;
  units: 'metric' | 'imperial';
  attachments: ProjectAttachment[];
  // Long-tail intake metadata (projects.metadata jsonb on the server).
  metadata?: ProjectMetadata;
  // Sprint 3 — server-assigned UUID after backend sync (undefined = not yet synced)
  serverId?: string;
  /**
   * Per-project zone reach thresholds, in metres. Defines what counts
   * as Zone-1 (close, ≤ closeM) and Zone-2 (medium, closeM–mediumM)
   * for proximity readouts on this project. Unset on most projects —
   * read via `getZoneThresholds(project)` which falls back to the
   * canonical defaults { closeM: 25, mediumM: 75 }.
   *
   * Project-level rather than card-level because zone reach is a
   * property of the land + the steward's body + the cart they
   * actually use, not a UI preference. A steep hillside has a
   * different Zone-1 than flat ground.
   */
  zoneThresholds?: { closeM: number; mediumM: number };
  /**
   * Anchor date the Goal Compass scheduler uses to place generated
   * phase tasks on concrete calendar dates. Optional — when unset,
   * `scheduleTasksToCalendar` falls back to the first day of the
   * current month at generation time. ISO YYYY-MM-DD.
   */
  startDate?: string | null;
  /**
   * ISO YYYY-MM-DD. Date land establishment/planting began; drives the
   * establishment-dip (years 1-2) re-frame on review flags. Distinct from
   * startDate (Goal Compass scheduling anchor).
   */
  commencementDate?: string | null;
  /**
   * Which Plan-stage shell the steward sees: the new 7-stratum spine
   * (OLOS Plan Navigation Spec v1) or the legacy module bar. Per-project
   * so legacy projects with `MTC_SEED` keep their module shape, while
   * new projects open straight into the stratum spine. Read via
   * `getPlanShellMode(project)` which applies the defaulting rules.
   */
  planShellMode?: PlanShellMode;
  /**
   * Which Act-stage shell the steward sees: the new field-action
   * dashboard (OLOS Act Command Center Spec v1, Phase 3) or the legacy
   * command-centre module shell. Per-project so existing module-bar
   * projects keep their carousel UX while new projects land on View B.
   * Read via `getActShellMode(project)` which applies the defaulting
   * rules.
   */
  actShellMode?: ActShellMode;
  /**
   * Which Observe-stage shell the steward sees: the new dashboard
   * (OLOS Observe Dashboard Spec v1, Phase 4) — Unified Land State /
   * Domain Detail / Temporal Layer — or the legacy 7-module bar.
   * Per-project so existing module-bar projects keep their carousel
   * UX while new projects land on the dashboard. Read via
   * `getObserveShellMode(project)` which applies the defaulting rules.
   */
  observeShellMode?: ObserveShellMode;
  /**
   * Which data source the `module-bar` Observe lens reads: `live` resolves
   * the lens bundle from the project's real ObserveDataPoint store +
   * domain snapshots; `mock` falls back to the static Millbrook fixtures
   * (the escape hatch). Per-project so a steward can pin either source.
   * Read via `getObserveLensDataSource(project)` which defaults to `live`.
   */
  observeLensDataSource?: ObserveLensDataSource;
}

/**
 * Which Plan-stage navigation shell a project renders. `tier-shell` is the
 * map-centric 4-rail default (stratum spine + left objectives + center
 * EDITABLE design canvas + bottom categorized tools + right dashboard/detail)
 * that mirrors the Act tier shell; `stratum-spine` is the dark/gold 3-column
 * Plan Navigation Spec v1 spine; `module-bar` is the legacy module-driven
 * shell. All three are preserved behind `PlanNavToggle` (no deletion). The two
 * legacy shells are removed in Phase 7 once every legacy module card has been
 * folded into a stratum objective via `legacyCardSectionId`.
 */
export type PlanShellMode = 'tier-shell' | 'stratum-spine' | 'module-bar';

/**
 * Canonical accessor for a project's Plan shell mode. Explicit per-
 * project values win; everything else — including builtin samples (MTC,
 * "351 House") — now defaults to `tier-shell`, the promoted 4-rail tier
 * shell (mirrors the Act `getActShellMode` promotion). Projects that
 * previously persisted `stratum-spine` or `module-bar` keep that choice (no
 * persist migration). Every mode stays reachable per project via
 * `PlanNavToggle`.
 */
export function getPlanShellMode(
  project: Pick<LocalProject, 'planShellMode' | 'isBuiltin'>,
): PlanShellMode {
  if (project.planShellMode) return project.planShellMode;
  return 'tier-shell';
}

/**
 * Which Act-stage navigation shell a project renders. `ops-hub` is the
 * scannable Operations-Hub default (a "what needs doing today" dashboard with
 * the map demoted to one embedded panel + a guided per-task walkthrough);
 * `tier-shell` is the map-centric 4-rail layout (stratum spine + left
 * objectives + center map + bottom tools + right execution panel);
 * `field-action` is the 2-column map-first layout; `command-centre` is the
 * legacy module-driven shell. All four are preserved behind `ActShellToggle`
 * (no deletion). The legacy shells are removed in Phase 7 once every legacy
 * module card has retired.
 */
export type ActShellMode =
  | 'ops-hub'
  | 'tier-shell'
  | 'field-action'
  | 'command-centre';

/**
 * Canonical accessor for a project's Act shell mode. Explicit per-
 * project values win; everything else — including builtin samples (MTC,
 * "351 House") — now defaults to `ops-hub`, the promoted Operations Hub
 * (mirrors the tier-shell promotion that preceded it). Projects that
 * previously persisted `tier-shell` / `field-action` / `command-centre` keep
 * that choice (no persist migration). Every mode stays reachable per project
 * via `ActShellToggle`.
 */
export function getActShellMode(
  project: Pick<LocalProject, 'actShellMode' | 'isBuiltin'>,
): ActShellMode {
  if (project.actShellMode) return project.actShellMode;
  return 'ops-hub';
}

/**
 * Which Observe-stage navigation shell a project renders.
 * `dashboard` is the OLOS Observe Dashboard Spec v1 default for new
 * projects; `module-bar` is the legacy 7-module shell preserved behind
 * a toggle so existing builtin samples (MTC, "351 House") keep their
 * hand-seeded module content visible. Removed in Phase 7 alongside
 * the Plan + Act shells.
 */
export type ObserveShellMode = 'dashboard' | 'module-bar';

/**
 * Canonical accessor for a project's Observe shell mode. Explicit
 * per-project values win; everything else — including builtin samples
 * (MTC, "351 House") — now defaults to `dashboard`. Builtins were
 * formerly pinned to `module-bar`; their seeded source-store data is
 * surfaced in the dashboard via `builtinObserveDataPoints`. The
 * `module-bar` shell stays reachable per project via `ObserveShellToggle`.
 */
export function getObserveShellMode(
  project: Pick<LocalProject, 'observeShellMode' | 'isBuiltin'>,
): ObserveShellMode {
  if (project.observeShellMode) return project.observeShellMode;
  return 'dashboard';
}

/**
 * Which data source the `module-bar` Observe lens renders. `live` builds
 * the lens bundle from the project's real ObserveDataPoint store + domain
 * snapshots (the default for every project, builtin and user-created);
 * `mock` is the escape hatch back to the static Millbrook fixtures. Both
 * stay reachable per project via `ObserveLensDataSourceToggle`.
 */
export type ObserveLensDataSource = 'mock' | 'live';

/**
 * Canonical accessor for a project's Observe lens data source. Explicit
 * per-project values win; everything else — including builtin samples
 * (MTC, "351 House") — defaults to `live` so the lens reflects real
 * captured observations out of the box. No persist backfill: an undefined
 * value resolves to the live default here.
 */
export function getObserveLensDataSource(
  project: Pick<LocalProject, 'observeLensDataSource'>,
): ObserveLensDataSource {
  if (project.observeLensDataSource) return project.observeLensDataSource;
  return 'live';
}

/**
 * Canonical default zone reach thresholds for proximity readouts.
 * Centralised so a future steward request to widen the defaults is a
 * one-line change. Per-project overrides via `setZoneThresholds`.
 */
export const DEFAULT_ZONE_THRESHOLDS = {
  closeM: 25,
  mediumM: 75,
} as const;

/**
 * Canonical accessor for a project's zone reach thresholds. Falls
 * back to `DEFAULT_ZONE_THRESHOLDS` when the project hasn't been
 * tuned. Cards that surface Zone-1 / Zone-2 framing should read via
 * this selector so default changes propagate to unmigrated projects.
 */
export function getZoneThresholds(
  project: Pick<LocalProject, 'zoneThresholds'>,
): { closeM: number; mediumM: number } {
  return project.zoneThresholds ?? DEFAULT_ZONE_THRESHOLDS;
}

/**
 * Default steward design-horizon (years). Drives the TemporalScrubSlider's
 * "↺" snap target when no per-project override is set. Centralised so a
 * future change to e.g. 25 years is one line.
 */
export const DEFAULT_DESIGN_HORIZON_YEARS = 20;

/**
 * Canonical accessor for a project's design-horizon. Falls back to
 * DEFAULT_DESIGN_HORIZON_YEARS when the steward hasn't pinned one.
 * Mirrors `getZoneThresholds`.
 */
export function getDesignHorizon(
  project: Pick<LocalProject, 'metadata'>,
): number {
  const v = project.metadata?.designHorizonYears;
  return typeof v === 'number' && v > 0 ? v : DEFAULT_DESIGN_HORIZON_YEARS;
}

/**
 * Needs & Yields graph-edge authoring (Rec #1 closeout, 2026-05-13).
 * `designStatus` defaults to 'draft' until the steward advances it via
 * canAdvanceToReadyForReview. `allowOrphanOutputs` is the per-project
 * escape hatch from the 2026-04-28 ADR — surfaced prominently in the
 * project header when set so it remains a deliberate choice.
 */
export type DesignStatus = 'draft' | 'ready-for-review' | 'approved';
export const DEFAULT_DESIGN_STATUS: DesignStatus = 'draft';

export function getDesignStatus(
  project: Pick<LocalProject, 'metadata'>,
): DesignStatus {
  return project.metadata?.designStatus ?? DEFAULT_DESIGN_STATUS;
}

export function getAllowOrphanOutputs(
  project: Pick<LocalProject, 'metadata'>,
): boolean {
  return project.metadata?.allowOrphanOutputs ?? false;
}

export interface ProjectAttachment {
  id: string;
  filename: string;
  type: 'kml' | 'kmz' | 'geojson' | 'shapefile' | 'photo' | 'document' | 'other';
  size: number;
  addedAt: string;
  /** For geospatial files, the parsed GeoJSON. For photos/docs, a data URL or blob URL. */
  data: unknown | null;
}

/** Tally returned by the batch lifecycle actions. */
export interface BatchResult {
  ok: number;
  failed: number;
}

/** Run a per-id async action across many ids concurrently, tolerating
 *  individual failures, and tally the outcomes. Exported for unit testing. */
export async function runBatch(
  ids: string[],
  op: (id: string) => Promise<void>,
): Promise<BatchResult> {
  const results = await Promise.allSettled(ids.map((id) => op(id)));
  let ok = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === 'fulfilled') ok += 1;
    else failed += 1;
  }
  return { ok, failed };
}

interface ProjectState {
  projects: LocalProject[];
  activeProjectId: string | null;

  // Derived
  activeProject: LocalProject | null;

  // Actions
  createProject: (input: CreateProjectInput) => LocalProject;
  updateProject: (id: string, updates: Partial<LocalProject>) => void;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  unarchiveProject: (id: string) => Promise<void>;
  /**
   * Batch variants of the three lifecycle actions — loop the per-id action
   * with `Promise.allSettled` and return an `{ ok, failed }` tally so the UI
   * can surface one summary toast. Each per-id action already handles API
   * sync, cascade cleanup, builtin no-op, and `activeProjectId` clearing.
   */
  archiveProjects: (ids: string[]) => Promise<BatchResult>;
  unarchiveProjects: (ids: string[]) => Promise<BatchResult>;
  deleteProjects: (ids: string[]) => Promise<BatchResult>;
  /**
   * Duplicate an existing project — clones the project metadata + parcel
   * boundary + all design-intent entities (zones, structures, paths,
   * utilities, crops, paddocks, phases). Returns the new project, or `null`
   * if the source id is unknown. Spec: §1 "Duplicate project from template".
   */
  duplicateProject: (sourceId: string, overrideName?: string) => LocalProject | null;
  setActiveProject: (id: string | null) => void;
  addAttachment: (projectId: string, attachment: ProjectAttachment) => void;
  removeAttachment: (projectId: string, attachmentId: string) => void;
  /**
   * Set this project's zone reach thresholds. Caller is responsible
   * for validation (closeM ∈ (0, 500], mediumM ∈ (closeM, 500]); the
   * store stores whatever it's given. Pass `clearZoneThresholds` to
   * revert to defaults.
   */
  setZoneThresholds: (
    projectId: string,
    thresholds: { closeM: number; mediumM: number },
  ) => void;
  /** Strip the field so the project falls back to defaults. */
  clearZoneThresholds: (projectId: string) => void;
  /**
   * Set the PRIMARY project type when none has been chosen yet (e.g. a
   * project created without a type, like the builtin MTC). Additive and
   * strictly non-destructive: returns `false` (no-op) when the project is
   * missing, when a `projectTypeRecord` ALREADY exists (replacing a primary
   * mid-project is out of scope — the wizard owns that), or when the id is
   * not a valid primary (e.g. `residential`, which is secondary-only).
   * On success it writes a fresh `ProjectTypeRecord` with the chosen primary
   * and empty secondary/ack/version arrays (mirroring the wizard's
   * primary-select write — no `versionHistory` entry, since the taxonomy has
   * no `'primary-set'` action), and normalizes the legacy bare `projectType`
   * string in the same write so record- and string-level resolution agree.
   * Metadata is written wholesale via `updateProject` (builtin allowlist +
   * `updatedAt` stamping apply). Returns `true` when applied.
   */
  setPrimaryType: (projectId: string, primaryTypeId: ProjectTypeId) => boolean;
  /**
   * Reconcile the steward-capture invite queue into the canonical
   * metadata.team.queuedInvites. Replaces the queue wholesale (the steward
   * FormValue is the source of truth) while preserving primarySteward /
   * coStewards. Local-only: updateProject persists to IndexedDB; syncService
   * does not push metadata. No-op when the project is missing.
   */
  reconcileStewardInvites: (
    projectId: string,
    queuedInvites: QueuedTeamInvite[],
  ) => void;
  /**
   * Add a secondary project type to an active project mid-project (OLOS
   * Plan Navigation Spec v1.1 §9). Returns `true` when applied, `false`
   * (no-op) when guarded out: no primary chosen yet, the id IS the primary,
   * a duplicate, incompatible with the primary, or the 8-secondary ceiling
   * is reached. On success it appends a `ProjectTypeVersion`
   * (action `'secondary-added'`, actor defaulting to the steward), records
   * `TensionAck`s for any newly-active tensions, and sets the new
   * `secondaryTypeIds`. Metadata is written wholesale via `updateProject`
   * (so the builtin allowlist + `updatedAt` stamping apply). No persist bump
   * — every touched field is additive / Zod-defaulted.
   */
  addSecondaryType: (
    projectId: string,
    secondaryTypeId: ProjectTypeId,
    opts?: { actor?: string; note?: string },
  ) => boolean;
  /**
   * Record a steward acknowledgement that a mid-project secondary addition
   * reopened one or more previously-complete objectives for review (Plan
   * Navigation Spec v1.1 §9). Append-only — one `ReopeningAck` per event.
   * No-op when the project or its type record is absent.
   */
  acknowledgeReopening: (
    projectId: string,
    secondaryTypeId: ProjectTypeId,
    affectedObjectiveIds: string[],
  ) => void;
  /**
   * Remove a secondary type from an active project (spec section 8.3).
   * Permitted only when none of the secondary's delta objectives (its additive
   * objectives + any objective it injected items into) are currently `active`,
   * `complete`, or `deferred`. When blocked, returns the blocking objective ids
   * (the UI names them and offers "mark as Deferred instead") WITHOUT mutating.
   * When allowed, drops the secondary, appends a `'secondary-removed'`
   * `ProjectTypeVersion`, prunes orphaned checklist progress for the removed
   * objectives, and writes metadata wholesale via `updateProject`. No persist
   * bump (append to existing `versionHistory`; `secondaryTypeIds` already exists).
   * Guard failures (missing project/record, secondary not present) return
   * `{ ok: false, blockingObjectiveIds: [] }`.
   */
  removeSecondaryType: (
    projectId: string,
    secondaryTypeId: ProjectTypeId,
  ) => { ok: true } | { ok: false; blockingObjectiveIds: string[] };
  /**
   * Change the PRIMARY type of an already-typed project mid-project. Unlike
   * `setPrimaryType` (which only ever sets a first primary and refuses to
   * replace one), this DESTRUCTIVELY re-derives the objective catalogue: it
   * prunes secondaries incompatible with the new primary, appends a
   * `'primary-changed'` `ProjectTypeVersion`, normalizes the legacy bare
   * `projectType` string, and discards orphaned checklist progress for the
   * objectives unique to the OLD type (the inverse delta — objectives present
   * under the current selection but absent under the next). Tensions newly
   * active under the new pairing are acknowledged (mirroring the add flow; the
   * modal gates Confirm on the steward acknowledging). The caller is expected
   * to offer an opt-in clone backup BEFORE invoking this (see
   * `cloneForProject`), since the discard is irreversible.
   *
   * No-op `{ ok: false }` when the project or its type record is missing, the
   * candidate is not a valid primary (e.g. `residential`), or it equals the
   * current primary. On success returns the dropped secondaries and discarded
   * objective ids so the UI can report counts. No persist bump — every touched
   * field is additive / already present.
   */
  changePrimaryType: (
    projectId: string,
    nextPrimaryId: ProjectTypeId,
    opts?: { actor?: string; note?: string },
  ) =>
    | { ok: true; droppedSecondaryIds: ProjectTypeId[]; discardedObjectiveIds: string[] }
    | { ok: false };
}

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Normalize a project's `projectType` to the server's canonical snake_case
 * `ProjectType` enum. The Plan goal-tree / intake vocabulary uses kebab-case
 * archetypes (e.g. "regenerative-farm"); if one leaks into `projectType` (a
 * legacy fixture, or a creation path that skipped `ARCHETYPE_TO_PROJECT_TYPE`),
 * `project:create` fails server validation with a 422 "Invalid enum value" on
 * sync. Normalizing on write (createProject) and on rehydrate (persist migrate)
 * keeps the local store free of unsyncable values.
 *
 *   null / undefined / ""        -> null   (projectType is optional server-side)
 *   valid snake_case ProjectType -> unchanged
 *   dropped pre-v1.2 legacy enum -> forwarded to its migration-046 home
 *   known kebab archetype        -> snake_case ProjectType (forwarded if legacy)
 *   anything else                -> null   (unsyncable; drop rather than 422)
 *
 * The legacy-forward step is the CLIENT mirror of migration 046
 * (apps/api/src/db/migrations/046_project_type_taxonomy.sql). The OLOS v1.2
 * rename dropped educational_farm / multi_enterprise / retreat_center from the
 * ProjectType enum, so a project still holding one — persisted before the
 * rename, or produced by the legacy archetype / vision-builder vocabulary — is
 * mapped to its nearest surviving type instead of 422-ing or dropping to null.
 */
const ARCHETYPE_PROJECT_TYPE_LOOKUP = ARCHETYPE_TO_PROJECT_TYPE as Record<
  string,
  string | undefined
>;

/**
 * Pre-v1.2 ProjectType values dropped by the rename -> nearest surviving home.
 * Targets match migration 046 exactly so the client and server backfills agree.
 */
const LEGACY_PROJECT_TYPE_BACKFILL: Record<string, string> = {
  educational_farm: 'education',
  multi_enterprise: 'regenerative_farm',
  retreat_center: 'agritourism',
};

export function normalizeProjectType(
  value: string | null | undefined,
): string | null {
  if (value == null || value === '') return null;
  if (ProjectType.safeParse(value).success) return value;
  // A dropped pre-v1.2 enum value supplied directly (a project persisted before
  // the rename, or the legacy vision-builder vocabulary) -> migration-046 home.
  const forwarded = LEGACY_PROJECT_TYPE_BACKFILL[value];
  if (forwarded) return forwarded;
  // A kebab archetype -> its enum value, forwarded again in case that value was
  // itself a dropped legacy (e.g. "retreat" -> "retreat_center" -> "agritourism").
  const mapped = ARCHETYPE_PROJECT_TYPE_LOOKUP[value];
  if (mapped) return LEGACY_PROJECT_TYPE_BACKFILL[mapped] ?? mapped;
  return null;
}

/**
 * Build a fresh `ProjectTypeRecord` from a project's bare `projectType` string
 * when — and only when — that string normalizes to a valid PRIMARY type.
 *
 * Legacy/seeded projects (e.g. the "351 House" homestead, or a project created
 * before the wizard wrote records) carry a bare `projectType` but no
 * `metadata.projectTypeRecord`. The resolution ladder in `useProjectObjectives`
 * tolerates that via its Level-2 string fallback, but the Step-2 wizard reads the
 * record DIRECTLY — so without a record it renders no primary selection, hides the
 * secondary picker, and blocks `handleToggleSecondary`. This helper lets both the
 * persist `migrate` backfill and the wizard materialize the SAME record the
 * steward would get by re-picking, mirroring `setPrimaryType`'s write exactly
 * (empty secondary / ack / version / reopening arrays, no `versionHistory` entry).
 *
 *   null / "" / unknown string   -> null
 *   secondary-only (residential) -> null   (canBePrimary: false)
 *   kebab archetype / legacy enum -> normalized + materialized (via normalizeProjectType)
 *
 * Returns `null` when no valid primary can be derived, so callers leave the
 * project untouched (it keeps falling through to the static skeleton).
 */
export function recordFromBareProjectType(
  projectType: string | null | undefined,
): ProjectTypeRecord | null {
  const normalized = normalizeProjectType(projectType);
  if (!normalized) return null;
  const def = findProjectType(normalized);
  if (!def?.canBePrimary) return null;
  return {
    primaryTypeId: def.id,
    secondaryTypeIds: [],
    tensionAcknowledgements: [],
    versionHistory: [],
    reopeningAcknowledgements: [],
  };
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,

      get activeProject() {
        const state = get();
        return state.projects.find((p) => p.id === state.activeProjectId) ?? null;
      },

      createProject: (input) => {
        const now = new Date().toISOString();
        const project: LocalProject = {
          id: generateId(),
          name: input.name,
          description: input.description ?? null,
          status: 'active',
          projectType: normalizeProjectType(input.projectType),
          country: input.country ?? 'US',
          provinceState: input.provinceState ?? null,
          conservationAuthId: null,
          address: input.address ?? null,
          parcelId: input.parcelId ?? null,
          acreage: null,
          dataCompletenessScore: null,
          hasParcelBoundary: false,
          createdAt: now,
          updatedAt: now,
          parcelBoundaryGeojson: null,
          ownerNotes: null,
          zoningNotes: null,
          accessNotes: null,
          waterRightsNotes: null,
          visionStatement: null,
          units: input.units ?? 'metric',
          attachments: [],
          metadata: input.metadata,
        };
        set((state) => ({
          projects: [...state.projects, project],
          activeProjectId: project.id,
        }));
        return project;
      },

      updateProject: (id, updates) => {
        const target = get().projects.find((p) => p.id === id);
        // Builtin sample projects are read-only for narrative content (vision,
        // owner notes, etc.) — but a freshly-drawn parcel boundary is a per-user
        // *map customization*, not a content edit. Carve those fields out so
        // the steward can re-trace the parcel on a builtin sample without the
        // write being silently dropped.
        if (target?.isBuiltin) {
          const allowedKeys: (keyof LocalProject)[] = [
            'parcelBoundaryGeojson',
            'hasParcelBoundary',
            // Re-tracing the boundary recomputes acres; without this the builtin
            // filter would drop the acreage write and the displayed area would go
            // stale against the new outline. Rides alongside the boundary fields
            // for the same reason — it is a map customization, not narrative.
            'acreage',
            'metadata',
            // UI preference, not narrative content — must be settable
            // on builtin samples too so the steward can flip between
            // stratum-spine and module-bar on the demo project.
            'planShellMode',
            // Same rationale as planShellMode — Act shell mode is a
            // per-steward UI choice, not narrative content.
            'actShellMode',
            // Same rationale — Observe shell mode is a per-steward
            // UI choice, not narrative content.
            'observeShellMode',
            // Same rationale — Observe lens data source (live/mock) is a
            // per-steward UI choice, settable on builtin samples (MTC) so
            // the steward can flip the lens between live and fixtures.
            'observeLensDataSource',
            // commencementDate is a steward-entered date, not narrative
            // content -- must be settable on builtin sample projects so the
            // establishment-dip re-frame works in preview/demo contexts.
            'commencementDate',
          ];
          const filtered = Object.fromEntries(
            Object.entries(updates).filter(([k]) =>
              allowedKeys.includes(k as keyof LocalProject),
            ),
          ) as Partial<LocalProject>;
          if (Object.keys(filtered).length === 0) return;
          // Boundary FC now persisted directly via zustand persist (see
          // partialize note + ADDENDUM 6). No IDB write here.
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === id
                ? { ...p, ...filtered, updatedAt: new Date().toISOString() }
                : p,
            ),
          }));
          return;
        }
        // Boundary FC now persisted directly via zustand persist (see
        // partialize note + ADDENDUM 6). No IDB write here.
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
          ),
        }));
      },

      deleteProject: async (id) => {
        // Builtin sample projects are read-only — silently no-op on delete.
        const target = get().projects.find((p) => p.id === id);
        if (target?.isBuiltin) return;
        if (target?.serverId) {
          try {
            await api.projects.delete(target.serverId);
          } catch (err) {
            console.warn('[OGDEN] deleteProject API failed, removing locally:', err);
          }
        }
        cascadeDeleteProject(id);
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        }));
      },

      archiveProject: async (id) => {
        const target = get().projects.find((p) => p.id === id);
        if (!target || target.isBuiltin) return;
        if (target.serverId) {
          try {
            await api.projects.archive(target.serverId);
          } catch (err) {
            console.warn('[OGDEN] archiveProject API failed, mutating locally:', err);
          }
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, status: 'archived', updatedAt: new Date().toISOString() }
              : p,
          ),
        }));
      },

      unarchiveProject: async (id) => {
        const target = get().projects.find((p) => p.id === id);
        if (!target || target.isBuiltin) return;
        if (target.serverId) {
          try {
            await api.projects.unarchive(target.serverId);
          } catch (err) {
            console.warn('[OGDEN] unarchiveProject API failed, mutating locally:', err);
          }
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, status: 'active', updatedAt: new Date().toISOString() }
              : p,
          ),
        }));
      },

      archiveProjects: (ids) => runBatch(ids, get().archiveProject),
      unarchiveProjects: (ids) => runBatch(ids, get().unarchiveProject),
      deleteProjects: (ids) => runBatch(ids, get().deleteProject),

      duplicateProject: (sourceId, overrideName) => {
        const source = get().projects.find((p) => p.id === sourceId);
        if (!source) return null;
        const now = new Date().toISOString();
        const newId = generateId();
        // Deep-clone metadata. Drop serverId (the new project hasn't synced)
        // and reset attachments — re-uploading parsed blobs would double-fill
        // IndexedDB without the user opting in.
        const {
          id: _sourceIdField,
          serverId: _sourceServerId,
          createdAt: _sourceCreatedAt,
          updatedAt: _sourceUpdatedAt,
          attachments: _sourceAttachments,
          parcelBoundaryGeojson: sourceBoundary,
          ...rest
        } = source;
        const clone: LocalProject = {
          ...rest,
          id: newId,
          name: overrideName ?? `${source.name} (Copy)`,
          status: 'active',
          createdAt: now,
          updatedAt: now,
          attachments: [],
          parcelBoundaryGeojson: sourceBoundary,
          // metadata is a structured object — shallow-copy is enough since
          // it's treated as immutable downstream.
          metadata: source.metadata ? { ...source.metadata } : undefined,
        };
        set((state) => ({
          projects: [...state.projects, clone],
        }));
        // Replicate the boundary blob in IndexedDB under the new id, and
        // clone every design-intent entity scoped to the source.
        if (sourceBoundary) {
          geodataCache.put(`boundary:${newId}`, sourceBoundary).catch((err) => {
            console.warn('[OGDEN] Failed to cache cloned boundary:', err);
          });
        }
        cascadeCloneProject(sourceId, newId);
        return clone;
      },

      setActiveProject: (id) => set({ activeProjectId: id }),

      addAttachment: (projectId, attachment) => {
        // Persist parsed geospatial data to IndexedDB
        if (attachment.data && (attachment.type === 'geojson' || attachment.type === 'kml')) {
          geodataCache.put(`attachment:${projectId}:${attachment.id}`, attachment.data).catch((err) => {
            console.warn('[OGDEN] Failed to cache attachment:', err);
          });
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, attachments: [...p.attachments, attachment], updatedAt: new Date().toISOString() }
              : p,
          ),
        }));
      },

      removeAttachment: (projectId, attachmentId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  attachments: p.attachments.filter((a) => a.id !== attachmentId),
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
        })),

      setZoneThresholds: (projectId, thresholds) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, zoneThresholds: thresholds, updatedAt: new Date().toISOString() }
              : p,
          ),
        })),

      clearZoneThresholds: (projectId) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            const { zoneThresholds: _drop, ...rest } = p;
            return { ...rest, updatedAt: new Date().toISOString() } as LocalProject;
          }),
        })),

      setPrimaryType: (projectId, primaryTypeId) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return false;
        // Non-destructive: only sets a primary when none exists. Replacing an
        // already-set primary mid-project orphans progress and is owned by the
        // wizard — refuse it here.
        if (project.metadata?.projectTypeRecord) return false;
        // Reject ids that cannot be a primary (e.g. residential, secondary-only).
        const def = findProjectType(primaryTypeId);
        if (!def?.canBePrimary) return false;

        // Mirror the wizard's primary-select write: a fresh record with the
        // chosen primary and empty arrays. The taxonomy has no 'primary-set'
        // version action, so — like the wizard — record no versionHistory entry.
        const nextRecord: ProjectTypeRecord = {
          primaryTypeId,
          secondaryTypeIds: [],
          tensionAcknowledgements: [],
          versionHistory: [],
          reopeningAcknowledgements: [],
        };

        // Wholesale write — updateProject's builtin allowlist permits both
        // `projectType` and `metadata`. Writing the legacy bare string keeps
        // string-level resolution aligned with the authoritative record.
        get().updateProject(projectId, {
          projectType: primaryTypeId,
          metadata: { ...(project.metadata ?? {}), projectTypeRecord: nextRecord },
        });
        return true;
      },

      reconcileStewardInvites: (projectId, queuedInvites) => {
        // Match the id-or-serverId lookup convention used everywhere the Act
        // shells resolve the active project (e.g. ActTierShell), so a serverId
        // route key reconciles correctly instead of silently no-op-ing.
        const project = get().projects.find(
          (p) => p.id === projectId || p.serverId === projectId,
        );
        if (!project) return;
        const existingTeam = project.metadata?.team ?? {};
        // updateProject matches strictly on `p.id`, so write through the
        // canonical local id (projectId may have been a serverId).
        get().updateProject(project.id, {
          metadata: {
            ...(project.metadata ?? {}),
            team: { ...existingTeam, queuedInvites },
          },
        });
      },

      addSecondaryType: (projectId, secondaryTypeId, opts) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return false;
        const existing = project.metadata?.projectTypeRecord;
        // Cannot add a secondary before a primary type is chosen.
        if (!existing) return false;
        const primaryTypeId = existing.primaryTypeId;
        const currentSecondaries = existing.secondaryTypeIds ?? [];
        // Guards — any failure is a silent no-op (returns false).
        if (secondaryTypeId === primaryTypeId) return false;
        if (currentSecondaries.includes(secondaryTypeId)) return false;
        if (!isCompatibleSecondary(secondaryTypeId, primaryTypeId)) return false;
        if (currentSecondaries.length >= 8) return false;

        const now = new Date().toISOString();
        const nextSecondaries = [...currentSecondaries, secondaryTypeId];

        // Acknowledge any tensions that become active with this addition and
        // are not already acknowledged (mirrors the wizard's tension flow;
        // the add-secondary modal gates confirm on the steward acknowledging).
        const active = getActiveTensions(primaryTypeId, nextSecondaries);
        const ackedIds = new Set(
          (existing.tensionAcknowledgements ?? []).map((a) => a.tensionId),
        );
        const newAcks: TensionAck[] = active
          .filter((t) => !ackedIds.has(t.id))
          .map((t) => ({ tensionId: t.id, acknowledgedAt: now }));

        const versionEntry: ProjectTypeVersion = {
          primaryTypeId,
          secondaryTypeIds: nextSecondaries,
          changedAt: now,
          note: opts?.note ?? `added secondary: ${secondaryTypeId}`,
          actor: opts?.actor ?? 'yousef@ogden.ag',
          action: 'secondary-added',
        };

        const nextRecord: ProjectTypeRecord = {
          ...existing,
          secondaryTypeIds: nextSecondaries,
          tensionAcknowledgements: [
            ...(existing.tensionAcknowledgements ?? []),
            ...newAcks,
          ],
          versionHistory: [...(existing.versionHistory ?? []), versionEntry],
          // Defensive default — records drafted before the v1.1 schema lack
          // this field at runtime even though the inferred type marks it
          // required (Zod default applies only on parse).
          reopeningAcknowledgements: existing.reopeningAcknowledgements ?? [],
        };

        // Wholesale metadata write — reuses updateProject's builtin allowlist
        // (metadata is allowed) and updatedAt stamping. No persist bump.
        get().updateProject(projectId, {
          metadata: { ...(project.metadata ?? {}), projectTypeRecord: nextRecord },
        });
        return true;
      },

      acknowledgeReopening: (projectId, secondaryTypeId, affectedObjectiveIds) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return;
        const existing = project.metadata?.projectTypeRecord;
        if (!existing) return;
        const ack: ReopeningAck = {
          secondaryTypeId,
          affectedObjectiveIds,
          acknowledgedAt: new Date().toISOString(),
        };
        const nextRecord: ProjectTypeRecord = {
          ...existing,
          reopeningAcknowledgements: [
            ...(existing.reopeningAcknowledgements ?? []),
            ack,
          ],
        };
        get().updateProject(projectId, {
          metadata: { ...(project.metadata ?? {}), projectTypeRecord: nextRecord },
        });
      },

      removeSecondaryType: (projectId, secondaryTypeId) => {
        const blocked = (ids: string[] = []) =>
          ({ ok: false, blockingObjectiveIds: ids }) as const;

        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return blocked();
        const existing = project.metadata?.projectTypeRecord;
        if (!existing) return blocked();
        const primaryTypeId = existing.primaryTypeId;
        const currentSecondaries = existing.secondaryTypeIds ?? [];
        if (!currentSecondaries.includes(secondaryTypeId)) return blocked();

        const nextSecondaries = currentSecondaries.filter(
          (id) => id !== secondaryTypeId,
        );

        // Inverse delta: diffing the post-removal record AGAINST the current one
        // surfaces the objectives that would disappear (`newObjectiveIds`) and
        // the host objectives that would lose injected items
        // (`objectivesWithNewItems`) — i.e. exactly this secondary's delta.
        const current = { primaryTypeId, secondaryTypeIds: currentSecondaries };
        const afterRemoval = { primaryTypeId, secondaryTypeIds: nextSecondaries };
        const inverse = computeObjectivesDelta(afterRemoval, current);
        const deltaObjectiveIds = Array.from(
          new Set([
            ...inverse.newObjectiveIds,
            ...inverse.objectivesWithNewItems,
          ]),
        );

        // Block removal if any delta objective is started/finished/parked.
        // Status is computed from the CURRENT resolution against the same
        // progress + deferred sets the spine uses.
        const progressStore = usePlanStratumProgressStore.getState();
        const progressMap = toProgressMap(
          selectProjectProgress(progressStore, projectId),
        );
        const deferredSet = toDeferredSet(
          selectDeferredObjectives(progressStore, projectId),
        );
        const currentObjectives = resolveProjectObjectives(current).objectives;
        const statuses = computeAllObjectiveStatuses(
          currentObjectives,
          progressMap,
          deferredSet,
        );
        const BLOCKING = new Set(['active', 'complete', 'deferred']);
        const blockingObjectiveIds = deltaObjectiveIds.filter((id) =>
          BLOCKING.has(statuses[id] ?? 'locked'),
        );
        if (blockingObjectiveIds.length > 0) {
          return blocked(blockingObjectiveIds);
        }

        const now = new Date().toISOString();
        const versionEntry: ProjectTypeVersion = {
          primaryTypeId,
          secondaryTypeIds: nextSecondaries,
          changedAt: now,
          note: `removed secondary: ${secondaryTypeId}`,
          actor: 'yousef@ogden.ag',
          action: 'secondary-removed',
        };
        const nextRecord: ProjectTypeRecord = {
          ...existing,
          secondaryTypeIds: nextSecondaries,
          versionHistory: [...(existing.versionHistory ?? []), versionEntry],
          reopeningAcknowledgements: existing.reopeningAcknowledgements ?? [],
        };
        get().updateProject(projectId, {
          metadata: { ...(project.metadata ?? {}), projectTypeRecord: nextRecord },
        });

        // Prune orphaned progress: the additive objectives that no longer exist
        // (their item ids would otherwise strand in the progress store). Host
        // objectives that merely lose injected items keep their own progress —
        // and, since removal was permitted, hold no checked injected items.
        const removedObjectiveIds = new Set(inverse.newObjectiveIds);
        for (const objId of removedObjectiveIds) {
          progressStore.clearForObjective(projectId, objId);
        }
        return { ok: true };
      },

      changePrimaryType: (projectId, nextPrimaryId, opts) => {
        const failed = { ok: false } as const;
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return failed;
        const existing = project.metadata?.projectTypeRecord;
        // Only for an already-typed project; the unset path is setPrimaryType's.
        if (!existing) return failed;
        const fromPrimary = existing.primaryTypeId;
        // No-op when unchanged or the candidate cannot be a primary
        // (e.g. residential, secondary-only).
        if (nextPrimaryId === fromPrimary) return failed;
        const def = findProjectType(nextPrimaryId);
        if (!def?.canBePrimary) return failed;

        const currentSecondaries = existing.secondaryTypeIds ?? [];
        // Prune secondaries incompatible with the new primary.
        const keptSecondaries = currentSecondaries.filter((s) =>
          isCompatibleSecondary(s, nextPrimaryId),
        );
        const droppedSecondaryIds = currentSecondaries.filter(
          (s) => !keptSecondaries.includes(s),
        );

        // Disappearing objectives: present under the CURRENT selection but not
        // the NEXT (inverse delta — same pattern as removeSecondaryType). These
        // are the old-type-unique objectives whose progress is now orphaned.
        const current = { primaryTypeId: fromPrimary, secondaryTypeIds: currentSecondaries };
        const next = { primaryTypeId: nextPrimaryId, secondaryTypeIds: keptSecondaries };
        const inverse = computeObjectivesDelta(next, current);
        const discardedObjectiveIds = Array.from(new Set(inverse.newObjectiveIds));

        const now = new Date().toISOString();

        // Acknowledge tensions that become active under the new pairing and are
        // not already acknowledged (mirrors addSecondaryType; the change modal
        // gates Confirm on the steward acknowledging). Prior acks are retained.
        const active = getActiveTensions(nextPrimaryId, keptSecondaries);
        const ackedIds = new Set(
          (existing.tensionAcknowledgements ?? []).map((a) => a.tensionId),
        );
        const newAcks: TensionAck[] = active
          .filter((t) => !ackedIds.has(t.id))
          .map((t) => ({ tensionId: t.id, acknowledgedAt: now }));

        const versionEntry: ProjectTypeVersion = {
          primaryTypeId: nextPrimaryId,
          secondaryTypeIds: keptSecondaries,
          changedAt: now,
          note: opts?.note ?? `changed primary: ${fromPrimary} -> ${nextPrimaryId}`,
          actor: opts?.actor ?? 'yousef@ogden.ag',
          action: 'primary-changed',
        };

        const nextRecord: ProjectTypeRecord = {
          ...existing,
          primaryTypeId: nextPrimaryId,
          secondaryTypeIds: keptSecondaries,
          tensionAcknowledgements: [
            ...(existing.tensionAcknowledgements ?? []),
            ...newAcks,
          ],
          versionHistory: [...(existing.versionHistory ?? []), versionEntry],
          reopeningAcknowledgements: existing.reopeningAcknowledgements ?? [],
        };

        // Wholesale write — updateProject's builtin allowlist permits both
        // `projectType` and `metadata`. The legacy bare string is kept aligned
        // with the authoritative record, matching setPrimaryType.
        get().updateProject(projectId, {
          projectType: nextPrimaryId,
          metadata: { ...(project.metadata ?? {}), projectTypeRecord: nextRecord },
        });

        // Discard orphaned progress on the old-type-unique objectives. This is
        // checklist DATA the steward explicitly chose to discard (the opt-in
        // clone preserves it under the old type).
        const progressStore = usePlanStratumProgressStore.getState();
        progressStore.discardObjectivesProgress(projectId, discardedObjectiveIds);

        return { ok: true, droppedSecondaryIds, discardedObjectiveIds };
      },
    }),
    {
      name: 'ogden-projects',
      // Durable IndexedDB backend (Phase 1 pilot store). Moves the full
      // projects[] off the ~5–10 MB localStorage origin cap onto IDB, where the
      // offline write queue already lives. Rehydration is now ASYNC: the boot
      // sequence in syncService.start() awaits hydration before attaching the
      // write-through subscriptions (see awaitStoresHydrated), so the diff
      // baseline is the hydrated project list — not an empty pre-hydration
      // snapshot that would re-push every project as a create on boot.
      storage: idbPersistStorage,
      version: 9,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 3) {
          const projects = (state.projects ?? []) as Record<string, unknown>[];
          state.projects = projects.map((p) => ({
            ...p,
            visionStatement: (p as Record<string, unknown>).visionStatement ?? null,
          }));
        }
        if (version < 4) {
          // No data transform — `zoneThresholds` stays undefined on
          // existing projects and reads canonical defaults via
          // `getZoneThresholds(project)`. Leaving the field absent
          // means future default changes (e.g. 25→30) propagate to
          // unmigrated projects automatically.
        }
        if (version < 5) {
          // Normalize kebab-case archetype values that leaked into
          // projectType (e.g. a legacy "regenerative-farm" fixture) to the
          // server snake_case ProjectType enum, so project:create stops
          // failing server validation with a 422 on sync. See
          // normalizeProjectType.
          const projects = (state.projects ?? []) as Record<string, unknown>[];
          state.projects = projects.map((p) => ({
            ...p,
            projectType: normalizeProjectType(
              (p as { projectType?: string | null }).projectType,
            ),
          }));
        }
        if (version < 6) {
          // OLOS v1.2 taxonomy rename: re-run normalizeProjectType so a project
          // persisted at v5 that still holds a dropped legacy value
          // (educational_farm / multi_enterprise / retreat_center) is forwarded
          // to its migration-046 home, instead of failing the server enum parse
          // with a 422 on the next sync. See normalizeProjectType.
          const projects = (state.projects ?? []) as Record<string, unknown>[];
          state.projects = projects.map((p) => ({
            ...p,
            projectType: normalizeProjectType(
              (p as { projectType?: string | null }).projectType,
            ),
          }));
        }
        if (version < 7) {
          // Plan stratum rename: view discriminator 'tier-spine' -> 'stratum-spine'.
          const projects = (state.projects ?? []) as Record<string, unknown>[];
          state.projects = projects.map((p) => ({
            ...p,
            planShellMode:
              (p as { planShellMode?: string }).planShellMode === 'tier-spine'
                ? 'stratum-spine'
                : (p as { planShellMode?: string }).planShellMode,
          }));
        }
        if (version < 8) {
          // Backfill a `projectTypeRecord` for any project (builtins included)
          // that carries a valid bare `projectType` but no record yet. Legacy/
          // seeded projects resolved their objectives via the string-level
          // fallback in `useProjectObjectives`, but the Step-2 wizard reads the
          // record directly — so without one the steward cannot add secondary
          // layers without first re-picking the primary. Seeding the record the
          // bare string already implies makes resolution uniformly source:'record'
          // and unblocks the wizard. Idempotent: projects already holding a record
          // (or whose string is empty / unknown / secondary-only) pass through.
          const projects = (state.projects ?? []) as Record<string, unknown>[];
          state.projects = projects.map((p) => {
            const meta = (p as { metadata?: Record<string, unknown> | null })
              .metadata;
            if (meta?.projectTypeRecord) return p;
            const record = recordFromBareProjectType(
              (p as { projectType?: string | null }).projectType,
            );
            if (!record) return p;
            return {
              ...p,
              metadata: { ...(meta ?? {}), projectTypeRecord: record },
            };
          });
        }
        if (version < 9) {
          // No data transform — `observeLensDataSource` stays undefined on
          // existing projects and resolves to the `live` default via
          // `getObserveLensDataSource(project)`. Leaving the field absent
          // means the module-bar Observe lens reads live project data out of
          // the box; the steward opts back to `mock` per project via the
          // ObserveLensDataSourceToggle.
        }
        return state;
      },
      // Strip large geospatial blobs (parsed attachments) from localStorage to
      // prevent quota issues. Parcel boundary FCs are small (~1-10 KB) so they
      // ride directly in localStorage like designElementsStore does in PLAN
      // — single source of truth, no IDB-restore race window. See ADDENDUM 6.
      // Defensive against partial / drift-shaped state (e.g. a project
      // seeded via raw setState that skipped `attachments: []`, or a sync
      // path that replaced state with `{}`). The persist middleware reruns
      // partialize on EVERY setState — including ones from useEffects like
      // V3ProjectLayout's `setActiveProject` — so an undefined here crashes
      // the whole render tree, not just persistence. Same guard pattern as
      // `tagged.apply` in syncManifest.ts.
      partialize: (state) => ({
        projects: (state.projects ?? []).map((p) => ({
          ...p,
          attachments: (p.attachments ?? []).map((a) => ({
            ...a,
            // Parsed geospatial data stored in IndexedDB under key "attachment:<id>"
            data: null,
          })),
        })),
        activeProjectId: state.activeProjectId,
      }),
    },
  ),
);

// On hydration, fetch the public builtin sample(s) from the API and merge
// into the local store. This runs for every visitor — authenticated or not
// — so the home page always shows the canonical "351 House — Atlas Sample"
// even before sign-in. The legacy hard-coded local seed has been removed in
// favour of this single source of truth.
//
// Boundary FCs ride along the rehydrated `projects[]` from localStorage
// directly (see partialize). The previous IDB-restore sequencing (ADDENDA
// 3) is no longer needed — see ADDENDUM 6.
useProjectStore.persist.onFinishHydration(() => {
  seedMtcDemo();
  seedHomesteadSampleProject();
  void hydrateBuiltins();
});

// Moontrance Creek demo project. The Plan and Act stages expose a
// `/v3/project/mtc/...` route whose `projectId` is the literal slug
// `'mtc'` — it predates the builtin-samples pipeline and is not a
// real server project. Seed it on hydrate as an `isBuiltin` row keyed
// by `'mtc'` so `updateProject('mtc', …)` writes route through the
// builtin allowlist (parcel boundary + metadata) instead of silently
// dropping. Idempotent.
// Plausible Ontario placeholder parcel for the Moontrance Creek demo (~40 ha
// near Mulmur/Creemore, CA/ON). Long axis runs NW-SE along the lie of the
// land; the seasonal creek follows the low NE edge. Full 6-dp precision,
// true-north WGS84 -- swappable for surveyed coordinates later. DEMO DATA.
const MTC_PARCEL_BOUNDARY: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Moontrance Creek (demo parcel)' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-80.105900, 44.303500],
          [-80.097200, 44.301800],
          [-80.095800, 44.296500],
          [-80.104500, 44.298200],
          [-80.105900, 44.303500],
        ]],
      },
    },
  ],
};

export const MTC_SEED: LocalProject = {
  id: 'mtc',
  name: 'Moontrance Creek',
  description: null,
  status: 'active',
  projectType: null,
  country: 'CA',
  provinceState: 'ON',
  conservationAuthId: null,
  address: null,
  parcelId: null,
  acreage: null,
  dataCompletenessScore: null,
  hasParcelBoundary: true,
  isBuiltin: true,
  createdAt: '2026-05-13T00:00:00.000Z',
  updatedAt: '2026-05-13T00:00:00.000Z',
  parcelBoundaryGeojson: MTC_PARCEL_BOUNDARY,
  ownerNotes: null,
  zoningNotes: null,
  accessNotes: null,
  waterRightsNotes: null,
  visionStatement: null,
  units: 'metric',
  attachments: [],
};

function seedMtcDemo(): void {
  const existing = useProjectStore.getState().projects.find((p) => p.id === 'mtc');
  if (!existing) {
    useProjectStore.setState((state) => ({
      projects: [...state.projects, MTC_SEED],
    }));
  } else if (!existing.parcelBoundaryGeojson) {
    // Backfill the demo boundary onto a row persisted before it existed.
    // Idempotent: only patches when the boundary is still absent, so a user
    // who later draws their own boundary is never overwritten.
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === 'mtc'
          ? { ...p, parcelBoundaryGeojson: MTC_PARCEL_BOUNDARY, hasParcelBoundary: true }
          : p,
      ),
    }));
  }
  // Seed MTC's curated Act content at hydrate time so View B is populated the
  // moment the map-first shell mounts (the default now that builtins are no
  // longer pinned to the legacy command-centre). Idempotent by the field-action
  // store's per-project gate, so a row that already exists won't duplicate and
  // View B's own mount-effect seed becomes a no-op. Run unconditionally — the
  // MTC project row can persist from a prior session while its actions are
  // empty (e.g. after a field-action store reset).
  seedCuratedMtcActionsIfEmpty('mtc');
  // Light up MTC's Observe Dashboard with its OWN site facts (distinct from
  // the 351-House fixture) now that builtins default to the dashboard shell.
  // Idempotent merge-by-id replay into the data-point store.
  seedMtcObserveDataPoints('mtc');
}

// ─────────────────────────────────────────────────────────────────────────
// Homestead — Atlas Sample. A fully-worked homestead fixture for the offline
// demo. The work is split across the builtin/clone boundary because
// `duplicateProject` cascade-clones metadata + design + boundary but NOT the
// `byProject` progress stores:
//   • Here we register the canonical builtin row (record + completion metadata
//     + boundary + drawn permaculture zones). All of this CASCADES to the
//     visitor's demo clone.
//   • `dev/seedHomesteadSample.ts` writes the Plan/Act/threshold completion
//     state onto the CLONE id (it scans `metadata.instantiatedFromTemplate`).
//
// Parcel boundary + permaculture zones 0–5 are OPERATOR-CAPTURED (drawn live in
// OLOS, then transcribed). Until captured they are null/empty and
// `seedHomesteadDesign` is a no-op — the row still lists in the portfolio and
// the spine still resolves all 34 objectives (resolution keys off
// `projectTypeRecord` only).
const HOMESTEAD_SAMPLE_BOUNDARY: GeoJSON.FeatureCollection | null = null;

// Structured metadata (typed as ProjectMetadata). `instantiatedFromTemplate`
// is added via spread in HOMESTEAD_SAMPLE_SEED below — it is a passthrough key
// not in the static type, and a spread relaxes the excess-property check (same
// idiom as features/project/wizard/StepNotes.tsx).
//
// The vision vocab here is intentionally lightweight; the curated vision /
// persona pass and location facts (centerLat/Lng, hardinessZone, climate) land
// with the operator-chosen site. What matters now: `projectTypeRecord` drives
// the 34-objective resolution, and `visionProfile` / `team` feed the Stratum-1
// effective-progress derivations the completion seeder builds on.
const HOMESTEAD_SAMPLE_METADATA: ProjectMetadata = {
  wizardStatus: 'complete',
  projectTypeRecord: {
    primaryTypeId: 'homestead',
    secondaryTypeIds: [],
    tensionAcknowledgements: [],
    versionHistory: [],
    reopeningAcknowledgements: [],
  },
  visionProfile: {
    primaryType: 'homestead',
    secondaryTypes: [],
    landIdentity: [
      'A family homestead stewarded as an amanah — feeding the household first, building soil and water security, and leaving the land more alive each year.',
    ],
    primaryOutcomes: ['household_food_security', 'soil_regeneration', 'water_resilience'],
    systemsInScope: {
      food: ['annual_vegetables', 'perennial_fruit', 'staple_crops'],
      animals: ['poultry', 'small_ruminants'],
      water: ['rainwater_harvesting', 'swales'],
      built: ['existing_dwelling', 'storage'],
    },
    economicIntentLevel: 'subsistence_plus',
    values: ['stewardship', 'self_reliance', 'family'],
    developmentStyle: 'incremental',
    willLiveOnLand: 'yes_full_time',
    livestock: {
      roles: ['eggs', 'meat', 'land_management'],
      intensity: 'low',
      managementStyle: 'rotational',
      priorities: ['household_provision', 'soil_fertility'],
    },
    budgetRange: 'modest',
    timelineProgress: 'three_to_five_years',
  },
  team: {
    primarySteward: { name: 'Yusuf & Amina', email: 'steward@homestead.example' },
    coStewards: [{ name: 'Bilal (eldest son)', email: 'bilal@homestead.example' }],
    queuedInvites: [
      {
        name: 'Local water-systems contractor',
        email: 'contractor@example.org',
        role: 'contractor',
        queuedAt: '2026-01-15T09:00:00.000Z',
      },
    ],
  },
};

export const HOMESTEAD_SAMPLE_SEED: LocalProject = {
  id: HOMESTEAD_SAMPLE_PROJECT_ID,
  name: 'Homestead — Atlas Sample',
  description:
    'A fully-worked family homestead — the complete OLOS journey end to end: vision, land reading, system design, and a launch-ready plan, all under stewardship of the land as an amanah.',
  status: 'active',
  projectType: 'homestead',
  country: 'CA',
  provinceState: 'ON',
  conservationAuthId: null,
  address: null,
  parcelId: null,
  acreage: null,
  dataCompletenessScore: null,
  hasParcelBoundary: false,
  isBuiltin: true,
  createdAt: '2026-01-10T00:00:00.000Z',
  updatedAt: '2026-06-20T00:00:00.000Z',
  parcelBoundaryGeojson: HOMESTEAD_SAMPLE_BOUNDARY,
  ownerNotes: null,
  zoningNotes: null,
  accessNotes: null,
  waterRightsNotes: null,
  visionStatement: null,
  units: 'metric',
  attachments: [],
  // `instantiatedFromTemplate` is the flag the clone seeder scans for. Added via
  // spread so the excess-property check is relaxed (see note above).
  metadata: { ...HOMESTEAD_SAMPLE_METADATA, instantiatedFromTemplate: 'homestead-sample' },
};

function seedHomesteadSampleProject(): void {
  const existing = useProjectStore
    .getState()
    .projects.find((p) => p.id === HOMESTEAD_SAMPLE_PROJECT_ID);
  if (!existing) {
    useProjectStore.setState((state) => ({
      projects: [...state.projects, HOMESTEAD_SAMPLE_SEED],
    }));
  } else if (!existing.parcelBoundaryGeojson && HOMESTEAD_SAMPLE_BOUNDARY) {
    // Backfill the captured boundary onto a row persisted before it existed.
    // Idempotent; never overwrites a boundary the visitor drew themselves.
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === HOMESTEAD_SAMPLE_PROJECT_ID
          ? { ...p, parcelBoundaryGeojson: HOMESTEAD_SAMPLE_BOUNDARY, hasParcelBoundary: true }
          : p,
      ),
    }));
  }
  // Seed the operator-captured permaculture zones 0–5 + the existing homebase
  // structure onto the canonical builtin id so they CASCADE to the demo clone
  // via cascadeCloneProject. No-op until the geometry is captured (Phase 4),
  // idempotent once it is.
  seedHomesteadDesign(HOMESTEAD_SAMPLE_PROJECT_ID);
}

// Local fallback used when the API is unreachable (e.g. dev server not
// running, offline). Mirrors the canonical builtin from migration 017 so
// every visitor — including unauthenticated ones with no API — sees a
// populated sample on the home page. Kept in sync by hand.
// Sample parcel polygon — same coordinates as migration 017, wrapped in a
// FeatureCollection so it matches the shape MapView and the rest of the
// app expect from `LocalProject.parcelBoundaryGeojson`.
const LOCAL_BUILTIN_BOUNDARY: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-79.70636, 43.50401],
          [-79.70364, 43.50401],
          [-79.70364, 43.50599],
          [-79.70636, 43.50599],
          [-79.70636, 43.50401],
        ]],
      },
    },
  ],
};

// Snake_case summaries — mirror migration 018's canonical jsonb keys.
// Used only when /projects/builtins is unreachable (e.g. signed-out user
// with the API stopped); the API path always wins when available.
const LOCAL_BUILTIN_FALLBACK_LAYERS: MockLayerResult[] = [
  {
    layerType: 'elevation',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: '2024-08-15',
    sourceApi: 'NRCan HRDEM',
    attribution: 'Natural Resources Canada (offline fallback)',
    summary: {
      min_elevation_m: 240.1,
      max_elevation_m: 268.4,
      mean_elevation_m: 254.7,
      mean_slope_deg: 4.2,
      max_slope_deg: 11.6,
      predominant_aspect: 'SW',
    },
  },
  {
    layerType: 'climate',
    fetchStatus: 'complete',
    confidence: 'high',
    dataDate: '2021-12-31',
    sourceApi: 'ECCC normals 1991–2020',
    attribution: 'Environment and Climate Change Canada (offline fallback)',
    summary: {
      annual_precip_mm: 870,
      growing_season_days: 156,
      growing_degree_days: 2860,
      hardiness_zone: '5b',
      annual_temp_mean_c: 7.8,
      koppen_classification: 'Dfb',
      first_frost_date: '2025-10-15',
      last_frost_date: '2025-05-05',
    },
  },
];

const LOCAL_BUILTIN_FALLBACK = {
  id: '00000000-0000-0000-0000-0000005a3791',
  name: '351 House — Atlas Sample',
  description: 'Halton Hills homestead — regenerative land design for a 12-acre parcel on the Niagara Escarpment edge. Mixed Carolinian forest, agricultural fields, and seasonal creek.',
  status: 'active' as const,
  projectType: 'homestead',
  country: 'CA',
  provinceState: 'ON',
  conservationAuthId: null,
  address: '351 Glenashton Dr, Oakville, ON',
  parcelId: null,
  acreage: 12,
  dataCompletenessScore: null,
  hasParcelBoundary: true,
  parcelBoundaryGeojson: LOCAL_BUILTIN_BOUNDARY,
  isBuiltin: true,
  layers: LOCAL_BUILTIN_FALLBACK_LAYERS,
};

interface BuiltinRow {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived' | 'shared' | 'candidate';
  projectType: string | null;
  country: string;
  provinceState: string | null;
  conservationAuthId: string | null;
  address: string | null;
  parcelId: string | null;
  acreage: number | null;
  dataCompletenessScore: number | null;
  hasParcelBoundary: boolean;
  /**
   * Parcel boundary. The API returns a raw GeoJSON geometry (from
   * `ST_AsGeoJSON`); the local fallback ships a FeatureCollection. We
   * normalize to FeatureCollection inside `applyBuiltinsToStore` before
   * writing into the store.
   */
  parcelBoundaryGeojson?:
    | GeoJSON.FeatureCollection
    | GeoJSON.Geometry
    | null;
  isBuiltin: boolean;
  createdAt?: string;
  updatedAt?: string;
  /**
   * Tier-1 layer summaries for this builtin. Populated by the public
   * `/projects/builtins` endpoint (migration 018 canonical snake_case
   * keys preserved by hand-mapping in the API handler — *not* routed
   * through `toCamelCase`). Falls back to `LOCAL_BUILTIN_FALLBACK_LAYERS`
   * when the API is unreachable.
   */
  layers?: MockLayerResult[];
}

/**
 * Normalize a server-supplied parcel boundary into the `FeatureCollection`
 * shape the store stores. `ST_AsGeoJSON(parcel_boundary)` returns a bare
 * Geometry (Polygon/MultiPolygon), so wrap it in a single-feature FC; an
 * already-FC value (e.g. a locally-drawn boundary) passes through unchanged.
 * Exported so the lazy boundary-hydration path in `syncService` can reuse the
 * exact same normalization (see `hydrateProjectBoundaries`).
 */
export function asFeatureCollection(
  raw: GeoJSON.FeatureCollection | GeoJSON.Geometry | null | undefined,
): GeoJSON.FeatureCollection | null {
  if (!raw) return null;
  if ((raw as GeoJSON.FeatureCollection).type === 'FeatureCollection') {
    return raw as GeoJSON.FeatureCollection;
  }
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: raw as GeoJSON.Geometry }],
  };
}

function applyBuiltinsToStore(builtins: BuiltinRow[]): void {
  const now = new Date().toISOString();
  // Snapshot the current store BEFORE we filter/replace so we can preserve
  // local-only state across re-seed: the existing local UUID (so IndexedDB
  // boundary:<id> entries remain reachable) and any user-drawn parcel
  // boundary that diverges from the canonical builtin geometry.
  const existingByServerId = new Map<string, LocalProject>();
  for (const p of useProjectStore.getState().projects) {
    if (p.serverId) existingByServerId.set(p.serverId, p);
  }
  // Build the LocalProject list outside setState so we can re-use the
  // generated local ids when seeding the per-project observe stores.
  const incoming: LocalProject[] = builtins.map((sp) => {
    const apiBoundary = asFeatureCollection(sp.parcelBoundaryGeojson);
    const existing = existingByServerId.get(sp.id);
    // Preserve a user-customized boundary across reloads. We treat ANY
    // non-null in-store FC whose stringified geometry differs from the
    // API's canonical FC as "user-drawn" — JSON equality is good enough
    // (geometries originate from turf/MapboxDraw with stable coord order).
    const userDrew =
      existing?.parcelBoundaryGeojson != null &&
      JSON.stringify(existing.parcelBoundaryGeojson) !== JSON.stringify(apiBoundary);
    const boundary = userDrew ? existing!.parcelBoundaryGeojson : apiBoundary;
    return {
    // Reuse the existing local id when one exists for this serverId so
    // that boundary:<id> entries already in IndexedDB remain valid; only
    // mint a fresh UUID for first-seen builtins.
    id: existing?.id ?? crypto.randomUUID(),
    name: sp.name,
    description: sp.description,
    status: sp.status,
    projectType: sp.projectType,
    country: sp.country,
    provinceState: sp.provinceState,
    conservationAuthId: sp.conservationAuthId,
    address: sp.address,
    parcelId: sp.parcelId,
    acreage: sp.acreage,
    dataCompletenessScore: sp.dataCompletenessScore,
    hasParcelBoundary: sp.hasParcelBoundary || boundary !== null,
    isBuiltin: sp.isBuiltin,
    createdAt: existing?.createdAt ?? sp.createdAt ?? now,
    updatedAt: sp.updatedAt ?? now,
    // Boundary is normalized to FeatureCollection above; ride alongside
    // the in-memory project so MapView and other consumers can render
    // immediately. We also persist to IndexedDB below so subsequent
    // reloads pick it up via `geodataCache` like a user-drawn boundary.
    parcelBoundaryGeojson: boundary,
    // Builtins ship with a hand-authored narrative — the public
    // /projects/builtins endpoint strips notes/visionStatement, so we
    // splice them in client-side. Non-builtin rows (none today via this
    // path, defence-in-depth) keep the previous null behaviour.
    ownerNotes: sp.isBuiltin ? BUILTIN_PROJECT_NARRATIVE.ownerNotes : null,
    zoningNotes: sp.isBuiltin ? BUILTIN_PROJECT_NARRATIVE.zoningNotes : null,
    accessNotes: sp.isBuiltin ? BUILTIN_PROJECT_NARRATIVE.accessNotes : null,
    waterRightsNotes: sp.isBuiltin ? BUILTIN_PROJECT_NARRATIVE.waterRightsNotes : null,
    visionStatement: sp.isBuiltin ? BUILTIN_PROJECT_NARRATIVE.visionStatement : null,
    units: 'metric',
    attachments: [],
    serverId: sp.id,
    // Preserve user-edited project metadata across the builtin re-seed
    // (designStatus, allowOrphanOutputs, designHorizonYears, zone
    // thresholds, etc.). Builtins API doesn't ship a metadata field, so
    // dropping the existing copy here would silently reset every
    // ProjectMetadata write on every reload.
    metadata: existing?.metadata,
  };
  });

  useProjectStore.setState((state) => {
    // Drop (a) any previous local copy keyed by serverId so server is
    // authoritative, and (b) the legacy hard-coded "351 House" seed that
    // earlier builds wrote on first run — it had no serverId and no
    // isBuiltin flag and would otherwise duplicate the builtin sample.
    const filtered = state.projects.filter((p) => {
      if (builtins.some((sp) => sp.id === p.serverId)) return false;
      if (!p.serverId && !p.isBuiltin && p.name === '351 House') return false;
      return true;
    });
    return { projects: [...filtered, ...incoming] };
  });

  // Hydrate the per-project observe stores (vision, hazards, sectors,
  // transects, soil samples, ecology, SWOT) so Stage 1 modules render
  // populated content, and persist the parcel boundary to IndexedDB so
  // map components on subsequent loads pick it up via `geodataCache`
  // — same path used for user-drawn boundaries. Both are idempotent.
  for (let i = 0; i < incoming.length; i++) {
    const lp = incoming[i];
    const sp = builtins[i];
    if (!lp || !sp) continue;
    if (lp.isBuiltin) seedBuiltinObserveData(lp.id);
    // Boundary persists via zustand persist (see partialize + ADDENDUM 6).
    // Stream Tier-1 layer summaries (climate, elevation, etc.) into
    // siteDataStore keyed by the local project id, so Stage 1 modules
    // and the diagnosis report read DB-canonical snake_case values
    // instead of a hand-coded fixture. Falls back to the offline
    // LOCAL_BUILTIN_FALLBACK_LAYERS when the API didn't ship `layers`.
    if (lp.isBuiltin) {
      const apiLayers = sp.layers && sp.layers.length > 0
        ? sp.layers
        : LOCAL_BUILTIN_FALLBACK_LAYERS;
      useSiteDataStore.setState((s) => ({
        dataByProject: {
          ...s.dataByProject,
          [lp.id]: {
            layers: apiLayers,
            isLive: false,
            liveCount: 0,
            fetchedAt: Date.now(),
            status: 'complete',
          },
        },
      }));
    }
  }
}

async function hydrateBuiltins(): Promise<void> {
  try {
    const res = await fetch('/api/v1/projects/builtins');
    if (!res.ok) {
      applyBuiltinsToStore([LOCAL_BUILTIN_FALLBACK]);
    } else {
      const envelope = (await res.json()) as {
        data: Array<{
          id: string;
          name: string;
          description: string | null;
          status: 'active' | 'archived' | 'shared' | 'candidate';
          projectType: string | null;
          country: string;
          provinceState: string | null;
          conservationAuthId: string | null;
          address: string | null;
          parcelId: string | null;
          acreage: number | null;
          dataCompletenessScore: number | null;
          hasParcelBoundary: boolean;
          isBuiltin: boolean;
          createdAt: string;
          updatedAt: string;
          parcelBoundaryGeojson?: GeoJSON.Geometry | GeoJSON.FeatureCollection | null;
          layers?: MockLayerResult[];
        }>;
      };
      applyBuiltinsToStore(envelope.data);
    }
  } catch (err) {
    console.warn('[OGDEN] Failed to fetch builtin samples — using local fallback:', err);
    applyBuiltinsToStore([LOCAL_BUILTIN_FALLBACK]);
  }
  // Trigger demo clone after builtins land. Tree-shaken to nothing in non-demo
  // builds (Vite folds the FEATURE_DEMO_* flags to literals). Dynamic import
  // avoids a circular dep: demoSession.ts statically imports projectStore.ts
  // below. Fires for BOTH demo modes — in offline mode the boot-time clone may
  // run before builtins hydrate, so this is the retry that actually lands it.
  if (
    process.env.FEATURE_DEMO_MODE === 'true' ||
    process.env.FEATURE_DEMO_OFFLINE === 'true'
  ) {
    void import('../app/demoSession.js').then((m) => void m.maybeCloneBuiltinsForDemo());
  }
}

// One-time legacy-data migrator: pre-ADDENDUM-6 builds stored boundary FCs
// in IndexedDB under `boundary:<projectId>`. Now that boundaries persist
// directly via zustand's localStorage, fold any pre-existing IDB blobs
// back into in-memory state for projects whose `parcelBoundaryGeojson`
// is null after rehydrate, then drop the legacy IDB entry. After this
// runs once successfully, no further IDB reads happen.
async function migrateLegacyIdbBoundaries(): Promise<void> {
  const { projects: hydratedProjects } = useProjectStore.getState();
  const restored = await Promise.all(
    hydratedProjects.map(async (hp) => {
      if (!hp.hasParcelBoundary || hp.parcelBoundaryGeojson) return null;
      try {
        const geo = await geodataCache.get<GeoJSON.FeatureCollection>(
          `boundary:${hp.id}`,
        );
        return geo ? { id: hp.id, geo } : null;
      } catch (err) {
        console.warn('[OGDEN] Legacy boundary IDB read failed:', err);
        return null;
      }
    }),
  );
  const hits = restored.filter(
    (r): r is { id: string; geo: GeoJSON.FeatureCollection } => r !== null,
  );
  if (hits.length === 0) return;
  useProjectStore.setState((state) => ({
    projects: state.projects.map((p) => {
      const hit = hits.find((h) => h.id === p.id);
      return hit ? { ...p, parcelBoundaryGeojson: hit.geo } : p;
    }),
  }));
}

// Hydrate from localStorage (Zustand v5 requires explicit rehydrate)
rehydrateWithLogging(useProjectStore);
// After rehydrate completes, run the one-time legacy IDB migrator. This
// is fire-and-forget; if the legacy entry exists it is folded into the
// next zustand persist cycle automatically when state changes.
void migrateLegacyIdbBoundaries();

// Expose store for console/testing access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenProjectStore = useProjectStore;
}
