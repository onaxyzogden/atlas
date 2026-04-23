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
  ProjectFile,
  ExportRecord,
  PortalRecord,
  CreatePortalInput,
  CommentRecord,
  CreateCommentInput,
  UpdateCommentInput,
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

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
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
      request<{ id: string; email: string; displayName: string | null }>('GET', '/api/v1/auth/me'),
  },

  projects: {
    list: () =>
      request<ProjectSummary[]>('GET', '/api/v1/projects'),

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
  },

  templates: {
    list: () =>
      request<Array<{
        id: string;
        ownerId: string;
        name: string;
        sourceProjectId: string | null;
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

    instantiate: (id: string, input: { name: string }) =>
      request<ProjectSummary>('POST', `/api/v1/templates/${id}/instantiate`, input),
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
  },
};
