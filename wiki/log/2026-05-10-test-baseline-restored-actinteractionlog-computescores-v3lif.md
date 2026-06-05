# 2026-05-10 — Test baseline restored: `actInteractionLog`, `computeScores`, `V3LifecycleSidebar` un-skipped


Two-commit chain closing the deferred test cleanup flagged at the end
of the Livestock Module 6 pass. Suite went from **3 failing groups +
1 skipped placeholder** back to **0 failures, 0 skips**.

**`ca52f5b` — restore green baseline (3 files):**

- `apps/web/src/lib/__tests__/actInteractionLog.test.ts` — vi.mock
  factory was closing over a module-level `const`, tripping Vitest 2's
  hoist guard. Wrapped the `postActInteractions` spy in `vi.hoisted()`
  so the factory and the test body share the same reference. 8/8 green.
- `apps/web/src/tests/computeScores.test.ts` — Sprint BT added three
  §5 water-resilience sub-scores (Water Retention · Drought Resilience ·
  Storm Resilience — diagnostic facets, weight 0 in overall). Score-array
  length grew **10 → 13** (US) and **11 → 14** (CA). Updated the seven
  length assertions and their surrounding comments. 138/138 green.
- `apps/web/src/v3/components/__tests__/V3LifecycleSidebar.test.tsx` —
  replaced with a documented `describe.skip` placeholder, citing the
  `lucide-react@^1.8.0` `Icon.js` spread-`[undefined]` bug that breaks
  React 18 child reconciliation under happy-dom. Deferred re-enable
  pending a fix.

**`d122734` — un-skip via importOriginal lucide stub (1 file):**

The lucide bug persists in `^1.14.0` (verified by reading
`node_modules/lucide-react/dist/esm/Icon.mjs` after the bump landed via
the Plan 3D GLB-renderer commit `de71aaa` upstream). A version upgrade
alone is not enough; the test must mock the library. Earlier sessions
failed two strategies — a Proxy fallback (rejected by Vitest 2's
static named-export enforcement) and a hand-enumerated stub map (~60
transitive icons across `act/types.ts`, `plan/types.ts`,
`observe/types.ts` — unmaintainable).

The shipped fix uses `importOriginal` inside `vi.mock('lucide-react', …)`
to harvest every real export, then walks `Object.entries(actual)` and
replaces anything that looks like a React component (`$$typeof` on
forwardRef objects or plain function components) with a deterministic
`forwardRef` `<svg data-lucide-icon={name}>` stub. Non-component
exports pass through unchanged. This satisfies Vitest 2's static check
(every name forwards) **and** avoids the spread-undefined bug at the
same time, without enumerating icons by hand.

Test now asserts:
- three lifecycle stage labels (`Observe`, `Plan`, `Act`) present;
- `data-active` / `data-stage` markers correct for `activeStage="plan"`;
- only the active stage's `aria-expanded="true"`;
- both `ChevronDown` (open stage) and `ChevronRight` (collapsed
  stages) render as the lucide stub.

**Final suite:** 625 passed · 0 skipped · 0 failed (40 files, ~81 s).

**Deferred to next session:** the Broiler Product Map (Plan Module 7)
pass — agribusinessStore + 3 Point draw tools (slaughter / cold-chain
/ market) + 3 diagnostic cards — still on the bench from the Farm-Scholar
Module 6 verdict.
