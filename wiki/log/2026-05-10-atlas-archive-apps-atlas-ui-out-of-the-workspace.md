# 2026-05-10 — Atlas: archive `apps/atlas-ui` out of the workspace


**Context.** Phase 2.3 of the pre-test friction audit
([wiki/decisions/2026-05-09-atlas-pre-test-audit.md]) flagged
`apps/atlas-ui` as a *stranded prototype* — a workspace member with stub
`lint` / `typecheck` / `test` scripts and no documented integration
story. Operator decision was **archive, not promote/merge.**

**Change.**

- `pnpm-workspace.yaml` switched from glob `apps/*` to explicit
  `apps/api` + `apps/web` (plus `packages/*`). atlas-ui is no longer
  linked, so `pnpm dev` from the repo root no longer spawns it.
- `apps/atlas-ui/ARCHIVED.md` added at the folder root — status
  marker, rationale, resurrection instructions.
- ADR filed at
  [wiki/decisions/2026-05-10-atlas-ui-archived.md].

**Verification.** `corepack pnpm install` from repo root → "Done in
17.4s"; -170 / +17 net change as the 1 atlas-ui-only dep tree
detaches and the explicit-list pin-up resolves. No errors.

**Deferred.** Audit phases 4.1 (regional-cost citation backfill) and
4.2 (deferred-TODO sweep) still open.
