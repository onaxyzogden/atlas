# Atlas Plan — Guild template picker on popover + slide-up

**Date:** 2026-05-10
**Branch:** `feat/atlas-permaculture`

## Context

The "guild template" picker (Apple guild, Nitrogen pioneer, 7-layer food
forest, Pollinator edge — sourced from
[`apps/web/src/data/guildPresets.ts`](../../apps/web/src/data/guildPresets.ts))
was already wired into [`GuildTool.tsx`](../../apps/web/src/v3/plan/draw/tools/GuildTool.tsx)
for **newly-placed** guilds via the inline-form `onValuesChange`
reactive hook. Stewards editing an **already-placed** guild had no
template path: the popover only exposed `name` + `notes`, with the
existing comment in `inlineEditSchemas.ts` declaring "Member
composition + anchor species stays in the slide-up." Stewards who
wanted to wholesale re-apply a template had to either re-place the
guild or compose layer-by-layer manually.

## Decision

Mirror the GuildTool template picker into both surfaces:

1. **Map popover** (`buildGuildEditSchema()` in
   [`inlineEditSchemas.ts`](../../apps/web/src/v3/plan/layers/inlineEditSchemas.ts)) —
   add `preset` + `anchorSpeciesId` fields with the same
   `lastAutofilled` scratchpad pattern used by GuildTool. Picking a
   preset patches `name` + `anchorSpeciesId` only when the steward
   has not manually edited those since the last preset switch.
   `onSave` writes `members: preset.members` wholesale; `preset.notes`
   is written only when the steward did not type a custom note.

2. **Slide-up** ([`GuildSpatialBuilderCard.tsx`](../../apps/web/src/v3/plan/cards/plant-systems/GuildSpatialBuilderCard.tsx)) —
   "Apply template" select beside the existing "Switch guild" select.
   Apply is wholesale: `name`, `anchorSpeciesId`, `members` overwritten;
   `notes` written from preset only when no existing note. Select
   resets to blank after apply so re-picking the same template
   re-fires.

Both surfaces use `resolveValidPresets()` and `findGuildPreset()` —
no new persistence, no new store actions.

## Why this reverses the prior split

The prior comment ("anchor + members stay in the slide-up") was driven
by ring-canvas affordances — picking individual species per ring is
slide-up work. But applying a *whole template* is a one-click action
that doesn't need the ring canvas, and forcing stewards into the
slide-up just to swap templates added unnecessary navigation.

The slide-up retains its role as the home for layer-by-layer
composition; the popover and slide-up template picker are wholesale
"start fresh from a template" affordances on top of that.

## Type-narrowing fix

`onValuesChange` returns `Partial<Record<string, string | number>>`,
which TS strict-mode widens to allow `undefined` values when spread.
[`InlineFeaturePopover.tsx:119-130`](../../apps/web/src/v3/plan/draw/InlineFeaturePopover.tsx)
now filters undefined entries before assigning into `next` instead
of using object spread, satisfying `setValues`'s
`Record<string, string | number>` signature.

## Verification

- `npm --prefix apps\web run typecheck` → exit 0, no errors.
- Live in-app schema invocation (via `preview_eval`) confirmed:
  - Schema fields ordered: `preset, name, anchorSpeciesId, notes`.
  - 4 preset options, 13 anchor options.
  - Apple-guild pick → patches `name` + `anchorSpeciesId`; `onSave`
    writes 7 members + preset notes.
  - Manual name edit + later preset pick → `name` preserved
    (`lastAutofilled` guard works), only `anchorSpeciesId` patched.
  - User-typed notes → preserved on save; `preset.notes` does not
    clobber.

## Related

- [2026-05-08 atlas-plan-plant-guild-tool](2026-05-08-atlas-plan-plant-guild-tool.md) — original GuildTool with first-placement template picker.
- [2026-05-08 atlas-plan-module5-plant-systems](2026-05-08-atlas-plan-module5-plant-systems.md) — Module 5 framing.
