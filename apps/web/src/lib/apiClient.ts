/**
 * Typed API client for OGDEN Atlas backend.
 *
 * All requests go through Vite's dev proxy (/api -> localhost:3001).
 * Handles JSON serialization, error extraction, and auth token injection.
 */

import type {
  ProjectSummary,
  CreateProjectInput,
  UpdateProjectInput,
  DesignFeatureSummary,
  CreateDesignFeatureInput,
  UpdateDesignFeatureInput,
  MachineryItemSummary,
  CreateMachineryItemInput,
  UpdateMachineryItemInput,
  ProjectFile,
  ExportRecord,
  PortalRecord,
  CreatePortalInput,
  CommentRecord,
  CreateCommentInput,
  UpdateCommentInput,
  RegenerationEvent,
  RegenerationEventInput,
  RegenerationEventUpdateInput,
  ProjectMemberRecord,
  InviteMemberInput,
  UpdateMemberRoleInput,
  OrganizationRecord,
  OrgMemberRecord,
  ActivityRecord,
  SuggestedEditRecord,
  CreateSuggestedEditInput,
  ReviewSuggestedEditInput,
  ProjectRole,
  AssessmentResponse,
  HydrologyWaterResponse,
  BasemapTerrainResponse,
  ElevationProfileRequest,
  ElevationProfileResponse,
  ElevationPointRequest,
  ElevationPointResponse,
  ActInteractionEventInput,
  GetActAffinityAggregateResult,
  ClientErrorEventInput,
  ProjectStateBlob,
  UpsertProjectStateInput,
  SyncedRecord,
  UpsertSyncedRecordInput,
  ConflictListItem,
  ResolveConflictInput,
  ResolveConflictResult,
  VegetationPatchSummary,
  CreateVegetationPatchInput,
  UpdateVegetationPatchInput,
  SuccessionMilestoneSummary,
  CreateSuccessionMilestoneInput,
  UpdateSuccessionMilestoneInput,
  Overlay,
  Objective,
  ChecklistItem,
  ObservationRecord,
  PlanDecisionRecord,
  ActHandoffPackage,
  ActTask,
  ProofRecord,
  VerificationRecord,
  EscalationRecord,
  StewardshipRoutine,
  ObserveStatus,
  PlanApprovalStatus,
  ActTaskStatus,
  EscalationStatus,
  EscalationSeverity,
  Stage,
  UniversalDomain,
  StewardshipFrequency,
} from '@ogden/shared';

// ─── Base Fetch ──────────────────────────────────────────────────────────────

export interface ApiEnvelope<T> {
  data: T;
  meta?: { total?: number };
  error: { code: string; message: string; details?: unknown } | null;
}

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

// Module-global 401 interceptor handler. Wired once at app boot from
// `main.tsx` after `bootAuth()` to avoid a direct apiClient → store import
// (apiClient is intentionally store-agnostic). When the server returns
// 401 + UNAUTHORIZED|INVALID_TOKEN, the handler fires exactly once per
// session-expiry event (idempotency lives in the store slice).
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(fn: (() => void) | null) {
  sessionExpiredHandler = fn;
}

// Module-global client-error reporter. Wired once at app boot from
// `bootAuthed.ts` (authed-only) — mirrors the `sessionExpiredHandler`
// injection above to keep apiClient store-agnostic. A direct
// `apiClient → clientErrorLog` import is forbidden: clientErrorLog already
// imports `api` from here (module cycle) and pulling the telemetry buffer
// into always-mounted code would regress the showcase bundle split
// (see wiki ADR 2026-05-21-atlas-showcase-bundle-split).
export interface ApiClientErrorReport {
  /** 'ApiError' for server-returned failures, else the network error's name. */
  name: string;
  message: string;
  /** HTTP status, or 0 for network/offline (fetch-reject) failures. */
  status: number;
  /** ApiError.code, or 'NETWORK_ERROR'. */
  code: string;
  method: string;
  path: string;
}

let clientErrorReporter: ((r: ApiClientErrorReport) => void) | null = null;

export function setApiClientErrorReporter(fn: ((r: ApiClientErrorReport) => void) | null) {
  clientErrorReporter = fn;
}

// Module-global success hook. Wired once at app boot from `bootAuthed.ts`
// (mirrors the reporter injection above) to drive the connectivity store's
// `apiReachable` signal back to true once the server responds. A server that
// recovers (restart) fires no browser `online` event, so an explicit success
// signal is required for the API-unreachable banner to auto-clear.
let apiSuccessHandler: (() => void) | null = null;

export function setApiSuccessHandler(fn: (() => void) | null) {
  apiSuccessHandler = fn;
}

function reportApiSuccess(path: string): void {
  if (!apiSuccessHandler) return;
  // Skip telemetry POSTs — they are noise for reachability and could mask a
  // genuinely unreachable API endpoint (same guard as reportApiFailure).
  if (path.startsWith(TELEMETRY_PATH_PREFIX)) return;
  try {
    apiSuccessHandler();
  } catch {
    // Reporting must never break the request path.
  }
}

const TELEMETRY_PATH_PREFIX = '/api/v1/telemetry/';

function reportApiFailure(r: ApiClientErrorReport): void {
  if (!clientErrorReporter) return;
  // Loop guard: a failed telemetry POST must NEVER be reported, or the
  // client-errors POST failing would enqueue another api_client event → ∞.
  if (r.path.startsWith(TELEMETRY_PATH_PREFIX)) return;
  try {
    clientErrorReporter(r);
  } catch {
    // Reporting must never break the request path.
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = {};
  if (body != null) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    // Network/offline/DNS/CORS rejection. An AbortError is a deliberate
    // cancellation (component unmount / debounced refetch), not a failure —
    // do not report it. Re-throw the original error unchanged either way.
    if (!(err instanceof Error && err.name === 'AbortError')) {
      reportApiFailure({
        name: err instanceof Error ? err.name : 'NetworkError',
        message: err instanceof Error ? err.message : String(err),
        status: 0,
        code: 'NETWORK_ERROR',
        method,
        path,
      });
    }
    throw err;
  }

  const json = await response.json().catch(() => ({
    data: null,
    error: { code: 'PARSE_ERROR', message: `Response not JSON (${response.status})` },
  })) as ApiEnvelope<T>;

  if (!response.ok || json.error) {
    if (
      response.status === 401 &&
      (json.error?.code === 'UNAUTHORIZED' || json.error?.code === 'INVALID_TOKEN')
    ) {
      sessionExpiredHandler?.();
    }
    const apiError = new ApiError(
      json.error?.code ?? 'UNKNOWN',
      json.error?.message ?? `Request failed (${response.status})`,
      response.status,
      json.error?.details,
    );
    reportApiFailure({
      name: 'ApiError',
      message: apiError.message,
      status: apiError.status,
      code: apiError.code,
      method,
      path,
    });
    throw apiError;
  }

  // Reached the server and got a well-formed envelope — the API is reachable.
  reportApiSuccess(path);
  return json;
}

// ─── Auth user type ───────────────────────────────────────────────────────────

export interface ApiAuthUser {
  id: string;
  email: string;
  displayName: string | null;
  /** Phase 4.5 — personal default org created at register time; always present post-migration-036. */
  defaultOrgId: string;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export const api = {
  // Lightweight, unauthenticated reachability ping. Hits the proxied
  // /api/v1/health route (the root /health is not under the web app's /api dev
  // proxy). A 2xx fires the apiClient success hook (→ apiReachable = true) on
  // the authed path; ApiReachabilityBanner's no-token Retry also flips the flag
  // directly off a resolved call, since the success hook is wired authed-only.
  health: () =>
    request<{ status: string; timestamp: string; version: string }>(
      'GET', '/api/v1/health',
    ),

  auth: {
    register: (email: string, password: string, displayName?: string) =>
      request<{ token: string; user: ApiAuthUser }>(
        'POST', '/api/v1/auth/register', { email, password, displayName },
      ),

    login: (email: string, password: string) =>
      request<{ token: string; user: ApiAuthUser }>(
        'POST', '/api/v1/auth/login', { email, password },
      ),

    me: () =>
      request<{ id: string; email: string; displayName: string | null; defaultOrgId: string }>(
        'GET', '/api/v1/auth/me',
      ),
  },

  projects: {
    list: (params?: { status?: 'active' | 'archived' | 'all' }) =>
      request<ProjectSummary[]>(
        'GET',
        params?.status ? `/api/v1/projects?status=${params.status}` : '/api/v1/projects',
      ),

    // Public — returns only is_builtin = true rows. No auth required so
    // unauthenticated visitors see the canonical sample on the home page.
    // Each row is a ProjectSummary plus `parcelBoundaryGeojson` (raw
    // PostGIS geometry) and `layers` (project_layers Tier-1 summaries
    // with snake_case `summary` jsonb preserved end-to-end).
    listBuiltins: () =>
      request<
        Array<
          ProjectSummary & {
            parcelBoundaryGeojson: unknown | null;
            layers: Array<{
              layerType: string;
              sourceApi: string | null;
              fetchStatus: string;
              confidence: string | null;
              dataDate: string | null;
              attribution: string | null;
              summary: Record<string, unknown>;
            }>;
          }
        >
      >('GET', '/api/v1/projects/builtins'),

    get: (id: string) =>
      request<ProjectSummary>('GET', `/api/v1/projects/${id}`),

    create: (input: CreateProjectInput) =>
      request<ProjectSummary>('POST', '/api/v1/projects', input),

    update: (id: string, input: Partial<UpdateProjectInput>) =>
      request<ProjectSummary>('PATCH', `/api/v1/projects/${id}`, input),

    setBoundary: (id: string, geojson: unknown) =>
      request<{ id: string; acreage: number }>('POST', `/api/v1/projects/${id}/boundary`, { geojson }),

    assessment: (id: string) =>
      request<AssessmentResponse>('GET', `/api/v1/projects/${id}/assessment`),

    aiOutputs: (id: string) =>
      request<Record<string, {
        id: string;
        projectId: string;
        outputType: string;
        content: string;
        confidence: 'high' | 'medium' | 'low';
        dataSources: string[];
        caveat: string | null;
        needsSiteVisit: boolean;
        modelId: string;
        generatedAt: string;
      }>>('GET', `/api/v1/projects/${id}/ai-outputs`),

    completeness: (id: string) =>
      request<{ score: number; layers: unknown[] }>('GET', `/api/v1/projects/${id}/completeness`),

    delete: (id: string) =>
      request<void>('DELETE', `/api/v1/projects/${id}`),

    archive: (id: string) =>
      request<ProjectSummary>('POST', `/api/v1/projects/${id}/archive`),

    unarchive: (id: string) =>
      request<ProjectSummary>('POST', `/api/v1/projects/${id}/unarchive`),
  },

  templates: {
    list: () =>
      request<Array<{
        id: string;
        ownerId: string;
        name: string;
        sourceProjectId: string | null;
        slug?: string | null;
        public?: boolean;
        createdAt: string;
      }>>('GET', '/api/v1/templates'),

    create: (input: { name: string; sourceProjectId: string }) =>
      request<{
        id: string;
        ownerId: string;
        name: string;
        sourceProjectId: string | null;
        createdAt: string;
      }>('POST', '/api/v1/templates', input),

    instantiate: (
      id: string,
      input: { name: string; parcelBoundaryGeojson?: unknown | null; orgId?: string },
    ) =>
      request<ProjectSummary>('POST', `/api/v1/templates/${id}/instantiate`, input),

    // Phase 4 (2026-05-21) — public ecosystem-template instantiation.
    // Still auth-gated; only the owner check is relaxed for public rows.
    // Phase 4.5 — accepts optional orgId to attach the cloned project to a
    // specific workspace (membership-checked server-side).
    instantiatePublic: (
      slug: string,
      input: { name: string; parcelBoundaryGeojson?: unknown | null; orgId?: string },
    ) =>
      request<ProjectSummary>(
        'POST',
        `/api/v1/templates/public/${encodeURIComponent(slug)}/instantiate`,
        input,
      ),
  },

  designFeatures: {
    list: (projectId: string, featureType?: string) =>
      request<DesignFeatureSummary[]>(
        'GET',
        featureType
          ? `/api/v1/design-features/project/${projectId}/${featureType}`
          : `/api/v1/design-features/project/${projectId}`,
      ),

    create: (projectId: string, input: CreateDesignFeatureInput) =>
      request<DesignFeatureSummary>('POST', `/api/v1/design-features/project/${projectId}`, input),

    update: (id: string, input: Partial<UpdateDesignFeatureInput>) =>
      request<DesignFeatureSummary>('PATCH', `/api/v1/design-features/${id}`, input),

    delete: (id: string) =>
      request<void>('DELETE', `/api/v1/design-features/${id}`),

    bulkUpsert: (projectId: string, features: CreateDesignFeatureInput[]) =>
      request<DesignFeatureSummary[]>(
        'POST',
        `/api/v1/design-features/project/${projectId}/bulk`,
        { features },
      ),
  },

  designMap: {
    generate: (
      projectId: string,
      input: {
        persist?: boolean;
        options?: {
          enterprises?: string[];
          orchard?: Record<string, unknown>;
          swale?: Record<string, unknown>;
          paddock?: Record<string, unknown>;
          corridor?: Record<string, unknown>;
        };
      } = {},
    ) =>
      request<{
        features: DesignFeatureSummary[];
        summary: Record<string, number>;
        warnings: string[];
        persisted?: { count: number; ids: string[] };
      }>(
        'POST',
        `/api/v1/design-map/project/${projectId}/generate`,
        input,
      ),
  },

  machineryItems: {
    list: (projectId: string) =>
      request<MachineryItemSummary[]>('GET', `/api/v1/machinery-items/project/${projectId}`),

    create: (projectId: string, input: CreateMachineryItemInput) =>
      request<MachineryItemSummary>('POST', `/api/v1/machinery-items/project/${projectId}`, input),

    update: (id: string, input: UpdateMachineryItemInput) =>
      request<MachineryItemSummary>('PATCH', `/api/v1/machinery-items/${id}`, input),

    delete: (id: string) =>
      request<void>('DELETE', `/api/v1/machinery-items/${id}`),
  },

  vegetation: {
    list: (projectId: string) =>
      request<VegetationPatchSummary[]>('GET', `/api/v1/vegetation/project/${projectId}`),

    create: (projectId: string, input: CreateVegetationPatchInput) =>
      request<VegetationPatchSummary>('POST', `/api/v1/vegetation/project/${projectId}`, input),

    update: (id: string, input: UpdateVegetationPatchInput) =>
      request<VegetationPatchSummary>('PATCH', `/api/v1/vegetation/${id}`, input),

    delete: (id: string) =>
      request<void>('DELETE', `/api/v1/vegetation/${id}`),
  },

  succession: {
    list: (projectId: string) =>
      request<SuccessionMilestoneSummary[]>('GET', `/api/v1/succession/project/${projectId}`),

    create: (projectId: string, input: CreateSuccessionMilestoneInput) =>
      request<SuccessionMilestoneSummary>('POST', `/api/v1/succession/project/${projectId}`, input),

    update: (id: string, input: UpdateSuccessionMilestoneInput) =>
      request<SuccessionMilestoneSummary>('PATCH', `/api/v1/succession/${id}`, input),

    delete: (id: string) =>
      request<void>('DELETE', `/api/v1/succession/${id}`),
  },

  // D.4 — SOM trajectory consumer for the J-curve secondary axis.
  // Producer (POST recompute) is owner|designer-gated on the API; the web
  // client only needs the GET today. Returns whole-project rows (zone_id
  // NULL) ordered by year ASC.
  soilRegeneration: {
    getSomTrajectory: (projectId: string) =>
      request<import('../features/financial/somAppreciation.js').SomYearRow[]>(
        'GET',
        `/api/v1/soil-regeneration/project/${projectId}/som-trajectory`,
      ),

    // K.1 — per-zone SOM trajectory for the sidebar sparklines. Same
    // endpoint, filtered by zone via the F.3 `?zoneId=` query param.
    // Returns that zone's rows (zone_id = zoneId) ordered by year ASC.
    getSomTrajectoryByZone: (projectId: string, zoneId: string) =>
      request<import('../features/financial/somAppreciation.js').SomYearRow[]>(
        'GET',
        `/api/v1/soil-regeneration/project/${projectId}/som-trajectory?zoneId=${encodeURIComponent(zoneId)}`,
      ),
  },

  evidenceAudit: {
    // F.4 — passive reproducibility ledger. Fire-and-forget from the
    // client; the caller does not await this in render paths.
    log: (
      projectId: string,
      body: {
        panelKey: string;
        inputHash: string;
        inputPayload: unknown;
        selectorName: string;
        evidenceOutput: unknown;
      },
    ) =>
      request<{ id: string }>(
        'POST',
        `/api/v1/projects/${projectId}/evidence-audit/log`,
        body,
      ),
  },

  projectState: {
    list: (projectId: string) =>
      request<ProjectStateBlob[]>('GET', `/api/v1/project-state/project/${projectId}`),

    get: (projectId: string, storeKey: string) =>
      request<ProjectStateBlob>(
        'GET',
        `/api/v1/project-state/project/${projectId}/${encodeURIComponent(storeKey)}`,
      ),

    upsert: (projectId: string, storeKey: string, input: UpsertProjectStateInput) =>
      request<ProjectStateBlob>(
        'PUT',
        `/api/v1/project-state/project/${projectId}/${encodeURIComponent(storeKey)}`,
        input,
      ),
  },

  // Typed per-record sync for the Act stores (ADR 7 Phase 1). Mirrors
  // `projectState`, but keyed per (project, storeKey, recordId) so each Act
  // record carries its own rev. `list` pulls every record for one store;
  // `upsert` writes one record under the baseRev-gated 409 conflict contract.
  actRecords: {
    list: (projectId: string, storeKey: string) =>
      request<SyncedRecord[]>(
        'GET',
        `/api/v1/act-records/project/${projectId}/${encodeURIComponent(storeKey)}`,
      ),

    upsert: (
      projectId: string,
      storeKey: string,
      recordId: string,
      input: UpsertSyncedRecordInput,
    ) =>
      request<SyncedRecord>(
        'PUT',
        `/api/v1/act-records/project/${projectId}/${encodeURIComponent(storeKey)}/${encodeURIComponent(recordId)}`,
        input,
      ),

    // ADR 7 Phase 4 — conflict resolution surface.
    // `listConflicts` returns every open (escalated) conflict for the project;
    // `resolveConflict` closes one by the steward's Keep-mine/Keep-server choice.
    // Both return the standard ApiEnvelope (request<T> wraps it), so callers
    // destructure `{ data }` exactly like list/upsert above.
    listConflicts: (projectServerId: string) =>
      request<ConflictListItem[]>(
        'GET',
        `/api/v1/act-records/project/${projectServerId}/conflicts`,
      ),

    resolveConflict: (
      projectServerId: string,
      syncLogId: string,
      input: ResolveConflictInput,
    ) =>
      request<ResolveConflictResult>(
        'POST',
        `/api/v1/act-records/project/${projectServerId}/conflicts/${encodeURIComponent(
          syncLogId,
        )}/resolve`,
        input,
      ),
  },

  layers: {
    list: (projectId: string) =>
      request<unknown[]>('GET', `/api/v1/layers/project/${projectId}`),

    get: (projectId: string, layerType: string) =>
      request<unknown>('GET', `/api/v1/layers/project/${projectId}/${layerType}`),

    refresh: (projectId: string, layerType: string) =>
      request<{ jobId: string }>('POST', `/api/v1/layers/project/${projectId}/${layerType}/refresh`),
  },

  spiritual: {
    list: (projectId: string) =>
      request<unknown[]>('GET', `/api/v1/spiritual/project/${projectId}`),

    create: (projectId: string, body: unknown) =>
      request<unknown>('POST', `/api/v1/spiritual/project/${projectId}`, body),

    qibla: (projectId: string) =>
      request<{ bearing: number; distanceKm: number }>('GET', `/api/v1/spiritual/project/${projectId}/qibla`),

    delete: (zoneId: string) =>
      request<void>('DELETE', `/api/v1/spiritual/${zoneId}`),
  },

  pipeline: {
    jobs: (projectId: string) =>
      request<unknown[]>('GET', `/api/v1/pipeline/jobs/${projectId}`),

    job: (jobId: string) =>
      request<unknown>('GET', `/api/v1/pipeline/job/${jobId}`),
  },

  ai: {
    chat: (messages: { role: string; content: string }[], systemPrompt: string, signal?: AbortSignal) =>
      request<{ content: string; model: string; inputTokens: number; outputTokens: number }>(
        'POST', '/api/v1/ai/chat', { messages, systemPrompt }, signal,
      ),
  },

  files: {
    /** Upload a file with optional progress tracking. Uses XMLHttpRequest for upload progress events. */
    upload: (
      projectId: string,
      file: File,
      onProgress?: (pct: number) => void,
    ): Promise<ApiEnvelope<ProjectFile>> =>
      new Promise((resolve, reject) => {
        const path = `/api/v1/projects/${projectId}/files`;
        // Report an ApiError to the client-error sink, then reject with it.
        const fail = (apiError: ApiError) => {
          reportApiFailure({
            name: 'ApiError',
            message: apiError.message,
            status: apiError.status,
            code: apiError.code,
            method: 'POST',
            path,
          });
          reject(apiError);
        };

        const xhr = new XMLHttpRequest();
        xhr.open('POST', path);

        if (authToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        }

        if (onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              onProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
        }

        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText) as ApiEnvelope<ProjectFile>;
            if (xhr.status >= 200 && xhr.status < 300 && !json.error) {
              resolve(json);
            } else {
              fail(new ApiError(
                json.error?.code ?? 'UNKNOWN',
                json.error?.message ?? `Upload failed (${xhr.status})`,
                xhr.status,
                json.error?.details,
              ));
            }
          } catch {
            fail(new ApiError('PARSE_ERROR', `Response not JSON (${xhr.status})`, xhr.status));
          }
        };

        xhr.onerror = () => {
          fail(new ApiError('NETWORK_ERROR', 'Network error during upload', 0));
        };

        const formData = new FormData();
        formData.append('file', file);
        xhr.send(formData);
      }),

    list: (projectId: string) =>
      request<(ProjectFile & { confidence?: string })[]>('GET', `/api/v1/projects/${projectId}/files`),

    delete: (projectId: string, fileId: string) =>
      request<null>('DELETE', `/api/v1/projects/${projectId}/files/${fileId}`),
  },

  proofPhoto: {
    /**
     * Upload a field-action proof photo blob captured offline-first.
     * Drives the `proof_photo_upload` sync queue case. Returns the
     * canonical `assetUri` (`storage://...`) the server stamped on disk;
     * the caller swaps the local `idb://` URI for it and flips
     * `fileSyncStatus` to `'uploaded'`.
     */
    upload: (
      projectId: string,
      args: { actionId: string; slotId: string; blob: Blob; fileName: string; fileMime: string },
    ): Promise<ApiEnvelope<{ assetUri: string; sizeBytes: number; mimetype: string }>> =>
      new Promise((resolve, reject) => {
        const path = `/api/v1/projects/${projectId}/proof-photo`;
        const fail = (apiError: ApiError) => {
          reportApiFailure({
            name: 'ApiError',
            message: apiError.message,
            status: apiError.status,
            code: apiError.code,
            method: 'POST',
            path,
          });
          reject(apiError);
        };

        const xhr = new XMLHttpRequest();
        xhr.open('POST', path);
        if (authToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        }

        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText) as ApiEnvelope<{
              assetUri: string;
              sizeBytes: number;
              mimetype: string;
            }>;
            if (xhr.status >= 200 && xhr.status < 300 && !json.error) {
              resolve(json);
            } else {
              fail(new ApiError(
                json.error?.code ?? 'UNKNOWN',
                json.error?.message ?? `Proof upload failed (${xhr.status})`,
                xhr.status,
                json.error?.details,
              ));
            }
          } catch {
            fail(new ApiError('PARSE_ERROR', `Response not JSON (${xhr.status})`, xhr.status));
          }
        };

        xhr.onerror = () => {
          fail(new ApiError('NETWORK_ERROR', 'Network error during proof upload', 0));
        };

        const form = new FormData();
        form.append('actionId', args.actionId);
        form.append('slotId', args.slotId);
        form.append('file', new File([args.blob], args.fileName, { type: args.fileMime }));
        xhr.send(form);
      }),
  },

  exports: {
    generate: (projectId: string, body: { exportType: string; payload?: unknown }) =>
      request<ExportRecord>('POST', `/api/v1/projects/${projectId}/exports`, body),

    list: (projectId: string) =>
      request<ExportRecord[]>('GET', `/api/v1/projects/${projectId}/exports`),
  },

  portal: {
    get: (projectId: string) =>
      request<PortalRecord>('GET', `/api/v1/projects/${projectId}/portal`),

    save: (projectId: string, config: CreatePortalInput) =>
      request<PortalRecord>('POST', `/api/v1/projects/${projectId}/portal`, config),

    getPublic: (shareToken: string) =>
      request<PortalRecord>('GET', `/api/v1/portal/${shareToken}`),

    // WS5 P2 — generate + publish a frozen view-only report snapshot.
    // Returns the portal record (with `shareToken`) so the caller can
    // build the public `/report-share/:token` link.
    publishReport: (projectId: string) =>
      request<PortalRecord>(
        'POST',
        `/api/v1/projects/${projectId}/portal/report`,
      ),

    unpublishReport: (projectId: string) =>
      request<{ unpublished: boolean }>(
        'DELETE',
        `/api/v1/projects/${projectId}/portal/report`,
      ),

    // Relative API path the browser/iframe fetches the frozen PDF from.
    // The raw storage URL is never exposed; this streams through the API
    // gated by token secrecy + the `reportShare.published` flag.
    reportPdfPath: (shareToken: string) =>
      `/api/v1/portal/${shareToken}/report.pdf`,
  },

  comments: {
    list: (projectId: string, resolved?: boolean) =>
      request<CommentRecord[]>(
        'GET',
        `/api/v1/projects/${projectId}/comments${resolved !== undefined ? `?resolved=${resolved}` : ''}`,
      ),

    create: (projectId: string, input: CreateCommentInput) =>
      request<CommentRecord>('POST', `/api/v1/projects/${projectId}/comments`, input),

    update: (projectId: string, commentId: string, input: UpdateCommentInput) =>
      request<CommentRecord>('PATCH', `/api/v1/projects/${projectId}/comments/${commentId}`, input),

    delete: (projectId: string, commentId: string) =>
      request<void>('DELETE', `/api/v1/projects/${projectId}/comments/${commentId}`),
  },

  regenerationEvents: {
    list: (
      projectId: string,
      filters?: {
        eventType?: RegenerationEvent['eventType'];
        interventionType?: NonNullable<RegenerationEvent['interventionType']>;
        phase?: NonNullable<RegenerationEvent['phase']>;
        since?: string;
        until?: string;
        parentId?: string;
      },
    ) => {
      const qs = filters
        ? '?' + new URLSearchParams(
            Object.entries(filters).filter(
              (entry): entry is [string, string] =>
                typeof entry[1] === 'string' && entry[1].length > 0,
            ),
          ).toString()
        : '';
      return request<RegenerationEvent[]>(
        'GET',
        `/api/v1/projects/${projectId}/regeneration-events${qs && qs !== '?' ? qs : ''}`,
      );
    },

    create: (projectId: string, input: RegenerationEventInput) =>
      request<RegenerationEvent>(
        'POST',
        `/api/v1/projects/${projectId}/regeneration-events`,
        input,
      ),

    update: (projectId: string, eventId: string, input: RegenerationEventUpdateInput) =>
      request<RegenerationEvent>(
        'PATCH',
        `/api/v1/projects/${projectId}/regeneration-events/${eventId}`,
        input,
      ),

    delete: (projectId: string, eventId: string) =>
      request<void>(
        'DELETE',
        `/api/v1/projects/${projectId}/regeneration-events/${eventId}`,
      ),

    uploadMedia: async (projectId: string, file: File): Promise<ApiEnvelope<{
      url: string;
      contentType: string;
      size: number;
      filename: string;
    }>> => {
      const formData = new FormData();
      formData.append('file', file);
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const path = `/api/v1/projects/${projectId}/regeneration-events/media`;
      let res: Response;
      try {
        res = await fetch(path, { method: 'POST', headers, body: formData });
      } catch (err) {
        // AbortError = deliberate cancellation, not a failure.
        if (!(err instanceof Error && err.name === 'AbortError')) {
          reportApiFailure({
            name: err instanceof Error ? err.name : 'NetworkError',
            message: err instanceof Error ? err.message : String(err),
            status: 0,
            code: 'NETWORK_ERROR',
            method: 'POST',
            path,
          });
        }
        throw err;
      }
      const json = await res.json();
      if (!res.ok || json.error) {
        const apiError = new ApiError(
          json.error?.code ?? 'UPLOAD_FAILED',
          json.error?.message ?? json.message ?? `Upload failed (${res.status})`,
          res.status,
        );
        reportApiFailure({
          name: 'ApiError',
          message: apiError.message,
          status: apiError.status,
          code: apiError.code,
          method: 'POST',
          path,
        });
        throw apiError;
      }
      return json;
    },
  },

  members: {
    list: (projectId: string) =>
      request<ProjectMemberRecord[]>('GET', `/api/v1/projects/${projectId}/members`),

    invite: (projectId: string, input: InviteMemberInput) =>
      request<ProjectMemberRecord>('POST', `/api/v1/projects/${projectId}/members`, input),

    updateRole: (projectId: string, userId: string, input: UpdateMemberRoleInput) =>
      request<ProjectMemberRecord>('PATCH', `/api/v1/projects/${projectId}/members/${userId}`, input),

    remove: (projectId: string, userId: string) =>
      request<void>('DELETE', `/api/v1/projects/${projectId}/members/${userId}`),

    myRole: (projectId: string) =>
      request<{ role: ProjectRole }>('GET', `/api/v1/projects/${projectId}/my-role`),

    myRoles: () =>
      request<Array<{ projectId: string; role: ProjectRole }>>(
        'GET',
        '/api/v1/projects/my-roles',
      ),
  },

  organizations: {
    list: () =>
      request<OrganizationRecord[]>('GET', '/api/v1/organizations'),

    create: (name: string) =>
      request<OrganizationRecord>('POST', '/api/v1/organizations', { name }),

    update: (
      orgId: string,
      input: {
        name?: string;
        plan?: string;
        jurisdiction?: string | null;
        registryId?: string | null;
      },
    ) => request<OrganizationRecord>('PATCH', `/api/v1/organizations/${orgId}`, input),

    listMembers: (orgId: string) =>
      request<OrgMemberRecord[]>('GET', `/api/v1/organizations/${orgId}/members`),

    inviteMember: (orgId: string, email: string, role: string) =>
      request<OrgMemberRecord>('POST', `/api/v1/organizations/${orgId}/members`, { email, role }),

    removeMember: (orgId: string, userId: string) =>
      request<void>('DELETE', `/api/v1/organizations/${orgId}/members/${userId}`),
  },

  activity: {
    list: (projectId: string, limit = 30, offset = 0) =>
      request<ActivityRecord[]>(
        'GET',
        `/api/v1/projects/${projectId}/activity?limit=${limit}&offset=${offset}`,
      ),
  },

  suggestions: {
    list: (projectId: string) =>
      request<SuggestedEditRecord[]>('GET', `/api/v1/projects/${projectId}/suggestions`),

    create: (projectId: string, input: CreateSuggestedEditInput) =>
      request<SuggestedEditRecord>('POST', `/api/v1/projects/${projectId}/suggestions`, input),

    review: (projectId: string, suggestionId: string, input: ReviewSuggestedEditInput) =>
      request<SuggestedEditRecord>(
        'PATCH',
        `/api/v1/projects/${projectId}/suggestions/${suggestionId}`,
        input,
      ),
  },

  hydrologyWater: {
    get: (projectId: string) =>
      request<HydrologyWaterResponse>('GET', `/api/v1/hydrology-water/${projectId}`),
  },

  basemapTerrain: {
    get: (projectId: string) =>
      request<BasemapTerrainResponse>('GET', `/api/v1/basemap-terrain/${projectId}`),
    viewshed: (projectId: string) =>
      request<{ status: 'ready'; geojson: GeoJSON.FeatureCollection } | { status: 'not_ready' }>(
        'GET',
        `/api/v1/basemap-terrain/${projectId}/viewshed`,
      ),
  },

  elevation: {
    profile: (input: ElevationProfileRequest) =>
      request<ElevationProfileResponse>('POST', '/api/v1/elevation/profile', input),
    point: (input: ElevationPointRequest) =>
      request<ElevationPointResponse>('POST', '/api/v1/elevation/point', input),
  },

  climateAnalysis: {
    computeSolarExposure: (projectId: string) =>
      request<SolarExposureResponse>(
        'POST',
        `/api/v1/climate-analysis/${projectId}/solar-exposure/compute`,
      ),
    computeComfortGrid: (projectId: string) =>
      request<ComfortGridResponse>(
        'POST',
        `/api/v1/climate-analysis/${projectId}/comfort-grid/compute`,
      ),

    /**
     * Server-side proxy for Open-Meteo ERA5 hourly wind, returned as 8-bin
     * compass frequencies. Maps the 502/WIND_ROSE_UNAVAILABLE silent-fail to
     * null so callers can decide whether to fall back to defaults.
     */
    windRose: async (
      lat: number,
      lng: number,
      signal?: AbortSignal,
    ): Promise<WindRoseResponse | null> => {
      try {
        const env = await request<WindRoseResponse>(
          'GET',
          `/api/v1/climate-analysis/wind-rose?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`,
          undefined,
          signal,
        );
        return env.data;
      } catch (err) {
        if (err instanceof ApiError && err.code === 'WIND_ROSE_UNAVAILABLE') {
          return null;
        }
        throw err;
      }
    },

    /**
     * Server-side proxy for Open-Meteo 7-day forecast (current + hourly + daily).
     * Maps the 502/FORECAST_UNAVAILABLE silent-fail to null so callers can
     * fall back to an empty-state placeholder.
     */
    forecast: async (
      lat: number,
      lng: number,
      signal?: AbortSignal,
    ): Promise<WeatherForecastResponse | null> => {
      try {
        const env = await request<WeatherForecastResponse>(
          'GET',
          `/api/v1/climate-analysis/forecast?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`,
          undefined,
          signal,
        );
        return env.data;
      } catch (err) {
        if (err instanceof ApiError && err.code === 'FORECAST_UNAVAILABLE') {
          return null;
        }
        throw err;
      }
    },
  },

  relationships: {
    list: (projectId: string) =>
      request<RelationshipRecord[]>('GET', `/api/v1/projects/${projectId}/relationships`),

    create: (projectId: string, edge: RelationshipEdgePayload) =>
      request<RelationshipRecord>('POST', `/api/v1/projects/${projectId}/relationships`, edge),

    delete: (projectId: string, edgeId: string) =>
      request<null>('DELETE', `/api/v1/projects/${projectId}/relationships/${edgeId}`),
  },

  telemetry: {
    postActInteractions: (events: ActInteractionEventInput[]) =>
      request<{ ingested: number }>(
        'POST',
        '/api/v1/telemetry/act-interactions',
        { events },
      ),

    getActAffinityAggregate: (params?: { projectId?: string; from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.projectId) qs.set('projectId', params.projectId);
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return request<GetActAffinityAggregateResult>(
        'GET',
        `/api/v1/telemetry/act-interactions/aggregate${suffix}`,
      );
    },

    postClientErrors: (events: ClientErrorEventInput[]) =>
      request<{ ingested: number }>(
        'POST',
        '/api/v1/telemetry/client-errors',
        { events },
      ),
  },

  // OLOS — universal Stage × Domain × Objective × Record system.
  // Catalogue endpoints are public; project endpoints require auth + role.
  olos: {
    // ── Catalogue (15 overlays + 48 objectives + ~237 checklist items) ──
    catalogue: () =>
      request<{
        overlays: Overlay[];
        objectives: Objective[];
        checklistItems: ChecklistItem[];
        objectiveOverlays: Array<{ objectiveId: string; overlayId: string }>;
      }>('GET', '/api/v1/olos/catalogue'),

    overlays: () => request<Overlay[]>('GET', '/api/v1/olos/overlays'),
    objectives: () => request<Objective[]>('GET', '/api/v1/olos/objectives'),
    checklistItems: () =>
      request<ChecklistItem[]>('GET', '/api/v1/olos/checklist-items'),

    // ── ObservationRecord ──────────────────────────────────────────────
    observations: {
      list: (projectId: string, q?: { objectiveId?: string; status?: ObserveStatus }) => {
        const qs = new URLSearchParams();
        if (q?.objectiveId) qs.set('objectiveId', q.objectiveId);
        if (q?.status) qs.set('status', q.status);
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return request<ObservationRecord[]>(
          'GET',
          `/api/v1/projects/${projectId}/olos/observations${suffix}`,
        );
      },
      create: (projectId: string, input: Omit<ObservationRecord, 'id' | 'projectId' | 'recordedAt'>) =>
        request<ObservationRecord>(
          'POST',
          `/api/v1/projects/${projectId}/olos/observations`,
          input,
        ),
      get: (projectId: string, recordId: string) =>
        request<ObservationRecord>(
          'GET',
          `/api/v1/projects/${projectId}/olos/observations/${recordId}`,
        ),
      update: (
        projectId: string,
        recordId: string,
        patch: Partial<Omit<ObservationRecord, 'id' | 'projectId' | 'recordedAt'>>,
      ) =>
        request<ObservationRecord>(
          'PATCH',
          `/api/v1/projects/${projectId}/olos/observations/${recordId}`,
          patch,
        ),
      delete: (projectId: string, recordId: string) =>
        request<void>(
          'DELETE',
          `/api/v1/projects/${projectId}/olos/observations/${recordId}`,
        ),
    },

    // ── PlanDecisionRecord ─────────────────────────────────────────────
    planDecisions: {
      list: (projectId: string, q?: { objectiveId?: string; approvalStatus?: PlanApprovalStatus }) => {
        const qs = new URLSearchParams();
        if (q?.objectiveId) qs.set('objectiveId', q.objectiveId);
        if (q?.approvalStatus) qs.set('approvalStatus', q.approvalStatus);
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return request<PlanDecisionRecord[]>(
          'GET',
          `/api/v1/projects/${projectId}/olos/plan-decisions${suffix}`,
        );
      },
      create: (
        projectId: string,
        input: Omit<PlanDecisionRecord, 'id' | 'projectId' | 'decidedAt'>,
      ) =>
        request<PlanDecisionRecord>(
          'POST',
          `/api/v1/projects/${projectId}/olos/plan-decisions`,
          input,
        ),
      get: (projectId: string, recordId: string) =>
        request<PlanDecisionRecord>(
          'GET',
          `/api/v1/projects/${projectId}/olos/plan-decisions/${recordId}`,
        ),
      update: (
        projectId: string,
        recordId: string,
        patch: Partial<Omit<PlanDecisionRecord, 'id' | 'projectId' | 'decidedAt'>>,
      ) =>
        request<PlanDecisionRecord>(
          'PATCH',
          `/api/v1/projects/${projectId}/olos/plan-decisions/${recordId}`,
          patch,
        ),
      delete: (projectId: string, recordId: string) =>
        request<void>(
          'DELETE',
          `/api/v1/projects/${projectId}/olos/plan-decisions/${recordId}`,
        ),
    },

    // ── ActHandoffPackage (POST 409s if upstream PlanDecision is not approved) ──
    handoffs: {
      list: (projectId: string, q?: { planDecisionRecordId?: string }) => {
        const qs = q?.planDecisionRecordId
          ? `?planDecisionRecordId=${q.planDecisionRecordId}`
          : '';
        return request<ActHandoffPackage[]>(
          'GET',
          `/api/v1/projects/${projectId}/olos/handoffs${qs}`,
        );
      },
      create: (
        projectId: string,
        input: Omit<ActHandoffPackage, 'id' | 'projectId' | 'createdAt'>,
      ) =>
        request<ActHandoffPackage>(
          'POST',
          `/api/v1/projects/${projectId}/olos/handoffs`,
          input,
        ),
      get: (projectId: string, recordId: string) =>
        request<ActHandoffPackage>(
          'GET',
          `/api/v1/projects/${projectId}/olos/handoffs/${recordId}`,
        ),
      update: (
        projectId: string,
        recordId: string,
        patch: Partial<Omit<ActHandoffPackage, 'id' | 'projectId' | 'planDecisionRecordId' | 'createdAt'>>,
      ) =>
        request<ActHandoffPackage>(
          'PATCH',
          `/api/v1/projects/${projectId}/olos/handoffs/${recordId}`,
          patch,
        ),
      delete: (projectId: string, recordId: string) =>
        request<void>(
          'DELETE',
          `/api/v1/projects/${projectId}/olos/handoffs/${recordId}`,
        ),
    },

    // ── ActTask ───────────────────────────────────────────────────────
    tasks: {
      list: (
        projectId: string,
        q?: {
          objectiveId?: string;
          handoffPackageId?: string;
          status?: ActTaskStatus;
          assigneeId?: string;
        },
      ) => {
        const qs = new URLSearchParams();
        if (q?.objectiveId) qs.set('objectiveId', q.objectiveId);
        if (q?.handoffPackageId) qs.set('handoffPackageId', q.handoffPackageId);
        if (q?.status) qs.set('status', q.status);
        if (q?.assigneeId) qs.set('assigneeId', q.assigneeId);
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return request<ActTask[]>(
          'GET',
          `/api/v1/projects/${projectId}/olos/tasks${suffix}`,
        );
      },
      create: (
        projectId: string,
        input: Omit<ActTask, 'id' | 'projectId' | 'createdAt'>,
      ) =>
        request<ActTask>(
          'POST',
          `/api/v1/projects/${projectId}/olos/tasks`,
          input,
        ),
      get: (projectId: string, taskId: string) =>
        request<ActTask>(
          'GET',
          `/api/v1/projects/${projectId}/olos/tasks/${taskId}`,
        ),
      update: (
        projectId: string,
        taskId: string,
        patch: Partial<Omit<ActTask, 'id' | 'projectId' | 'handoffPackageId' | 'createdAt'>>,
      ) =>
        request<ActTask>(
          'PATCH',
          `/api/v1/projects/${projectId}/olos/tasks/${taskId}`,
          patch,
        ),
      delete: (projectId: string, taskId: string) =>
        request<void>(
          'DELETE',
          `/api/v1/projects/${projectId}/olos/tasks/${taskId}`,
        ),
    },

    // ── ProofRecord (scoped to a task) ────────────────────────────────
    proofs: {
      list: (projectId: string, taskId: string) =>
        request<ProofRecord[]>(
          'GET',
          `/api/v1/projects/${projectId}/olos/tasks/${taskId}/proofs`,
        ),
      create: (
        projectId: string,
        taskId: string,
        input: Omit<ProofRecord, 'id' | 'projectId' | 'taskId' | 'capturedAt' | 'verificationStatus'> & {
          capturedAt?: string;
          verificationStatus?: ProofRecord['verificationStatus'];
        },
      ) =>
        request<ProofRecord>(
          'POST',
          `/api/v1/projects/${projectId}/olos/tasks/${taskId}/proofs`,
          input,
        ),
      get: (projectId: string, taskId: string, proofId: string) =>
        request<ProofRecord>(
          'GET',
          `/api/v1/projects/${projectId}/olos/tasks/${taskId}/proofs/${proofId}`,
        ),
      update: (
        projectId: string,
        taskId: string,
        proofId: string,
        patch: Partial<Omit<ProofRecord, 'id' | 'projectId' | 'taskId'>>,
      ) =>
        request<ProofRecord>(
          'PATCH',
          `/api/v1/projects/${projectId}/olos/tasks/${taskId}/proofs/${proofId}`,
          patch,
        ),
      delete: (projectId: string, taskId: string, proofId: string) =>
        request<void>(
          'DELETE',
          `/api/v1/projects/${projectId}/olos/tasks/${taskId}/proofs/${proofId}`,
        ),
    },

    // ── VerificationRecord (scoped to a task) ─────────────────────────
    verifications: {
      list: (projectId: string, taskId: string) =>
        request<VerificationRecord[]>(
          'GET',
          `/api/v1/projects/${projectId}/olos/tasks/${taskId}/verifications`,
        ),
      create: (
        projectId: string,
        taskId: string,
        input: Omit<VerificationRecord, 'id' | 'projectId' | 'taskId' | 'verifiedAt'> & { verifiedAt?: string },
      ) =>
        request<VerificationRecord>(
          'POST',
          `/api/v1/projects/${projectId}/olos/tasks/${taskId}/verifications`,
          input,
        ),
      get: (projectId: string, taskId: string, verificationId: string) =>
        request<VerificationRecord>(
          'GET',
          `/api/v1/projects/${projectId}/olos/tasks/${taskId}/verifications/${verificationId}`,
        ),
      update: (
        projectId: string,
        taskId: string,
        verificationId: string,
        patch: Partial<Omit<VerificationRecord, 'id' | 'projectId' | 'taskId'>>,
      ) =>
        request<VerificationRecord>(
          'PATCH',
          `/api/v1/projects/${projectId}/olos/tasks/${taskId}/verifications/${verificationId}`,
          patch,
        ),
      delete: (projectId: string, taskId: string, verificationId: string) =>
        request<void>(
          'DELETE',
          `/api/v1/projects/${projectId}/olos/tasks/${taskId}/verifications/${verificationId}`,
        ),
    },

    // ── EscalationRecord ──────────────────────────────────────────────
    escalations: {
      list: (
        projectId: string,
        q?: { taskId?: string; status?: EscalationStatus; severity?: EscalationSeverity; routedToStage?: Stage },
      ) => {
        const qs = new URLSearchParams();
        if (q?.taskId) qs.set('taskId', q.taskId);
        if (q?.status) qs.set('status', q.status);
        if (q?.severity) qs.set('severity', q.severity);
        if (q?.routedToStage) qs.set('routedToStage', q.routedToStage);
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return request<EscalationRecord[]>(
          'GET',
          `/api/v1/projects/${projectId}/olos/escalations${suffix}`,
        );
      },
      create: (
        projectId: string,
        input: Omit<EscalationRecord, 'id' | 'projectId' | 'raisedAt'>,
      ) =>
        request<EscalationRecord>(
          'POST',
          `/api/v1/projects/${projectId}/olos/escalations`,
          input,
        ),
      get: (projectId: string, recordId: string) =>
        request<EscalationRecord>(
          'GET',
          `/api/v1/projects/${projectId}/olos/escalations/${recordId}`,
        ),
      update: (
        projectId: string,
        recordId: string,
        patch: Partial<Omit<EscalationRecord, 'id' | 'projectId' | 'raisedAt'>>,
      ) =>
        request<EscalationRecord>(
          'PATCH',
          `/api/v1/projects/${projectId}/olos/escalations/${recordId}`,
          patch,
        ),
      delete: (projectId: string, recordId: string) =>
        request<void>(
          'DELETE',
          `/api/v1/projects/${projectId}/olos/escalations/${recordId}`,
        ),
    },

    // ── StewardshipRoutine ────────────────────────────────────────────
    stewardshipRoutines: {
      list: (projectId: string, q?: { domainId?: UniversalDomain; frequency?: StewardshipFrequency }) => {
        const qs = new URLSearchParams();
        if (q?.domainId) qs.set('domainId', q.domainId);
        if (q?.frequency) qs.set('frequency', q.frequency);
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return request<StewardshipRoutine[]>(
          'GET',
          `/api/v1/projects/${projectId}/olos/stewardship-routines${suffix}`,
        );
      },
      create: (
        projectId: string,
        input: Omit<StewardshipRoutine, 'id' | 'projectId' | 'createdAt'>,
      ) =>
        request<StewardshipRoutine>(
          'POST',
          `/api/v1/projects/${projectId}/olos/stewardship-routines`,
          input,
        ),
      get: (projectId: string, recordId: string) =>
        request<StewardshipRoutine>(
          'GET',
          `/api/v1/projects/${projectId}/olos/stewardship-routines/${recordId}`,
        ),
      update: (
        projectId: string,
        recordId: string,
        patch: Partial<Omit<StewardshipRoutine, 'id' | 'projectId' | 'createdAt'>>,
      ) =>
        request<StewardshipRoutine>(
          'PATCH',
          `/api/v1/projects/${projectId}/olos/stewardship-routines/${recordId}`,
          patch,
        ),
      delete: (projectId: string, recordId: string) =>
        request<void>(
          'DELETE',
          `/api/v1/projects/${projectId}/olos/stewardship-routines/${recordId}`,
        ),
    },
  },
};

export interface RelationshipEdgePayload {
  fromId: string;
  fromOutput: string;
  toId: string;
  toInput: string;
  ratio?: number;
}

export interface RelationshipRecord extends RelationshipEdgePayload {
  id: string;
  createdAt: string;
}

export { ApiError };

export interface SolarExposureResponse {
  geojson: GeoJSON.FeatureCollection;
  summary: {
    mean_exposure: number;
    min_exposure: number;
    max_exposure: number;
    excellent_pct: number;
    high_pct: number;
    medium_pct: number;
    low_pct: number;
    sample_grid_size: number;
    resolution_m: number;
    source_api: string;
  };
}

export type WindRoseCompassCode = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface WindRoseResponse {
  frequencies: Record<WindRoseCompassCode, number>;
  /**
   * Per-bin mean wind speed in m/s. Optional — old cached payloads (pre-Beaufort)
   * may not include it; null entries mean the bin had zero non-calm samples.
   */
  meanSpeedsMs?: Record<WindRoseCompassCode, number | null>;
  source: string;
  windowYears: { start: number; end: number };
  sampleCount: number;
}

export interface ForecastCurrent {
  time: string;
  temperatureC: number | null;
  apparentC: number | null;
  isDay: boolean;
  precipitationMm: number | null;
  weatherCode: number | null;
  windSpeedMs: number | null;
  windDirectionDeg: number | null;
  humidity: number | null;
}

export interface ForecastHour {
  time: string;
  temperatureC: number | null;
  apparentC: number | null;
  precipitationMm: number | null;
  precipitationProbability: number | null;
  weatherCode: number | null;
  windSpeedMs: number | null;
  windDirectionDeg: number | null;
  humidity: number | null;
}

export interface ForecastDay {
  date: string;
  tempMaxC: number | null;
  tempMinC: number | null;
  precipitationSumMm: number | null;
  precipitationProbMax: number | null;
  weatherCode: number | null;
  windSpeedMaxMs: number | null;
  sunrise: string | null;
  sunset: string | null;
}

export interface WeatherForecastResponse {
  current: ForecastCurrent | null;
  hourly: ForecastHour[];
  daily: ForecastDay[];
  timezone: string;
  source: string;
  fetchedAt: string;
  coordinates: { lat: number; lng: number };
}

export interface ComfortGridResponse {
  geojson: GeoJSON.FeatureCollection;
  summary: {
    reference_mean_max_c: number;
    reference_mean_min_c: number;
    reference_elevation_m: number;
    freezing_pct: number;
    cold_pct: number;
    cool_pct: number;
    comfortable_pct: number;
    hot_pct: number;
    dominant_band: 'freezing' | 'cold' | 'cool' | 'comfortable' | 'hot';
    sample_grid_size: number;
    resolution_m: number;
    source_api: string;
  };
}
