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
import { useWorkItemStore } from '../store/workItemStore.js';
import { useCrewMemberStore } from '../store/crewMemberStore.js';
import { useWorkItemBudgetStore } from '../store/workItemBudgetStore.js';
import { useProofEventStore } from '../store/proofEventStore.js';
import { useObservationLogStore } from '../store/observationLogStore.js';
import { useLivestockStore } from '../store/livestockStore.js';
import { usePolycultureStore } from '../store/polycultureStore.js';
import { useCropStore } from '../store/cropStore.js';
import { useConventionalCropStore } from '../store/conventionalCropStore.js';
import { useVisionStore } from '../store/visionStore.js';
import { useNurseryStore } from '../store/nurseryStore.js';
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
import { useMaintenanceLogStore } from '../store/maintenanceLogStore.js';
import { useHarvestLogStore } from '../store/harvestLogStore.js';
import { useLivestockMoveLogStore } from '../store/livestockMoveLogStore.js';
import { usePortalStore } from '../store/portalStore.js';
import { usePilotPlotStore } from '../store/pilotPlotStore.js';
import { useScenarioStore } from '../store/scenarioStore.js';
import { useScheduledLivestockMoveStore } from '../store/scheduledLivestockMoveStore.js';
import { useLivestockWorkPlanStore } from '../store/livestockWorkPlanStore.js';
import { useCommunityWorkPlanStore } from '../store/communityWorkPlanStore.js';
import { useSetbackStore } from '../store/setbackStore.js';
import { useSoilSampleStore } from '../store/soilSampleStore.js';
import { useTopographyStore } from '../store/topographyStore.js';
import { useTemplateStore } from '../store/templateStore.js';
import { useUtilityRunStore } from '../store/utilityRunStore.js';
import { useWaterSystemsStore } from '../store/waterSystemsStore.js';
import { useRotationPlanStore } from '../store/rotationPlanStore.js';
import { useCompostCycleStore } from '../store/compostCycleStore.js';
import { useSuccessionPathStore } from '../store/successionPathStore.js';
import { useLandDesignStore } from '../store/landDesignStore.js';
import { usePlanImpactReviewStore } from '../store/planImpactReviewStore.js';
import { usePlanDecisionStore } from '../store/planDecisionStore.js';
import { usePlanWorkPackageStore } from '../store/planWorkPackageStore.js';
import { usePlanConflictReviewStore } from '../store/planConflictReviewStore.js';
import { usePlanVersionStore } from '../store/planVersionStore.js';
import { useObservationNeedStore } from '../store/observationNeedStore.js';
import { useTrueNorthStore } from '../store/trueNorthStore.js';
import { useActCompassStore } from '../store/actCompassStore.js';
import { useObserveCompassStore } from '../store/observeCompassStore.js';
import { usePlanCompassStore } from '../store/planCompassStore.js';
import { useObjectiveSummaryStore } from '../store/objectiveSummaryStore.js';
import { useStageGateOverrideStore } from '../store/stageGateOverrideStore.js';
import { useCyclicalReviewStore } from '../store/cyclicalReviewStore.js';
import { usePlanStratumProgressStore } from '../store/planStratumStore.js';
import { useFieldActionStore } from '../store/fieldActionStore.js';
import { useObserveFeedStore } from '../store/observeFeedStore.js';
import { useObserveDataPointStore } from '../store/observeDataPointStore.js';
import { useObserveCycleStore } from '../store/observeCycleStore.js';
import { usePresentationShareStore } from '../store/presentationShareStore.js';
import { usePlanRevisionDismissalStore } from '../store/planRevisionDismissalStore.js';
import { useObservationRecordStore } from '../store/olos/observationRecordStore.js';
import { useProofRecordStore } from '../store/olos/proofRecordStore.js';
import { useVerificationRecordStore } from '../store/olos/verificationRecordStore.js';
import { useActEvidenceStore } from '../store/actEvidenceStore.js';
import { useRealityCheckStore } from '../store/realityCheckStore.js';
import { useCoherenceCheckStore } from '../store/coherenceCheckStore.js';
import { useActMandateStore } from '../store/actMandateStore.js';
import { useLaunchMilestoneStore } from '../store/launchMilestoneStore.js';
import { usePlanConcernsStore } from '../store/planConcernsStore.js';
import { useReviewFlagStore } from '../store/reviewFlagStore.js';
import { useProtocolStore } from '../store/protocolStore.js';
import { usePlanTensionBannerStore } from '../store/planTensionBannerStore.js';
import { useStakeholderRegisterStore } from '../store/stakeholderRegisterStore.js';
import { useVegetationSurveyStore } from '../store/vegetationSurveyStore.js';
import { useSlopeSurveyStore } from '../store/slopeSurveyStore.js';
import {
  hydrologySurvey,
  soilSurvey,
  nutrientSurvey,
  pestSurvey,
  stockWaterSurvey,
  climateSurvey,
  infrastructureSurvey,
  landHealthSurvey,
  landscapeSurvey,
} from '../store/receptionSurveys.js';

export type SyncClassification =
  | 'typed-design-feature'
  | 'typed-table'
  | 'typed-record'
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

/**
 * Denormalised per-record tier/sort hints for the `typed-record` transport
 * (ADR 7 Phase 1). Mirrored onto `synced_records` columns so the queue and
 * server can tier/index without parsing the opaque payload. Every field is
 * best-effort — a record lacking it sends null.
 */
export interface SyncedRecordMeta {
  observedAt?: string | null;
  sourceType?: string | null;
  cycleId?: string | null;
  taskType?: string | null;
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
  /**
   * OPTIONAL append-only RECONCILE applier (F8). Same signature as
   * `applyForProject`, but instead of replacing the project bucket it MERGES
   * the incoming server slice with the locally-held one (union append-only logs
   * by id; OR/min-defined the singleton fields). Consumed ONLY by the
   * multi-device sync hydrate path (`hydrateProjectStateBlobs`), so two devices
   * that each edited a governance log offline keep BOTH sides on reconcile
   * instead of last-writer-wins clobber.
   *
   * `applyForProject` (whole-bucket REPLACE) is deliberately left untouched so
   * the two contracts that depend on replace semantics keep holding: the P0-1
   * `select`↔`apply` round-trip, and `restorePlanSnapshot`'s documented
   * destructive OVERWRITE. Absent ⇒ the hydrate path falls back to
   * `applyForProject` (the existing behaviour for every other blob store).
   */
  reconcileForProject?: (
    store: { getState: () => unknown; setState: (p: unknown) => void },
    projectId: string,
    incoming: unknown,
  ) => void;
  /**
   * `typed-record` only: enumerate this project's records as
   * `{ recordId, record, meta }` triples. `recordId` is the stable per-record
   * sync key (an array element's `id`, or the inner map key for keyed-map
   * stores like observe-cycles). `meta` carries the denormalised tier hints.
   * Total — never throws; an empty/unknown project yields `[]`.
   */
  selectRecordsForProject?: (
    state: unknown,
    projectId: string,
  ) => Array<{ recordId: string; record: unknown; meta?: SyncedRecordMeta }>;
  /**
   * Inverse of `selectRecordsForProject`: upsert ONE hydrated server record
   * (by `recordId`) into the live store for `projectId`, leaving every other
   * record and every other project untouched. Goes through `setState` so the
   * `isSyncing` guard suppresses a write-through bounce.
   */
  applyRecordForProject?: (
    store: { getState: () => unknown; setState: (p: unknown) => void },
    projectId: string,
    recordId: string,
    incoming: unknown,
  ) => void;
  /**
   * `typed-record` only, OPT-IN: one-time hydrate fallback for stores
   * promoted from versioned-blob (e.g. `ogden-work-items`, 2026-06-12).
   * When `hydrateTypedRecords` finds ZERO `synced_records` rows for this
   * store, it reads the now-inert `project_state_blobs` row once and applies
   * it through this applier, so a fresh device doesn't hydrate an empty
   * store before the data-holding device's first per-record push. The blob
   * is never written again; stores without this field keep the
   * abandon-silently precedent (`ogden-paths`).
   */
  applyBlobFallbackForProject?: (
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
  /**
   * OPTIONAL multi-device reconcile applier (F8). When present it is surfaced as
   * the descriptor's `reconcileForProject` and used by the sync hydrate path
   * INSTEAD of `apply` (replace). Snapshot-restore and the P0-1 round-trip keep
   * using `apply`. Absent ⇒ hydrate falls back to `apply` (every other store).
   */
  reconcile?: Applier;
}

/** Attach an append-only reconcile applier to an existing replace-shape. */
const withReconcile = (shape: BlobShape, reconcile: Applier): BlobShape => ({
  ...shape,
  reconcile,
});

/** Earliest-defined wins: the original crossing/seal time stands across devices. */
const minDefined = (a: unknown, b: unknown): unknown => {
  if (a == null) return b;
  if (b == null) return a;
  return (a as number) <= (b as number) ? a : b;
};

/**
 * Reconcile applier for a byProject ARRAY bucket (append-only log): UNION the
 * incoming slice with the locally-held one by `idField` rather than replacing
 * it, so two devices that each appended offline keep BOTH sides. On an id
 * collision `rank` picks the winner (higher wins; incoming wins ties, so a
 * remote record that advanced its lifecycle is not lost). Rows missing the id
 * field are preserved verbatim. `order` gives a deterministic final ordering so
 * the two devices converge on an identical array regardless of merge direction.
 */
const unionListReconcile =
  (
    record: string,
    idField: string,
    rank: (row: any) => number,
    order: (row: any) => number,
  ): Applier =>
  (store, pid, incoming) =>
    store.setState((st: any) => {
      const rec = { ...((st?.[record] as any) ?? {}) };
      const mine: any[] = Array.isArray(rec[pid]) ? rec[pid] : [];
      const inc: any[] = Array.isArray(incoming) ? incoming : [];
      const byId = new Map<string, any>();
      const noId: any[] = [];
      for (const row of [...mine, ...inc]) {
        const id = row?.[idField];
        if (id == null) {
          noId.push(row);
          continue;
        }
        const key = String(id);
        const held = byId.get(key);
        if (held == null || rank(row) >= rank(held)) byId.set(key, row);
      }
      const merged = [...byId.values(), ...noId].sort(
        (a, b) => order(a) - order(b),
      );
      rec[pid] = merged;
      return { [record]: rec };
    });

/**
 * Reconcile applier for a byProject OBJECT bucket (singleton record): pass every
 * field through (`{...mine, ...inc}`, incoming wins) EXCEPT the named fields,
 * which are merged by their merger. A named field is written ONLY when at least
 * one side actually carries it, so a synthetic payload (P0-1 fixtures) bearing
 * none of the schema fields passes through untouched.
 */
const mergeRecordReconcile =
  (
    record: string,
    mergers: Record<string, (mine: any, inc: any) => any>,
  ): Applier =>
  (store, pid, incoming) =>
    store.setState((st: any) => {
      const rec = { ...((st?.[record] as any) ?? {}) };
      const mine =
        rec[pid] && typeof rec[pid] === 'object' ? (rec[pid] as any) : {};
      const inc =
        incoming && typeof incoming === 'object' ? (incoming as any) : {};
      const merged: any = { ...mine, ...inc };
      for (const [field, mergeFn] of Object.entries(mergers)) {
        if (!(field in mine) && !(field in inc)) continue;
        merged[field] = mergeFn(mine[field], inc[field]);
      }
      rec[pid] = merged;
      return { [record]: rec };
    });

/** Union two append-only amendment logs by `itemId` (each item resolved once,
 *  frozen), ordered by `resolvedAt` for deterministic cross-device convergence. */
const unionAmendments = (a: unknown, b: unknown): any[] => {
  const byItem = new Map<string, any>();
  const all = [
    ...(Array.isArray(a) ? a : []),
    ...(Array.isArray(b) ? b : []),
  ];
  for (const am of all) {
    const id = (am as any)?.itemId;
    if (id == null) continue;
    if (!byItem.has(String(id))) byItem.set(String(id), am); // append-only/frozen
  }
  return [...byItem.values()].sort(
    (x, y) => ((x as any)?.resolvedAt ?? 0) - ((y as any)?.resolvedAt ?? 0),
  );
};

/** Lifecycle rank for a PlanConcern so a remote resolution wins over a local
 *  still-raised copy of the same id. raised < under-review < terminal. */
const concernRank = (c: any): number =>
  c?.status === 'approved' || c?.status === 'declined'
    ? 2
    : c?.status === 'under-review'
      ? 1
      : 0;

/** F8 reconcile appliers for the three Threshold governance logs. */
const planConcernsReconcile: Applier = unionListReconcile(
  'byProject',
  'id',
  concernRank,
  (c) => c?.timestamp ?? 0,
);
const actMandateReconcile: Applier = mergeRecordReconcile('byProject', {
  // The original crossing stands; once armed anywhere, the lock stays armed;
  // the per-objective lift windows union (a lifted objective stays writable).
  mandatedAt: (a, b) => minDefined(a, b),
  planReadOnly: (a, b) => Boolean(a) || Boolean(b),
  objectiveOverrides: (a, b) => ({ ...(a ?? {}), ...(b ?? {}) }),
});
const coherenceCheckReconcile: Applier = mergeRecordReconcile('byProject', {
  // Resolutions shallow-merge by itemId (append-only/frozen); the amendments
  // log unions by itemId; the original seal time stands.
  itemResolutions: (a, b) => ({ ...(a ?? {}), ...(b ?? {}) }),
  amendments: (a, b) => unionAmendments(a, b),
  sealedAt: (a, b) => minDefined(a, b),
});

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
      // Guard: a 404/empty server bucket can hand back `undefined`. Persisting
      // that into the project bucket leaves downstream renderers calling
      // `.map`/`.filter` on undefined and crashing the Vite overlay. Fall back
      // to the registered `empty` so the store always holds a usable shape.
      // Mirrors the `Array.isArray(inc) ? inc : []` guard in `tagged.apply`.
      const safe = incoming ?? empty;
      if (leaf) rec[pid] = { ...(rec[pid] ?? {}), [leaf]: safe };
      else rec[pid] = safe;
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

/**
 * observation-needs carries TWO byProject record maps (run state +
 * steward-raised needs); both slices are owned by the same projectId.
 */
const observationNeedsShape: BlobShape = {
  select: (s, pid) => ({
    byProject: (s as any)?.byProject?.[pid] ?? {},
    createdByProject: (s as any)?.createdByProject?.[pid] ?? [],
  }),
  apply: (store, pid, incoming) =>
    store.setState((st: any) => {
      const inc = (incoming as any) ?? {};
      return {
        byProject: { ...((st?.byProject as any) ?? {}), [pid]: inc.byProject ?? {} },
        createdByProject: {
          ...((st?.createdByProject as any) ?? {}),
          [pid]: inc.createdByProject ?? [],
        },
      };
    }),
};

/**
 * plan-tier-progress carries TWO byProject record maps (per-objective
 * checklist completion + tier-unlock celebration log); both slices are
 * owned by the same projectId. Same pattern as observationNeedsShape.
 */
const planStratumShape: BlobShape = {
  select: (s, pid) => ({
    byProject: (s as any)?.byProject?.[pid] ?? {},
    celebratedByProject: (s as any)?.celebratedByProject?.[pid] ?? [],
  }),
  apply: (store, pid, incoming) =>
    store.setState((st: any) => {
      const inc = (incoming as any) ?? {};
      return {
        byProject: { ...((st?.byProject as any) ?? {}), [pid]: inc.byProject ?? {} },
        celebratedByProject: {
          ...((st?.celebratedByProject as any) ?? {}),
          [pid]: inc.celebratedByProject ?? [],
        },
      };
    }),
};

/**
 * objective-summaries nests project UNDER stage (`byStage[stage][projectId]`),
 * so a project's slice spans every stage. Extract/restore that project's row
 * across all stages, leaving other projects' rows untouched.
 */
const objectiveSummaryShape: BlobShape = {
  select: (s, pid) => {
    const byStage = (s as any)?.byStage ?? {};
    const out: Record<string, unknown> = {};
    for (const stage of Object.keys(byStage)) {
      const proj = byStage[stage]?.[pid];
      if (proj !== undefined) out[stage] = proj;
    }
    return out;
  },
  apply: (store, pid, incoming) =>
    store.setState((st: any) => {
      const byStage = { ...((st?.byStage as any) ?? {}) };
      const inc = (incoming as any) ?? {};
      for (const stage of Object.keys(inc)) {
        byStage[stage] = { ...((byStage[stage] as any) ?? {}), [pid]: inc[stage] };
      }
      return { byStage };
    }),
};

/**
 * act-evidence carries TWO byProject record maps (per-objective evidence
 * capture + per-form vision text); both slices are owned by the same projectId.
 * Same pattern as observationNeedsShape / planStratumShape.
 */
const actEvidenceShape: BlobShape = {
  select: (s, pid) => ({
    byProject: (s as any)?.byProject?.[pid] ?? {},
    visionForms: (s as any)?.visionForms?.[pid] ?? {},
  }),
  apply: (store, pid, incoming) =>
    store.setState((st: any) => {
      const inc = (incoming as any) ?? {};
      return {
        byProject: { ...((st?.byProject as any) ?? {}), [pid]: inc.byProject ?? {} },
        visionForms: {
          ...((st?.visionForms as any) ?? {}),
          [pid]: inc.visionForms ?? {},
        },
      };
    }),
};

/**
 * protocols mixes TWO projectId-tagged arrays (lifecycle `records` + append-only
 * `activations`) with TWO byProject maps (`expectationsByProject` +
 * `instantiatedObjectiveIds`). Same mixed-shape pattern as agribusinessSelect:
 * filter the tagged arrays to this project, pick this project's map rows, and
 * restore each without disturbing other projects.
 */
const protocolShape: BlobShape = {
  select: (s, pid) => {
    const st = s as any;
    const pick = (f: string) =>
      Array.isArray(st?.[f]) ? st[f].filter((x: any) => x?.projectId === pid) : [];
    return {
      records: pick('records'),
      activations: pick('activations'),
      expectationsByProject: st?.expectationsByProject?.[pid] ?? {},
      instantiatedObjectiveIds: st?.instantiatedObjectiveIds?.[pid] ?? [],
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
        records: repl('records'),
        activations: repl('activations'),
        expectationsByProject: {
          ...((st?.expectationsByProject as any) ?? {}),
          [pid]: inc.expectationsByProject ?? {},
        },
        instantiatedObjectiveIds: {
          ...((st?.instantiatedObjectiveIds as any) ?? {}),
          [pid]: inc.instantiatedObjectiveIds ?? [],
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
    reconcileForProject: shape.reconcile as
      | SyncedStoreDescriptor['reconcileForProject']
      | undefined,
  };
}

/**
 * A typed-record shape: how to enumerate this project's records as
 * `{ recordId, record, meta }` triples (`selectRecords`) and how to upsert ONE
 * hydrated server record back by `recordId` without disturbing other records
 * or other projects (`applyRecord`). `applyRecord` always goes through
 * `setState((st) => patch)` so the `isSyncing` guard suppresses a write-through
 * bounce — exactly like `BlobShape.apply`.
 */
interface RecordShape {
  selectRecords: (
    state: any,
    projectId: string,
  ) => Array<{ recordId: string; record: unknown; meta?: SyncedRecordMeta }>;
  applyRecord: (
    store: StoreApi,
    projectId: string,
    recordId: string,
    incoming: unknown,
  ) => void;
}

/**
 * Best-effort denormalised tier hints pulled from a record without knowing its
 * concrete type. The authoritative copy lives inside the record (the payload);
 * these are mirrored onto `synced_records` columns so the queue (Phase 2) can
 * tier and the server can index without parsing the blob. Lenient by design —
 * a field the record lacks resolves to null. `capturedAt` (Observe) and
 * `sourceObjectiveType` (Observe data points) are accepted as aliases for the
 * canonical `observedAt` / `sourceType`.
 */
function extractRecordMeta(rec: any): SyncedRecordMeta {
  const observedAt =
    typeof rec?.observedAt === 'string'
      ? rec.observedAt
      : typeof rec?.capturedAt === 'string'
        ? rec.capturedAt
        : null;
  const sourceType =
    typeof rec?.sourceType === 'string'
      ? rec.sourceType
      : typeof rec?.sourceObjectiveType === 'string'
        ? rec.sourceObjectiveType
        : null;
  return {
    observedAt,
    sourceType,
    cycleId: rec?.cycleId != null ? String(rec.cycleId) : null,
    taskType: typeof rec?.taskType === 'string' ? rec.taskType : null,
  };
}

/**
 * typed-record shape for a `byProject` ARRAY store (`Record<projectId, T[]>`,
 * each `T` carrying a stable `id`). recordId = `String(record.id)`. Mirrors
 * `byKey('byProject', null, [])` on the read side, but emits one entry per
 * element instead of the whole array. Records without an `id` are skipped on
 * select (they have no stable sync key) and never block the rest.
 */
function recordArray(): RecordShape {
  return {
    selectRecords: (state, pid) => {
      const list = (state?.byProject?.[pid] as any[]) ?? [];
      return list
        .filter((rec) => rec != null && rec.id != null)
        .map((rec) => ({
          recordId: String(rec.id),
          record: rec,
          meta: extractRecordMeta(rec),
        }));
    },
    applyRecord: (store, pid, recordId, incoming) =>
      store.setState((st: any) => {
        const byProject = { ...((st?.byProject as any) ?? {}) };
        const list = [...((byProject[pid] as any[]) ?? [])];
        const idx = list.findIndex((r) => String(r?.id) === recordId);
        if (idx >= 0) list[idx] = incoming;
        else list.push(incoming);
        byProject[pid] = list;
        return { byProject };
      }),
  };
}

/**
 * typed-record shape for a `byProject` KEYED-MAP store
 * (`Record<projectId, Record<recordKey, V>>`). recordId = the inner map key —
 * observe-cycles keys per-domain cycle state by domainId, so recordId is the
 * domainId. `cycleIdField` names the field on `V` to denormalise as the
 * `cycle_id` hint (observe-cycles -> `currentCycleId`).
 */
function recordKeyedMap(cycleIdField?: string): RecordShape {
  return {
    selectRecords: (state, pid) => {
      const map = (state?.byProject?.[pid] as Record<string, any>) ?? {};
      return Object.entries(map)
        .filter(([, value]) => value != null)
        .map(([recordId, value]) => ({
          recordId,
          record: value,
          meta: {
            cycleId:
              cycleIdField != null && value?.[cycleIdField] != null
                ? String(value[cycleIdField])
                : null,
          },
        }));
    },
    applyRecord: (store, pid, recordId, incoming) =>
      store.setState((st: any) => {
        const byProject = { ...((st?.byProject as any) ?? {}) };
        byProject[pid] = { ...((byProject[pid] as any) ?? {}), [recordId]: incoming };
        return { byProject };
      }),
  };
}

/**
 * typed-record shape for a `byProject` KEYED-MAP store whose inner key is NOT
 * the record's sync id — the olos observation store keys
 * `byProject[pid][objectiveId]`, but the record's stable sync id is `value.id`
 * (a server uuid, or a local `obs-…` draft id). recordId = `String(value.id)`
 * so the wire/queue/conflict identity is the row id (matching the server's
 * uuid PK), while the store stays keyed by `objectiveId` for O(1) workspace
 * lookup.
 *
 * `applyRecord` reconciles by the record id: it replaces whichever inner entry
 * already carries `.id === recordId` (the in-place update / local-draft→server
 * rekey case, since the objective slot is stable), else inserts the incoming
 * record under its own `objectiveId`. The local draft and its server copy share
 * one `objectiveId` slot, so a rekey never leaves an orphan.
 */
function recordByInnerField(innerIdField: string): RecordShape {
  return {
    selectRecords: (state, pid) => {
      const map = (state?.byProject?.[pid] as Record<string, any>) ?? {};
      return Object.values(map)
        .filter((value) => value != null && value.id != null)
        .map((value) => ({
          recordId: String(value.id),
          record: value,
          meta: extractRecordMeta(value),
        }));
    },
    applyRecord: (store, pid, recordId, incoming) =>
      store.setState((st: any) => {
        const byProject = { ...((st?.byProject as any) ?? {}) };
        const project = { ...((byProject[pid] as Record<string, any>) ?? {}) };
        const existingKey = Object.keys(project).find(
          (k) => String(project[k]?.id) === recordId,
        );
        const key =
          existingKey ?? String((incoming as any)?.[innerIdField] ?? recordId);
        project[key] = incoming;
        byProject[pid] = project;
        return { byProject };
      }),
  };
}

/**
 * typed-record shape for a `projectId-tagged` FLAT-ARRAY store
 * (`state[field]: T[]`, each `T` carrying `projectId` + a stable `id`).
 * The per-record analogue of `tagged(field)`: select enumerates only this
 * project's rows (recordId = `String(record.id)`); apply upserts ONE row by
 * id, leaving every other row — including other projects' — untouched.
 *
 * Meta is built inline rather than via `extractRecordMeta` because tagged
 * spine rows (WorkItem) denormalise differently: `observed_at` ← `updatedAt`
 * (bumped on every store mutation, so per-record LWW tracks true edit
 * recency), `source_type` ← `source` (e.g. 'livestock-plan',
 * 'rotation-sequence'), `task_type` ← top-level `category`. All best-effort
 * — a row lacking a field sends null.
 */
function recordTaggedArray(field: string): RecordShape {
  return {
    selectRecords: (state, pid) => {
      const arr = ((state as any)?.[field] as any[]) ?? [];
      return (Array.isArray(arr) ? arr : [])
        .filter((rec) => rec != null && rec.id != null && rec.projectId === pid)
        .map((rec) => ({
          recordId: String(rec.id),
          record: rec,
          meta: {
            observedAt: typeof rec.updatedAt === 'string' ? rec.updatedAt : null,
            sourceType: typeof rec.source === 'string' ? rec.source : null,
            cycleId: null,
            taskType: typeof rec.category === 'string' ? rec.category : null,
          },
        }));
    },
    applyRecord: (store, _pid, recordId, incoming) =>
      store.setState((st: any) => {
        const list = [...(((st?.[field] as any[]) ?? []) as any[])];
        const idx = list.findIndex((r) => String(r?.id) === recordId);
        if (idx >= 0) list[idx] = incoming;
        else list.push(incoming);
        return { [field]: list };
      }),
  };
}

/**
 * typed-record registration helper — the per-record analogue of `blob()`.
 * `schemaVersion` MUST match the store's persist `version` so the hydrate-side
 * version-skew guard stays correct (e.g. field-actions is persist v3 after the
 * Phase-0 + Stratum-rename bumps).
 */
function record(
  storeKey: string,
  store: { getState: () => unknown; subscribe: (...a: any[]) => any },
  scope: StoreScope,
  schemaVersion: number,
  shape: RecordShape,
  usesTemporal = false,
  blobFallback?: BlobShape,
): SyncedStoreDescriptor {
  return {
    storeKey,
    classification: 'typed-record',
    scope,
    schemaVersion,
    usesTemporal,
    store: store as unknown as VersionedBlobStoreHandle,
    selectRecordsForProject: shape.selectRecords,
    applyRecordForProject:
      shape.applyRecord as SyncedStoreDescriptor['applyRecordForProject'],
    ...(blobFallback
      ? {
          applyBlobFallbackForProject:
            blobFallback.apply as SyncedStoreDescriptor['applyBlobFallbackForProject'],
        }
      : {}),
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
  // ogden-paths promoted from versioned-blob → typed design_features
  // (featureType `path`) on 2026-05-22 so access paths are server-queryable
  // and appear in the master-plan PDF feature roster. Transport lives in
  // syncService (subscribeToPaths + mergeDesignFeatures), not the blob loop.
  { storeKey: 'ogden-paths', classification: 'typed-design-feature' },
  // ogden-utilities promoted from versioned-blob → typed design_features
  // (featureType `point`) on 2026-05-22 so utility points are server-queryable
  // and appear in the master-plan PDF feature roster. Transport lives in
  // syncService (subscribeToUtilities + mergeDesignFeatures), not the blob loop.
  // Note: ogden-utility-runs (connector lines) stays a versioned-blob — it is
  // not the PDC "utility points" deliverable.
  { storeKey: 'ogden-utilities', classification: 'typed-design-feature' },

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
  // ogden-atlas-design-elements reclassified typed-design-feature →
  // versioned-blob on 2026-05-22: it was on the typed path but NO transport
  // was ever wired (silent no-sync). It has no design_features mapper and is
  // not a PDC roster deliverable, so an opaque per-(project,storeKey) blob is
  // the correct transport. byProject Record<projectId, DesignElement[]>, v2.
  blob('ogden-atlas-design-elements', useLandDesignStore, 'byProject', 2, byKey('byProject', null, [])),
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
  // Plan Impact Reviews (Phase 1): persisted triage state for derived
  // Observe→Plan impact flags. byProject Record<projectId, Record<flagId, run>>.
  blob('ogden-plan-impact-reviews', usePlanImpactReviewStore, 'byProject', 1, byKey('byProject', null, {})),
  // Plan Decision Log (Phase 2): authored decision records behind review verbs.
  // byProject Record<projectId, Record<decisionId, PlanDecision>>.
  blob('ogden-plan-decisions', usePlanDecisionStore, 'byProject', 1, byKey('byProject', null, {})),
  // Plan Work Packages (Phase 3): authored field-work records handed from
  // accepted decisions to Act. byProject Record<projectId, Record<pkgId, PlanWorkPackage>>.
  blob('ogden-plan-work-packages', usePlanWorkPackageStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-plan-conflict-reviews', usePlanConflictReviewStore, 'byProject', 1, byKey('byProject', null, {})),
  // Plan Versions (Phase 5b): authored point-in-time snapshots of the whole
  // plan. byProject Record<projectId, Record<versionId, PlanVersion>>. The
  // snapshot engine (planSnapshot.ts) SKIPS this storeKey during capture so a
  // version never contains the version history (no recursion/bloat).
  blob('ogden-plan-versions', usePlanVersionStore, 'byProject', 1, byKey('byProject', null, {})),
  // Observation needs: per-project run state + steward-raised needs (two
  // byProject maps), custom shape extracts/restores both for one project.
  blob('ogden-observation-needs', useObservationNeedStore, 'byProject', 3, observationNeedsShape),
  // True North fit-gate profile, one TrueNorthProfile per project.
  blob('ogden-true-north', useTrueNorthStore, 'byProject', 1, byKey('profilesByProject', null, {})),
  // Stage Compass evidence-gating maps (byProject Record<projectId,
  // Partial<Record<module, RawEvidenceMap>>>). SEED is a read-time fallback,
  // not persisted, so syncing the byProject overrides is correct.
  blob('ogden-atlas-act-compass', useActCompassStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-atlas-observe-compass', useObserveCompassStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-atlas-plan-compass', usePlanCompassStore, 'byProject', 1, byKey('byProject', null, {})),
  // Objective summary notes nested byStage→byProject→byModule, custom shape.
  blob('ogden-atlas-objective-summaries', useObjectiveSummaryStore, 'byProject', 1, objectiveSummaryShape),
  // Soft stage-gate "continue anyway" overrides, byProject.
  blob('ogden-atlas-stage-gate-override', useStageGateOverrideStore, 'byProject', 1, byKey('byProject', null, {})),

  // --- versioned-blob: projectId-tagged (flat arrays carrying projectId) ---
  blob('ogden-regen-plans', useRegenerationPlanStore, 'projectId-tagged', 2, tagged('plans'), true),
  blob('ogden-ecology', useEcologyStore, 'projectId-tagged', 3, tagged('ecology'), true),
  blob('ogden-pastures', usePastureStore, 'projectId-tagged', 1, tagged('pastures'), true),
  blob('ogden-swot', useSwotStore, 'projectId-tagged', 1, tagged('swot'), true),
  blob('ogden-phases', usePhaseStore, 'projectId-tagged', 3, tagged('phases')),
  // ogden-work-items promoted versioned-blob → typed-record on 2026-06-12
  // (ADR 2026-06-12-atlas-work-items-typed-record-transport): the work spine
  // gets per-row LWW with steward-escalated conflicts (failed_records) instead
  // of silent whole-blob loss, plus queryable observed_at/source_type/
  // task_type columns. Transport-only — the client store stays source of
  // truth; confirmProposal/fulfilWorkItem remain the only writers. The
  // tagged('items') blob shape rides along as the one-time hydrate fallback
  // for pre-promotion server blobs (migratedSources stays device-local, as it
  // always was — the blob shape never synced it either).
  record('ogden-work-items', useWorkItemStore, 'projectId-tagged', 4, recordTaggedArray('items'), false, tagged('items')),
  blob('ogden-crew-members', useCrewMemberStore, 'projectId-tagged', 1, tagged('members')),
  blob('ogden-work-item-actuals', useWorkItemBudgetStore, 'projectId-tagged', 1, tagged('actuals')),
  blob('ogden-work-item-proof', useProofEventStore, 'projectId-tagged', 1, tagged('events')),
  blob('ogden-observation-log', useObservationLogStore, 'projectId-tagged', 1, tagged('records')),
  blob('ogden-livestock', useLivestockStore, 'projectId-tagged', 1, tagged('paddocks', 'fenceLines'), true),
  blob('ogden-polyculture', usePolycultureStore, 'projectId-tagged', 3, tagged('guilds', 'species'), true),
  blob('ogden-crops', useCropStore, 'projectId-tagged', 3, tagged('cropAreas'), true),
  blob('ogden-conventional-crops', useConventionalCropStore, 'projectId-tagged', 1, tagged('conventionalCrops'), true),
  blob('ogden-vision', useVisionStore, 'projectId-tagged', 3, taggedFind('visions')),
  blob('ogden-nursery', useNurseryStore, 'projectId-tagged', 1, tagged('batches', 'transfers')),
  blob('ogden-human-context', useHumanContextStore, 'projectId-tagged', 1, tagged('neighbours', 'households', 'accessRoads', 'permacultureZones'), true),
  blob('ogden-enterprises', useEnterpriseStore, 'projectId-tagged', 1, tagged('enterprises')),
  blob('ogden-versions', useVersionStore, 'projectId-tagged', 1, tagged('snapshots')),
  blob('ogden-closed-loop', useClosedLoopStore, 'projectId-tagged', 2, tagged('materialFlows', 'wasteVectorRuns', 'fertilityInfra'), true),
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
  blob('ogden-act-maintenance-log', useMaintenanceLogStore, 'projectId-tagged', 2, tagged('events')),
  blob('ogden-act-harvest-log', useHarvestLogStore, 'projectId-tagged', 1, tagged('entries')),
  blob('ogden-livestock-moves', useLivestockMoveLogStore, 'projectId-tagged', 3, tagged('events')),
  blob('ogden-portal', usePortalStore, 'projectId-tagged', 1, taggedFind('configs')),
  blob('ogden-act-pilots', usePilotPlotStore, 'projectId-tagged', 1, tagged('pilots')),
  blob('ogden-scenarios', useScenarioStore, 'projectId-tagged', 1, tagged('scenarios')),
  blob('ogden-scheduled-livestock-moves', useScheduledLivestockMoveStore, 'projectId-tagged', 2, tagged('plans')),
  blob('ogden-livestock-work-plan', useLivestockWorkPlanStore, 'projectId-tagged', 1, tagged('rules', 'proposals')),
  blob('ogden-community-work-plan', useCommunityWorkPlanStore, 'projectId-tagged', 1, tagged('rules', 'proposals')),
  blob('ogden-setback-rings', useSetbackStore, 'projectId-tagged', 1, tagged('rings'), true),
  blob('ogden-soil-samples', useSoilSampleStore, 'projectId-tagged', 1, tagged('samples'), true),
  blob('ogden-topography', useTopographyStore, 'projectId-tagged', 2, tagged('transects', 'contours', 'highPoints', 'drainageLines'), true),
  blob('ogden-templates', useTemplateStore, 'projectId-tagged', 1, tagged('customTemplates')),
  blob('ogden-utility-runs', useUtilityRunStore, 'projectId-tagged', 1, tagged('runs'), true),
  blob('ogden-water-systems', useWaterSystemsStore, 'projectId-tagged', 1, tagged('earthworks', 'storageInfra', 'watercourses', 'waterNodes'), true),

  // --- B-series additive design slices (byProject / projectId-tagged) ---
  blob('ogden-rotation-plan', useRotationPlanStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-compost-cycle', useCompostCycleStore, 'byProject', 1, byKey('byProject', null, [])),
  blob('ogden-succession-path', useSuccessionPathStore, 'byProject', 1, byKey('byProject', null, {})),

  // --- OLOS Plan-tier substrate (Phase 1) ---
  // Per-objective checklist completion + per-tier celebration log, both
  // keyed by projectId. Custom shape (planStratumShape) carries both maps
  // for one project together. v3 matches the store's persist version
  // (v1->v2 backfilled celebratedByProject; v2->v3 renumbered to Stratum 1-7).
  blob('ogden-plan-tier-progress', usePlanStratumProgressStore, 'byProject', 3, planStratumShape),
  // Cyclical-review records keyed by (projectId, objectiveId). Tracks
  // lastReviewedAt / reviewMode / lastDecisionConfirmedAt per objective.
  // v2 matches the persist version (v1->v2 renumbered objective keys to Stratum).
  blob('ogden-cyclical-review', useCyclicalReviewStore, 'byProject', 2, byKey('byProject', null, {})),

  // --- OLOS Act field actions (Phase 3 Slice 3.1; typed-record ADR 7 P1) ---
  // FieldAction is a new entity (locked decision: not a WorkItem extension).
  // `typed-record` (ADR 7 Phase 1): each FieldAction syncs as its own typed op
  // (recordId = action.id) on the `synced_records` table, carrying its own rev
  // + denormalised cycleId/sourceType/taskType — replacing the opaque
  // per-project blob so the 5-tier queue (Phase 2) can tier by semantics.
  // schemaVersion 3 mirrors the store's persist version (v1->v2 Phase 0 fields;
  // v2->v3 Stratum rename: tierId -> stratumId + slug renumber).
  record('ogden-field-actions', useFieldActionStore, 'byProject', 3, recordArray()),

  // --- OLOS Observe feed (Phase 3 Slice 3.5) ---
  // Lightweight per-project append-only feed of verified/diverged events
  // from the Act state machine. Plan Revision Banner + tier divergence
  // indicator consume this. Phase 4 will normalise into the canonical
  // ObservationRecord substrate; today this is the working surface.
  // `typed-record` (ADR 7 P1): each feed event syncs per-record (recordId = event.id).
  // schemaVersion 2 mirrors the persist version (v1->v2 renumbered feedKey to Stratum).
  record('ogden-observe-feed', useObserveFeedStore, 'byProject', 2, recordArray()),

  // --- OLOS Observe Dashboard substrate (Phase 4 Slice 4.1) ---
  // Per-project ObserveDataPoint rows. New captures auto-supersede same-
  // domain neighbours within the per-domain proximity radius. The "Not a
  // replacement" CTA restores both. `typed-record` (ADR 7 P1): each data
  // point syncs per-record (recordId = point.id) on `synced_records`,
  // denormalising capturedAt -> observed_at + sourceType for Phase 2 tiering.
  record('ogden-observe-data-points', useObserveDataPointStore, 'byProject', 1, recordArray()),

  // --- OLOS Observe cycle counters (Phase 4 Slice 4.1) ---
  // Per (project, domain) monotonic cycleId + append-only history of
  // advance events. Cycles advance only via `confirmDecision` /
  // `acknowledgeRevise` (wired in Slice 4.5). New captures stamp with
  // the current cycleId so the Temporal Layer can annotate the x-axis.
  // Payload is `Record<domainId, ObserveDomainCycleState>` per project — a
  // KEYED MAP, so `typed-record` (ADR 7 P1) keys each record by domainId
  // (recordId = domainId) and denormalises currentCycleId -> cycle_id.
  record('ogden-observe-cycles', useObserveCycleStore, 'byProject', 1, recordKeyedMap('currentCycleId')),

  // --- OLOS Observe presentation shares (Phase 4 Slice 4.1) ---
  // Per-project list of token-based share links for Presentation Mode.
  // 32-char tokens persisted client-side; viewer route resolves by
  // iterating projects. Server endpoint deferred per Phase 4 locked
  // decision; the per-project metadata field carries a sync-mirrorable
  // copy so shares survive device migration.
  blob('ogden-observe-shares', usePresentationShareStore, 'byProject', 1, byKey('byProject', null, [])),

  // --- OLOS Plan Revision Banner dismissal cursor (Phase 4 Slice 4.4) ---
  // Per-project ISO timestamp marking the moment the steward last
  // dismissed the banner. The banner re-surfaces when a newer Observe
  // event (capture, divergence, freshness change) arrives. A single
  // string per project fits byKey('byProject', null, '').
  blob('ogden-plan-revision-dismissals', usePlanRevisionDismissalStore, 'byProject', 1, byKey('byProject', null, '')),

  // --- OLOS canonical record substrate (Phase 3B; full rev parity) ---
  // The three olos record domains join the typed-record transport so they get
  // real-time broadcast, reconnect delta-pull, and the 409 keep-mine/keep-server
  // surface (mirroring the Act path). Unlike Act records (opaque synced_records
  // blobs), the canonical data stays single-sourced in the olos_* tables with a
  // server `rev` column (migration 053); the push flush in syncService routes
  // these storeKeys to the domain REST endpoints rather than the generic
  // synced_records PUT. All gated behind FLAGS.SYNC_STATE_BLOBS (default OFF).
  //
  // observation: byProject[pid][objectiveId], but the sync id is record.id (a
  // server uuid / local `obs-…` draft) → recordByInnerField('objectiveId').
  // schemaVersion 1 mirrors the store persist version AND OLOS_SCHEMA_VERSION.
  record('ogden-olos-observation-records', useObservationRecordStore, 'byProject', 1, recordByInnerField('objectiveId')),
  // proof / verification: byProject[pid][id] keyed by the record id directly →
  // the existing recordKeyedMap() (recordId = inner key = row id).
  record('ogden-olos-proof-records', useProofRecordStore, 'byProject', 1, recordKeyedMap()),
  record('ogden-olos-verification-records', useVerificationRecordStore, 'byProject', 1, recordKeyedMap()),

  // --- Act tier-shell evidence capture + Protocol/Review-flag substrate ---
  // Per-objective evidence capture (photos/confirms/notes) + per-form vision
  // text, two byProject maps owned by one project. No server table → opaque
  // versioned-blob. v1 matches the persist version.
  blob('ogden-act-evidence', useActEvidenceStore, 'byProject', 1, actEvidenceShape),
  // ObjectiveReviewFlag records raised by the deviation engine, byProject
  // Record<projectId, ObjectiveReviewFlag[]>. Records carry ids but have no
  // dedicated typed-record transport (no server table/endpoint), so the
  // generic byProject blob is the correct path. v1 matches the persist version.
  blob('ogden-review-flags', useReviewFlagStore, 'byProject', 1, byKey('byProject', null, [])),
  // Threshold 1 (The Reality Check) steward state: one ProjectRealityCheck per
  // project (phase1Ready + strandFindings + classifications + planningDirection
  // text + approvedAt). Client-only IndexedDB, no server table -> opaque
  // byProject versioned-blob. v1 matches the persist version.
  blob('ogden-reality-check', useRealityCheckStore, 'byProject', 1, byKey('byProject', null, {})),
  // Act-side Launch-milestone progress: byProject -> objectiveId -> milestoneKey
  // -> { reachedAt, reachedBy }. The live, persisted half of the Plan-authored
  // progressTracking.milestones -- records that a milestone was marked reached
  // during Act. Record-only (never gates), no free-text covenant surface.
  // Client-only IndexedDB, no server table -> opaque byProject versioned-blob.
  // v1 matches the persist version. Mirrors ogden-reality-check.
  blob('ogden-launch-milestone-progress', useLaunchMilestoneStore, 'byProject', 1,
    byKey('byProject', null, {})),
  // Threshold 2 (The Coherence Check) steward state: one ProjectCoherenceCheck
  // per project (itemResolutions map + append-only amendments log + sealedAt).
  // Client-only IndexedDB, no server table -> opaque byProject versioned-blob.
  // v1 matches the persist version. Mirrors ogden-reality-check exactly. F8:
  // carries an append-only RECONCILE applier (union amendments by itemId, merge
  // itemResolutions, earliest seal stands) so concurrent offline edits across
  // devices keep both sides instead of last-writer-wins clobber.
  blob('ogden-coherence-check', useCoherenceCheckStore, 'byProject', 1,
    withReconcile(byKey('byProject', null, {}), coherenceCheckReconcile)),
  // Threshold 3 (The Act Mandate) steward state: one ProjectActMandate per
  // project (mandatedAt + planReadOnly + per-objective lift window). Client-only
  // IndexedDB, no server table -> opaque byProject versioned-blob. v1 matches the
  // persist version. Mirrors ogden-coherence-check / ogden-reality-check. F8:
  // reconcile = earliest mandatedAt + OR(planReadOnly) + union(objectiveOverrides).
  blob('ogden-act-mandate', useActMandateStore, 'byProject', 1,
    withReconcile(byKey('byProject', null, {}), actMandateReconcile)),
  // Threshold 3 concern log: append-only PlanConcern[] per project -- the
  // governance escape valve over a locked plan (raise -> review -> approve +
  // amendment-alongside / decline). Client-only IndexedDB, no server table ->
  // opaque byProject versioned-blob (empty bucket = []). v1 matches the persist
  // version. F8: reconcile = union the concern log by id (a remote resolution of
  // the same id wins over a local still-raised copy via concernRank).
  blob('ogden-plan-concerns', usePlanConcernsStore, 'byProject', 1,
    withReconcile(byKey('byProject', null, []), planConcernsReconcile)),
  // Standing-protocol lifecycle: `records` + `activations` (projectId-tagged
  // arrays) plus `expectationsByProject` + `instantiatedObjectiveIds` (byProject
  // maps). Mixed shape (protocolShape), mirroring agribusiness. schemaVersion 4
  // matches the store's persist version (v1→v4 additive slice migrations).
  blob('ogden-protocols', useProtocolStore, 'projectId-tagged', 4, protocolShape),
  // Plan design-tension banner collapsed/expanded preference, per project
  // (collapsedByProject Record<projectId, boolean>). A per-project UI cursor
  // like ogden-plan-revision-dismissals (also a synced versioned-blob); absent
  // ⇒ collapsed (true) default, so empty = true. v1 matches the persist version.
  blob('ogden-plan-tension-banner', usePlanTensionBannerStore, 'byProject', 1, byKey('collapsedByProject', null, true)),
  // Act Tier-0 stakeholder register: rows keyed byProject[projectId][stakeholderId].
  // Persist v2 (v1→v2 migration: commsChannel string → commsChannels array).
  blob('ogden-stakeholder-register', useStakeholderRegisterStore, 'byProject', 2, byKey('byProject', null, {})),
  // s2-ecology-c1 drawn vegetation-community survey: polygons keyed
  // byProject[projectId][featureId]. Persist v1. Ephemeral takeover flag
  // (active/activeCommunity) is partialized out, so only byProject syncs.
  blob('ogden-vegetation-survey', useVegetationSurveyStore, 'byProject', 1, byKey('byProject', null, {})),
  // s2-terrain-c2 drawn slope-class survey: polygons keyed
  // byProject[projectId][featureId]. Persist v1. Ephemeral takeover flag
  // (active/activeProjectId) is partialized out, so only byProject syncs.
  blob('ogden-slope-survey', useSlopeSurveyStore, 'byProject', 1, byKey('byProject', null, {})),
  // Plan Tier-2 (Stratum-3) Systems-Reading map surveys (2026-06-16): five
  // byProject[projectId][featureId] draw stores built from createSurveyStore,
  // one per resolved S3 objective. Persist v1; ephemeral takeover flag
  // (active/activeProjectId) is partialized out, so only byProject syncs.
  // Same byProject blob transport as slope/vegetation survey.
  blob('ogden-recep-hydrology-survey', hydrologySurvey.useStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-recep-soil-survey', soilSurvey.useStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-recep-nutrient-survey', nutrientSurvey.useStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-recep-pest-survey', pestSurvey.useStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-recep-stock-water-survey', stockWaterSurvey.useStore, 'byProject', 1, byKey('byProject', null, {})),
  // Plan Tier-1 (Stratum-2) Land-Reading map surveys (2026-06-17): four more
  // byProject draw stores from createSurveyStore -- one per uncovered S2
  // objective (terrain/ecology keep their bespoke slope/vegetation stores).
  // Same byProject blob transport; persist v1; takeover flag partialized out.
  blob('ogden-recep-climate-survey', climateSurvey.useStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-recep-infrastructure-survey', infrastructureSurvey.useStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-recep-land-health-survey', landHealthSurvey.useStore, 'byProject', 1, byKey('byProject', null, {})),
  blob('ogden-recep-landscape-survey', landscapeSurvey.useStore, 'byProject', 1, byKey('byProject', null, {})),
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
  // Per-device VISIBILITY ledger over the service-worker (Workbox) offline
  // tile cache: per project + per basemap, whether tiles are
  // 'ready'/'caching'/'error'/'uncached'. Offline-tile warmth is inherently
  // device-local — syncing 'ready' from a device whose SW has warmed tiles to
  // one that hasn't would falsely report offline availability. Must NOT sync.
  'ogden-map-cache',
  // Phase 2 wizard pre-create state — there is no projectId until Step 1
  // "Next" promotes the draft via projectStore.createProject, at which
  // point the wizard store is cleared. Per-device transient by design;
  // syncing it across devices would race with project creation.
  'ogden-project-wizard',
  // DEV-ONLY override that lifts Plan prerequisite locks for local testing.
  // Call-sites are guarded by import.meta.env.DEV; the flag must never sync.
  'ogden-dev-unlock-all-strata',
  // Steward's communal-meeting-place designation (placesByProject). This is
  // project-scoped data, but client-first by design: the store deliberately
  // defers server sync of the designation as a documented out-of-scope
  // follow-on. Parked here as device-local until that sync is wired; promote
  // to SYNCED_STORES (with a transport) when it is.
  'ogden-community-meeting-place',
]);
