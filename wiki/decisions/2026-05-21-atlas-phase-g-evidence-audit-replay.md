# 2026-05-21 — Phase G: server-side evidence-audit replay tool

**Branch:** `feat/atlas-permaculture`
**Commits:**
- G.1 `f32c7c58` — promote selectors + dispatcher + hashInputs to `packages/shared/evidence`
- G.2 `8f55a45b` — `replayEvidenceAuditSince` + CLI
- G.3 `89cf2a5d` — self-cleaning pgtest
- G.4 (this commit) — wiki ADR + log + index + LAUNCH-CHECKLIST strike

## Context

F.4 (migration 033 + emit hook) + F.6 + F.7 instrumented every live
Evidence panel to write a passive row to `evidence_audit_log` on each
emission. The **write** path is now proven across all 7 live panels.
F.4's ADR explicitly deferred the **read-back / reproducibility** path:

> Server-side replay tool for `evidence_audit_log`. Given an
> `input_hash`, recompute the selector and assert byte-identical
> output — durability test, not gating.

Phase G closes that follow-up. The tool re-runs
`selectEvidenceFor({ panelKey, inputs: input_payload })` on stored
rows and asserts the recomputed output stable-stringifies to the same
bytes as `evidence_output` (and that the recomputed
`hashInputs(input_payload)` still matches the stored `input_hash`).
It catches three flavors of silent drift:

1. **Selector drift** — a refactor that subtly changes outputs.
2. **Hash-function drift** — a change to `stableStringify` /
   `hashInputs` that invalidates historical hashes.
3. **Schema drift** — a payload shape the selector no longer accepts.

Durability only — not gating. Operator-run today; can graduate to a
nightly CI cron later.

## Locked decisions

Three forks ratified via `AskUserQuestion` 2026-05-21:

1. **Selectors move to `packages/shared/evidence`** — the canonical
   long-term home. Mirrors `packages/shared/demand` +
   `packages/shared/scoring` precedent. API + web both import from
   `@ogden/shared/evidence` after G.1.
2. **CLI interface: `--all-since <ISO date>` sweep only** — no
   single-hash mode in v1; sweep-and-summarise semantics map cleanly
   to a future nightly CI gate.
3. **Full integration test against a seeded fixture** — the pgtest
   owns its own row lifecycle (insert via selector at runtime, replay,
   assert, cleanup); no migration bump for the seed.

## G.1 — Selector promotion

`apps/web/src/lib/evidence/` (Phase E.2 home) was the wrong layer once
a server-side replay tool needed the same selectors. All 8 selectors,
the `selectEvidenceFor` dispatcher, the `hashInputs` /
`stableStringify` helpers, the `types.ts`, and the existing selector
test suite moved under `packages/shared/src/evidence/`. A new barrel
re-exports the public surface plus per-selector enum types
(`EthicKey`, `EthicStatus`) that downstream UI consumers reach for.

- New: `packages/shared/src/evidence/{types,hashInputs,selectEvidence,index}.ts`
  + `selectors/*.ts` + `__tests__/*.ts`
- New: `./evidence` exports entry in `packages/shared/package.json`
- Rewritten: 10 apps/web consumers (4 panels + 3 new + 3 components)
  + `apps/web/src/lib/evidence/auditEmit.ts` (which stays — depends on
  the web `apiClient`)
- Rewritten: 3 selector self-imports (`verdict`, `triad`, `intelligence`)
  + 1 test self-import — switched from `@ogden/shared` to the relative
  `../../schemas/assessment.schema.js` to avoid the package's
  self-import circular.

Verification (G.1 gate):
- `pnpm --filter @ogden/shared run typecheck` clean
- `pnpm --filter @ogden/shared run test` — 21 files / 318 tests passed
  (incl. 41 selector + 8 hashInputs cases now running in shared)
- `pnpm --filter @ogden/web run typecheck` clean on touched files;
  pre-existing foreign-WIP errors (`StepBoundary.tsx`, `HostUnion*`
  test mocks) unchanged
- `pnpm --filter @ogden/web run test` — 189 files / 1851 passed /
  4 skipped (baseline 1825 holds and is exceeded)

## G.2 — Replay function + CLI

`apps/api/src/scripts/replayEvidenceAudit.ts` exports:

```ts
export async function replayEvidenceAuditSince(
  sql: postgres.Sql,
  sinceIso: string,
): Promise<ReplayResult>
```

`ReplayResult` carries `{ totalRows, okRows, failRows, failures[] }`;
each `ReplayFailure` is `{ rowId, panelKey, reason, detail? }` where
`reason ∈ 'hash-mismatch' | 'output-mismatch' | 'unknown-panel' |
'selector-threw'`. Per-row mismatches never throw — the sweep keeps
going so a single bad row doesn't mask the rest.

`apps/api/src/scripts/replayEvidenceAudit.cli.ts` is a thin Node
entrypoint that parses `--all-since <ISO>` from `process.argv`, opens
its own `postgres` pool (mirrors `db/migrate.ts`), and exits 0 on
clean sweep / 1 on any FAIL / 2 on bad args. New pnpm script
`evidence:replay` runs it via `tsx`.

Operator usage:
```
pnpm --filter @ogden/api evidence:replay -- --all-since 2026-05-21T00:00:00Z
```

Verification: `pnpm --filter @ogden/api run typecheck` clean.

## G.3 — Integration test

`apps/api/src/tests/integration/replay-evidence-audit.pgtest.ts` —
three test cases gated behind `INTEGRATION_ENABLED` (Docker absent →
green-skip via the standard harness contract):

1. Freshly-seeded rows replay cleanly (`failRows === 0`).
2. Tampering one row's `evidence_output` is caught as
   `output-mismatch` against that specific `rowId`.
3. Corrupting `input_hash` is caught as `hash-mismatch`.

The fixture covers three representative selectors: `land-verdict`
(Tier-1 verdict), `three-ethics` (permaculture rollup),
`capital-partner` (export modal). Self-cleaning: the test seeds its
own user + project, then `resetDb` cascades the audit rows on
`afterEach` / `afterAll`. No new migration; no rows shared across
tests.

Verification:
- `pnpm --filter @ogden/api run typecheck` clean
- `pnpm --filter @ogden/api run test` — 680 mock tests pass (baseline)
- `pnpm --filter @ogden/api run test:integration` — file collected
  (3 tests detected); green-skipped on this host (Docker absent),
  consistent with the other 4 pgtests

## Out of scope

- **Single-hash replay mode.** v1 is sweep-only. A `--hash <hex>`
  variant is trivially additive against the same `replayEvidenceAuditSince`
  building blocks but not needed for the durability sweep.
- **Nightly CI cron.** The script is operator-run. CI integration is
  its own slice (requires a managed DB connection in CI secrets).
- **Web UI surface for replay results.** Audit ledger remains a
  private reproducibility surface; no public-facing strings, no UI.
- **Removing the orphan `'intelligence-summary'` selector.** Separate
  cleanup — the dispatcher still wires it for future re-adoption.

## Covenant restatement

The replay tool exercises **private internal reproducibility**; no
new public-facing surface, no new strings, no capital framing. The
audit ledger continues to persist existing numeric inputs only.
"Capital partners & allies" / "appreciation of stewarded land value"
framing per [[fiqh-csra-erased-2026-05-04]] is untouched. 3-item
Observe/Plan/Act IA unchanged. Mobile Overview stack flat
([[feedback-mobile-overview-stack]]).

## Closes

- F.4 deferred follow-up: *"Server-side replay tool for
  `evidence_audit_log` — given an `input_hash`, recompute the
  selector and assert byte-identical output — durability test, not
  gating."* LAUNCH-CHECKLIST item flipped `[ ]` → `[x]` in G.4.
