# 2026-05-13 — Needs & Yields audit card v2 (inline edge authoring)


**Closed.** Follow-up to the same-day polish commit `8d3e016e`. The v1
card was read-only — surfacing orphans / unmet / closed-loops /
integration score but forcing the steward back to the legacy canvas
socket-drag to *fix* anything (the "Open map editor →" CTA closed the
slide-up). v2 attaches behavior to every flagged row so the steward
closes loops without leaving the slide-up.

Per-row UX:

- Orphan-output rows now render a small `<select>` of compatible
  targets (entities where `INPUTS_BY_TYPE[type]` includes the resource;
  self-loops excluded) and a gold `Connect` button. Click → `addEdge`
  against `useRelationshipsStore`.
- Mirror under unmet-input rows: `<select>` of compatible sources
  (entities whose `OUTPUTS_BY_TYPE[type]` includes the resource).
- When the candidate list is empty the select reads `(no compatible
  inputs/outputs placed)` and `Connect` is disabled — no addEdge call.
- Local `edgeKey` helper pre-checks duplicates against
  `edgesByProject[project.id]` before `addEdge`, since the store
  silently no-ops on dupes but still returns `{ ok: true }`. Dupe
  attempts flash an `Already routed` pill for 2 s next to the button.

New "Routed edges (N)" `<details>` block under Site rollup —
collapsed by default — lists every existing edge as
`<from> [chip] → <to>` with a per-row `Remove` button calling
`removeEdge(project.id, predicate)`. Lets the steward undo a bad
inline pick without map context.

Reactivity is automatic: the orphans/unmet/score `useMemo`s already
subscribe to `edgesByProject`, so the FLAGGED → INTEGRATED pill flips
live the moment the last orphan clears, and the routed list grows
without re-mount.

Files: `apps/web/src/v3/plan/cards/principle-verification/NeedsYieldsAuditCard.tsx`
(351 + / 22 −, the only file touched). HMR clean. Tsc clean for the
card itself (pre-existing errors elsewhere in
`DesignElementLayers.tsx`, `temporalCoherenceMath.ts`,
`growthCurves.ts` remain — unrelated WIP).

Commit `29ed6498` on `feat/atlas-permaculture`.
