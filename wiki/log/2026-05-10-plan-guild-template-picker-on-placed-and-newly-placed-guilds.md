# 2026-05-10 — Plan guild template picker on placed-and-newly-placed guilds


Closes the asymmetry where only newly-placed guilds had the template
picker. `buildGuildEditSchema()` (popover for placed guilds) now
mirrors `GuildTool.tsx` — `preset` + `anchorSpeciesId` fields with
the same `lastAutofilled` scratchpad pattern that preserves manual
edits. `GuildSpatialBuilderCard` (slide-up) gains an "Apply template"
select beside "Switch guild"; wholesale apply, select clears after
apply so re-picking re-fires.

Wholesale-apply semantics on both surfaces: `name` +
`anchorSpeciesId` + `members` overwritten; `preset.notes` only
written when the steward has not typed a custom note. Manual edits
to `name` between picks are preserved by the idempotent
`lastAutofilled` guard.

`InlineFeaturePopover.tsx` patch-spread switched from `{...next, ...patch}`
to a filtered loop assigning only defined values, so the
`Partial<Record<string, string|number>>` patch type does not widen
`setValues`'s state signature to include `undefined`.

Verified live via `preview_eval` invoking `buildGuildEditSchema`
inside the running app — schema fields ordered correctly (4 presets,
13 anchor options); preset pick patches `name` + `anchorSpeciesId`
and `onSave` writes 7 members + preset notes; manual edit + later
preset pick preserves `name`; user-typed notes preserved on save.
`npm --prefix apps\web run typecheck` clean (exit 0).

ADR: [2026-05-10 Plan guild template picker on popover](decisions/2026-05-10-atlas-plan-guild-template-picker-on-popover.md).
