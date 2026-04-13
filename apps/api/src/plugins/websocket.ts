/**
 * WebSocket plugin — registers @fastify/websocket and provides
 * connection management + broadcast utilities.
 *
 * Decorates:
 *   - fastify.wsConnections: Map of projectId → Map of userId → { socket, userName }
 *   - fastify.wsBroadcast(projectId, event, excludeUserId?): send to all project members
 */

import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import type { WsEvent } from '@ogden/shared';

export interface WsConnectionInfo {
  socket: WebSocket;
  userName: string;
  lastSeen: number;
}

declare module 'fastify' {
  interface FastifyInstance {
    wsConnections: Map<string, Map<string, WsConnectionInfo>>;
    wsBroadcast: (projectId: string, event: WsEvent, excludeUserId?: string) => void;
  }
}

// Stale connection timeout: 3× the client heartbeat interval (30s)
const STALE_TIMEOUT_MS = 90_000;
const STALE_CHECK_MS = 30_000;

export default fp(async (fastify: FastifyInstance) => {
  // Register the underlying WebSocket support
  await fastify.register(websocket);

  // Connection registry: projectId → userId → { socket, userName }
  const connections = new Map<string, Map<string, WsConnectionInfo>>();
  fastify.decorate('wsConnections', connections);

  // Broadcast to all connected clients in a project room
  fastify.decorate(
    'wsBroadcast',
    (projectId: string, event: WsEvent, excludeUserId?: string) => {
      const room = connections.get(projectId);
      if (!room) return;

      const message = JSON.stringify(event);
      for (const [userId, conn] of room) {
        if (userId === excludeUserId) continue;
        if (conn.socket.readyState === conn.socket.OPEN) {
          conn.socket.send(message);
        }
      }
    },
  );

  // Periodic stale connection cleanup — removes connections with no
  // heartbeat received within STALE_TIMEOUT_MS (90s)
  let staleTimer: ReturnType<typeof setInterval> | null = null;

  fastify.addHook('onReady', async () => {
    staleTimer = setInterval(() => {
      const now = Date.now();
      for (const [projectId, room] of connections) {
        for (const [userId, conn] of room) {
          if (now - conn.lastSeen > STALE_TIMEOUT_MS) {
            try {
              conn.socket.close(4000, 'Stale connection');
            } catch { /* ignore */ }
            room.delete(userId);
            fastify.log.info({ projectId, userId }, 'Removed stale WS connection');
          }
        }
        if (room.size === 0) connections.delete(projectId);
      }
    }, STALE_CHECK_MS);
  });

  // Cleanup all connections on server shutdown
  fastify.addHook('onClose', async () => {
    if (staleTimer) clearInterval(staleTimer);
    for (const room of connections.values()) {
      for (const conn of room.values()) {
        try {
          conn.socket.close(1001, 'Server shutting down');
        } catch { /* ignore */ }
      }
    }
    connections.clear();
  });
});
