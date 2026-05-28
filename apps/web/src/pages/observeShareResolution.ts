/**
 * observeShareResolution — pure helper extracted from
 * `ObserveShareViewerPage` so the expiry / unknown / ready discrimination
 * can be unit-tested without React, the router, or the project store.
 *
 * The viewer wraps a single call: `resolveShare(token, resolveTokenFn)`.
 * Clock is injected (`now`) so vitest can pin the wall clock instead of
 * relying on `Date.now()`.
 */

import type { PresentationShare } from '@ogden/shared';

export type ShareResolution =
  | { kind: 'loading' }
  | { kind: 'unavailable'; reason: 'unknown' | 'expired' | 'missing-project' }
  | { kind: 'ready'; projectId: string; share: PresentationShare };

export type ResolveTokenFn = (
  token: string,
) => { projectId: string; share: PresentationShare } | null;

export function resolveShare(
  token: string,
  resolveTokenFn: ResolveTokenFn,
  now: number = Date.now(),
): ShareResolution {
  const hit = resolveTokenFn(token);
  if (!hit) return { kind: 'unavailable', reason: 'unknown' };
  const { share, projectId } = hit;
  if (share.expiresAt) {
    const expiresMs = Date.parse(share.expiresAt);
    if (Number.isFinite(expiresMs) && expiresMs < now) {
      return { kind: 'unavailable', reason: 'expired' };
    }
  }
  return { kind: 'ready', projectId, share };
}
