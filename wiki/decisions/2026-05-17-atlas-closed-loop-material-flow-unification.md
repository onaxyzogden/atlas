# 2026-05-17 — Closed-loop model unification (#58/#59): one `MaterialFlow`

**Status:** Accepted · **Scope:** `apps/web` Plan/Act closed-loop subsystem

## Context

Atlas carried **two disjoint material-flow models** that never reconciled:

- `flowConnectorStore` (`ogden-flow-connectors` v1) — canvas-drawn
  `FlowConnector` LineStrings with **free-text** `fromName`/`toName`. No
  structured endpoints → could not earn closed-loop credit.
- `closedLoopStore` (`ogden-closed-loop` v1) — `WasteVector` with
  structured `fromFeatureId`/`toFeatureId`, scored by `ClosedLoopGraphCard`,
  but **not authorable from the canvas**, and its endpoint picker was blind
  to livestock / water systems / plant guilds.

A steward who drew a compost→bed flow on the map got **no closed-loop
credit**, and the loop-scoring graph could not see canvas geometry
(#58/#59).

## Decision

Full store merge. One `MaterialFlow` model in the **surviving**
`closedLoopStore` (it already owns loop scoring + `wasteVectorRuns` +
`fertilityInfra`); `ogden-closed-loop` schemaVersion **1→2**.
`ogden-flow-connectors` folded then retired; `flowConnectorStore.ts`
deleted.

`MaterialFlow` = id · projectId · label · `materialKind` (superset enum:
legacy `FlowKind` ∪ `WasteResourceType`) · `sourceId`/`sinkId`
(structured, nullable) · `sourceLabel`/`sinkLabel` (free-text fallback) ·
`origin: 'canvas' | 'list'` · optional `geometry` (canvas only) ·
color/notes/phase/enterprise · timestamps.

**Two-mechanism migration** (builtEnvironmentStoreV2 precedent):

1. **Same-key** persist `migrate` (v1→v2): each `WasteVector` →
   `MaterialFlow` (origin `'list'`, structured endpoints, no geometry).
2. **Foreign-key** `onRehydrateStorage`: raw-read the dead
   `ogden-flow-connectors` blob, map each `FlowConnector` → `MaterialFlow`
   (origin `'canvas'`, geometry kept, `fromName/toName` →
   `sourceLabel/sinkLabel`, endpoints unpinned), dedupe by id, **delete the
   dead key**, clear the undo timeline (holds pre-merge shapes). Idempotent
   — once the dead key is gone the fold is a no-op.

The legacy `site-annotations-migrate.ts` v3 path is **unchanged**: it still
seeds `ogden-closed-loop` as `{state:{wasteVectors,…},version:1}` and the
new persist `migrate` converts on rehydrate — only its type import moved.

`syncManifest` line 339: schemaVersion 2 + `tagged('materialFlows',…)`;
`ogden-flow-connectors` descriptor removed.

New shared `useFlowEndpointOptions(projectId)` hook (zones / structures /
crops / fertility **+ livestock paddocks / water earthworks+storage /
guilds**) consumed by both the list tool and the canvas tool, so endpoint
choices are identical regardless of authoring path. `FlowConnectorTool` and
`buildFlowConnectorEditSchema` gained structured From/To pickers — the #59
ask: canvas-drawn flows now earn closed-loop credit.

## Consequences

- **+** One coherent model; canvas flows score; endpoint picker covers the
  endpoints a regenerative loop actually routes between.
- **+** Side benefit: closes the pre-existing `PlanDataLayers →
  flowConnectorStore` build breakage logged under the A1 entry (2026-05-17).
- **−** Canvas-folded flows arrive with `sourceId/sinkId: null` — the
  steward must re-pick endpoints to earn credit (free-text label retained
  as a visible fallback until then). Acceptable: structured endpoints can't
  be inferred from free text.
- **Verification:** `tsc --noEmit` EXIT 0; full `apps/web` vitest
  **1096/1096** incl. 19 new (closedLoopStore migration ×4,
  useFlowEndpointOptions ×2, siteAnnotations migrate ×13) + syncManifest
  guard. Live-UI smoke deferred — only running 5200 server was bound to a
  sibling worktree (non-destructive mandate); migration/endpoint/jump logic
  is deterministic and unit-locked.

Supersedes the `closedLoopStore wasteVectors` slice from
`2026-04-30-site-annotations-store-scholar-aligned-namespaces.md`.
