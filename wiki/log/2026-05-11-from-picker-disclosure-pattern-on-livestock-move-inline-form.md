# 2026-05-11 — From-picker disclosure pattern on livestock-move inline forms


**Context.** Final deferred item from
`wiki/decisions/2026-05-10-atlas-livestock-move-event-v3.md`: the three
inline livestock-move forms (`startLivestockMoveLog`,
`startScheduledLivestockMove`, and the `LivestockMoveTool` draw tool)
omitted any From picker. Only the in-card `LivestockMoveCard` exposed
origin. ADR's blocker: "20-option paddock+structure select on a 6-field
cramped panel."

**Resolution.** Disclosure pattern. Default form footprint unchanged at
6 fields; a new `+ Add origin` trigger row reveals the From-picker on
demand. Current destination is excluded from origin options so a
plan/event can never self-target.

**Infra (generic).** `inlineFormStore.FieldSpec` gained a new
`kind: 'disclosure'` variant with `triggerLabel` + `collapsedLabel` +
`children: FieldSpec[]`. Children write to the flat top-level values
map (no namespacing — caller owns key collisions, same rule as today).
`InlineFeaturePopover` renders disclosures collapsed by default as a
single `.secondaryBtn` row; expanded state stores per-`key` in component
state. Auto-expands when any `children[i].key` has a non-empty value in
`initial` (so edit-mode flows show the picker already open). Required-
field validation flattens through children.

**Shared helper.** New `apps/web/src/v3/act/originPicker.ts` owns:
`OriginRef` (discriminated `{kind: 'paddock' | 'structure', id}`),
`encodeOriginValue` / `parseOriginValue` (encoding
`'paddock:<id>'` / `'structure:<id>'` / `''`), `buildOriginOptions(
projectId, exclude)` (paddocks sorted by name, then livestock-capable
structures sorted by template label; current destination filtered),
and `originDisclosureField(projectId, exclude)` returning a ready-to-
spread FieldSpec.

**Wiring.** Three call sites all spread the disclosure field at the end
of their existing `fields` array and parse `values.origin` in `onSave`,
merging into `fromPaddockId` / `fromStructureId` on the addEvent /
updatePlan payload:

- `ActStructurePopover.actions.startLivestockMoveLog` —
  excludes `{kind: 'structure', id: structure.id}`.
- `ActStructurePopover.actions.startScheduledLivestockMove` — same
  exclude; in edit mode, `initial.origin = encodeOriginValue(existing
  plan's from*)` so the picker auto-expands pre-selected.
- `LivestockMoveTool` (paddock draw tool) — excludes
  `{kind: 'paddock', id: hitId}` (destination).

**Files touched:**
- *Created*: `apps/web/src/v3/act/originPicker.ts`.
- *Modified*: `apps/web/src/v3/plan/draw/inlineFormStore.ts`,
  `apps/web/src/v3/plan/draw/InlineFeaturePopover.tsx`,
  `apps/web/src/v3/act/ActStructurePopover.actions.ts`,
  `apps/web/src/v3/act/draw/tools/LivestockMoveTool.tsx`,
  `wiki/decisions/2026-05-10-atlas-livestock-move-event-v3.md`.

**Verification.** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc
--noEmit` from `apps/web` → exit 0. One unrelated error in
`ObserveTools.tsx` (`Sprout` icon) untouched by this work. Manual smoke
deferred to operator (basemap tiles unavailable in dev).

**ADR closeout.** With this commit, every deferred item under the
2026-05-10 livestock-move-event-v3 ADR is now closed (Gap B, S2 third
cleanup, forward-looking variance, plan editing, plans for structure
destinations, plan-editing parity for structures, From picker). Only
truly architectural follow-ups remain ("linked rotate-through pair
objects", "cross-stage surfacing") and they are scoped for separate
sessions.
