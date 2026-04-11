/**
 * Presence store — ephemeral state for real-time collaboration awareness.
 *
 * Tracks which users are connected to the current project and whether
 * they are actively typing/drawing. Not persisted to localStorage.
 */

import { create } from 'zustand';
import type { WsEvent } from '@ogden/shared';

export interface PresenceUser {
  userId: string;
  userName: string;
  lastSeen: number;
  isTyping: boolean;
  typingAction: string | null;
}

interface PresenceState {
  users: Map<string, PresenceUser>;

  /** Handle presence_join / presence_leave / presence_sync events */
  handlePresenceEvent: (event: WsEvent) => void;

  /** Handle typing_start / typing_stop events */
  handleTypingEvent: (event: WsEvent) => void;

  /** Remove users not seen in the last 60 seconds */
  pruneStale: () => void;

  /** Clear all presence (on disconnect or project change) */
  clear: () => void;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  users: new Map(),

  handlePresenceEvent: (event) => {
    set((state) => {
      const users = new Map(state.users);

      switch (event.type) {
        case 'presence_join': {
          users.set(event.userId, {
            userId: event.userId,
            userName: event.userName ?? event.userId,
            lastSeen: Date.now(),
            isTyping: false,
            typingAction: null,
          });
          break;
        }
        case 'presence_leave': {
          users.delete(event.userId);
          break;
        }
        case 'presence_heartbeat': {
          const existing = users.get(event.userId);
          if (existing) {
            users.set(event.userId, { ...existing, lastSeen: Date.now() });
          }
          break;
        }
      }

      // Handle presence_sync (bulk user list from server on connect)
      if (event.type === 'presence_join' && event.payload && 'users' in event.payload) {
        // This is actually a presence_sync — handled in wsService directly
      }

      return { users };
    });
  },

  handleTypingEvent: (event) => {
    set((state) => {
      const users = new Map(state.users);
      const existing = users.get(event.userId);

      if (event.type === 'typing_start') {
        const payload = event.payload as Record<string, unknown>;
        if (existing) {
          users.set(event.userId, {
            ...existing,
            isTyping: true,
            typingAction: (payload.action as string) ?? 'editing',
            lastSeen: Date.now(),
          });
        } else {
          users.set(event.userId, {
            userId: event.userId,
            userName: event.userName ?? event.userId,
            lastSeen: Date.now(),
            isTyping: true,
            typingAction: (payload.action as string) ?? 'editing',
          });
        }
      } else if (event.type === 'typing_stop') {
        if (existing) {
          users.set(event.userId, {
            ...existing,
            isTyping: false,
            typingAction: null,
            lastSeen: Date.now(),
          });
        }
      }

      return { users };
    });
  },

  pruneStale: () => {
    const cutoff = Date.now() - 60_000;
    set((state) => {
      const users = new Map(state.users);
      for (const [userId, user] of users) {
        if (user.lastSeen < cutoff) {
          users.delete(userId);
        }
      }
      return { users };
    });
  },

  clear: () => {
    set({ users: new Map() });
  },
}));
