# 2026-05-13 — Plan → Observe deep-link opens the record's detail panel


**Why.** Phase 1 of the Plan-stage Observe popover (earlier today)
surfaced read-only details, but its "Edit in Observe →" button only
navigated to the module — the steward still had to hunt for the
specific record they'd just clicked. Phase 2 closes the loop: the
detail panel opens automatically on landing.

**What.** Popover now forwards `annoKind` + `annoId` as `focusKind` /
`focusId` search params on the route navigation. `ObserveLayout`
reads them via `useSearch({ strict: false })` and on mount calls
`useAnnotationDetailStore.open({ kind, id })` when
`getAnnotationRow(kind, id)` resolves. Search params are stripped
immediately via `navigate({ search: {}, replace: true })` so refresh
/ back-nav doesn't re-fire the handoff. Falls back gracefully when
the record is gone (registry lookup returns null → no-op).

**Verified.** `npx tsc --noEmit` clean. Live preview: clicking a soil
sample on `/v3/project/mtc/plan` → "Edit in Observe →" routes to
`/v3/project/mtc/observe/earth-water-ecology` and the
`<AnnotationDetailPanel>` opens showing "House yard — kitchen garden
bed" + notes + created timestamp + Delete / Edit buttons.
