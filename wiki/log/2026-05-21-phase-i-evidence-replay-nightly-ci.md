# 2026-05-21 — Phase I: nightly evidence-replay CI sweep

**Branch:** `feat/atlas-permaculture`
**ADR:** [[decisions/2026-05-21-atlas-phase-i-evidence-replay-nightly-ci]]

Closes the Phase G ADR "Nightly CI cron" deferral. The existing
`evidence:replay` operator CLI is now also driven by a non-gating
nightly GitHub Actions workflow against the dev DB.

## Commits

- **I.2** `c4109b25` — `ci(evidence): I.2 — nightly evidence-replay sweep (non-gating)`
  - New `.github/workflows/evidence-replay-nightly.yml`.
  - Triggers: `schedule: cron '0 8 * * *'` (08:00 UTC daily) +
    `workflow_dispatch: {}`.
  - `continue-on-error: true` — non-gating; FAIL is a summary, not a
    red branch.
  - `$GITHUB_STEP_SUMMARY` reporting (no Slack / Discord in v1) with
    window + exit code + last 40 lines of `replay.out`.
  - Guard step on missing `DEV_DATABASE_URL` repo secret emits
    `::warning::` + green skip with a populated summary, so the
    workflow is safe to land before the operator configures the secret.
  - 24h sliding window via `date -u -d '24 hours ago'`.
  - Dummy `JWT_SECRET` + `REDIS_URL` env vars satisfy `apps/api`
    config-schema import (the replay CLI never touches them).
  - `pnpm/action-setup@v4` (pnpm 9) + `actions/setup-node@v4` (Node 20
    + pnpm cache) + `pnpm install --frozen-lockfile`.

- **I.3** (this commit) — `docs(wiki): I.3 — Phase I nightly evidence-replay CI ADR + log + index`
  - ADR + log entry + index pointers + Phase G ADR strike on the
    "Nightly CI cron" deferred bullet.

## Operator prerequisite

Add `DEV_DATABASE_URL` to repository secrets (Settings → Secrets and
variables → Actions). Value = the dev Postgres connection string Atlas
already uses for migrations. **Not committed.** Documented in the
Phase I ADR.

## Verification

- YAML parses on push (implicit GitHub Actions linter step).
- Manual `workflow_dispatch` smoke deferred to operator action
  post-merge (requires `DEV_DATABASE_URL` configured and Actions
  credentials Claude does not have).

## Branch hygiene

I.2 committed immediately after Write per the rebased-branch protocol
(`[[feedback-commit-immediately-on-rebased-branches]]`). Foreign-WIP
working-tree edits (org migrations, organizations feature WIP) left
unstaged.

## Covenant

No public-facing surface. No new public strings. "Capital partners &
allies" framing per [[fiqh-csra-erased-2026-05-04]] untouched. Audit
ledger remains private reproducibility — durability cadence improves,
visibility posture does not change.

## Continues

[[2026-05-21-phase-g-evidence-audit-replay]]
[[2026-05-21-phase-h-tooltip-evidence-retrofit]] (sibling)
