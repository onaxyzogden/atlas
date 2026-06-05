# 2026-04-24 — `typecheck` npm script (raised Node heap)


Follows the workspace-wide tsc verification (commit `2f891bc`). Default
Node heap (~2 GB) OOMs when running `tsc --noEmit` across any of the
three workspaces on this Windows 10 box. Contributors shouldn't have
to discover and set `NODE_OPTIONS` manually.

### Shipped
- Root [package.json](../package.json) — `typecheck` script that
  fans out via Turborepo: `turbo run typecheck`.
- [turbo.json](../turbo.json) — `typecheck` task registered.
- Per-workspace [package.json](../apps/web/package.json) (`apps/web`,
  `apps/api`, `packages/shared`) — each gets:
  `typecheck: node --max-old-space-size=8192 ../../node_modules/typescript/bin/tsc --noEmit`.
  Direct-node invocation works cross-platform without `cross-env`;
  the hoisted `typescript` always lives at `./node_modules/` from the
  repo root under the `shamefully-hoist` pnpm layout (see
  [.npmrc](../.npmrc)).
- Kept the existing `lint` script (`tsc --noEmit`) untouched to avoid
  churning CI that may depend on it.

### Verification
All three `npm run typecheck` runs exited 0 with clean output:
- `apps/web`
- `apps/api`
- `packages/shared`

### Outcome
`pnpm typecheck` (or `npm run typecheck` from any workspace) now runs
cleanly without manual env tweaking. Deferred: wire `typecheck` into
the pre-push or CI pipeline once `lint` is retired.
