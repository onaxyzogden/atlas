# Slice 5.5a - Role Substrate + Access Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the per-project role substrate (bulk role map + access enforcement spine) so the scoped-views epic can layer team/contractor/landowner surfaces on top, and break the placeholder contractor->designer write-equivalence so contractor sessions are denied at every Plan/Observe/Act gate.

**Architecture:** Roles are a backend-synced concept. A new `GET /api/v1/projects/my-roles` endpoint returns the signed-in user's role on every non-builtin project; `memberStore.fetchMyRoles` caches it as a server-id-keyed record; the `useMyProjectRoles` hook exposes it as a `ReadonlyMap<serverId, role>` that is empty when signed out (so offline/demo always renders the full single-owner view). That one map is the single role source for both the Per-Project Home access gate and the Portfolio role badge. Enforcement at the API is shifted by a single lever: `ROLE_ALIAS.contractor` flips from `'designer'` to `null`, so a contractor satisfies no legacy `requireRole(...)` gate. Scoped Act access is re-granted (with assignment-scoping) in Slice 5.5c.

**Tech Stack:** React 18 + TypeScript + Vite + Zustand + TanStack Router (apps/web); Fastify + Postgres/PostGIS (apps/api); shared types/relationships (packages/shared); pnpm + Turborepo; Vitest + happy-dom + @testing-library/react. Windows / PowerShell.

**Design doc:** [wiki/decisions/2026-05-28-atlas-scoped-views-epic-design.md](../../../wiki/decisions/2026-05-28-atlas-scoped-views-epic-design.md)

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `packages/shared/src/relationships/projectRoleCapabilities.ts` | `ROLE_ALIAS` + `roleSatisfies` (legacy gate lever) | Modify: `contractor` alias -> `null` + doc |
| `packages/shared/src/relationships/__tests__/projectRoleCapabilities.test.ts` | Alias/gate behaviour contract | Modify: flip 4 contractor assertions, add focused test |
| `apps/api/src/routes/projects/index.ts` | Project REST routes | Modify: add `GET /my-roles` |
| `apps/web/src/lib/apiClient.ts` | Typed API client | Modify: add `api.members.myRoles` |
| `apps/web/src/store/memberStore.ts` | Member + role state | Modify: add `myRoles` + `fetchMyRoles` + `reset` |
| `apps/web/src/store/__tests__/memberStore.test.ts` | Store transform contract | Create |
| `apps/web/src/hooks/useMyProjectRoles.ts` | Bulk role map hook | Create |
| `apps/web/src/hooks/__tests__/useMyProjectRoles.test.ts` | Hook contract (offline no-op, fetch-on-user, map) | Create |
| `apps/web/src/v3/home/PerProjectHomePage.tsx` | Per-Project Home | Modify: access gate |
| `apps/web/src/v3/home/__tests__/PerProjectHomePage.test.tsx` | Home behaviour suite | Modify: add gate cases |
| `apps/web/src/v3/portfolio/ProjectUrgencyCard.tsx` | Portfolio card | Modify: optional role badge |
| `apps/web/src/v3/portfolio/PortfolioHomePage.module.css` | Portfolio styles | Modify: add `.roleBadge` |
| `apps/web/src/v3/portfolio/__tests__/ProjectUrgencyCard.test.tsx` | Badge contract | Create |
| `apps/web/src/v3/portfolio/PortfolioHomePage.tsx` | Portfolio Home | Modify: wire role map into cards |
| `wiki/decisions/2026-05-28-slice-55a-role-substrate.md` | Implementation ADR | Create |
| `wiki/log/2026-05-28-slice-55a-role-substrate.md` | Session log | Create |
| `wiki/index.md`, `wiki/log.md` | Wiki indices | Modify: add pointers |

---

## Conventions for every task

- **ASCII-only** in all user-facing copy and comments.
- **Never** `git add -A` / `git add .`. Stage only the files named in the task, then run `git diff --cached --name-only` and confirm it matches before committing. The repo carries unrelated foreign WIP that must never be staged.
- **Never** `--no-verify`, never force-push, never push to `main`.
- Commit message footer line (exact):

  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```

- **Typecheck** (PowerShell, per package):
  - web: `cd apps/web` then `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit`
  - shared: `cd packages/shared` then `npx tsc --noEmit`
  - api: `cd apps/api` then `npx tsc --noEmit`
- **Run one test file** (from the owning package dir): `npx vitest run <relative/path/to/file>`

---

## Task 1: Break the contractor->designer alias (enforcement spine)

The contractor role aliases to `designer` (a Slice 5.1 placeholder), so a contractor session satisfies every `requireRole('owner', 'designer')` gate across Plan/Observe/Act. Flipping the alias to `null` is the single low-blast-radius lever that denies contractor at all those gates. The fine-grained capability map (`PROJECT_ROLE_CAPABILITIES`) is deliberately left untouched - the two-axis design keeps capabilities separate from legacy gate aliasing.

**Files:**
- Modify: `packages/shared/src/relationships/projectRoleCapabilities.ts` (alias line + doc)
- Modify: `packages/shared/src/relationships/__tests__/projectRoleCapabilities.test.ts`

- [ ] **Step 1: Inventory every `contractor` mention in the source file** so no doc comment is missed.

Run (from repo root):
```
npx --yes rg -n contractor packages/shared/src/relationships/projectRoleCapabilities.ts
```
Expected: the alias definition (`contractor: 'designer',`) and the JSDoc block describing it (around lines 44-47). If a comment near the `ROLE_ALIAS` definition also describes contractor, include it in Step 5's doc edit.

- [ ] **Step 2: Update the test assertions to the post-5.5a contract (these will fail first).**

In `packages/shared/src/relationships/__tests__/projectRoleCapabilities.test.ts`:

Replace the `contractor satisfies designer gates` test:
```ts
  it('contractor satisfies designer gates', () => {
    expect(roleSatisfies('contractor', 'designer')).toBe(true);
  });
```
with:
```ts
  it('contractor no longer satisfies designer gates (Slice 5.5a broke the alias)', () => {
    // Slice 5.5a sets ROLE_ALIAS.contractor = null, so a contractor session
    // satisfies NO legacy requireRole gate. Scoped Act access is re-granted
    // explicitly (per-route allow-list) alongside assignment-scoping in 5.5c.
    expect(roleSatisfies('contractor', 'designer')).toBe(false);
  });
```

Immediately after the `landowner does NOT satisfy designer/reviewer/owner gates` test (the one that closes the first `describe` block), add a focused sweep:
```ts
  it('contractor satisfies no legacy gate after Slice 5.5a (alias broken)', () => {
    expect(roleSatisfies('contractor', 'owner')).toBe(false);
    expect(roleSatisfies('contractor', 'designer')).toBe(false);
    expect(roleSatisfies('contractor', 'reviewer')).toBe(false);
    expect(roleSatisfies('contractor', 'viewer')).toBe(false);
    expect(roleSatisfies('contractor', 'landowner')).toBe(false);
    expect(roleSatisfies('contractor', 'contractor')).toBe(true); // literal self only
  });
```

In the `write gates (owner | designer) ...` scenario, change:
```ts
    expect(satisfiesAny('contractor', allowed)).toBe(true);
```
to:
```ts
    expect(satisfiesAny('contractor', allowed)).toBe(false); // 5.5a: alias broken
```

Change the read-gate scenario title and its contractor line. Replace:
```ts
  it('read gates (owner | designer | reviewer | viewer) accept every role', () => {
```
with:
```ts
  it('read gates (owner | designer | reviewer | viewer) accept every role except contractor', () => {
```
and within that test change:
```ts
    expect(satisfiesAny('contractor', allowed)).toBe(true);
```
to:
```ts
    expect(satisfiesAny('contractor', allowed)).toBe(false); // 5.5a: alias broken
```

Change the comment-gate scenario title and its contractor line. Replace:
```ts
  it('comment gates extended with landowner accept every comment-capable role', () => {
```
with:
```ts
  it('comment gates extended with landowner accept every comment-capable role except contractor', () => {
```
and within that test change:
```ts
    expect(satisfiesAny('contractor', allowed)).toBe(true);
```
to:
```ts
    expect(satisfiesAny('contractor', allowed)).toBe(false); // 5.5a: alias broken
```

> Do NOT touch any `hasCapability('contractor', ...)` assertions - the capability map is unchanged.

- [ ] **Step 3: Run the shared test - verify it FAILS.**

Run: `cd packages/shared` then `npx vitest run src/relationships/__tests__/projectRoleCapabilities.test.ts`
Expected: FAIL - the flipped `contractor` assertions still see `true` because the alias is still `'designer'`.

- [ ] **Step 4: Flip the alias.**

In `packages/shared/src/relationships/projectRoleCapabilities.ts`, change:
```ts
  contractor: 'designer',
```
to:
```ts
  contractor: null,
```

- [ ] **Step 5: Update the alias JSDoc.**

Replace the contractor bullet in the JSDoc (around lines 44-47):
```
 *   - `contractor` → `designer` (write-capable at the gate layer; future
 *     Phase 5 slices add per-route scoping so a contractor can only
 *     mutate the field actions assigned to them, but the gate-level
 *     check is the same as designer).
```
with:
```
 *   - `contractor` → `null` (Slice 5.5a). The Slice 5.1 placeholder aliased
 *     contractor to `designer`, granting blanket Plan/Observe/Act write at
 *     every `requireRole('owner', 'designer')` gate. 5.5a breaks that: a
 *     contractor now satisfies no legacy gate (literal match only). Slice
 *     5.5c re-grants Act access by adding `'contractor'` to specific route
 *     allow-lists, scoped to the field actions assigned to them.
```
If Step 1 found a second contractor comment near the `ROLE_ALIAS` definition, update it to read: `contractor aliases to null (Slice 5.5a) - matches literally only`.

- [ ] **Step 6: Run the shared test - verify it PASSES.**

Run: `cd packages/shared` then `npx vitest run src/relationships/__tests__/projectRoleCapabilities.test.ts`
Expected: PASS.

- [ ] **Step 7: Guard against API-side tests that assumed the old behaviour.**

Run (from repo root):
```
npx --yes rg -n contractor apps/api/src
```
Then run the API rbac/role tests if any exist:
```
cd apps/api
npx vitest run
```
Expected: PASS, or no tests found. If a test asserts a contractor passing a `requireRole` gate, that test encoded the placeholder - update it to expect denial and note it in the commit body. Do NOT relax the alias to make such a test pass.

- [ ] **Step 8: Typecheck shared.**

Run: `cd packages/shared` then `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit.**

```
git add packages/shared/src/relationships/projectRoleCapabilities.ts packages/shared/src/relationships/__tests__/projectRoleCapabilities.test.ts
git diff --cached --name-only
```
Confirm exactly those two files are staged, then:
```
git commit -m "feat(shared): slice 5.5a - break contractor->designer alias (contractor satisfies no legacy gate)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Bulk roles API endpoint (`GET /api/v1/projects/my-roles`)

A new collection-level route returns the signed-in user's role on every non-builtin project (owned + shared) in one round-trip. It mirrors the proven `GET /projects` list query (same JOIN + access predicate, minus builtins). It is declared as a static route; Fastify matches static routes ahead of `/:id/...` param routes, so `my-roles` is never treated as a project id.

**Files:**
- Modify: `apps/api/src/routes/projects/index.ts` (insert after the `GET /` list handler, before `POST /`)

- [ ] **Step 1: Add the route handler.**

In `apps/api/src/routes/projects/index.ts`, immediately after the `GET /projects` list handler closes (the block that ends with `);` after `return { data: rows.map((r) => ProjectSummary.parse(toCamelCase(r))), meta: { total: rows.length }, error: null };`) and before the `// POST /projects` comment, insert:

```ts
  // GET /projects/my-roles - bulk role map for the signed-in user across all
  // their non-builtin projects (owned + shared). Powers the Portfolio role
  // badge and the Per-Project Home access gate (Slice 5.5a). Declared as a
  // static route; Fastify matches it ahead of the `/:id/...` param routes, so
  // "my-roles" is never treated as a project id.
  fastify.get('/my-roles', { preHandler: [authenticate] }, async (req) => {
    const rows = await db`
      SELECT p.id AS project_id,
             CASE WHEN p.owner_id = ${req.userId} THEN 'owner' ELSE pm.role END AS role
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ${req.userId}
      WHERE (p.owner_id = ${req.userId} OR pm.user_id IS NOT NULL)
        AND p.is_builtin = false
    `;
    return {
      data: rows.map((r) => ({ projectId: r.project_id, role: r.role })),
      meta: { total: rows.length },
      error: null,
    };
  });
```

> `project_members` has primary key `(project_id, user_id)`, so the LEFT JOIN yields at most one row per project - no `DISTINCT` needed. Owned projects resolve to `'owner'` via the CASE even if a stray membership row exists.

- [ ] **Step 2: Typecheck api.**

Run: `cd apps/api` then `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Smoke-test route registration against the running dev API.**

The API runs on the native postgresql-x64-17 instance (localhost:5432); the dev API listens on its usual port (confirm from `apps/api` startup logs - default `http://localhost:3000`). With the API running, from PowerShell:
```
(Invoke-WebRequest -Uri 'http://localhost:3000/api/v1/projects/my-roles' -SkipHttpErrorCheck).StatusCode
```
Expected: `401` (the `authenticate` preHandler rejects the unauthenticated request). A `401` - not `404` - proves the route is registered and gated. Full authenticated/data-shape verification is exercised end-to-end by the web hook + store tests (Tasks 4-5) and in the browser during Task 7 verification.

> Coverage note (no silent cap): a Postgres-backed integration test for this route is deferred. The apps/api package's route-test DB-fixture harness is out of scope for this frontend-substrate slice; the query is a faithful mirror of the already-shipping `GET /projects` list query, and correctness of registration + gating is verified by the 401 smoke test above. Logged in the slice ADR.

- [ ] **Step 4: Commit.**

```
git add apps/api/src/routes/projects/index.ts
git diff --cached --name-only
```
Confirm only that file is staged, then:
```
git commit -m "feat(api): slice 5.5a - add GET /projects/my-roles bulk role endpoint

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3 + 4: apiClient method + memberStore role map

These ship together as one green unit: the client method is the store action's only dependency, and the store test exercises the transform from the endpoint's array shape to a server-id-keyed record.

**Files:**
- Modify: `apps/web/src/lib/apiClient.ts` (add `members.myRoles`)
- Modify: `apps/web/src/store/memberStore.ts` (add `myRoles` state + `fetchMyRoles` action + `reset`)
- Create: `apps/web/src/store/__tests__/memberStore.test.ts`

- [ ] **Step 1: Add the apiClient method.**

In `apps/web/src/lib/apiClient.ts`, inside the `members:` object, immediately after the `myRole` method:
```ts
    myRole: (projectId: string) =>
      request<{ role: ProjectRole }>('GET', `/api/v1/projects/${projectId}/my-role`),
```
add:
```ts

    myRoles: () =>
      request<Array<{ projectId: string; role: ProjectRole }>>(
        'GET',
        '/api/v1/projects/my-roles',
      ),
```
(`ProjectRole` is already imported in this file - no new import.)

- [ ] **Step 2: Write the failing store test.**

Create `apps/web/src/store/__tests__/memberStore.test.ts`:
```ts
/**
 * @vitest-environment happy-dom
 *
 * memberStore.fetchMyRoles (Slice 5.5a) - the bulk role endpoint returns an
 * array; the store folds it into a server-id-keyed record consumed by
 * useMyProjectRoles. reset() must clear it alongside the singular myRole.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  myRolesResp: [] as Array<{ projectId: string; role: string }>,
}));

vi.mock('../../lib/apiClient.js', () => ({
  api: {
    members: {
      myRoles: vi.fn(async () => ({ data: h.myRolesResp, error: null })),
    },
  },
}));

import { useMemberStore } from '../memberStore';

beforeEach(() => {
  useMemberStore.getState().reset();
  h.myRolesResp = [];
});

describe('memberStore.fetchMyRoles', () => {
  it('folds the bulk endpoint array into a server-id-keyed role record', async () => {
    h.myRolesResp = [
      { projectId: 'srv-1', role: 'contractor' },
      { projectId: 'srv-2', role: 'owner' },
    ];
    await useMemberStore.getState().fetchMyRoles();
    expect(useMemberStore.getState().myRoles).toEqual({
      'srv-1': 'contractor',
      'srv-2': 'owner',
    });
  });

  it('reset clears the role map', () => {
    useMemberStore.setState({ myRoles: { 'srv-1': 'contractor' } });
    useMemberStore.getState().reset();
    expect(useMemberStore.getState().myRoles).toEqual({});
  });
});
```

- [ ] **Step 3: Run the store test - verify it FAILS.**

Run: `cd apps/web` then `npx vitest run src/store/__tests__/memberStore.test.ts`
Expected: FAIL - `myRoles` and `fetchMyRoles` do not exist on the store yet.

- [ ] **Step 4: Add `myRoles` + `fetchMyRoles` + `reset` to the store.**

In `apps/web/src/store/memberStore.ts`:

In the `MemberState` interface, after `myRole: ProjectRole | null;` add:
```ts
  myRoles: Record<string, ProjectRole>;
```
and after `fetchMyRole: (projectId: string) => Promise<void>;` add:
```ts
  fetchMyRoles: () => Promise<void>;
```

In the store initializer, after `myRole: null,` add:
```ts
  myRoles: {},
```

After the `fetchMyRole` action (the block ending `},` right before `inviteMember`), add:
```ts

  fetchMyRoles: async () => {
    try {
      const { data } = await api.members.myRoles();
      if (data) {
        const next: Record<string, ProjectRole> = {};
        for (const entry of data) {
          next[entry.projectId] = entry.role;
        }
        set({ myRoles: next });
      }
    } catch (err) {
      console.warn('[OGDEN] Failed to fetch my roles:', err);
    }
  },
```

Change `reset`:
```ts
  reset: () => set({ members: [], myRole: null, isLoading: false }),
```
to:
```ts
  reset: () => set({ members: [], myRole: null, myRoles: {}, isLoading: false }),
```

- [ ] **Step 5: Run the store test - verify it PASSES.**

Run: `cd apps/web` then `npx vitest run src/store/__tests__/memberStore.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck web.**

Run: `cd apps/web` then `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit.**

```
git add apps/web/src/lib/apiClient.ts apps/web/src/store/memberStore.ts apps/web/src/store/__tests__/memberStore.test.ts
git diff --cached --name-only
```
Confirm exactly those three files, then:
```
git commit -m "feat(web): slice 5.5a - bulk myRoles in apiClient + memberStore role map

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: `useMyProjectRoles` hook

The hook is the single role source for both the access gate and the portfolio badge. It fetches only when a user is present (so offline/demo never triggers a request) and returns a `ReadonlyMap<serverId, role>`. Keying on the server project id (not the local id) is deliberate: roles are a backend concept, local-only projects have no `serverId` and therefore never appear in the map, which enforces the "scoped views are an authenticated + synced capability" principle.

**Files:**
- Create: `apps/web/src/hooks/useMyProjectRoles.ts`
- Create: `apps/web/src/hooks/__tests__/useMyProjectRoles.test.ts`

- [ ] **Step 1: Write the failing hook test.**

Create `apps/web/src/hooks/__tests__/useMyProjectRoles.test.ts`:
```ts
/**
 * @vitest-environment happy-dom
 *
 * useMyProjectRoles (Slice 5.5a). Contract:
 *  - signed out -> never fetches, returns an empty map (offline/demo no-op).
 *  - signed in  -> fetches the bulk role map once.
 *  - exposes the store record as a Map keyed by server project id.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';

const h = vi.hoisted(() => ({
  user: null as { id: string } | null,
  myRoles: {} as Record<string, string>,
  fetchMyRoles: vi.fn(),
}));

vi.mock('../../store/authStore.js', () => ({
  useAuthStore: (selector: (s: { user: unknown }) => unknown) =>
    selector({ user: h.user }),
}));

vi.mock('../../store/memberStore.js', () => ({
  useMemberStore: (
    selector: (s: {
      myRoles: Record<string, string>;
      fetchMyRoles: () => void;
    }) => unknown,
  ) => selector({ myRoles: h.myRoles, fetchMyRoles: h.fetchMyRoles }),
}));

import { useMyProjectRoles } from '../useMyProjectRoles';

beforeEach(() => {
  h.user = null;
  h.myRoles = {};
  h.fetchMyRoles = vi.fn();
});
afterEach(() => cleanup());

describe('useMyProjectRoles', () => {
  it('does not fetch and returns an empty map when signed out', () => {
    const { result } = renderHook(() => useMyProjectRoles());
    expect(h.fetchMyRoles).not.toHaveBeenCalled();
    expect(result.current.size).toBe(0);
  });

  it('fetches once when a user is present', () => {
    h.user = { id: 'u-1' };
    renderHook(() => useMyProjectRoles());
    expect(h.fetchMyRoles).toHaveBeenCalledTimes(1);
  });

  it('exposes the store role map keyed by server project id', () => {
    h.user = { id: 'u-1' };
    h.myRoles = { 'srv-1': 'contractor', 'srv-2': 'owner' };
    const { result } = renderHook(() => useMyProjectRoles());
    expect(result.current.get('srv-1')).toBe('contractor');
    expect(result.current.get('srv-2')).toBe('owner');
    expect(result.current.size).toBe(2);
  });
});
```

- [ ] **Step 2: Run the hook test - verify it FAILS.**

Run: `cd apps/web` then `npx vitest run src/hooks/__tests__/useMyProjectRoles.test.ts`
Expected: FAIL - module `../useMyProjectRoles` does not exist.

- [ ] **Step 3: Write the hook.**

Create `apps/web/src/hooks/useMyProjectRoles.ts`:
```ts
// useMyProjectRoles.ts
//
// Slice 5.5a - bulk per-project role map for the signed-in user. The single
// role source for the Portfolio role badge and the Per-Project Home access
// gate. Keyed by SERVER project id (projects.id), because role is a
// backend-synced concept: local-only projects have no serverId and therefore
// never appear in the map. Signed-out sessions never fetch and get a stable
// empty map, so the dominant offline/demo flow always renders the full
// single-owner view ("scoped views are an authenticated + synced capability").

import { useEffect, useMemo } from 'react';
import type { ProjectRole } from '@ogden/shared';
import { useMemberStore } from '../store/memberStore.js';
import { useAuthStore } from '../store/authStore.js';

const EMPTY: ReadonlyMap<string, ProjectRole> = new Map();

export function useMyProjectRoles(): ReadonlyMap<string, ProjectRole> {
  const user = useAuthStore((s) => s.user);
  const myRoles = useMemberStore((s) => s.myRoles);
  const fetchMyRoles = useMemberStore((s) => s.fetchMyRoles);

  useEffect(() => {
    if (user) {
      fetchMyRoles();
    }
  }, [!!user]);

  return useMemo(() => {
    const keys = Object.keys(myRoles);
    if (keys.length === 0) return EMPTY;
    const map = new Map<string, ProjectRole>();
    for (const key of keys) {
      map.set(key, myRoles[key]);
    }
    return map;
  }, [myRoles]);
}
```

> The `[!!user]` dependency array mirrors the established `useProjectRole` effect (re-run on auth transition only; the store action is stable). Keep it identical to that file so lint behaviour matches.

- [ ] **Step 4: Run the hook test - verify it PASSES.**

Run: `cd apps/web` then `npx vitest run src/hooks/__tests__/useMyProjectRoles.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint the new hook (effect-deps).**

Run: `cd apps/web` then `npx eslint src/hooks/useMyProjectRoles.ts`
Expected: clean. If `react-hooks/exhaustive-deps` errors on `fetchMyRoles`, confirm `apps/web/src/hooks/useProjectRole.ts` lints clean with the same pattern; match whatever it does (it is the precedent).

- [ ] **Step 6: Typecheck web.**

Run: `cd apps/web` then `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit.**

```
git add apps/web/src/hooks/useMyProjectRoles.ts apps/web/src/hooks/__tests__/useMyProjectRoles.test.ts
git diff --cached --name-only
```
Confirm exactly those two files, then:
```
git commit -m "feat(web): slice 5.5a - useMyProjectRoles bulk role-map hook (no-op offline)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Per-Project Home access gate

A contractor or landowner who opens a synced project's home gets an honest empty state instead of the steward home (their real surfaces - task list / portal - ship in 5.5c / 5.5d). The gate reads the bulk map by `serverId`, not the singular `useProjectRole` slot: the singular slot is one value, so navigating from a project where you are a contractor to one you own would briefly render the owned project's home as denied using the stale role. The bulk map keyed by `serverId` returns either the right role or `undefined` (not-yet-loaded), so the worst case is a brief steward home before nothing changes - never a wrongly-denied owned project.

**Files:**
- Modify: `apps/web/src/v3/home/PerProjectHomePage.tsx`
- Modify: `apps/web/src/v3/home/__tests__/PerProjectHomePage.test.tsx`

- [ ] **Step 1: Extend the test harness and add failing gate cases.**

In `apps/web/src/v3/home/__tests__/PerProjectHomePage.test.tsx`:

Add `serverId?: string;` to the hoisted project type. Change:
```ts
  project: null as null | {
    id: string;
    name: string;
    description: string | null;
    metadata: { wizardStatus?: 'in_progress' | 'complete'; wizardLastStep?: string };
  },
```
to:
```ts
  project: null as null | {
    id: string;
    name: string;
    description: string | null;
    serverId?: string;
    metadata: { wizardStatus?: 'in_progress' | 'complete'; wizardLastStep?: string };
  },
  roleMap: new Map<string, string>(),
```

Add a mock for the new hook (after the `observeDataPointStore` mock, before the `// Import AFTER mocks` line):
```ts
vi.mock('../../../hooks/useMyProjectRoles.js', () => ({
  useMyProjectRoles: () => h.roleMap,
}));
```

In `beforeEach`, reset the new fields. Change the `beforeEach` body so it also resets `roleMap`:
```ts
beforeEach(() => {
  h.params = { projectId: 'p-1' };
  h.project = {
    id: 'p-1',
    name: 'Acme Homestead',
    description: 'A small piece of land.',
    metadata: {},
  };
  h.urgency = null;
  h.roleMap = new Map<string, string>();
});
```

Add a new describe block at the end of the file (before the final closing of the outer `describe`, or as a sibling top-level `describe` after it):
```ts
describe('PerProjectHomePage - Slice 5.5a access gate', () => {
  const DENY_TEXT =
    'Your role on this project does not include the home view. Contact the project steward if you need access.';

  it('denies a contractor on a synced project', () => {
    h.project = { ...h.project!, serverId: 'srv-1' };
    h.roleMap = new Map([['srv-1', 'contractor']]);
    render(<PerProjectHomePage />);
    expect(screen.getByText(DENY_TEXT)).toBeTruthy();
  });

  it('denies a landowner on a synced project', () => {
    h.project = { ...h.project!, serverId: 'srv-1' };
    h.roleMap = new Map([['srv-1', 'landowner']]);
    render(<PerProjectHomePage />);
    expect(screen.getByText(DENY_TEXT)).toBeTruthy();
  });

  it('renders the full steward home for an owner on a synced project', () => {
    h.project = { ...h.project!, serverId: 'srv-1' };
    h.roleMap = new Map([['srv-1', 'owner']]);
    render(<PerProjectHomePage />);
    expect(screen.getByText('Plan tier shell')).toBeTruthy();
    expect(screen.queryByText(DENY_TEXT)).toBeNull();
  });

  it('never gates an unsynced (local-only) project, even with a stale role in the map', () => {
    h.project = { ...h.project!, serverId: undefined };
    h.roleMap = new Map([['srv-1', 'contractor']]);
    render(<PerProjectHomePage />);
    expect(screen.getByText('Plan tier shell')).toBeTruthy();
    expect(screen.queryByText(DENY_TEXT)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the home test - verify the new cases FAIL.**

Run: `cd apps/web` then `npx vitest run src/v3/home/__tests__/PerProjectHomePage.test.tsx`
Expected: the four gate tests FAIL (no gate yet); the existing 5.4 tests still PASS.

- [ ] **Step 3: Add the gate to the page.**

In `apps/web/src/v3/home/PerProjectHomePage.tsx`:

Add the import after the `useProjectUrgency` import:
```ts
import { useMyProjectRoles } from '../../hooks/useMyProjectRoles.js';
```

Call the hook unconditionally, right after the `urgencyMap` line and before the `if (!project)` guard:
```ts
  const urgencyMap = useProjectUrgency(project ? [project] : []);
  const roleMap = useMyProjectRoles();

  if (!project) {
    return <p className={css.empty}>No project loaded.</p>;
  }
```

Immediately after that `if (!project)` block, insert the gate:
```ts
  // Slice 5.5a access gate. Scoped views are an authenticated + synced
  // capability: a contractor or landowner on a SYNCED project (one with a
  // serverId) gets an honest empty state instead of the steward home - their
  // task / portal surfaces ship in Slices 5.5c / 5.5d. Local-only projects
  // have no serverId so they are never in the map (always full single-owner
  // view), and signed-out sessions get an empty map, so this never fires for
  // the dominant offline/demo flow.
  const scopedRole = project.serverId ? roleMap.get(project.serverId) : undefined;
  if (scopedRole === 'contractor' || scopedRole === 'landowner') {
    return (
      <div className={css.scrollHost}>
        <PageHeader
          eyebrow="Project"
          title={project.name}
          actions={
            <button
              type="button"
              className={css.headerLink}
              onClick={() => navigate({ to: '/v3/portfolio' })}
            >
              All projects
            </button>
          }
        />
        <p className={css.empty}>
          Your role on this project does not include the home view. Contact the
          project steward if you need access.
        </p>
      </div>
    );
  }
```
(`css.scrollHost`, `css.headerLink`, and `css.empty` already exist in this page's CSS module and are used by the steward render below.)

- [ ] **Step 4: Run the home test - verify ALL pass.**

Run: `cd apps/web` then `npx vitest run src/v3/home/__tests__/PerProjectHomePage.test.tsx`
Expected: PASS (gate cases + all pre-existing 5.4 cases).

- [ ] **Step 5: Typecheck web.**

Run: `cd apps/web` then `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit.**

```
git add apps/web/src/v3/home/PerProjectHomePage.tsx apps/web/src/v3/home/__tests__/PerProjectHomePage.test.tsx
git diff --cached --name-only
```
Confirm exactly those two files, then:
```
git commit -m "feat(web): slice 5.5a - Per-Project Home access gate for contractor/landowner

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Portfolio role badge

Logged-in sessions get a small badge on each project card showing their non-steward role (Team / Contractor / Landowner / Designer / Reviewer / Viewer). Owners and primary stewards get no badge (it is their own portfolio). The badge never hides a card - local-first means the user always sees their own projects. Offline sessions get an empty role map, so no badge shows and the portfolio renders exactly as before.

**Files:**
- Modify: `apps/web/src/v3/portfolio/ProjectUrgencyCard.tsx`
- Modify: `apps/web/src/v3/portfolio/PortfolioHomePage.module.css`
- Create: `apps/web/src/v3/portfolio/__tests__/ProjectUrgencyCard.test.tsx`
- Modify: `apps/web/src/v3/portfolio/PortfolioHomePage.tsx`

- [ ] **Step 1: Write the failing card test.**

Create `apps/web/src/v3/portfolio/__tests__/ProjectUrgencyCard.test.tsx`:
```tsx
/**
 * @vitest-environment happy-dom
 *
 * ProjectUrgencyCard role badge (Slice 5.5a). The card shows a small badge
 * for a non-steward role and nothing for owner/primary_steward or when no
 * role is supplied (offline / unsynced).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import type { LocalProject } from '../../../store/projectStore.js';

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
});

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

import ProjectUrgencyCard from '../ProjectUrgencyCard';

const baseProject = {
  id: 'p-1',
  name: 'Acme Homestead',
  description: null,
  status: 'active',
  serverId: 'srv-1',
  metadata: {},
} as unknown as LocalProject;

afterEach(() => cleanup());

describe('ProjectUrgencyCard role badge', () => {
  it('renders a badge for a non-steward role', () => {
    render(
      <ProjectUrgencyCard project={baseProject} urgency={undefined} role="contractor" />,
    );
    expect(screen.getByText('Contractor')).toBeTruthy();
  });

  it('renders no badge for the owner', () => {
    render(
      <ProjectUrgencyCard project={baseProject} urgency={undefined} role="owner" />,
    );
    expect(screen.queryByText('Owner')).toBeNull();
  });

  it('renders no badge and still shows the project when role is undefined', () => {
    render(<ProjectUrgencyCard project={baseProject} urgency={undefined} />);
    expect(screen.getByText('Acme Homestead')).toBeTruthy();
    expect(screen.queryByText('Contractor')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the card test - verify it FAILS.**

Run: `cd apps/web` then `npx vitest run src/v3/portfolio/__tests__/ProjectUrgencyCard.test.tsx`
Expected: FAIL - `role` prop and badge do not exist yet (`getByText('Contractor')` finds nothing).

- [ ] **Step 3: Add the badge to the card.**

In `apps/web/src/v3/portfolio/ProjectUrgencyCard.tsx`:

Change the type import:
```ts
import type { ProjectUrgencyResult } from '@ogden/shared';
```
to:
```ts
import type { ProjectUrgencyResult, ProjectRole } from '@ogden/shared';
```

Add the label map just below the imports (above `export interface ProjectUrgencyCardProps`):
```ts
// Non-steward roles get a badge; owner / primary_steward are omitted (the
// portfolio belongs to the steward, so their own projects carry no badge).
const ROLE_BADGE_LABEL: Partial<Record<ProjectRole, string>> = {
  designer: 'Designer',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
  team_member: 'Team',
  contractor: 'Contractor',
  landowner: 'Landowner',
};
```

Add the prop to the interface:
```ts
export interface ProjectUrgencyCardProps {
  project: LocalProject;
  urgency: ProjectUrgencyResult | undefined;
  role?: ProjectRole;
}
```

Destructure it and derive the label. Change:
```ts
export default function ProjectUrgencyCard({
  project,
  urgency,
}: ProjectUrgencyCardProps) {
  const navigate = useNavigate();
```
to:
```ts
export default function ProjectUrgencyCard({
  project,
  urgency,
  role,
}: ProjectUrgencyCardProps) {
  const navigate = useNavigate();
  const roleLabel = role ? ROLE_BADGE_LABEL[role] : undefined;
```

Render the badge in the header, right after the `Finish setup` badge block. Change:
```tsx
        {draftWizard ? (
          <span className={css.finishSetupBadge}>
            <Sprout size={12} aria-hidden /> Finish setup
          </span>
        ) : null}
      </BentoBox.Header>
```
to:
```tsx
        {draftWizard ? (
          <span className={css.finishSetupBadge}>
            <Sprout size={12} aria-hidden /> Finish setup
          </span>
        ) : null}
        {roleLabel ? <span className={css.roleBadge}>{roleLabel}</span> : null}
      </BentoBox.Header>
```

- [ ] **Step 4: Add the badge style.**

In `apps/web/src/v3/portfolio/PortfolioHomePage.module.css`, immediately after the `.finishSetupBadge { ... }` rule, add:
```css

.roleBadge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: color-mix(in srgb, #6b8cce 16%, transparent);
  color: #6b8cce;
  border: 1px solid color-mix(in srgb, #6b8cce 35%, transparent);
  border-radius: var(--radius-full, 999px);
}
```

- [ ] **Step 5: Run the card test - verify it PASSES.**

Run: `cd apps/web` then `npx vitest run src/v3/portfolio/__tests__/ProjectUrgencyCard.test.tsx`
Expected: PASS.

- [ ] **Step 6: Wire the role map into the portfolio.**

In `apps/web/src/v3/portfolio/PortfolioHomePage.tsx`:

Add the import after the `useProjectUrgency` import:
```ts
import { useMyProjectRoles } from '../../hooks/useMyProjectRoles.js';
```

Call the hook after `urgencyMap`:
```ts
  const urgencyMap = useProjectUrgency(activeProjects);
  const roleMap = useMyProjectRoles();
```

Pass the role to each card. Change:
```tsx
            <ProjectUrgencyCard
              key={project.id}
              project={project}
              urgency={urgencyMap.get(project.id)}
            />
```
to:
```tsx
            <ProjectUrgencyCard
              key={project.id}
              project={project}
              urgency={urgencyMap.get(project.id)}
              role={project.serverId ? roleMap.get(project.serverId) : undefined}
            />
```

- [ ] **Step 7: Typecheck web.**

Run: `cd apps/web` then `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Browser verification (preview).**

Start the dev server (preview_start), open Portfolio Home (`/v3/portfolio`). In the dominant signed-out/offline state, confirm: cards render exactly as before, NO role badges. (Authenticated badge rendering is covered by the unit tests; an end-to-end logged-in check belongs to a synced-session QA pass.) Capture a screenshot of the offline portfolio as proof that the no-op-offline contract holds. Check the console for errors.

- [ ] **Step 9: Commit.**

```
git add apps/web/src/v3/portfolio/ProjectUrgencyCard.tsx apps/web/src/v3/portfolio/PortfolioHomePage.module.css apps/web/src/v3/portfolio/__tests__/ProjectUrgencyCard.test.tsx apps/web/src/v3/portfolio/PortfolioHomePage.tsx
git diff --cached --name-only
```
Confirm exactly those four files, then:
```
git commit -m "feat(web): slice 5.5a - Portfolio role badge for logged-in sessions (no-op offline)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Implementation ADR + wiki log + pointers

Mirror the Slice 5.4 documentation commit: an implementation ADR, a session log entry, and reverse-chron pointers in `wiki/index.md` and `wiki/log.md`.

**Files:**
- Create: `wiki/decisions/2026-05-28-slice-55a-role-substrate.md`
- Create: `wiki/log/2026-05-28-slice-55a-role-substrate.md`
- Modify: `wiki/index.md`
- Modify: `wiki/log.md`

- [ ] **Step 1: Write the implementation ADR.**

Create `wiki/decisions/2026-05-28-slice-55a-role-substrate.md`:
```markdown
# 2026-05-28 - Slice 5.5a: Role substrate + access foundation

**Status.** Implemented. Branch `feat/atlas-permaculture`. First slice of the
scoped-views epic ([[decisions/2026-05-28-atlas-scoped-views-epic-design]]).

## Context

The epic design fixed 5.5a as the security spine that 5.5b-d depend on. Three
walls from the design pass had to be cleared before any scoped surface: there
was no per-project role map (only `memberStore.myRole`, a single slot), role
fetching only ran when logged in, and the contractor role aliased to designer
so a contractor satisfied every Plan/Observe/Act gate.

## Decisions

1. **Roles are an authenticated + synced capability.** The bulk role map is
   keyed by SERVER project id. Local-only projects (no `serverId`) never
   appear; signed-out sessions get an empty map. Offline/demo therefore always
   renders the full single-owner view - no gate, no badge.

2. **One bulk endpoint, one map, one role source.** `GET /projects/my-roles`
   returns the caller's role per non-builtin project (mirrors the `GET
   /projects` list query). `memberStore.fetchMyRoles` caches it;
   `useMyProjectRoles` exposes a `ReadonlyMap<serverId, role>`. Both the Home
   access gate and the Portfolio badge read that one map.

3. **Gate reads the bulk map, not the singular `useProjectRole` slot.** The
   singular slot is one value, so navigating contractor-project -> owned-project
   would flash the owned home as denied using the stale role. The bulk map
   keyed by serverId returns the right role or undefined (not-loaded), so the
   worst case is a brief steward home, never a wrongly-denied owned project.
   `useProjectRole` (singular) is untouched and still serves the editing
   surfaces.

4. **Enforcement lever: `ROLE_ALIAS.contractor` flips `'designer'` -> `null`.**
   Every Plan/Observe/Act mutation gate shares `requireRole('owner',
   'designer')`, so the alias is the only single-point lever. With it null, a
   contractor satisfies no legacy gate (literal match only) and gets 403
   everywhere. The fine-grained capability map is deliberately left unchanged
   (two-axis design). Re-granting SCOPED Act access (contractor editing only
   assigned field actions) is 5.5c's job - granting it here without
   assignment-scoping would itself be a confidentiality hole. Between 5.5a and
   5.5c a contractor has no functional surface, which is correct: the
   contractor surface ships in 5.5c.

5. **Portfolio badges, never hides.** Local-first: the user always sees their
   own project cards. Owner / primary_steward carry no badge.

## What shipped

- `packages/shared`: `ROLE_ALIAS.contractor = null` + 4 flipped test
  assertions + a focused contractor-no-gate test.
- `apps/api`: `GET /projects/my-roles`.
- `apps/web`: `api.members.myRoles`; `memberStore.myRoles` + `fetchMyRoles` +
  `reset`; `useMyProjectRoles`; Per-Project Home access gate; Portfolio role
  badge (`ProjectUrgencyCard` `role` prop + `.roleBadge`).

## Verification

- shared / web vitest green (alias contract, store transform, hook contract,
  home gate, card badge).
- shared / web / api `tsc --noEmit` clean.
- `GET /projects/my-roles` smoke: 401 unauthenticated (route registered +
  gated). A Postgres-backed integration test for the route is deferred (the
  api route-test DB harness is out of scope for this frontend-substrate slice;
  the query mirrors the shipping list query).
- Offline portfolio screenshot confirms no badges in the signed-out flow.

## Deferred

- 5.5b: team_member scoping.
- 5.5c: contractor task-only view + field-action query scoping + re-grant
  scoped Act access + read-confidentiality on the no-requireRole Observe batch
  routes.
- 5.5d: landowner portal view + contractor access expiry.
```

- [ ] **Step 2: Write the session log entry.**

Create `wiki/log/2026-05-28-slice-55a-role-substrate.md`:
```markdown
# 2026-05-28 - Slice 5.5a implementation (role substrate + access foundation)

**Branch.** `feat/atlas-permaculture`. First implementation slice of the
scoped-views epic. ADR: [[decisions/2026-05-28-slice-55a-role-substrate]].
Design: [[decisions/2026-05-28-atlas-scoped-views-epic-design]].

## Shipped

Role substrate end to end: bulk `GET /projects/my-roles` ->
`memberStore.fetchMyRoles` -> `useMyProjectRoles` (ReadonlyMap keyed by server
id, empty offline). That one map drives the Per-Project Home access gate
(contractor / landowner on a synced project get an honest empty state) and the
Portfolio role badge (non-steward roles, never hides). Enforcement spine: the
contractor -> designer alias was flipped to null, so contractor now gets 403 at
every Plan/Observe/Act gate; scoped Act access returns in 5.5c with
assignment-scoping.

## Notable choices

- Gate reads the bulk map (keyed by serverId), not the singular
  `useProjectRole` slot, to avoid a stale-role flash on cross-project nav.
- Two-axis design preserved: capability map untouched, only the legacy alias
  moved.
- API integration test for the new route deferred with rationale (mirrors the
  shipping list query; verified by 401 smoke + the web hook/store tests).

## Verification

shared/web vitest green; shared/web/api tsc clean; my-roles 401 smoke;
offline-portfolio screenshot (no badges). Per-commit `git diff --cached
--name-only` confirmed only slice files staged - no foreign WIP. Divergence
check before push per [[feedback-commit-immediately-on-rebased-branches]].

## Carry-over

5.5b (team_member scoping) is next; 5.5c / 5.5d follow. Each ships as its own
commit + implementation ADR.
```

- [ ] **Step 3: Add the `index.md` Decisions bullet.**

`wiki/index.md` uses a dense single-bullet-per-decision format, newest first. Insert this as the new FIRST entry directly under the `## Decisions` heading, above the existing `2026-05-28 Scoped Views Epic` bullet. Fill the `<sha-*>` tokens with the actual commit hashes from Tasks 1-7 (the code/test commits; this doc commit is not referenced, same as prior entries reference only their code commits):
```markdown
- [2026-05-28 Slice 5.5a: Role substrate + access foundation (bulk role map + Per-Project Home access gate + Portfolio role badge + contractor 403)](decisions/2026-05-28-slice-55a-role-substrate.md) — Shipped the first slice of the scoped-views epic on `feat/atlas-permaculture` across explicit-path commits (`<sha-shared>` shared alias break -> `<sha-api>` api endpoint -> `<sha-client-store>` apiClient + store -> `<sha-hook>` hook -> `<sha-gate>` home gate -> `<sha-badge>` portfolio badge): the role substrate end to end. New `GET /api/v1/projects/my-roles` returns the caller's role per non-builtin project (mirrors the `GET /projects` list query); `memberStore.fetchMyRoles` folds it into a server-id-keyed record; `useMyProjectRoles` exposes a `ReadonlyMap<serverId, ProjectRole>` that is empty and fetch-free when signed out, so the dominant offline/demo flow always renders the full single-owner view. That one map is the single role source for both new surfaces: the **Per-Project Home access gate** (a contractor or landowner on a SYNCED project gets an honest empty state instead of the steward home — their task / portal surfaces ship in 5.5c / 5.5d) and the **Portfolio role badge** (non-steward roles get a small badge; owner / primary_steward get none; no card is ever hidden). The gate reads the bulk map by `serverId`, not the singular `useProjectRole` slot, so cross-project navigation never flashes an owned project's home as denied with a stale role. **Enforcement spine:** `ROLE_ALIAS.contractor` flipped `'designer' -> null` — since every Plan/Observe/Act mutation gate shares `requireRole('owner','designer')`, this single lever denies contractor at all of them (403); the fine-grained capability map is untouched (two-axis design), and scoped Act access is re-granted with assignment-scoping in 5.5c (between 5.5a and 5.5c a contractor has no functional surface — correct, the surface ships in 5.5c). Verified: shared + web vitest green (alias contract with 4 flipped contractor assertions + focused contractor-no-gate test, store transform, hook no-op-offline, home gate, card badge); shared/web/api `tsc --noEmit` clean; `my-roles` 401-unauthenticated smoke (route registered + gated; Postgres-backed integration test deferred with rationale — query mirrors the shipping list query); offline-portfolio screenshot confirms no badges signed out. No-deletion; 3-item nav forward IA ([[project-lifecycle-retirement]]); CSRA model untouched; ASCII-only copy. Implements [[decisions/2026-05-28-atlas-scoped-views-epic-design]]; log [[log/2026-05-28-slice-55a-role-substrate]].
```

- [ ] **Step 4: Add the `log.md` index bullet.**

`wiki/log.md` is the reverse-chronological index; each entry is a dense single bullet (the standalone narrative lives in the `log/` file from Step 2). Insert this as the new first entry, directly above the existing `2026-05-28 — Scoped Views Epic design pass` bullet. Fill `<sha-*>` from the actual Task 1-7 commits and `<shared-count>` / `<web-count>` from the Task 9 Step 1 run output:
```markdown
- [2026-05-28 — Slice 5.5a: Role substrate + access foundation](log/2026-05-28-slice-55a-role-substrate.md) — **Branch.** `feat/atlas-permaculture` (explicit-path commits: `<sha-shared>` shared alias break -> `<sha-api>` `GET /projects/my-roles` -> `<sha-client-store>` apiClient `myRoles` + `memberStore` role map -> `<sha-hook>` `useMyProjectRoles` -> `<sha-gate>` Per-Project Home access gate -> `<sha-badge>` Portfolio role badge). First implementation slice of the scoped-views epic — the role substrate end to end plus the enforcement spine. New `GET /api/v1/projects/my-roles` (static route, `authenticate`-gated; mirrors the `GET /projects` list JOIN + access predicate, minus builtins) returns `{ data: Array<{ projectId, role }>, meta, error }`; `memberStore.fetchMyRoles` folds the array into a `Record<serverId, ProjectRole>` (cleared by `reset`); `useMyProjectRoles` returns a `ReadonlyMap<serverId, ProjectRole>` — empty + fetch-free signed-out (the `[!!user]` effect mirrors `useProjectRole`), so offline/demo always renders the full single-owner view. **One map, two surfaces:** the Per-Project Home access gate (`scopedRole = serverId ? roleMap.get(serverId) : undefined`; contractor/landowner -> honest "your role does not include the home view" empty state with an All-projects escape; unsynced/offline projects never gated) and the Portfolio role badge on `ProjectUrgencyCard` (new optional `role` prop + `.roleBadge`; `ROLE_BADGE_LABEL` omits owner/primary_steward; never hides a card). The gate reads the bulk map by serverId, not the singular `useProjectRole` slot, to avoid a stale-role flash on cross-project nav. **Enforcement:** `ROLE_ALIAS.contractor` flipped `'designer' -> null` in `projectRoleCapabilities.ts` — every Plan/Observe/Act mutation gate shares `requireRole('owner','designer')`, so the alias is the single lever; contractor now satisfies no legacy gate (literal match only) and gets 403. Capability map untouched (two-axis design); 4 pre-existing contractor gate assertions flipped to `false` + a focused contractor-no-gate test added; scoped Act access returns in 5.5c with assignment-scoping. **Verified:** shared `npx vitest run` + web `npx vitest run` green (<shared-count> / <web-count> pass); shared/web/api `tsc --noEmit` clean; `my-roles` 401 smoke (route registered + gated — Postgres-backed integration test deferred, query mirrors the shipping list query); offline-portfolio `preview_screenshot` shows no badges signed-out; per-commit `git diff --cached --name-only` confirmed only slice files staged (no foreign WIP); divergence-checked via `git fetch origin feat/atlas-permaculture` + `git log --left-right HEAD...origin/feat/atlas-permaculture` before push. ADR [[decisions/2026-05-28-slice-55a-role-substrate]]; continues [[log/2026-05-28-scoped-views-epic-design]]; no-deletion; 3-item nav forward IA ([[project-lifecycle-retirement]]); CSRA model untouched; ASCII-only copy.
```

- [ ] **Step 5: Commit.**

```
git add wiki/decisions/2026-05-28-slice-55a-role-substrate.md wiki/log/2026-05-28-slice-55a-role-substrate.md wiki/index.md wiki/log.md
git diff --cached --name-only
```
Confirm exactly those four files, then:
```
git commit -m "docs(wiki): slice 5.5a ADR + log entry + index/log pointers - role substrate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Full-suite green + divergence-checked push

- [ ] **Step 1: Run the full web + shared test suites.**

```
cd packages/shared
npx vitest run
cd ../../apps/web
npx vitest run
```
Expected: all green. If anything unrelated to this slice fails, do NOT fix it here - note it and surface it.

- [ ] **Step 2: Final typecheck sweep.**

```
cd packages/shared
npx tsc --noEmit
cd ../../apps/api
npx tsc --noEmit
cd ../web
$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit
```
Expected: clean across all three.

- [ ] **Step 3: Divergence check, then push.**

```
git fetch origin feat/atlas-permaculture
git log --left-right --oneline HEAD...origin/feat/atlas-permaculture
```
- If only `<` (local-ahead) lines appear: `git push origin feat/atlas-permaculture`.
- If `>` (remote-ahead) lines appear, the branch was rebased out-of-band. STOP and surface it - do NOT force-push, do NOT blindly merge. Re-base or reconcile per the established branch-rebase handling, then re-run the check.

---

## Definition of Done

- `ROLE_ALIAS.contractor === null`; `roleSatisfies('contractor', <any>)` is false except the literal `'contractor'`; the four pre-existing contractor gate assertions are flipped and a focused contractor-no-gate test passes.
- `GET /api/v1/projects/my-roles` is registered, `authenticate`-gated (401 unauthenticated), and returns `{ data: Array<{ projectId, role }>, meta: { total }, error: null }`.
- `useMyProjectRoles()` returns a `ReadonlyMap<serverId, role>`: empty and fetch-free when signed out; populated from the store when signed in.
- Per-Project Home renders the access-denied empty state for a contractor/landowner on a synced project, and the full steward home otherwise (including all unsynced/offline projects).
- Portfolio cards show a role badge for non-steward roles when signed in, no badge for owner/primary_steward, and no badge at all offline; no card is ever hidden.
- shared / web vitest green; shared / web / api `tsc --noEmit` clean.
- Each task committed separately with only its own files staged; slice pushed after a clean divergence check.

---

## Notes for the executor

- This slice is frontend substrate + one read-only endpoint + one alias flip. No data migration, no destructive operation, no `main` interaction.
- The repo carries unrelated foreign WIP (economics/financial/material-substitution/graphify files, `tsc_*.txt`, `_*` dumps, `.superpowers/`). NONE of it belongs in any commit here - the per-commit `git diff --cached --name-only` check is how you guarantee that.
- All user-facing copy is ASCII-only by project rule.
```
