/**
 * Redis pub/sub helpers for broadcasting WebSocket events.
 *
 * Used by components that don't have access to the Fastify instance
 * (e.g., BullMQ workers in DataPipelineOrchestrator) to publish
 * events that the WebSocket plugin relays to connected clients.
 */

import type { Redis } from 'ioredis';
import type { WsEvent } from '@ogden/shared';

const CHANNEL = 'ogden:ws:broadcast';

/**
 * Publish a WS event to the Redis broadcast channel.
 * The WebSocket plugin's subscriber will relay it to connected clients.
 */
export function publishBroadcast(
  redis: Redis,
  projectId: string,
  event: WsEvent,
): void {
  redis.publish(CHANNEL, JSON.stringify({ projectId, event })).catch((err) => {
    console.warn('[WS-BROADCAST] Redis publish failed:', err);
  });
}

/**
 * Subscribe to the Redis broadcast channel and relay messages.
 * IMPORTANT: Creates a duplicate Redis connection (ioredis subscriber mode
 * blocks the connection for other commands).
 *
 * @returns The subscriber Redis instance (caller must close on shutdown).
 */
export function subscribeBroadcast(
  redis: Redis,
  onMessage: (projectId: string, event: WsEvent) => void,
): Redis {
  const sub = redis.duplicate();
  sub.subscribe(CHANNEL).catch((err) => {
    console.warn('[WS-BROADCAST] Redis subscribe failed:', err);
  });
  sub.on('message', (_channel: string, message: string) => {
    try {
      const parsed = JSON.parse(message) as { projectId: string; event: WsEvent };
      onMessage(parsed.projectId, parsed.event);
    } catch (err) {
      console.warn('[WS-BROADCAST] Failed to parse broadcast message:', err);
    }
  });
  return sub;
}
