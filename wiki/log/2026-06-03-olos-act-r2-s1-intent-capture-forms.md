# 2026-06-03 — OLOS Act R2: per-item s1 intent capture forms (all 12 types)

**Project:** OLOS / Atlas · branch `feat/atlas-permaculture`
**Arm:** R2 of the standing Act-stage objective-coverage remediation (R1 per-type overrides — done; R2 form-arm capture tools — **this entry**; R3 ratchet — done).

## What

Wired **per-checklist-item form-arm capture tools** for every per-type s1 vision/intent objective so each can be completed and recorded from the Act stage — closing the last arm of "every objective has an Act tool to complete/record its task."

- **36 s1 intent objectives** (32 primary + 4 additive secondary) across the 12 permaculture project types.
- **222 form tools** added to `ACT_TOOL_CATALOG` (`apps/web/src/v3/act/tier-shell/actToolCatalog.ts`).
- Each objective's `OBJECTIVE_ACT_TOOLS_OVERRIDE` entry (`packages/shared/src/relationships/objectiveActTools.ts`) flipped from intentional `[]` to its per-item form-id array.

## Convention (per-checklist-item, full integration)

`catalogue id == formId == real checklist-item id` (e.g. `hms-s1-household-needs-c1`). The form pipeline is fully generic: `ActTierShell.handleFormSave(formId, text)` persists via `saveVisionForm` **and** calls `setItemComplete(projectId, objectiveId, formId)`. Because the formId IS the checklist-item id, **saving a form ticks that checklist box and advances the objective progress bar**. `VisionFormModal` renders generically from the entry's `prompt` — no per-form switch, no modal/store edits required. Prompts are the **verbatim** checklist-item text from each type catalogue; icons reuse the already-imported lucide set (no import churn).

## Grounding / Amanah

- Prompts copied verbatim from operator-authored catalogue checklists (the operator explicitly delegated prompt authoring this session). The one apostrophe (`ag-s1-experience-vision-c4`, "farm's") uses a double-quoted string.
- `con-s1-tenure-covenant` retains "carbon credits" / "carbon agreement" in its prompts verbatim — no silent omission/rewording; Amanah scope flags live on the objective content, not the form tool.
- Amanah Gate: all 36 objectives are land-stewardship / production / governance / compliance intent capture — clean.

## Verification

- `corepack pnpm -C packages/shared exec tsc --noEmit` → clean.
- `actToolCoverage.test.ts` → **17/17** (forks, 20s timeout), including the new R2 ratchet `every s1 intent objective resolves to per-item form-arm capture tools (R2)` and the existing "every emitted catalogue id resolves in ACT_TOOL_CATALOG" sweep over all 222 new ids.
- Audit (`scripts/audit-out/act-objective-coverage.md`): Gap A **0** / Gap B **0** / Gap C **130 → 98** (all intentional, 0 default-driven). The 32 primary intent objectives moved out of the empty set; the 4 additive secondaries wire correctly but sit outside the primary-objective Gap C universe.

## Commits

- `ec71a9ad` homestead · `7e077900` silvopasture (earlier in session)
- `426952b1` regen_farm + market_garden + orchard
- `090a778a` livestock + conservation + off_grid + agritourism + ecovillage + education + wellness
- `b52a5cab` R2 ratchet assertion

## Notes / carried items

- Two commit subjects (`7e077900`, and the `@`-leak on `426952b1`/`b52a5cab` from a PowerShell here-string quirk) have cosmetic blemishes; this entry and the findings doc carry the authoritative figures. No `--amend` on this rebased branch. Future commits should use `git commit -F <file>`.
- Operator-only carried items (need forbidden `--amend`/`reset` on the rebased branch): R1 commits `923464a0` (conservation), `ee3af9b1` (off_grid), `71c4671f` (ecovillage) miscounts.

## Status

Standing Act-coverage task **complete**: R1 ✅ (Gap A 0), R2 ✅ (all s1 intent objectives carry per-item capture forms), R3 ✅ (ratchets across 14 types + the new R2 invariant).
