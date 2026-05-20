# 2026-05-10 — Triage round 4: Built-Environment unification thread landed


Landed the BE-unification thread as two thematic commits on
`feat/atlas-permaculture`:

- `956b876` — `atlas/shared`: Phase 1 — unified Zod schema, kind
  registry, `BUILT_ENV_V2` flag, ADR
  (`wiki/decisions/2026-05-10-atlas-built-environment-unification.md`).
- `688bc01` — `atlas/web`: Phase 2 — `builtEnvironmentStoreV2`
  (Zustand + zundo + persist) with legacy-key migration shim and 16
  passing tests. Gated behind `BUILT_ENV_V2`; no consumers switched
  over yet.

The 3 TS errors flagged in the prior compaction summary
(`builtEnvironmentStoreV2.ts` L222/L298/L338) were already resolved by
the schema's loose-by-design coordinate typing
(`z.array(z.number()).length(2)` → `number[]`, length checked at
runtime) — `tsc --noEmit` was clean going in. No code change needed
for that piece.

Verification: `tsc --noEmit` exit 0; `vitest run
src/store/__tests__/builtEnvironmentStoreV2.test.ts` → 16/16 pass.

Recommended next: Phase 3 (Observe consumer rewrite — flip
`builtEnvironmentStore` callers behind the flag) and Phase 4 (Plan
inline-edit handler lift).
