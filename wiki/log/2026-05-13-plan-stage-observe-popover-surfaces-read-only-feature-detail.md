# 2026-05-13 — Plan-stage Observe popover surfaces read-only feature details


**Why.** Clicking an Observe annotation on the Plan Current-Land map
opened `<ObserveLinkPopover>` showing only a generic kind label
("Soil sample") plus boilerplate "Observed feature. Edits live in
the Observe stage." — stewards couldn't tell which specific feature
they'd clicked without round-tripping back to Observe.

**What.** Routed `annoKind` + `annoId` (already stamped on every
`observe-anno-*` feature) through the popover chain:
`PlanObserveSelectionHandler` reads them off `top.properties` and
passes them to `useObserveLinkPopoverStore.open(...)`; the payload
type gained two optional fields; `<ObserveLinkPopover>` calls the
existing `getAnnotationRow(kind, id)` helper from
`AnnotationRegistry` and renders `row.title` + `row.subtitle` +
`Created · <toLocaleString>` as a read-only block above the
"Edit in Observe →" deep-link. Falls back to generic copy when no
row resolves (stale id / kinds without `annoKind` stamping). No new
store, no new data shape — reused the helper that already powers
`<AnnotationDetailPanel>` in Observe. BE kinds (building/well/etc.)
unaffected: they dispatch to the editable inline popover via
`BE_INLINE_EDIT_DISPATCH` before reaching this path.

**Verified.** `npx tsc --noEmit` clean for the three changed files.
Live preview at `/v3/project/mtc/plan`: clicking a soil sample
renders "House yard — kitchen garden bed" + earthworm/crumb notes
+ "Created · 5/11/2026, 1:14:21 PM"; Edit-in-Observe button still
deep-links into the Observe earth-water-ecology module.
