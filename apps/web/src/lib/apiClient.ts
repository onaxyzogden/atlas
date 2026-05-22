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
  ProjectStateBlob,
  UpsertProjectStateInput,
  VegetationPatchSummary,
  CreateVegetationPatchInput,
  UpdateVegetationPatchInput,
  SuccessionMilestoneSummary,
  CreateSuccessionMilestoneInput,
  UpdateSuccessionMilestoneInput,
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

  const response = await fetch(path, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    signal,
  });

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
    throw new ApiError(
      json.error?.code ?? 'UNKNOWN',
      json.error?.message ?? `Request failed (${response.status})`,
      response.status,
      json.error?.details,
    );
  }

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
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/v1/projects/${projectId}/files`);

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
              reject(new ApiError(
                json.error?.code ?? 'UNKNOWN',
                json.error?.message ?? `Upload failed (${xhr.status})`,
                xhr.status,
                json.error?.details,
              ));
            }
          } catch {
            reject(new ApiError('PARSE_ERROR', `Response not JSON (${xhr.status})`, xhr.status));
          }
        };

        xhr.onerror = () => {
          reject(new ApiError('NETWORK_ERROR', 'Network error during upload', 0));
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

    uploadMedia: (projectId: string, file: File): Promise<ApiEnvelope<{
      url: string;
      contentType: string;
      size: number;
      filename: string;
    }>> => {
      const formData = new FormData();
      formData.append('file', file);
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      return fetch(`/api/v1/projects/${projectId}/regeneration-events/media`, {
        method: 'POST',
        headers,
        body: formData,
      }).then(async (res) => {
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new ApiError(
            json.error?.code ?? 'UPLOAD_FAILED',
            json.error?.message ?? json.message ?? `Upload failed (${res.status})`,
            res.status,
          );
        }
        return json;
      });
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
