# 2026-05-25 — Observe Command Centre polish: edit/delete needs · short-viewport tray clamp · dark warning-600 contrast

**Branch.** `feat/atlas-permaculture`. Three independent polish slices over the Observe
Command Centre (route `observe/command-centre`), picked up under a single steward "all"
selection. Each verified and committed immediately by explicit path per
[[feedback-commit-immediately-on-rebased-branches]]; foreign WIP untouched per
[[feedback-no-deletion]]. Parallel-session commits (`e6b48857`, `454f17c7`) interleaved
between mine — expected on this rebased branch.

## Slice A — edit + delete steward-raised observation needs (`43fd436d`)

Closes the create-only gap from [[entities/web-app]]'s Observation Needs thread (the
`BACKLOG-v3.1` "remaining follow-on" + the OBSERVATION-NEEDS-WORKSPACE "out of scope"
note). Only **steward-authored** needs are mutable — `origin` `manual`/`follow-up` —
while `seed`/`auto` stay read-only (an `isEditable(origin)` guard); `auto` needs keep
their existing "Dismiss" (→ `setStatus resolved`), `seed` needs get nothing extra.

- **Model (`observationNeed.ts`):** new pure `editRaisedNeed(need, input)` + `EditNeedInput`
  — applies/trims the form fields, **preserves** id/origin/target/source-link/evidence/
  recordingRule, clears blank trigger/planImpact, never mutates the original.
- **Store (`observationNeedStore.ts`):** `updateNeed` (maps over `createdByProject[pid]`)
  + `deleteNeed` (drops from `createdByProject` **and** clears the matching run-state in
  `byProject` so no orphan run lingers).
- **Form (`RaiseNeedForm.tsx`):** made reusable for edit — `initial?: RaiseNeedFormInitial`
  pre-fill + `submitLabel` prop (default "Raise need"); all field state seeds from
  `initial?.x ?? default`.
- **Panel (`OpenObservationNeedsPanel.tsx`):** Pencil/Trash icon actions on editable cards;
  edit opens the same `RaiseNeedForm` inline with "Save changes"; Remove uses a two-step
  inline "Remove?" confirm (no modal).
- **Tests:** +5 `editRaisedNeed` cases (apply+trim, preservation, blank-clearing,
  no-mutation) → `observationNeed.test.ts` 31 green.

Verified live (:5200): raise → Edit/Remove appear only on manual/follow-up → edit pre-fills
+ saves with **stable id** → Remove confirm → Cancel restores → confirm deletes (count 0),
run-state cleanup confirmed (other seed run-states untouched). React re-render is async vs
the synchronous zustand `set`, so post-action DOM must be re-read in a fresh eval.

## Slice C — short-viewport tray clamp (`b2f00779`)

CSS-only follow-on to the grid-tray fix [[log/2026-05-25-command-centre-tray-and-waterrouter-fixes]].
The `.shell` grid is `auto / minmax(0,1fr) / auto` (tabs / body / tray) at `height:100%`;
the tray's `auto` track grows with its content and on a short viewport can squeeze the
`1fr` body/map toward zero. Added a scoped `@media (max-height: 640px)` capping
`.bottomTray { max-height: 42vh; overflow-y: auto }` (the carousel already scrolls X), so
the map always keeps a floor. Verified the clamp fires only below the breakpoint (tray
`max-height` 42vh + `overflow-y:auto` at 560px tall; `none`/`visible` at 900px). Preview
height-emulation decouples `vh` (emulated) from the `%`-height chain (real window), so a
true before/after body-collapse pixel read wasn't capturable — media-query scoping verified
instead. `preview_screenshot` times out on the MapLibre WebGL canvas (stated, not claimed).

## Slice B — dark-mode warning-600 contrast (`fb31e23d`)

a11y backlog item (axe-core muted-text-on-charcoal). A canvas-normalized contrast sweep of
the live dark command-centre (resolves `oklch()` + composites translucent chip backgrounds)
found the only real AA failures were the carousel's amber **"High"** priority and
**"In progress"** status badges: text `#a16207` on the dark `--color-warning-muted` chip =
**2.8:1**. Root cause — dark mode overrides `--color-warning` → estate gold `#d4af5f` but
left the numeric ladder's `--color-warning-600` at its **light-mode** value `#a16207`, and
the badges read `color: var(--color-warning-600, …)`. Fix: override `--color-warning-600`
→ `#d4af5f` in **both** dark blocks (`dark-mode.css`). Now ~**7:1**; full dark sweep 0
failures. Scoped to dark-only selectors so light mode is byte-identical (no regression
possible). **`-700` deliberately left untouched** — it is paired with the always-light
`--color-warning-100` chip across the app (MetricCard/BlockerCard/ActionList/…), and `-100`
is not theme-flipped; brightening `-700` would break that dark-text-on-light-chip pattern.
`-600` is never used as text on `-100`, so the override is safe.

**No new ADR** — two bug fixes + one modest in-scope feature. Updates [[entities/web-app]]
Observe Command Centre thread. Continues
[[log/2026-05-25-observe-command-centre-dashboard-shell]].
