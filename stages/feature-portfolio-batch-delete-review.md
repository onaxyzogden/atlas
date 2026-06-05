# Portfolio batch archive / delete — destructive-capability approval

**Status:** review
**Date:** 2026-06-02
**Author:** Claude Code (awaiting Yousef approval)

## What
Adds a multi-select toolbar to the v3 Portfolio surfaces (`/v3/portfolio` —
both the dashboard card grid and the map list). A "Select" toggle enters select
mode; the steward checks multiple projects and then **batch-archives,
batch-unarchives, or batch-deletes** them from a sticky bottom action bar. A
"Show archived" toggle swaps the visible set so archive stays reversible.

Plan: [`.claude/plans/how-should-triggered-protocol-starry-aho.md`](../../../../.claude/plans/how-should-triggered-protocol-starry-aho.md)

## Why this needs an approval doc
Per the MILOS CI/CD safety flags, a **destructive operation** (here, permanent
batch project deletion) requires a `stages/` approval doc before it lands.
Archive/unarchive are reversible status flips and not themselves destructive,
but they ship in the same toolbar, so they are documented here too.

## Blast-radius assessment
- **Delete is permanent.** It calls the existing per-id `deleteProject`, which
  issues `DELETE /api/v1/projects/:id` (server `ON DELETE CASCADE`s zones,
  design elements, plans, attachments) and runs the client `cascadeDeleteProject`
  to purge local-cache stores. The batch wrapper (`deleteProjects`) only loops
  this proven action via `Promise.allSettled`; it introduces no new delete path.
- **Guarded by type-to-confirm.** Hard delete is gated behind
  `ConfirmDestructiveDialog tone="danger"` requiring the steward to type
  `delete`. Archive/unarchive use a single `tone="warn"` confirm.
- **Builtins are never selectable.** Sample/system projects cannot be checked,
  and the per-id actions no-op on them regardless.
- **Orphan gap closed.** This feature also extends `cascadeDeleteProject` to
  clear the ~10 OLOS Act/Plan/Observe stores + `planStratumStore` (4 maps) +
  `siteDataStore`, which were previously orphaned on hard-delete. (Committed
  separately, slice 1; regression-tested.)
- **No schema change.** Archive remains a `status` flip; no new columns.

## Verification
- `cascadeDelete.test.ts` + `projectStore.batch.test.ts` green (bounded,
  pool=forks): cascade purges the deleted project across every store while a
  sibling is preserved; batch wrappers tally ok/failed, handle partial failure,
  archive/unarchive round-trip, and no-op on builtins.
- Web typecheck clean in touched files.
- Live verification (Claude_Preview) pending sign-off: select ≥2 projects on the
  grid and the map list, archive → leaves active list → show archived →
  unarchive restores; delete requires typing `delete`, removes the project, and
  clears its OLOS/siteData localStorage records while a sibling's remain.

## Rollback
Feature is purely additive UI + store wrappers. To disable, revert the
`PortfolioHomePage` select-mode wiring; the per-id `deleteProject`/`archiveProject`
actions it calls are pre-existing and unaffected.
