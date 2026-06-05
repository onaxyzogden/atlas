/**
 * presentationShareStore — Phase 4 Slice 4.1 substrate for the
 * Observe Presentation Mode share-link surface (Dashboard Spec §6).
 *
 * Tokens are 32-char random strings persisted per project. The
 * viewer route `/v3/observe/share/$token` resolves the token by
 * iterating projects (resolution is rare; the global token index
 * lives in the project record's metadata for sync parity but the
 * authoritative shape here is byProject).
 *
 * Per the locked Phase 4 decision: local-first; the server endpoint
 * is deferred to a follow-up engineering task. Expiry buckets per
 * spec §6.2 — `permanent` carries `expiresAt = null`; `7d` / `30d` /
 * `90d` materialise the ISO timestamp at creation so the viewer
 * route never has to recompute against `createdAt`.
 *
 * Persistence: Zustand `persist` middleware, key `ogden-observe-
 * shares`. Registered as `versioned-blob` `byProject` in
 * `syncManifest.ts`. Rehydration logged via `rehydrateWithLogging`.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import type {
  PresentationShare,
  PresentationShareExpiry,
  PresentationShareSectionId,
} from '@ogden/shared';

const PERSIST_KEY = 'ogden-observe-shares';

type ByProject = Record<string, PresentationShare[]>;

const EMPTY_SHARES: readonly PresentationShare[] = Object.freeze([]);

const EXPIRY_DAYS: Record<PresentationShareExpiry, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  permanent: null,
};

interface CreateShareInput {
  projectId: string;
  expiry: PresentationShareExpiry;
  sections?: readonly PresentationShareSectionId[];
  /** Override the clock for tests / fixtures. */
  now?: Date | string;
  /** Override the token for tests. Defaults to `randomToken()`. */
  token?: string;
}

interface PresentationShareState {
  byProject: ByProject;

  // --- selectors ---
  listByProject: (projectId: string) => readonly PresentationShare[];
  /** Walks every project's shares to find the matching token. Used
   *  by the public viewer route — call sparingly. */
  resolveToken: (
    token: string,
  ) => { projectId: string; share: PresentationShare } | null;

  // --- mutators ---
  createShare: (input: CreateShareInput) => PresentationShare;
  revokeShare: (projectId: string, token: string) => void;
  clearForProject: (projectId: string) => void;
}

/** 32-char URL-safe token. Browser-only — guards crypto for SSR. */
export function randomToken(): string {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(24);
    globalThis.crypto.getRandomValues(bytes);
    return btoaUrl(bytes);
  }
  // Non-secure fallback for environments without WebCrypto (older
  // jsdom / node). Tests can override via the `token` input.
  let out = '';
  while (out.length < 32) {
    out += Math.random().toString(36).slice(2);
  }
  return out.slice(0, 32);
}

function btoaUrl(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 =
    typeof btoa === 'function'
      ? btoa(bin)
      : Buffer.from(bin, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function resolveExpiresAt(
  expiry: PresentationShareExpiry,
  nowMs: number,
): string | null {
  const days = EXPIRY_DAYS[expiry];
  if (days === null) return null;
  return new Date(nowMs + days * 86_400_000).toISOString();
}

export const usePresentationShareStore = create<PresentationShareState>()(
  persist(
    (set, get) => ({
      byProject: {},

      listByProject: (projectId) =>
        get().byProject[projectId] ?? EMPTY_SHARES,

      resolveToken: (token) => {
        const byProject = get().byProject;
        for (const [projectId, shares] of Object.entries(byProject)) {
          for (const share of shares) {
            if (share.token === token) return { projectId, share };
          }
        }
        return null;
      },

      createShare: (input) => {
        const nowMs =
          input.now instanceof Date
            ? input.now.getTime()
            : typeof input.now === 'string'
              ? Date.parse(input.now)
              : Date.now();
        const share: PresentationShare = {
          token: input.token ?? randomToken(),
          projectId: input.projectId,
          createdAt: new Date(nowMs).toISOString(),
          expiresAt: resolveExpiresAt(input.expiry, nowMs),
          expiry: input.expiry,
          sections: [...(input.sections ?? [])],
        };
        set((s) => {
          const list = s.byProject[input.projectId] ?? [];
          return {
            byProject: {
              ...s.byProject,
              [input.projectId]: [...list, share],
            },
          };
        });
        return share;
      },

      revokeShare: (projectId, token) =>
        set((s) => {
          const list = s.byProject[projectId];
          if (!list) return s;
          const next = list.filter((sh) => sh.token !== token);
          if (next.length === list.length) return s;
          return {
            byProject: { ...s.byProject, [projectId]: next },
          };
        }),

      clearForProject: (projectId) =>
        set((s) => {
          if (!(projectId in s.byProject)) return s;
          const { [projectId]: _dropped, ...rest } = s.byProject;
          return { byProject: rest };
        }),
    }),
    {
      name: PERSIST_KEY,
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 1,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(usePresentationShareStore);
