# 2026-05-13 — Module-bar tiles open slide-up on first click


**Why.** Tiles in the bottom module bar required two clicks to surface
the slide-up: first click selected (URL nav + reset slideUpOpen=false
in the layout), second click on the now-active tile finally fired
`onOpenSlideUp`. PlanTools and PlanChecklistAside already opened the
sheet on first click — the bar lagged the rest of the stage.

**What.** Composed `onOpenSlideUp()` on top of `onSelectModule()` at
the wrapper level so the shared `_shared/moduleNav/ModuleBar.tsx`
semantics stay untouched. Applied across all three stages:
`PlanModuleBar.tsx`, `ActModuleBar.tsx` (both wrap shared `ModuleBar`),
and `ObserveModuleBar.tsx` (custom `handleCardClick` — inactive branch
now calls both). React batches the layout`s `setSlideUpOpen(false)`
with the wrapper`s `onOpenSlideUp()`, so the sheet renders open in one
frame with the freshly-navigated module.

**Verified.** Live in `/v3/project/.../{plan,observe,act}`: first click
on Water / Human Context / Build opens the slide-up immediately;
clicking the active tile still closes, click-again reopens.
