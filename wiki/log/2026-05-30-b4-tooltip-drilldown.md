# 2026-05-30 — B4 tooltip drilldown (Slice M)

**Branch.** `feat/atlas-permaculture` (shipped as
`claude/zealous-hawking-a75e25`). Closes Slice M of the B4 tooltip
remaining-deferrals roadmap — **roadmap fully closed**. Full design
context in
[2026-05-30 ADR](../decisions/2026-05-30-atlas-b4-tooltip-drilldown.md).

## What changed

- **NEW** `apps/web/src/v3/plan/layers/HostUnionContextMenu.tsx` +
  `.module.css` — floating context menu opened by right-click /
  long-press on a host-canopy-union polygon. One item ("Open
  detail"). Dark-glass palette + fade via Slice I `--motion-overlay-*`
  tokens.
- **NEW** `apps/web/src/v3/plan/layers/HostUnionDrilldownCard.tsx` +
  `.module.css` — sticky floating card: host name header, per-member
  list with name + `LAYER_TINT`-coloured layer pill, "Open full
  audit →" footer link. `pointer-events: auto`. Edge-clamp mirrors
  the tooltip; scroll cap via own `max-height` + `overflow-y: auto`
  (no Slice K-style carve-out needed — already pointer-events: auto).
- **NEW** `apps/web/src/v3/plan/layers/drilldownStrings.ts` — colocated
  user-facing strings (mirrors Slice N pattern); five entries.
- **NEW** `apps/web/src/v3/plan/layers/silvopastureDrilldownStore.ts`
  — Zustand bus for drilldown-card → SilvopastureIntegrationCard
  routing. Three operations: `requestOpenAudit(hostId)`,
  `consumePendingOpen()`, `clearTarget()`. Two pieces of state:
  `targetHostId` (read by the integration card) +
  `pendingOpenModule` (consumed by `PlanLayout`).
- **MODIFIED**
  [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
  — added `contextMenu` + `drilldownHost` state slots; added a
  trigger effect installing `map.on('contextmenu')` +
  `pointerdown`/`pointermove`/`pointerup`/`pointercancel` for the
  500 ms long-press synthesis (10 px² movement abort); added a
  dismiss effect (ESC + document-pointerdown) with per-surface
  carve-outs (`host-union-context-menu`,
  `host-union-drilldown-card`, plus the existing
  `host-canopy-union-tooltip` exemption); refactored the return
  block from a single `createPortal` to a fragment of up to three
  sibling portals; added the open-detail member-resolution path that
  flattens `resolveMembers(host, …).guilds[].members` filtered to
  canopy-bearing (`canopySpreadM > 0`) into the
  `DrilldownMemberRow[]` shape the card consumes.
- **MODIFIED**
  [apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx](../../apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx)
  + `.module.css` — optional `targetHostId?` prop (prop overrides
  store read); on-mount `scrollIntoView` + `data-target='true'` on
  the matching row; `data-target-faded='true'` flips after 2 s to
  transition the gold border-left back to neutral. Gold accent
  `#c4a265` matches Slice L's per-block pinned accent.
- **MODIFIED**
  [apps/web/src/v3/plan/PlanLayout.tsx](../../apps/web/src/v3/plan/PlanLayout.tsx)
  — subscribed to `pendingOpenModule`; consume + navigate +
  `setSlideUpOpen(true)` in a single effect. Clear `targetHostId`
  on slide-up close.
- **NEW tests** —
  `HostUnionContextMenu.test.tsx` (3),
  `HostUnionDrilldownCard.test.tsx` (5),
  `silvopastureDrilldownStore.test.ts` (4).

## Test results

- `npx vitest run src/v3/plan/layers` → **40/40 passing** (was 28
  after Slice L; +12 here = 3 menu + 5 card + 4 store).
- `npx vitest run src/v3/plan src/features/agroforestry` →
  **300/300 passing** (was 288 after Slice L; +12 here).
- `npx tsc --noEmit` — Slice M files clean. Pre-existing unrelated
  errors elsewhere (atlas-AI / hydrology / computeScores) confirmed
  unchanged.

## Design highlights

- **Two surfaces, two purposes.** The context menu is a transient
  one-shot ("Open detail" is the only item; the menu lifts the
  steward from a right-click-does-nothing dead-end). The drilldown
  card is sticky and persists across cursor motion until ESC, close
  button, or a click outside the map canvas (sticky semantic: the
  steward wants to explore the map without losing the readout).
- **Right-click + long-press chosen over double-click / in-tooltip
  button / modifier-click.** Heaviest infrastructure (we synthesise
  long-press because MapLibre does not emit `contextmenu` from a
  held touch) but the only option that works cross-device without
  teaching stewards a hidden gesture.
- **Per-member layer pill = Slice O carve-out applied correctly.**
  Per-host layer tinting is information loss (Slice O rejection).
  Per-member layer pills are *correct metadata* — each member
  belongs to one layer. The card reuses the existing `LAYER_TINT`
  palette already on the per-member geometry layers.
- **Store-brokered slide-up routing, not prop-drilling.** A small
  Zustand bus (`silvopastureDrilldownStore`) holds the transient
  routing payload; `PlanLayout` consumes pending open requests and
  `SilvopastureIntegrationCard` reads the target id on mount. URL
  params rejected — a transient highlight is not deep-linkable; we
  don't want browser history churn for in-session UI state.

## Roadmap status

Slices H + I + J + K + N + O + L + M shipped. **B4 tooltip
remaining-deferrals roadmap fully closed.** Future tooltip work opens
its own roadmap or ad-hoc slices as field-testing reveals gaps.
