# 2026-05-21 — Phase G: server-side evidence-audit replay tool

**Branch:** `feat/atlas-permaculture`
**ADR:** [[decisions/2026-05-21-atlas-phase-g-evidence-audit-replay]]

Closes the F.4 deferred follow-up. The Evidence reproducibility ledger
now has a read-back path: `replayEvidenceAuditSince(sql, sinceIso)`
sweeps every `evidence_audit_log` row newer than the given ISO
timestamp, recomputes both the SHA-256 input hash and the selector
output, and asserts byte-identical match against the stored row.

## Commit roster

- **G.1 `f32c7c58`** — `refactor(evidence): G.1 — promote selectors +
  dispatcher + hashInputs to packages/shared/evidence`. 11 files moved
  from `apps/web/src/lib/evidence/` to `packages/shared/src/evidence/`
  (8 selectors + `selectEvidence.ts` + `hashInputs.ts` + `types.ts`),
  plus existing selector + hashInputs tests. New barrel
  `packages/shared/src/evidence/index.ts` re-exports the public
  surface plus `EthicKey` / `EthicStatus`. `./evidence` exports entry
  added to `packages/shared/package.json`. 10 apps/web consumers +
  `auditEmit.ts` redirected to `@ogden/shared/evidence`. 3 selector
  self-imports + 1 test self-import rewritten to relative paths to
  avoid the package self-import circular.
- **G.2 `8f55a45b`** — `feat(evidence): G.2 — server-side replay tool
  (replayEvidenceAuditSince + CLI)`. New `apps/api/src/scripts/`
  directory with the importable async function + thin CLI entrypoint
  (parses `--all-since <ISO>`, exits 0 / 1 / 2). New
  `evidence:replay` pnpm script. Per-row checks: hash recompute,
  panel-key in the 8-key dispatch set, stable-stringify of output.
  Never throws on per-row mismatch.
- **G.3 `89cf2a5d`** — `test(evidence): G.3 — integration test for
  replayEvidenceAuditSince (self-cleaning seed)`. Pgtest with three
  cases — clean sweep, tampered `evidence_output` →
  `output-mismatch`, corrupted `input_hash` → `hash-mismatch`.
  Fixtures cover `land-verdict` + `three-ethics` + `capital-partner`.
  Self-cleaning via `resetDb` (project CASCADE drops audit rows).
- **G.4** (this commit) — ADR + log + index + LAUNCH-CHECKLIST strike.

## Verification

- `pnpm --filter @ogden/shared test` — 21 files / 318 tests passed
  (incl. 41 selector + 8 hashInputs cases now running in shared)
- `pnpm --filter @ogden/shared typecheck` clean
- `pnpm --filter @ogden/web test` — 189 files / 1851 passed / 4
  skipped (baseline 1825 from F.7 docs holds and is exceeded)
- `pnpm --filter @ogden/web typecheck` — only pre-existing
  foreign-WIP errors unchanged
- `pnpm --filter @ogden/api test` — 680 mock tests passed (3 skipped)
- `pnpm --filter @ogden/api typecheck` clean
- `pnpm --filter @ogden/api test:integration` — pgtest file
  collected (3 tests); green-skipped on this host (Docker absent),
  consistent with the rest of the pgtest suite

## Branch hygiene

External rebases occurred across F.7 / G.1 / G.2 / G.3 boundaries
(branch tip moved from `75b56e9b` → `df01b61a` mid-phase). Per
[[project-branch-rebase]]: `git fetch origin && git status -sb` ran
after every commit; foreign-WIP working-tree edits (StewardshipPrograms
cashflow files, `vite.config.ts`, unrelated wiki edits) were never
staged into G.* commits.

## Deferred (still)

- Single-hash replay mode (`--hash <hex>`).
- Nightly CI cron wiring for `evidence:replay`.
- Web UI surface for replay results.
- Cleanup of the orphan `'intelligence-summary'` selector.

## Covenant

No new public-facing strings; no capital-framing changes. Audit
ledger continues to persist existing numeric inputs only.
Reproducibility, not surveillance. See [[fiqh-csra-erased-2026-05-04]].
