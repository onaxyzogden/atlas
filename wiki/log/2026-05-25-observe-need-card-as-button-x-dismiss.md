# 2026-05-25 — Observe need card: whole-tile Open button + top-right "x" dismiss confirm

**Branch.** `feat/atlas-permaculture`, commit `bf65f407` (2 files, +136/−60). Steward
interaction polish on the "Open Observation Needs" carousel (route `observe/command-centre`,
component `OpenObservationNeedsPanel`). Two changes from one screenshot + selected element on
the `.objCardActions` footer:

1. **Card-as-button.** The standalone "Open" button is gone; the whole need tile is now the
   launch trigger. The card `<div>` became `role="button"` + `tabIndex={0}` +
   `aria-label="Open observation need: {title}"` with `onClick={() => onLaunch(id)}` and an
   Enter/Space `onKeyDown` (both `preventDefault` + launch). A `<div>` (not `<button>`) is used
   deliberately so the inner action controls remain valid nested interactive elements.
2. **X-dismiss with confirm.** Auto needs' one-click "Dismiss" is replaced by a top-right **×**
   (`.cardDismiss`, lucide `X`) placed at the end of `.objCardTop`. Clicking it opens a two-step
   inline confirm in the footer — **"Dismiss?" · Dismiss · Cancel** — reusing the existing
   `.confirmPrompt`/`.removeConfirmBtn`/`.dismissBtn` classes (same pattern as the manual-need
   "Remove?" confirm). Dismiss calls `setStatus(projectId, id, 'resolved')`; Cancel clears the
   `confirmDismissId` state.

**Event isolation.** Every inner control (the ×, Edit, Remove, and all confirm buttons) now calls
`e.stopPropagation()` in its `onClick` so it never bubbles up to fire the card's `onLaunch`.

**Footer visibility.** The `.objCardActions` span now renders only when the card is editable
(`manual`/`follow-up`) **or** an `auto` card is mid-dismiss-confirm — so seed cards (read-only)
carry no footer at all, and auto cards show the footer only while confirming.

**State.** New `confirmDismissId` (mirrors `confirmRemoveId`); `startEdit` clears it; new
`dismissNeed(id)` handler wraps `setStatus … 'resolved'` + clears the confirm.

**Model unchanged.** Pure presentation/interaction — no store action, schema, model, or migration
change. `isEditable(origin) = manual||follow-up` and the auto→resolve dismiss semantics are exactly
as before; only the *surface* moved.

**Verified live** (:5200, `/v3/project/mtc/observe/command-centre`, DOM/eval reads —
`preview_screenshot` times out on the MapLibre WebGL canvas, **stated not claimed**): all 15 cards
`role="button"`, zero "Open" buttons; **×** only on the 7 auto cards; card-body click **and** Enter
both swap the carousel for the capture workspace; clicking **×** does **not** navigate (count
unchanged) and shows "Dismiss?"; Cancel restores (count 15); Dismiss resolves (15→14, card gone).
`npm run typecheck` (8GB heap) clean for both files — the 5 remaining errors are the known foreign
WIP baseline (`IncomingWorkPackagesCard.tsx`, `StepBoundary.tsx`, `planImpactFlag.test.ts`, two
`HostUnion*` tests), none in `OpenObservationNeedsPanel.tsx` (CSS modules aren't typechecked).

**No new ADR** — interaction polish, no architectural choice. Foreign WIP untouched per
[[feedback-no-deletion]]; committed by explicit path immediately per
[[feedback-commit-immediately-on-rebased-branches]]. Continues [[entities/web-app]] Observe Command
Centre thread; follows
[[log/2026-05-25-observe-command-centre-polish-edit-delete-clamp-contrast]].
