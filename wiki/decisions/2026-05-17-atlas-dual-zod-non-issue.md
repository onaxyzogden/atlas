# 2026-05-17 — The dual-zod-instance "root cause" does not currently exist (erratum + invariant)

**Status.** Accepted · **Branch.** `claude/hardcore-napier-80b70c`

Erratum-style follow-up to
[2026-05-17 Faithful postgres.js test mock](2026-05-17-atlas-faithful-postgres-test-mock.md)
(D4) and
[2026-05-17 Error-handler ordering + structural dual-zod](2026-05-17-atlas-error-handler-ordering-dual-zod-structural.md)
(D2).

## Context

The session debrief recommended "eliminate the dual-`zod`-instance root
cause at the build level (single hoisted `zod` across `@ogden/shared` +
`@ogden/api`)." Read-only investigation **falsified that premise**: there
is no genuine dual-zod instance between `@ogden/shared` and `@ogden/api`
in the current install, so a build-level dedup would solve a non-problem.

User decision: **document only** — record the finding so the false premise
is not re-litigated, and capture the invariant that keeps zod
single-instance. No source/config/test/dependency changes.

## Finding (evidence, all read-only)

- `.npmrc` sets `node-linker=hoisted` + `shamefully-hoist=true` → a flat,
  npm-style `node_modules`.
- All three workspace packages declare `zod: "^3.23.8"`
  (`packages/shared/package.json`, `apps/api/package.json`,
  `apps/web/package.json`) and resolve to the **single** root-hoisted
  `node_modules/zod` @ **3.25.76**.
- Glob confirms there is **no** `apps/api/node_modules/zod` and **no**
  `packages/shared/node_modules/zod`. Both packages resolve `import 'zod'`
  to the one root copy, so they share one instance and `instanceof
  ZodError` across the api↔shared boundary already works today.
- The **only** second physical copy is
  `node_modules/@scalar/types/node_modules/zod` @ **4.3.6**, private to
  `@scalar/types@0.8.0` (transitive via api's
  `@scalar/fastify-api-reference@^1.25.0`, used to render the
  API-reference UI). Application/route code never imports through
  `@scalar/types`, so its v4 copy is irrelevant to the api↔shared
  `instanceof` check and never reaches our request-validation path.
- The telemetry-500 that originally prompted the "dual-zod" framing in D4
  was in fact the **error-handler-ordering bug** (handlers registered
  *after* the route plugins → Fastify's default handler → a thrown
  `ZodError` has no `statusCode` → 500). That was fixed this session in
  `a481d852` (D1 of the structural ADR). The "dual-zod" attribution was a
  plausible-but-unverified hypothesis layered on top of the real cause.

## Decision — keep the mitigations as-is (defense-in-depth)

The three mitigations are belt-and-suspenders over a risk that does not
currently materialize. They are cheap and forward-safe, so they stay
**untouched**:

- **Structural `ZodError` detection in `app.ts`** — O(1)
  (`name === 'ZodError'` + `Array.isArray(issues)`). Also tolerant of a
  *future* zod v4 `ZodError` (v4 still exposes `name === 'ZodError'` and an
  `issues` array), so it is the single seam that would become genuinely
  load-bearing if the invariant below ever broke. Worth keeping
  permanently.
- **`parseOrThrow` (telemetry) / `parseEdge` (relationships)** — redundant
  given the global handler, but harmless; they additionally yield a typed
  `ValidationError` (422) at the call site, which is a clean contract
  regardless of zod-instance topology. Not removed (user's call).

D4's `safeParse`→`ValidationError` and D2's structural 422 behaviour are
**both still correct**; only their *dual-zod rationale* is superseded by
this finding.

## Invariant to preserve

A genuine api↔shared zod split would only reappear if one of these changed
— preserve them, or re-evaluate (the structural check then becomes
load-bearing rather than defensive):

1. `.npmrc` stays `node-linker=hoisted` (flat single copy).
2. Every workspace package keeps the **same `zod` major** (currently v3).
3. `@ogden/shared` keeps being consumed as **source via the workspace
   symlink** (`main`/`exports` → `src/…`) and never bundles its own `zod`
   into a `dist`.
4. No workspace package gains its own nested `zod` (e.g. a transitive dep
   pinning a different major that pnpm hoists differently).

## How to re-confirm empirically (optional — not run under this doc-only decision)

From the repo root:

```
node -e "console.log(require.resolve('zod',{paths:['apps/api']})===require.resolve('zod',{paths:['packages/shared']}))"
```

`true` ⇒ a single shared instance. Alternatively compare
`require('zod/package.json').version` resolved from each package dir — both
should report `3.25.76`.

## Files

Documentation only. No code, config, dependency, or test changes.
