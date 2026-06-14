// stewardRef -- one dual-ref vocabulary for linking a free-text steward name back
// to the canonical roster (Option 1 of the steward-data consolidation; see
// docs/steward-data-audit-2026-06-14.md).
//
// A steward reference is serialised as a single compact token so it slots into
// the existing parallel-`string[]` / JSON-row storage idioms used by the Act
// Tier-0 captures without introducing new container types:
//
//   'u:<userId>'  -- a joined member (precise, server-authoritative identity)
//   'e:<email>'   -- a pending invite (email bridge; invites carry no userId at
//                    founding time -- QueuedTeamInvite/StewardInvite have email only)
//   ''            -- off-platform / free-text (no link; the fallback)
//
// Decode is TOTAL: any unknown/blank/foreign token decodes to `null` and never
// throws. Encode is its lossless inverse. This keeps every pre-Option-1 saved
// decision round-tripping byte-identically.

import type { ProjectMemberRecord } from '@ogden/shared';
import type { StewardModel } from '../StewardCapture.js';
import type { StewardRosterEntry } from '../../../observe/modules/human-context/roster.js';

/** A link from a named steward back to the canonical roster, or `null` if none. */
export type StewardRef = { userId: string } | { email: string } | null;

/** Serialise a StewardRef to its compact token. `null` -> ''. */
export function encodeStewardRef(ref: StewardRef): string {
  if (ref === null) return '';
  if ('userId' in ref) {
    const id = ref.userId.trim();
    return id === '' ? '' : `u:${id}`;
  }
  const email = ref.email.trim();
  return email === '' ? '' : `e:${email}`;
}

/** Parse a token back to a StewardRef. TOTAL -- unknown/blank -> null, never throws. */
export function decodeStewardRef(token: string | undefined | null): StewardRef {
  if (typeof token !== 'string') return null;
  const t = token.trim();
  if (t === '') return null;
  if (t.startsWith('u:')) {
    const userId = t.slice(2).trim();
    return userId === '' ? null : { userId };
  }
  if (t.startsWith('e:')) {
    const email = t.slice(2).trim();
    return email === '' ? null : { email };
  }
  // Foreign / legacy token -- no link.
  return null;
}

/**
 * TOTAL coercion of a persisted NESTED ref object (as stored inside a JSON row
 * -- e.g. a ratify member or a cohort household) back to a StewardRef. Distinct
 * from decodeStewardRef, which parses the compact *token* used by parallel
 * `string[]` storage. Anything unexpected (legacy rows with no ref, blank ids,
 * junk) returns `undefined` so the row carries no link and re-encodes
 * byte-identically (`undefined` is dropped by JSON.stringify; `null` is not).
 */
export function coerceStewardRef(raw: unknown): StewardRef | undefined {
  if (raw === null || typeof raw !== 'object') return undefined;
  const o = raw as { userId?: unknown; email?: unknown };
  if (typeof o.userId === 'string' && o.userId.trim() !== '') {
    return { userId: o.userId };
  }
  if (typeof o.email === 'string' && o.email.trim() !== '') {
    return { email: o.email };
  }
  return undefined;
}

/** True when two refs point at the same identity (userId or email, case-insensitive email). */
export function sameStewardRef(a: StewardRef, b: StewardRef): boolean {
  if (a === null || b === null) return a === b;
  if ('userId' in a && 'userId' in b) return a.userId === b.userId;
  if ('email' in a && 'email' in b) {
    return a.email.toLowerCase() === b.email.toLowerCase();
  }
  return false;
}

/** One selectable identity in a StewardPicker. */
export interface StewardOption {
  ref: StewardRef;
  /** Display name (member displayName, else invite name, else email). */
  label: string;
  /** Secondary line -- email when known. */
  sub: string;
  kind: 'member' | 'invite';
}

function memberLabel(member: ProjectMemberRecord): string {
  const dn = (member.displayName ?? '').trim();
  if (dn !== '') return dn;
  const email = member.email.trim();
  return email !== '' ? email : 'Member';
}

/**
 * Members-only option list (joined members from the canonical roster). Used by
 * work assignment, where a task cannot be assigned to a not-yet-joined invite
 * (there is no userId to assign to). Dedupes by lowercased email. Pure, non-hook.
 */
export function memberStewardOptions(
  roster: readonly StewardRosterEntry[],
): StewardOption[] {
  const out: StewardOption[] = [];
  const seenEmails = new Set<string>();
  for (const entry of roster) {
    const member = entry.member;
    const email = member.email.trim();
    const key = email.toLowerCase();
    if (key !== '' && seenEmails.has(key)) continue;
    if (key !== '') seenEmails.add(key);
    out.push({
      ref: { userId: member.userId },
      label: memberLabel(member),
      sub: email,
      kind: 'member',
    });
  }
  return out;
}

/**
 * Merge the canonical roster (joined members) with the pending StewardCapture
 * invites into one option list. Pure, non-hook so tests and non-React callers
 * (getStewardRoster) can use it.
 *
 * Dedupe by lowercased email: a member who also appears as a pending invite
 * collapses to the member (userId wins -- the precise identity). Members are
 * listed first, then invites that introduce a new email.
 */
export function buildStewardOptions(
  roster: readonly StewardRosterEntry[],
  model: StewardModel,
): StewardOption[] {
  const out: StewardOption[] = memberStewardOptions(roster);
  const seenEmails = new Set<string>(
    out.map((o) => o.sub.trim().toLowerCase()).filter((k) => k !== ''),
  );

  for (const invite of model.invites) {
    const email = invite.email.trim();
    const key = email.toLowerCase();
    // An invite with no email cannot be referenced (the link key is the email);
    // skip it -- it has no stable handle until the person joins.
    if (key === '') continue;
    if (seenEmails.has(key)) continue;
    seenEmails.add(key);
    const name = invite.name.trim();
    out.push({
      ref: { email },
      label: name !== '' ? name : email,
      sub: email,
      kind: 'invite',
    });
  }

  return out;
}

/** Find the option whose ref matches `ref`, if any (for resolving a stored ref to a label). */
export function findStewardOption(
  options: readonly StewardOption[],
  ref: StewardRef,
): StewardOption | undefined {
  if (ref === null) return undefined;
  return options.find((o) => sameStewardRef(o.ref, ref));
}
