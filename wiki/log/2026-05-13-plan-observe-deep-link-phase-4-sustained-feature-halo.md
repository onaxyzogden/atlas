# 2026-05-13 — Plan → Observe deep-link Phase 4: sustained feature halo


**Why.** After Phase 3's flyTo + pulse, the pulse fades at ~2.5 s
and the target feature loses all visual treatment while the
steward is still reading the detail panel. They need a sustained
outline on the feature itself so the spatial context never gets
lost during the read.

**What.** Reused the existing `useObserveSelectionStore`-driven
halo (`observe-anno-selection-circle` / `-line` at
`ObserveAnnotationLayers.tsx:1121-1366`) rather than building a
parallel highlight layer. Three small edits:
- `ObserveDeepLinkFocus.tsx` now calls
  `useObserveSelectionStore.getState().set([{ kind, id }])` right
  after opening the detail panel, so the gold halo paints around
  the feature on landing.
- `AnnotationDetailPanel.tsx` wraps `close` in a `useCallback` that
  guard-clears the selection only when it's exactly
  `[{ kind, id }]` matching `active` (via `selectionKey`). User-
  initiated multi-selects diverge from that signature and are
  preserved.
- `SelectionFloater.tsx` early-returns `null` while
  `useAnnotationDetailStore.active` is set — the panel already
  shows its own Edit / Delete buttons, so the floater would be
  redundant clutter on top.

**Verified.** `npx tsc --noEmit` clean for the three changed files
(only the pre-existing `DesignElementLayers.tsx:468` MultiPoint
error remains, baseline). The halo source already filters by
`{kind, id}` across all 21 AnnotationKinds, so points, lines,
polygons, and sector wedges all paint together with zero per-kind
plumbing.
