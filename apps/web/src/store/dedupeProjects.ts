import type { LocalProject } from './projectStore';

/**
 * Collapse same-identity duplicate projects down to a single surviving row.
 *
 * The portfolio can accrue two rows for the SAME project when a create is
 * raced or retried across sync paths. Those duplicates carry DISTINCT local
 * ids and DISTINCT serverIds, so neither the client's local id nor the server's
 * `client_local_id` key can see them as one -- only their shared identity
 * (name + projectType + country) can. This is that collapse, meant to run at
 * server-reconciliation moments (initialSync pull, builtin merge), never
 * mid-edit.
 *
 * Identity = name + projectType + country, each trimmed + lowercased, AND split
 * by builtin class: a system builtin "Sample" (chip "Sample") and a non-builtin
 * demo clone of the same name (chip "Synced") render differently and serve
 * different purposes, so they are keyed into separate groups and never merged
 * into each other.
 *
 * Within a group the survivor is chosen, in order:
 *   1. a builtin over a non-builtin -- a no-op under the class-split key above,
 *      kept as a defensive invariant so the fn is still correct if ever reused
 *      on an unsplit set;
 *   2. the earliest `createdAt` -- the steward's headline rule, and the one that
 *      decides the observed two-"Synced"-rows case exactly;
 *   3. on an exact tie, the row that already has a `serverId` (keeping a
 *      serverId-less winner would re-mint a fresh server row on the next push,
 *      since its clientLocalId differs), then first-seen.
 *
 * Nothing is deleted server-side: every dropped loser is `console.warn`ed with
 * its orphan serverId so the hidden row stays diagnosable and recoverable.
 *
 * Pure and side-effect-free except for console.warn, so it unit-tests in
 * isolation. Survivors are emitted in their original input order; when nothing
 * is duplicated the input array is returned by reference (stable for selectors).
 */
export function dedupeProjectsByIdentity(projects: LocalProject[]): LocalProject[] {
  // Group input indices by identity key, preserving first-seen order.
  const groups = new Map<string, number[]>();
  for (let i = 0; i < projects.length; i++) {
    const key = identityKey(projects[i]!);
    const bucket = groups.get(key);
    if (bucket) bucket.push(i);
    else groups.set(key, [i]);
  }

  // Fast path: nothing duplicated -> return the input untouched.
  let hasDupes = false;
  for (const bucket of groups.values()) {
    if (bucket.length > 1) {
      hasDupes = true;
      break;
    }
  }
  if (!hasDupes) return projects;

  // Pick the survivor per group; warn + mark every other row as dropped.
  const dropped = new Set<number>();
  for (const bucket of groups.values()) {
    if (bucket.length < 2) continue;
    let winner = bucket[0]!;
    for (let k = 1; k < bucket.length; k++) {
      const challenger = bucket[k]!;
      if (beats(projects[challenger]!, projects[winner]!)) winner = challenger;
    }
    for (const idx of bucket) {
      if (idx === winner) continue;
      dropped.add(idx);
      const loser = projects[idx]!;
      console.warn(
        `[SYNC] Collapsed duplicate project "${loser.name}" -- hiding local row; ` +
          `orphan serverId=${loser.serverId ?? 'none'} left on server (not deleted).`,
      );
    }
  }

  return projects.filter((_, i) => !dropped.has(i));
}

/**
 * Identity key: builtin class + name + projectType + country. NUL-separated so
 * field boundaries can never collide (name "a b" + type "" must not equal
 * name "a" + type "b"), honoring "name AND type AND country all agree".
 */
function identityKey(p: LocalProject): string {
  const fields = [p.name, p.projectType, p.country].map((s) => (s ?? '').trim().toLowerCase());
  return `${p.isBuiltin ? 'builtin' : 'user'}\u0000${fields.join('\u0000')}`;
}

/** `createdAt` as epoch ms; missing/invalid sorts last (loses to any real date). */
function createdAtMs(p: LocalProject): number {
  const t = Date.parse(p.createdAt);
  return Number.isNaN(t) ? Infinity : t;
}

/** True if `a` should survive over `b` as the single kept row within a group. */
function beats(a: LocalProject, b: LocalProject): boolean {
  // 1. A builtin outranks a non-builtin (never fires under the class-split key;
  //    kept as a defensive invariant).
  if (!!a.isBuiltin !== !!b.isBuiltin) return !!a.isBuiltin;
  // 2. Earliest createdAt wins -- the headline rule.
  const am = createdAtMs(a);
  const bm = createdAtMs(b);
  if (am !== bm) return am < bm;
  // 3. Tie -> prefer the row that already carries a serverId...
  if (!!a.serverId !== !!b.serverId) return !!a.serverId;
  // 4. ...else keep the incumbent (first-seen).
  return false;
}
