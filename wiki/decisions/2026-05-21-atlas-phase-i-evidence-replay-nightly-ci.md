# 2026-05-21 — Atlas Phase I: nightly evidence-replay CI sweep

**Branch:** `feat/atlas-permaculture`
**Continues:** [[2026-05-21-atlas-phase-g-evidence-audit-replay]]
**Sibling:** [[2026-05-21-atlas-phase-h-tooltip-evidence-retrofit]]
**Closes:** Phase G ADR "Nightly CI cron" deferral.

---

## Context

Phase G shipped `replayEvidenceAuditSince` + `evidence:replay` CLI as
operator-run only. The Phase G ADR explicitly deferred "Nightly CI cron"
because it required a managed DB connection in CI secrets. With the
tooltip retrofit landed in Phase H, the natural follow-up was to wire
the existing CLI into a non-gating nightly sweep so the durability
guarantee runs without operator burden.

Phase I lands one workflow file. No code changes outside `.github/`.

## Decisions

### I.1 — repository secret (operator action, not committed)

The workflow consumes a new `DEV_DATABASE_URL` repository secret
(Settings → Secrets and variables → Actions). Value = the dev Postgres
connection string Atlas already uses for migrations. Operator-managed;
**not** committed. The workflow has a guard step that emits
`::warning::DEV_DATABASE_URL secret not configured — skipping nightly
replay.` + a populated `$GITHUB_STEP_SUMMARY` and exits 0 when unset,
so the workflow is safe to land before the secret is configured.

### I.2 — workflow file (commit `c4109b25`)

New `.github/workflows/evidence-replay-nightly.yml`:

- **Trigger.** `schedule: cron '0 8 * * *'` (08:00 UTC daily) + manual
  `workflow_dispatch: {}` for ad-hoc runs from the Actions tab.
- **Permissions.** `contents: read` (least privilege; the workflow
  never writes the repo).
- **Non-gating.** `continue-on-error: true` on the job — replay
  failures surface as a FAIL summary, never as a red branch. Branch
  protection stays untouched.
- **Reporting.** Markdown blob appended to `$GITHUB_STEP_SUMMARY`:
  window, exit code, last 40 lines of `replay.out`. Full output is
  in the run artifacts. **No Slack / Discord / email** in v1.
- **Window.** 24h sliding window via
  `date -u -d '24 hours ago' +"%Y-%m-%dT%H:%M:%SZ"`, fed into
  `pnpm --filter @ogden/api evidence:replay -- --all-since "$since"`.
- **Env.** `DATABASE_URL` from the secret; **dummy** `JWT_SECRET` +
  `REDIS_URL` because the `apps/api` config schema validates them at
  import even though the replay CLI never touches them. Documented in
  the workflow body. If config validation loosens later, drop the
  dummies.
- **Setup.** `pnpm/action-setup@v4` (pnpm 9) + `actions/setup-node@v4`
  (Node 20 + pnpm cache) + `pnpm install --frozen-lockfile`.

### I.3 — wiki + Phase G strike (this commit)

- This ADR.
- New log entry `wiki/log/2026-05-21-phase-i-evidence-replay-nightly-ci.md`.
- Pointer added to `wiki/log.md` newest-first above the Phase H entry.
- Pointer added to `wiki/index.md` Decisions section above the Phase H
  ADR entry.
- Phase G ADR's "Deferred (still)" list: "Nightly CI cron" line
  struck through (`~~…~~`) with backlink to this ADR.
- **No LAUNCH-CHECKLIST change** — the "Nightly CI cron" item lived
  in the Phase G ADR's deferred follow-ups, not LAUNCH-CHECKLIST.
  (Verified on read of `wiki/LAUNCH-CHECKLIST.md`.)

## Verification

- YAML parses on push (GitHub Actions linter — implicit on the push
  step).
- Operator smoke (post-merge, after `DEV_DATABASE_URL` configured):
  `workflow_dispatch` run produces summary with `OK N / FAIL 0` on a
  clean dev DB. Deferred to operator action — Claude does not have
  Actions credentials.

## Commits

- **I.2** `c4109b25` — `ci(evidence): I.2 — nightly evidence-replay sweep (non-gating)`
- **I.3** (this) — `docs(wiki): I.3 — Phase I nightly evidence-replay CI ADR + log + index`

## Out of scope

- Slack / Discord / email alerting on replay FAIL — `$GITHUB_STEP_SUMMARY`
  only for v1.
- Single-hash replay mode (`--hash <hex>`) — still deferred from Phase G.
- Web UI surface for replay results — still deferred from Phase G.
- Orphan `'intelligence-summary'` selector cleanup — separate slice.
- Promoting the replay to gating (branch-protection rule) — explicitly
  rejected for v1; the audit ledger is reproducibility infrastructure,
  not a CI invariant.

## Covenant restatement

No public-facing surface. No new strings outside the workflow YAML.
"Capital partners & allies" framing per [[fiqh-csra-erased-2026-05-04]]
untouched. Audit ledger remains private reproducibility infrastructure
— the nightly sweep does not change its visibility posture, only its
durability cadence. 3-item Observe/Plan/Act IA unchanged. Mobile
Overview stack flat unchanged.
