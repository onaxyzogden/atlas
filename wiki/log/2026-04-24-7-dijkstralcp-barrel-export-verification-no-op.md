# 2026-04-24 — §7 dijkstraLCP barrel-export verification (no-op)


Plan-mode plan ([deep-launching-goose.md](../../.claude/plans/deep-launching-goose.md))
proposed adding `export * from './ecology/corridorLCP.js';` to
[packages/shared/src/index.ts](../packages/shared/src/index.ts) to fix a
runtime "module does not provide an export named `dijkstraLCP`" error from
[BiodiversityCorridorOverlay.tsx](../apps/web/src/features/map/BiodiversityCorridorOverlay.tsx).

### Finding
Verified the barrel re-export already exists at
[packages/shared/src/index.ts:29](../packages/shared/src/index.ts), and all
four imported symbols (`dijkstraLCP`, `frictionForCell`, `pickCorridorAnchors`,
`gridDims`) are exported from
[corridorLCP.ts](../packages/shared/src/ecology/corridorLCP.ts) at
lines 170, 205, 245, 341.

The plan was already complete — no edit needed. If the runtime error still
surfaces, it's a stale Vite dep-cache issue: clear `node_modules/.vite` and
restart the dev server.

### Outcome
No code change. Wiki entry only.
