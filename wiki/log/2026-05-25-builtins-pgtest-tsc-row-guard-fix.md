# 2026-05-25 — fix(api): guard row destructure in builtins pgtest (lint green)

**Branch.** `feat/atlas-permaculture`. Commit `34c146e4`.

Closed the pre-existing `tsc` error that the same-day CI-gating entry
([[log/2026-05-25-pgtest-ci-gating-strict-mode]]) explicitly flagged as
"flagged separately." `pnpm --filter @ogden/api lint` (which is `tsc
--noEmit`) was red on a single error introduced in `4ab1e52d`:

```
src/tests/integration/builtins-project-type.pgtest.ts(112,16):
  error TS2339: Property 'count' does not exist on type '{ count: string; } | undefined'.
```

Root cause: under `noUncheckedIndexedAccess`, the destructure
`const [{ count }] = await sql<{ count: string }[]>...` types the first
array element as `{ count: string } | undefined`, so the inner
`{ count }` destructure is rejected. Fix matches the `row!.id`
non-null-assertion idiom already used elsewhere in this file and in
`fixtures.ts`:

```ts
const [row] = await sql<{ count: string }[]>`
  SELECT count(*)::text AS count FROM projects WHERE project_type = 'farm'
`;
expect(row!.count).toBe('0');
```

Two-line change, test-only, no behavior change. This error did **not**
block the `api-integration.yml` CI workflow (it runs `test:integration`
via esbuild, no `tsc`) — but it kept the `lint` target red. **Verified:**
`corepack pnpm --filter @ogden/api lint` exits 0 after the fix.
