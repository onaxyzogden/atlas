/**
 * syncManifest — the single source of truth for which `ogden-` persisted
 * Zustand store is synced across devices, and how.
 *
 * P0-1 (silent multi-device data loss) was caused by `syncService` covering
 * only 4 of ~68 project-scoped stores with no enumeration that could be
 * audited. This registry closes that failure mode: every project-scoped
 * `ogden-` persist store MUST appear in `SYNCED_STORES` (with a sync
 * `classification`) or in `DEVICE_GLOBAL` (deliberately device-local). The
 * coverage guard in `__tests__/syncManifest.test.ts` fails the build the
 * moment a persisted store is left unclassified.
 *
 * Classification semantics (see the Full syncService Coverage plan):
 *  - `typed-design-feature` — geometry-bearing design elements that already
 *    round-trip through the `design_features` typed path; the generic blob
 *    path MUST NOT touch these (no double-write of the design surface).
 *  - `typed-table`          — stores the server should query/reason about;
 *    get real columns + Zod (e.g. vegetation, succession).
 *  - `versioned-blob`       — the write-mostly remainder; one generic
 *    versioned-blob row per (project, storeKey).
 *
 * Phase 1 deliverable: the enumeration + classification + coverage guard.
 * Phase 2.5b: every `versioned-blob` descriptor now also carries a live
 * store handle + `scope` + `schemaVersion` + `usesTemporal` +
 * `selectForProject`, so `syncService`'s generic subscription/queue loop can
 * push each store's project slice as an opaque blob. `typed-*` descriptors
 * keep their own (existing) transport and intentionally omit this metadata.
 */

import { useProjectStore } from '../store/projectStore.js';
import { useFinancialStore } from '../store/financialStore.js';
import { useSitingWeightStore } from '../store/sitingWeightStore.js';
import { useHazardsStore } from '../store/hazardsStore.js';
import { useSectorStore } from '../store/sectorStore.js';
import { useSoilTestStore } from '../store/soilTestStore.js';
import { useGoalTreeStore } from '../store/goalTreeStore.js';
import { useSiteProfileStore } from '../store/siteProfileStore.js';
import { useActualsStore } from '../store/actualsStore.js';
import { useCompostInventoryStore } from '../store/compostInventoryStore.js';
import { useActHowChecksStore } from '../store/actHowChecksStore.js';
import { useHomesteadStore } from '../store/homesteadStore.js';
import { useMachineryInventoryStore } from '../store/machineryInventoryStore.js';
import { usePlanProjectTypeChecklistStore } from '../store/planProjectTypeChecklistStore.js';
import { usePrincipleCheckStore } from '../store/principleCheckStore.js';
import { usePlanHowChecksStore } from '../store/planHowChecksStore.js';
import { useRelationshipsStore } from '../store/relationshipsStore.js';
import { useObserveHowChecksStore } from '../store/observeHowChecksStore.js';
import { useRegenerationPlanStore } from '../store/regenerationPlanStore.js';
import { useEcologyStore } from '../store/ecologyStore.js';
import { usePastureStore } from '../store/pastureStore.js';
import { useSwotStore } from '../store/swotStore.js';
import { usePhaseStore } from '../store/phaseStore.js';
import { useLivestockStore } from '../store/livestockStore.js';
import { usePolycultureStore } from '../store/polycultureStore.js';
import { useCropStore } from '../store/cropStore.js';
import { useConventionalCropStore } from '../store/conventionalCropStore.js';
import { useVisionStore } from '../store/visionStore.js';
import { useNurseryStore } from '../store/nurseryStore.js';
import { usePathStore } from '../store/pathStore.js';
import { useHumanContextStore } from '../store/humanContextStore.js';
import { useEnterpriseStore } from '../store/enterpriseStore.js';
import { useVersionStore } from '../store/versionStore.js';
import { useClosedLoopStore } from '../store/closedLoopStore.js';
import { useAppropriateTechStore } from '../store/appropriateTechStore.js';
import { useFieldworkStore } from '../store/fieldworkStore.js';
import { useFieldTaskStore } from '../store/fieldTaskStore.js';
import { useExternalForcesStore } from '../store/externalForcesStore.js';
import { useBuildTaskStore } from '../store/buildTaskStore.js';
import { useNetworkStore } from '../store/networkStore.js';
import { useAgribusinessStore } from '../store/agribusinessStore.js';
import { useMonitoringTransectStore } from '../store/monitoringTransectStore.js';
import { useEcologicalNoteStore } from '../store/ecologicalNoteStore.js';
import { useCommunityEventStore } from '../store/communityEventStore.js';
import { useCommentStore } from '../store/commentStore.js';
import { useMaintenanceStore } from '../store/maintenanceStore.js';
import { useFlowConnectorStore } from '../store/flowConnectorStore.js';
import { useMaintenanceLogStore } from '../store/maintenanceLogStore.js';
import { useHarvestLogStore } from '../store/harvestLogStore.js';
import { useLivestockMoveLogStore } from '../store/livestockMoveLogStore.js';
import { usePortalStore } from '../store/portalStore.js';
import { usePilotPlotStore } from '../store/pilotPlotStore.js';
import { useScenarioStore } from '../store/scenarioStore.js';
import { useScheduledLivestockMoveStore } from '../store/scheduledLivestockMoveStore.js';
import { useSetbackStore } from '../store/setbackStore.js';
import { useSoilSampleStore } from '../store/soilSampleStore.js';
import { useTopographyStore } from '../store/topographyStore.js';
import { useTemplateStore } from '../store/templateStore.js';
import { useUtilityRunStore } from '../store/utilityRunStore.js';
import { useUtilityStore } from '../store/utilityStore.js';
import { useWaterSystemsStore } from '../store/waterSystemsStore.js';

export type SyncClassification =
  | 'typed-design-feature'
  | 'typed-table'
  | 'versioned-blob';

/** Shape of a project-scoped store's persisted state across projects. */
export type StoreScope =
  | 'byProject' // Record<projectId, T[]>
  | 'projectId-tagged' // flat array, each row carries projectId
  | 'active-singleton'; // single active-project blob

/**
 * Minimal live store handle the generic loop needs: read current state and
 * subscribe to changes. A Zustand bound hook satisfies this structurally
 * (its variance on `subscribe`'s listener is widened via the builder cast).
 */
export interface VersionedBlobStoreHandle {
  getState: () => unknown;
  subscribe: (listener: (state: unknown, prev: unknown) => void) => () => void;
}

export interface SyncedStoreDescriptor {
  /** The `persist` `name:` key, e.g. `ogden-zones`. Unique. */
  storeKey: string;
  /** How this store is transported across devices. */
  classification: SyncClassification;
  /**
   * How the persisted state is partitioned by project. Populated for
   * `versioned-blob`; `typed-*` keep their own transport and omit it.
   */
  scope?: StoreScope;
  /** Monotonic blob schema version for the version-skew guard. */
  schemaVersion?: number;
  /** True if the store is wrapped in `temporal()` (undo-frame handling). */
  usesTemporal?: boolean;
  /** Live store handle to read + subscribe to (versioned-blob only). */
  store?: VersionedBlobStoreHandle;
  /**
   * Extract the project-scoped slice to push as the opaque blob payload.
   * Must be total (never throw, never return `undefined`) so an empty or
   * unknown project still produces a serialisable payload.
   */
  selectForProject?: (state: unknown, projectId: string) => unknown;
  /**
   * Inverse of `selectForProject`: write a hydrated server slice back into
   * the live store for `projectId`, leaving every OTHER project's rows
   * untouched (P4 multi-device restore). Applies via the store's
   * `setState` functional updater so the `isSyncing` guard suppresses an
   * undo frame for `temporal()` stores.
   */
  applyForProject?: (
    store: { getState: () => unknown; setState: (p: unknown) => void },
    projectId: string,
    incoming: unknown,
  ) => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Selector = (state: unknown, projectId: string) => unknown;
type StoreApi = { getState: () => unknown; setState: (p: unknown) => void };
type Applier = (store: StoreApi, projectId: string, incoming: unknown) => void;

/**
 * A project-scope shape: how to extract this project's slice (`select`) and
 * how to write a hydrated slice back without disturbing other projects
 * (`apply`). `apply` always goes through `setState((st) => patch)` so the
 * `isSyncing` guard suppresses a temporal undo frame.
 */
interface BlobShape {
  select: Selector;
  apply: Applier;
}

/** active-singleton: the whole persisted state is the project slice. */
const whole: BlobShape = {
  select: (s) => s ?? {},
  apply: (store, _pid, incoming) =>
    store.setState(() => ({ ...((incoming as any) ?? {}) })),
};

/** byProject: `state[record][projectId]` (optionally a `leaf` field). */
const byKey = (
  record: string,
  leaf: string | null,
  empty: unknown,
): BlobShape => ({
  select: (s, pid) => {
    const bucket = (s as any)?.[record]?.[pid];
    if (leaf) return bucket?.[leaf] ?? empty;
    return bucket ?? empty;
  },
  apply: (store, pid, incoming) =>
    store.setState((st: any) => {
      const rec = { ...((st?.[record] as any) ?? {}) };
      if (leaf) rec[pid] = { ...(rec[pid] ?? {}), [leaf]: incoming };
      else rec[pid] = incoming;
      return { [record]: rec };
    }),
});

/** projectId-tagged: each named array filtered to this project. */
const tagged = (...fields: string[]): BlobShape => ({
  select: (s, pid) => {
    const out: Record<string, unknown[]> = {};
    for (const f of fields) {
      const arr = (s as any)?.[f];
      out[f] = Array.isArray(arr) ? arr.filter((x) => x?.projectId === pid) : [];
    }
    return out;
  },
  apply: (store, pid, incoming) =>
    store.setState((st: any) => {
      const patch: Record<string, unknown[]> = {};
      for (const f of fields) {
        const existing = Array.isArray(st?.[f]) ? st[f] : [];
        const others = existing.filter((x: any) => x?.projectId !== pid);
        const inc = (incoming as any)?.[f];
        patch[f] = others.concat(Array.isArray(inc) ? inc : []);
      }
      return patch;
    }),
});

/** projectId-tagged singleton: the one row owned by this project. */
const taggedFind = (field: string): BlobShape => ({
  select: (s, pid) => {
    const arr = (s as any)?.[field];
    return (Array.isArray(arr) ? arr.find((x) => x?.projectId === pid) : null) ?? null;
  },
  apply: (store, pid, incoming) =>
    store.setState((st: any) => {
      const existing = Array.isArray(st?.[field]) ? st[field] : [];
      const others = existing.filter((x: any) => x?.projectId !== pid);
      return {
        [field]: incoming == null ? others : others.concat([incoming]),
      };
    }),
});

/** agribusiness mixes projectId-tagged arrays with a byProject sizing map. */
const agribusinessSelect: BlobShape = {
  select: (s, pid) => {
    const st = s as any;
    const pick = (f: string) =>
      Array.isArray(st?.[f]) ? st[f].filter((x: any) => x?.projectId === pid) : [];
    return {
      slaughterPoints: pick('slaughterPoints'),
      coldChainUnits: pick('coldChainUnits'),
      marketNodes: pick('marketNodes'),
      sizingByProject: st?.sizingByProject?.[pid] ?? null,
    };
  },
  apply: (store, pid, incoming) =>
    store.setState((st: any) => {
      const inc = (incoming as any) ?? {};
      const repl = (f: string) => {
        const ex = Array.isArray(st?.[f]) ? st[f] : [];
        const others = ex.filter((x: any) => x?.projectId !== pid);
        const i = inc[f];
        return others.concat(Array.isArray(i) ? i : []);
      };
      return {
        slaughterPoints: repl('slaughterPoints'),
        coldChainUnits: repl('coldChainUnits'),
        marketNodes: repl('marketNodes'),
        sizingByProject: {
          ...((st?.sizingByProject as any) ?? {}),
          [pid]: inc.sizingByProject ?? null,
        },
      };
    }),
};

function blob(
  storeKey: string,
  store: { getState: () => unknown; subscribe: (...a: any[]) => any },
  scope: StoreScope,
  schemaVersion: number,
  shape: BlobShape,
  usesTemporal = false,
): SyncedStoreDescriptor {
  return {
    storeKey,
    classification: 'versioned-blob',
    scope,
    schemaVersion,
    usesTemporal,
    store: store as unknown as VersionedBlobStoreHandle,
    selectForProject: shape.select,
    applyForProject: shape.apply as SyncedStoreDescriptor['applyForProject'],
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Every project-scoped persisted `ogden-` store, with its sync
 * classification. Adding a project-scoped store WITHOUT adding it here (or
 * to `DEVICE_GLOBAL`) fails the coverage guard — that is the point.
 */
export const SYNCED_STORES: SyncedStoreDescriptor[] = [
  // --- typed-design-feature: already on the design_features typed path ---
  { storeKey: 'ogden-zones', classification: 'typed-design-feature' },
  { storeKey: 'ogden-built-environment-v2', classification: 'typed-design-feature' },
  { storeKey: 'ogden-atlas-design-elements', classification: 'typed-design-feature' },

  // --- typed-table: server should query/reason about these ---
  { storeKey: 'ogden-vegetation', classification: 'typed-table' },
  { storeKey: 'ogden-act-succession', classification: 'typed-table' },

  // --- versioned-blob: active-singleton (whole persisted state) ---
  blob('ogden-projects', useProjectStore, 'active-singleton', 4, whole),
  blob('ogden-financial', useFinancialStore, 'active-singleton', 1, whole),
  blob('ogden-siting-weights', useSitingWeightStore, 'active-singleton', 1, whole),

  // --- versioned-blob: byProject (Record keyed by projectId) ---
  blob('ogden-hazards', useHazardsStore, 'byProject', 1, byKey('byProject', 'hazards', [])),
  blob('ogden-sectors', useSectorStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-soil-tests', useSoilTestStore, 'byProject', 1, byKey('byProject', null, [])),
  blob('ogden-goal-trees', useGoalTreeStore, 'byProject', 1, byKey('goalTreesByProject', null, null)),
  blob('ogden-site-profiles', useSiteProfileStore, 'byProject', 2, byKey('profilesByProject', null, {})),
  blob('ogden-act-actuals', useActualsStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-compost-inventory', useCompostInventoryStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-atlas-act-how-checks', useActHowChecksStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-atlas-homestead', useHomesteadStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-atlas-machinery-inventory-v1', useMachineryInventoryStore, 'byProject', 1, byKey('byProject', null, [])),
  blob('ogden-atlas-plan-project-type-checklist', usePlanProjectTypeChecklistStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-principle-checks', usePrincipleCheckStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-atlas-plan-how-checks', usePlanHowChecksStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-relationships', useRelationshipsStore, 'byProject', 2, byKey('edgesByProject', null, [])),
  blob('ogden-atlas-observe-how-checks', useObserveHowChecksStore, 'byProject', 1, byKey('byProject', null, {})),

  // --- versioned-blob: projectId-tagged (flat arrays carrying projectId) ---
  blob('ogden-regen-plans', useRegenerationPlanStore, 'projectId-tagged', 2, tagged('plans'), true),
  blob('ogden-ecology', useEcologyStore, 'projectId-tagged', 3, tagged('ecology'), true),
  blob('ogden-pastures', usePastureStore, 'projectId-tagged', 1, tagged('pastures'), true),
  blob('ogden-swot', useSwotStore, 'projectId-tagged', 1, tagged('swot'), true),
  blob('ogden-phases', usePhaseStore, 'projectId-tagged', 3, tagged('phases')),
  blob('ogden-livestock', useLivestockStore, 'projectId-tagged', 1, tagged('paddocks', 'fenceLines'), true),
  blob('ogden-polyculture', usePolycultureStore, 'projectId-tagged', 3, tagged('guilds', 'species'), true),
  blob('ogden-crops', useCropStore, 'projectId-tagged', 2, tagged('cropAreas'), true),
  blob('ogden-conventional-crops', useConventionalCropStore, 'projectId-tagged', 1, tagged('conventionalCrops'), true),
  blob('ogden-vision', useVisionStore, 'projectId-tagged', 3, taggedFind('visions')),
  blob('ogden-nursery', useNurseryStore, 'projectId-tagged', 1, tagged('batches', 'transfers')),
  blob('ogden-paths', usePathStore, 'projectId-tagged', 1, tagged('paths'), true),
  blob('ogden-human-context', useHumanContextStore, 'projectId-tagged', 1, tagged('neighbours', 'households', 'accessRoads', 'permacultureZones'), true),
  blob('ogden-enterprises', useEnterpriseStore, 'projectId-tagged', 1, tagged('enterprises')),
  blob('ogden-versions', useVersionStore, 'projectId-tagged', 1, tagged('snapshots')),
  blob('ogden-closed-loop', useClosedLoopStore, 'projectId-tagged', 1, tagged('wasteVectors', 'wasteVectorRuns', 'fertilityInfra'), true),
  blob('ogden-act-appropriate-tech', useAppropriateTechStore, 'projectId-tagged', 1, tagged('items')),
  blob('ogden-fieldwork', useFieldworkStore, 'projectId-tagged', 1, tagged('entries', 'walkRoutes', 'punchList')),
  blob('ogden-field-tasks', useFieldTaskStore, 'projectId-tagged', 1, tagged('tasks')),
  blob('ogden-external-forces', useExternalForcesStore, 'projectId-tagged', 2, tagged('hazards', 'sectors'), true),
  blob('ogden-build-tasks', useBuildTaskStore, 'projectId-tagged', 1, tagged('tasks')),
  blob('ogden-act-network', useNetworkStore, 'projectId-tagged', 1, tagged('nodes')),
  blob('ogden-agribusiness', useAgribusinessStore, 'projectId-tagged', 2, agribusinessSelect, true),
  blob('ogden-monitoring-transects', useMonitoringTransectStore, 'projectId-tagged', 1, tagged('transects'), true),
  blob('ogden-ecological-notes', useEcologicalNoteStore, 'projectId-tagged', 1, tagged('notes'), true),
  blob('ogden-act-community-events', useCommunityEventStore, 'projectId-tagged', 1, tagged('events')),
  blob('ogden-comments', useCommentStore, 'projectId-tagged', 2, tagged('comments')),
  blob('ogden-act-maintenance', useMaintenanceStore, 'projectId-tagged', 1, tagged('tasks')),
  blob('ogden-flow-connectors', useFlowConnectorStore, 'projectId-tagged', 1, tagged('connectors'), true),
  blob('ogden-act-maintenance-log', useMaintenanceLogStore, 'projectId-tagged', 2, tagged('events')),
  blob('ogden-act-harvest-log', useHarvestLogStore, 'projectId-tagged', 1, tagged('entries')),
  blob('ogden-livestock-moves', useLivestockMoveLogStore, 'projectId-tagged', 3, tagged('events')),
  blob('ogden-portal', usePortalStore, 'projectId-tagged', 1, taggedFind('configs')),
  blob('ogden-act-pilots', usePilotPlotStore, 'projectId-tagged', 1, tagged('pilots')),
  blob('ogden-scenarios', useScenarioStore, 'projectId-tagged', 1, tagged('scenarios')),
  blob('ogden-scheduled-livestock-moves', useScheduledLivestockMoveStore, 'projectId-tagged', 2, tagged('plans')),
  blob('ogden-setback-rings', useSetbackStore, 'projectId-tagged', 1, tagged('rings'), true),
  blob('ogden-soil-samples', useSoilSampleStore, 'projectId-tagged', 1, tagged('samples'), true),
  blob('ogden-topography', useTopographyStore, 'projectId-tagged', 2, tagged('transects', 'contours', 'highPoints', 'drainageLines'), true),
  blob('ogden-templates', useTemplateStore, 'projectId-tagged', 1, tagged('customTemplates')),
  blob('ogden-utility-runs', useUtilityRunStore, 'projectId-tagged', 1, tagged('runs'), true),
  blob('ogden-utilities', useUtilityStore, 'projectId-tagged', 1, tagged('utilities'), true),
  blob('ogden-water-systems', useWaterSystemsStore, 'projectId-tagged', 1, tagged('earthworks', 'storageInfra', 'watercourses', 'waterNodes'), true),
];

/**
 * Deliberately device-local persisted `ogden-` stores. These hold
 * device/session/UI state that must NOT travel between devices. Mirrors the
 * `projectBundle.ts` non-portable scope (auth token and the bundle-exported
 * flag are plain localStorage keys, not `persist` stores, so they are out of
 * the scanner's contract and not listed here).
 */
export const DEVICE_GLOBAL: ReadonlySet<string> = new Set<string>([
  'ogden-ui',
  'ogden-connectivity',
  'ogden-atlas-matrix-toggles',
  'ogden-atlas-basemap',
]);
