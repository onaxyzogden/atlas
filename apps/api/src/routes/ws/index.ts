/**
 * WebSocket route — real-time collaboration channel for project members.
 *
 * Endpoint: GET /api/v1/ws/projects/:id?token=JWT
 *
 * Authentication: JWT passed as query parameter (browser WebSocket API
 * cannot send custom Authorization headers on upgrade).
 *
 * On connection:
 *   - Verify JWT and project membership
 *   - Add to connection registry
 *   - Broadcast presence_join to other project members
 *
 * Client messages: presence_heartbeat, typing_start, typing_stop
 * Server messages: feature_*, comment_*, layer_complete, export_ready, presence_*, typing_*
 */

import type { FastifyInstance } from 'fastify';
import type { WsEvent } from '@ogden/shared';

export default async function wsRoutes(fastify: FastifyInstance) {
  const { db } = fastify;

  fastify.get<{ Params: { id: string }; Querystring: { token?: string } }>(
    '/projects/:id',
    { websocket: true },
    async (socket, req) => {
      const projectId = req.params.id;
      const token = req.query.token;

      // ── Auth: verify JWT ──────────────────────────────────────────────
      if (!token) {
        socket.close(4001, 'Missing token');
        return;
      }

      let userId: string;
      let userEmail: string;
      let userName: string;
      try {
        const payload = fastify.jwt.verify<{ sub: string; email: string }>(token);
        userId = payload.sub;
        userEmail = payload.email;
        // Look up display name
        const [user] = await db`SELECT display_name FROM users WHERE id = ${userId}`;
        userName = (user?.display_name as string) ?? userEmail.split('@')[0] ?? 'Unknown';
      } catch {
        socket.close(4001, 'Invalid or expired token');
        return;
      }

      // ── Auth: verify project membership ───────────────────────────────
      try {
        const [project] = await db`
          SELECT id, owner_id FROM projects WHERE id = ${projectId}
        `;
        if (!project) {
          socket.close(4004, 'Project not found');
          return;
        }

        if (project.owner_id !== userId) {
          const [membership] = await db`
            SELECT role FROM project_members
            WHERE project_id = ${projectId} AND user_id = ${userId}
          `;
          if (!membership) {
            socket.close(4003, 'Not a project member');
            return;
          }
        }
      } catch (err) {
        fastify.log.error(err, '[WS] Auth check failed');
        socket.close(4500, 'Server error during auth');
        return;
      }

      // ── Register connection ──────────────────────────────────────────��
      const connections = fastify.wsConnections;
      if (!connections.has(projectId)) {
        connections.set(projectId, new Map());
      }

      // Close any existing connection from the same user (e.g., stale tab)
      const room = connections.get(projectId)!;
      const existing = room.get(userId);
      if (existing) {
        try { existing.socket.close(4009, 'Replaced by new connection'); } catch { /* */ }
      }

      room.set(userId, { socket, userName, lastSeen: Date.now() });
      fastify.log.info(`[WS] ${userName} joined project ${projectId} (${room.size} connected)`);

      // ── Broadcast presence_join to others ──────────────────────────────
      const joinEvent: WsEvent = {
        type: 'presence_join',
        payload: { userName, userEmail },
        userId,
        userName,
        timestamp: new Date().toISOString(),
      };
      fastify.wsBroadcast(projectId, joinEvent, userId);

      // Send current presence list to the new connection
      const presenceList = Array.from(room.entries())
        .filter(([uid]) => uid !== userId)
        .map(([uid, conn]) => ({
          userId: uid,
          userName: conn.userName,
          lastSeen: conn.lastSeen,
        }));
      socket.send(JSON.stringify({
        type: 'presence_sync',
        payload: { users: presenceList },
        userId: 'system',
        userName: null,
        timestamp: new Date().toISOString(),
      }));

      // ── Message handling ──────────────────────────────────────────────
      socket.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          switch (msg.type) {
            case 'presence_heartbeat': {
              const conn = room.get(userId);
              if (conn) conn.lastSeen = Date.now();
              break;
            }
            case 'typing_start': {
              fastify.wsBroadcast(projectId, {
                type: 'typing_start',
                payload: { action: msg.payload?.action ?? 'editing' },
                userId,
                userName,
                timestamp: new Date().toISOString(),
              }, userId);
              break;
            }
            case 'typing_stop': {
              fastify.wsBroadcast(projectId, {
                type: 'typing_stop',
                payload: {},
                userId,
                userName,
                timestamp: new Date().toISOString(),
              }, userId);
              break;
            }
          }
        } catch {
          // Ignore malformed messages
        }
      });

      // ── Cleanup on disconnect ─────────────────────────────────────────
      socket.on('close', () => {
        room.delete(userId);
        if (room.size === 0) {
          connections.delete(projectId);
        }

        fastify.log.info(`[WS] ${userName} left project ${projectId}`);

        const leaveEvent: WsEvent = {
          type: 'presence_leave',
          payload: {},
          userId,
          userName,
          timestamp: new Date().toISOString(),
        };
        fastify.wsBroadcast(projectId, leaveEvent);
      });

      socket.on('error', (err) => {
        fastify.log.warn(err, `[WS] Socket error for ${userName} in project ${projectId}`);
      });
    },
  );
}
