# 2026-05-21 — Phase G hotfix: Vite alias for `@ogden/shared/evidence`

**Branch.** `feat/atlas-permaculture`. Unblocks dev-server boot after the
Phase G evidence-layer promotion ([2026-05-21 Phase G log](2026-05-21-phase-g-evidence-audit-replay.md))
landed `./evidence` in `packages/shared/package.json` exports but did not
update the parallel `resolve.alias` map in `apps/web/vite.config.ts`.

**Symptom.** Vite v6.4.1 dev server (port 5200) returned HTTP 500 on
`DecisionTriad.tsx`, `LandVerdictCard.tsx`, and `auditEmit.ts`:

> Failed to resolve import "@ogden/shared/evidence" from
> "src/features/dashboard/DecisionTriad.tsx". Does the file exist?

React root never mounted on `/v3/project/<id>/observe` (or anywhere in
the app), blocking every manual UI verification.

**Root cause.** `apps/web/vite.config.ts` carries an explicit
`resolve.alias` map listing every `@ogden/shared/*` subpath. The bare
`@ogden/shared` alias is matched as a *prefix* by Vite, so any subpath
without its own explicit entry gets rewritten to
`packages/shared/src/index.ts/<subpath>` (nonsense). Phase G G.1 added
the package-exports entry but left the alias map missing
`./evidence` — Node's resolver was happy (verified via
`require.resolve('@ogden/shared/evidence')`) but Vite's alias-first
resolution short-circuited before reaching the exports field.

**Fix.** Added one line to
[apps/web/vite.config.ts:194](../../apps/web/vite.config.ts:194), in
specificity order before the bare `@ogden/shared` entry:

```ts
'@ogden/shared/evidence': resolve(__dirname, '../../packages/shared/src/evidence/index.ts'),
```

**Verification.** After Vite picked up the config change:

```
DecisionTriad.tsx    → 200
LandVerdictCard.tsx  → 200
auditEmit.ts         → 200
```

`apps/web` `npm run typecheck` clean for evidence code (3 pre-existing
unrelated errors in `StepBoundary.tsx`,
`HostUnionContextMenu.test.tsx`, `HostUnionDrilldownCard.test.tsx`).

**Lesson — keep the two resolution paths in sync.** The repo carries
two parallel module-resolution surfaces for `@ogden/shared/*`: the
package's `exports` field (used by Node, tsc, vitest) and the explicit
`resolve.alias` map in `apps/web/vite.config.ts` (used by Vite dev +
build). Future subpath additions to `packages/shared/package.json`
**must also add the matching `vite.config.ts` alias entry** or dev-server
boot will silently fail for any apps/web consumer. The alias map exists
because Vite's dev-server cwd is `apps/web/` and it does not auto-traverse
up to the workspace-root `node_modules`; the alias bypasses that.
