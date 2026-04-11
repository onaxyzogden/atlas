/**
 * WebSocket service — manages the real-time connection to the server
 * for a specific project room.
 *
 * Handles: connection lifecycle, reconnect with exponential backoff,
 * heartbeat keep-alive, and event dispatch to Zustand stores.
 */

import type { WsEvent, DesignFeatureSummary } from '@ogden/shared';
import { setSyncGuard } from './syncService.js';
import { designFeatureToZone, designFeatureToStructure } from './featureMapping.js';
import { useZoneStore } from '../store/zoneStore.js';
import { useStructureStore } from '../store/structureStore.js';
import { usePresenceStore } from '../store/presenceStore.js';
import { useProjectStore } from '../store/projectStore.js';
import { api } from './apiClient.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 30_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const RECONNECT_MULTIPLIER = 2;

// ─── State ───────────────────────────────────────────────────────────────────

let ws: WebSocket | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = RECONNECT_BASE_MS;
let currentProjectServerId: string | null = null;
let currentToken: string | null = null;
let intentionalClose = false;

// Typing throttle
let lastTypingSent = 0;
const TYPING_THROTTLE_MS = 2_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWsBaseUrl(): string {
  const loc = window.location;
  const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  // In dev, Vite proxies /api to localhost:3001
  return `${proto}//${loc.host}`;
}

function getProjectLocalId(serverId: string): string | undefined {
  return useProjectStore.getState().projects.find((p) => p.serverId === serverId)?.id;
}

// ─── Event Dispatch ──────────────────────────────────────────────────────────

function dispatchEvent(event: WsEvent) {
  switch (event.type) {
    case 'feature_created':
      handleFeatureCreated(event);
      break;
    case 'feature_updated':
      handleFeatureUpdated(event);
      break;
    case 'feature_deleted':
      handleFeatureDeleted(event);
      break;
    case 'comment_added':
      handleCommentAdded(event);
      break;
    case 'comment_resolved':
      handleCommentResolved(event);
      break;
    case 'comment_deleted':
      handleCommentDeleted(event);
      break;
    case 'layer_complete':
      handleLayerComplete(event);
      break;
    case 'export_ready':
      handleExportReady(event);
      break;
    case 'presence_join':
    case 'presence_leave':
    case 'presence_heartbeat':
      usePresenceStore.getState().handlePresenceEvent(event);
      break;
    case 'typing_start':
    case 'typing_stop':
      usePresenceStore.getState().handleTypingEvent(event);
      break;
  }
}

function handleFeatureCreated(event: WsEvent) {
  const payload = event.payload as unknown as DesignFeatureSummary;
  if (!payload?.id || !currentProjectServerId) return;

  const projectLocalId = getProjectLocalId(currentProjectServerId);
  if (!projectLocalId) return;

  setSyncGuard(true);
  try {
    if (payload.featureType === 'zone') {
      // Skip if already exists by serverId
      const existing = useZoneStore.getState().zones.find((z) => z.serverId === payload.id);
      if (!existing) {
        const zone = designFeatureToZone(payload, projectLocalId);
        useZoneStore.getState().addZone(zone);
      }
    } else if (payload.featureType === 'structure') {
      const existing = useStructureStore.getState().structures.find((s) => s.serverId === payload.id);
      if (!existing) {
        const structure = designFeatureToStructure(payload, projectLocalId);
        useStructureStore.getState().addStructure(structure);
      }
    }
  } finally {
    setSyncGuard(false);
  }
}

function handleFeatureUpdated(event: WsEvent) {
  const payload = event.payload as unknown as DesignFeatureSummary;
  if (!payload?.id || !currentProjectServerId) return;

  const projectLocalId = getProjectLocalId(currentProjectServerId);
  if (!projectLocalId) return;

  setSyncGuard(true);
  try {
    if (payload.featureType === 'zone') {
      const existing = useZoneStore.getState().zones.find((z) => z.serverId === payload.id);
      if (existing) {
        const merged = designFeatureToZone(payload, projectLocalId);
        useZoneStore.getState().updateZone(existing.id, { ...merged, id: existing.id });
      }
    } else if (payload.featureType === 'structure') {
      const existing = useStructureStore.getState().structures.find((s) => s.serverId === payload.id);
      if (existing) {
        const merged = designFeatureToStructure(payload, projectLocalId);
        useStructureStore.getState().updateStructure(existing.id, { ...merged, id: existing.id });
      }
    }
  } finally {
    setSyncGuard(false);
  }
}

function handleFeatureDeleted(event: WsEvent) {
  const payload = event.payload as Record<string, unknown>;
  const featureId = payload.id as string;
  if (!featureId) return;

  setSyncGuard(true);
  try {
    // Try zones first
    const zone = useZoneStore.getState().zones.find((z) => z.serverId === featureId);
    if (zone) {
      useZoneStore.getState().deleteZone(zone.id);
      return;
    }
    // Then structures
    const structure = useStructureStore.getState().structures.find((s) => s.serverId === featureId);
    if (structure) {
      useStructureStore.getState().deleteStructure(structure.id);
    }
  } finally {
    setSyncGuard(false);
  }
}

async function handleCommentAdded(event: WsEvent) {
  const payload = event.payload as Record<string, unknown>;
  if (!payload.id) return;

  // Dynamically import to avoid circular dependency
  const { useCommentStore } = await import('../store/commentStore.js');
  const existing = useCommentStore.getState().comments.find(
    (c) => c.serverId === payload.id || c.id === payload.id,
  );
  if (existing) return; // Already have it

  const comment = {
    id: (payload.id as string),
    serverId: (payload.id as string),
    projectId: (payload.projectId as string) ?? '',
    author: (payload.authorName as string) ?? (payload.author as string) ?? 'Unknown',
    authorId: (payload.authorId as string) ?? event.userId,
    text: (payload.text as string) ?? '',
    location: (payload.location as [number, number] | null) ?? null,
    featureId: (payload.featureId as string | null) ?? null,
    featureType: (payload.featureType as string | null) ?? null,
    resolved: false,
    createdAt: (payload.createdAt as string) ?? event.timestamp,
    updatedAt: (payload.updatedAt as string) ?? event.timestamp,
  };

  useCommentStore.getState().addComment(comment);
}

async function handleCommentResolved(event: WsEvent) {
  const payload = event.payload as Record<string, unknown>;
  const commentId = payload.commentId as string;
  if (!commentId) return;

  const { useCommentStore } = await import('../store/commentStore.js');
  const comment = useCommentStore.getState().comments.find(
    (c) => c.serverId === commentId || c.id === commentId,
  );
  if (comment) {
    useCommentStore.getState().updateComment(comment.id, { resolved: true });
  }
}

async function handleCommentDeleted(event: WsEvent) {
  const payload = event.payload as Record<string, unknown>;
  const commentId = payload.commentId as string;
  if (!commentId) return;

  const { useCommentStore } = await import('../store/commentStore.js');
  const comment = useCommentStore.getState().comments.find(
    (c) => c.serverId === commentId || c.id === commentId,
  );
  if (comment) {
    useCommentStore.getState().deleteComment(comment.id);
  }
}

function handleLayerComplete(event: WsEvent) {
  // Mark layers stale — the dashboard/map will re-fetch on next access
  // For now, log it. The siteDataStore can be triggered to re-fetch.
  const payload = event.payload as Record<string, unknown>;
  console.info(`[WS] Layer complete: ${payload.layerType} (confidence: ${payload.confidence})`);

  // TODO: trigger useSiteDataStore re-fetch for the active project
}

function handleExportReady(event: WsEvent) {
  const payload = event.payload as Record<string, unknown>;
  console.info(`[WS] Export ready: ${payload.exportType}`);

  // Show a toast notification if available
  // For now, dispatch a custom event that components can listen to
  window.dispatchEvent(new CustomEvent('ogden:export-ready', {
    detail: {
      exportType: payload.exportType,
      storageUrl: payload.storageUrl,
      id: payload.id,
    },
  }));
}

// ─── Presence sync handler ───────────────────────────────────────────────────

function handlePresenceSync(data: { users: Array<{ userId: string; userName: string; lastSeen: number }> }) {
  const store = usePresenceStore.getState();
  for (const user of data.users) {
    store.handlePresenceEvent({
      type: 'presence_join',
      payload: { userName: user.userName },
      userId: user.userId,
      userName: user.userName,
      timestamp: new Date().toISOString(),
    });
  }
}

// ─── Reconnection ────────────────────────────────────────────────────────────

function scheduleReconnect() {
  if (intentionalClose || !currentProjectServerId || !currentToken) return;

  reconnectTimer = setTimeout(() => {
    console.info(`[WS] Reconnecting (delay: ${reconnectDelay}ms)...`);
    if (currentProjectServerId && currentToken) {
      connectWs(currentProjectServerId, currentToken);
    }
    reconnectDelay = Math.min(reconnectDelay * RECONNECT_MULTIPLIER, RECONNECT_MAX_MS);
  }, reconnectDelay);
}

async function reconcileOnReconnect() {
  if (!currentProjectServerId) return;

  const projectLocalId = getProjectLocalId(currentProjectServerId);
  if (!projectLocalId) return;

  console.info('[WS] Reconciling state after reconnect...');

  setSyncGuard(true);
  try {
    // Re-fetch features
    const { data: serverFeatures } = await api.designFeatures.list(currentProjectServerId);
    const zones = useZoneStore.getState().zones.filter((z) => z.projectId === projectLocalId);
    const structures = useStructureStore.getState().structures.filter((s) => s.projectId === projectLocalId);

    for (const sf of serverFeatures) {
      if (sf.featureType === 'zone') {
        const existing = zones.find((z) => z.serverId === sf.id);
        if (existing) {
          const merged = designFeatureToZone(sf, projectLocalId);
          useZoneStore.getState().updateZone(existing.id, { ...merged, id: existing.id });
        } else {
          useZoneStore.getState().addZone(designFeatureToZone(sf, projectLocalId));
        }
      } else if (sf.featureType === 'structure') {
        const existing = structures.find((s) => s.serverId === sf.id);
        if (existing) {
          const merged = designFeatureToStructure(sf, projectLocalId);
          useStructureStore.getState().updateStructure(existing.id, { ...merged, id: existing.id });
        } else {
          useStructureStore.getState().addStructure(designFeatureToStructure(sf, projectLocalId));
        }
      }
    }

    // Re-fetch comments
    const { useCommentStore } = await import('../store/commentStore.js');
    await useCommentStore.getState().fetchComments(currentProjectServerId);
  } catch (err) {
    console.warn('[WS] Reconciliation failed:', err);
  } finally {
    setSyncGuard(false);
  }
}

// ─── Core Connection ─────────────────────────────────────────────────────────

function connectWs(projectServerId: string, token: string) {
  // Close existing connection
  if (ws) {
    try { ws.close(); } catch { /* */ }
    ws = null;
  }

  const url = `${getWsBaseUrl()}/api/v1/ws/projects/${projectServerId}?token=${encodeURIComponent(token)}`;
  ws = new WebSocket(url);

  ws.onopen = () => {
    console.info(`[WS] Connected to project ${projectServerId}`);
    reconnectDelay = RECONNECT_BASE_MS; // Reset backoff

    // Start heartbeat
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'presence_heartbeat' }));
      }
    }, HEARTBEAT_INTERVAL_MS);
  };

  ws.onmessage = (msgEvent) => {
    try {
      const data = JSON.parse(msgEvent.data as string);

      // Handle presence_sync separately (not a standard WsEvent)
      if (data.type === 'presence_sync' && data.payload?.users) {
        handlePresenceSync(data.payload);
        return;
      }

      dispatchEvent(data as WsEvent);
    } catch {
      // Ignore malformed messages
    }
  };

  ws.onclose = (closeEvent) => {
    console.info(`[WS] Disconnected (code: ${closeEvent.code}, reason: ${closeEvent.reason})`);
    stopHeartbeat();
    ws = null;

    if (!intentionalClose) {
      scheduleReconnect();
    }
  };

  ws.onerror = () => {
    // onclose will fire after this
  };
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const wsService = {
  /**
   * Connect to the WebSocket server for a specific project.
   */
  connect(projectServerId: string, token: string): void {
    intentionalClose = false;
    currentProjectServerId = projectServerId;
    currentToken = token;
    reconnectDelay = RECONNECT_BASE_MS;

    usePresenceStore.getState().clear();
    connectWs(projectServerId, token);
  },

  /**
   * Cleanly disconnect from the WebSocket server.
   */
  disconnect(): void {
    intentionalClose = true;
    currentProjectServerId = null;
    currentToken = null;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    stopHeartbeat();

    if (ws) {
      try { ws.close(1000, 'Client disconnecting'); } catch { /* */ }
      ws = null;
    }

    usePresenceStore.getState().clear();
  },

  /**
   * Send a typing_start signal (throttled to prevent spam).
   */
  sendTyping(action = 'editing'): void {
    const now = Date.now();
    if (now - lastTypingSent < TYPING_THROTTLE_MS) return;
    lastTypingSent = now;

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'typing_start', payload: { action } }));
    }
  },

  /**
   * Send a typing_stop signal.
   */
  stopTyping(): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'typing_stop' }));
    }
  },

  /** Whether the WebSocket is currently connected. */
  get isConnected(): boolean {
    return ws?.readyState === WebSocket.OPEN;
  },
};
