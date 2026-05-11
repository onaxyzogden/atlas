# `apps/atlas-ui` — Archived 2026-05-10

This workspace was lifted from the OGDEN prototype on 2026-05-03 and absorbed
MILOS UI primitives on 2026-05-04. It is no longer an active workspace
member: `pnpm-workspace.yaml` was updated on 2026-05-10 to list
`apps/api` and `apps/web` explicitly, omitting this folder.

## Status

- **Not built.** `pnpm dev` / `pnpm build` from the repo root no longer
  spawn this app.
- **Not linted / typechecked.** Its `lint`, `typecheck`, and `test`
  scripts were stubs ("not configured yet") at the time of archiving.
- **Kept in-repo** for reference — the 11 OBSERVE pages and the typed
  `builtin-sample.js` may inform future v3 work.

## Rationale

Per the 2026-05-09 pre-test friction audit:
> `apps/atlas-ui` is a stranded prototype. It is a workspace member, so
> `pnpm dev` from root spawns it alongside `apps/web`. Its
> `test`/`typecheck` scripts are stubs. There is no documented
> integration story.

Operator decision: **archive, not promote/merge.** Active v3 work lives
in `apps/web/src/v3/`.

## ADR

See `wiki/decisions/2026-05-10-atlas-ui-archived.md`.

## Resurrecting

If a future task wants this back as an active workspace, add it back to
`pnpm-workspace.yaml` and run `pnpm install` from the repo root to relink
its `workspace:*` dependency on `@ogden/shared`.
