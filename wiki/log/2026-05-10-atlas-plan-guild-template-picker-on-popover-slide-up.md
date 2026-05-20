# 2026-05-10 — Atlas Plan: guild template picker on popover + slide-up


**Objective.** When a steward edits an already-placed guild — either
via the map popover or the Plant-Systems slide-up — they should be
able to apply a premade guild template (Apple guild, Nitrogen
pioneer, 7-layer food forest, Pollinator edge) in one click, instead
of re-placing the guild or composing layers manually. The
first-placement picker on `GuildTool.tsx` had been live since
2026-05-09; this session extends parity to edit surfaces.

**Source picker (already in place from 20879ef).**
- [`apps/web/src/data/guildPresets.ts`](../apps/web/src/data/guildPresets.ts) — `GuildPreset` type, 4 starter presets, `resolveValidPresets()` + `findGuildPreset()` with warn-and-drop on missing species IDs.
- [`apps/web/src/data/__tests__/guildPresets.test.ts`](../apps/web/src/data/__tests__/guildPresets.test.ts) — 9/9 vitest cases for resolution + member-layer integrity.
- [`GuildTool.tsx`](../apps/web/src/v3/plan/draw/tools/GuildTool.tsx) — `preset` field above name/anchor; `lastAutofilled` scratchpad preserves manual edits across preset switches; `onSave` writes `members` + optional `notes`.
- [`InlineFeaturePopover.tsx`](../apps/web/src/v3/plan/draw/InlineFeaturePopover.tsx) — adopts the "store info from previous render" pattern + reactive `onValuesChange` so preset-autofill patches don't lose to a stale `useEffect` reset.

**Edit-surface parity (this session's incremental — see ADR
[2026-05-10-atlas-plan-guild-template-picker-on-popover](decisions/2026-05-10-atlas-plan-guild-template-picker-on-popover.md)).**
- `buildGuildEditSchema()` in `inlineEditSchemas.ts` now exposes
  `preset, name, anchorSpeciesId, notes`. Picking a preset patches
  `name` + `anchorSpeciesId` only when untouched; `onSave` overwrites
  `members`; `preset.notes` is written only when the steward did not
  type a custom note.
- `GuildSpatialBuilderCard.tsx` adds an "Apply template" select
  beside the existing "Switch guild" select — wholesale apply of
  `name` + `anchorSpeciesId` + `members`; resets to blank after apply
  so re-picking the same template re-fires.

**Side-fix.** `PlanChecklistAside.tsx`'s `PLAN_MODULE_GUIDANCE` was
missing the `machinery` entry, which crashed `<GuidanceCard>` once
machinery became a first-class module (commit ffde429). Added the
entry — Yeomans rank 4 (Access) framing with Mollison ch.5 +
Yeomans (*Water for Every Farm*) refs.

**Verification.**
- `cd apps/web && npx tsc --noEmit` → exit 0.
- `cd apps/web && npx vitest run src/data/__tests__/guildPresets.test.ts` → 9/9.
- Preview at `/v3/project/mtc/plan` loads cleanly; all 11 modules
  render in the right rail; toolset rail exposes the Guild button.
- Visual screenshot of popover-open + populated
  `GuildSpatialBuilderCard` deferred — MapboxDraw subscribes to
  native pointer events, and synthetic events through `preview_eval`
  can't drive `draw_point` mode. A real pointer click on the canvas
  is required for that proof.

**Deferred.** Manual map-click screenshot for visual sign-off.
