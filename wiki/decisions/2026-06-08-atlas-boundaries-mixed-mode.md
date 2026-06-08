# ADR: Boundaries surface re-decompose (II) -- 5-register revert to the 7-item mixed-mode mockup

- **Date:** 2026-06-08
- **Status:** Accepted
- **Branch:** `feat/structured-capture-forms` (commits `15d9482b` [BR1] -> `38df407b` [BR3, folds BR2 test] -> `66a3202f` [BR4] -> `620cd45d` [BR5] -> `4da47016` [BR6] -> `9d77a306` [post-review polish] + this docs commit; pushed -- local/remote divergence 0/0 at close)
- **Entity:** [[entities/act-tier-shell]]
- **Relates to:** SUPERSEDES the 5-register surface in [[decisions/2026-06-07-atlas-boundaries-redecompose]] for the `s1-boundaries` objective; sibling captures [[decisions/2026-06-07-atlas-ev-legal-governance-capture]], [[decisions/2026-06-06-atlas-tier0-stakeholders]], [[decisions/2026-06-07-atlas-tier0-stewards]]; builds on Phase B [[decisions/2026-06-06-atlas-tier0-workbench]]
- **Log:** [[log/2026-06-08-atlas-boundaries-mixed-mode]]

## Context

The operator selected, from the live running app, the centre column (DecisionList) and right column (DecisionWorkingPanel) of the shipped 5-register `s1-boundaries` Tier-0 workbench (the surface filed in [[decisions/2026-06-07-atlas-boundaries-redecompose]]) and instructed: "update these to match the right two columns of `olos_boundaries_legal_mixed_surface.html`".

The mockup is the EARLIER 7-item mixed-mode shape -- the very surface the 2026-06-07 ADR re-decomposed AWAY from (into 5 conveyancing registers) and preserved as `BoundaryCaptureLegacy.tsx`. So this is a deliberate revert-of-the-revert for this objective, driven by operator preference for the mixed doc/map/decision surface over the register surface. Four clarifications were locked in: (1) full re-decomposition (replace the 5-register surface); (2) revive `BoundaryCaptureLegacy` as the live capture; (3) verbatim mockup copy, generic-farm / de-communalized; (4) feed captions modelled as TWO optional free-text fields.

`BoundaryCaptureLegacy.tsx` is a near-pixel-faithful build of this exact mockup (its 7 bodies map 1:1 onto the mockup's 7 items), and its `boundaryModeFor` already returns the correct legacy modes -- so the work is a catalogue revert plus an import swap, with NO change to the legacy component's resolver/decode/encode/valid/summarise.

## Decision

### 1. Re-decompose the catalogue objective from 5 registers / 3 groups back to 7 items / 2 groups

`s1-boundaries` in `universal.ts` is rewritten to 7 items authored in mockup display order `[c2, c1, c3, c4, c5, c6, c7]` across 2 decision groups: **dg1 "Title & boundary"** = [c2, c1]; **dg2 "Legal & permit obligations"** = [c3, c4, c5, c6, c7]. Title "Establish site boundaries & legal constraints"; verbatim mockup labels; `completionGate` "All legal constraints and boundary conditions are mapped, recorded, and reviewed. No design work proceeds into areas of legal ambiguity."; `actHandoff` "Legal & Boundary Constraints Brief"; ref `U-S1.2`. Authoring in this id order keeps the legacy `boundaryModeFor` mapping intact (no renumber, no component edit). The 5-register ids (`boundaryRegister`/`rowRegister`/`tenancyRegister`/`titleRestrictionChecker`/`landHistoryRegister`) are retired from the live surface; persisted register values orphan (local-only planning surface, no migration -- consistent posture with the prior ADR).

### 2. Revive `BoundaryCaptureLegacy` as the live capture (import swap only)

`DecisionWorkingPanel.tsx` and `ActTierZeroWorkbench.tsx` re-point their `./BoundaryCapture.js` imports to `./BoundaryCaptureLegacy.js` (identical exported symbols: default `BoundaryCapture`, `boundaryModeFor`, `decodeBoundary`, `isBoundaryValid`, `summariseBoundary`, type `BoundaryModel`). The mixed modes resolve: c2->map, c1->doc(titleDeed), c3->mapEntry, c4->decision(zoning), c5->decision(water), c6->doc(covenant), c7->decision(permits). The boundary gate-note arm in the panel was rewritten for the mixed modes (map ack; c1 doc-status vs c6 obligation-type; mapEntry easement; c4 zoning vs c5 water; c7 permits always valid -> no note).

### 3. Two new optional checklist-item schema fields: `feedHint` + `feedNote`

The mockup shows per-row "Feeds ..." chips in the centre column AND longer blue feeds-block callouts in the right panel. `feedsInto` is typed as downstream objective IDs (resolved to titles), not free display text, so it has no home for this copy. Added two OPTIONAL free-text fields to `PlanDecisionChecklistItemSchema` (`z.string().min(1).optional()`): `feedHint` (short, the centre-column chip) and `feedNote` (longer, the panel callout). The `ck()` authoring helper gained an `opts: { feedHint?, feedNote? }` param spreading them conditionally. Both absent on every pre-existing item -> seed + all catalogues validate unchanged. `feedHint` lives on c3/c4/c5; `feedNote` on c1/c3/c4/c5/c6/c7; c2 (map) carries neither.

### 4. `DecisionList` gains opt-in group dividers + mode-badge icons + feedHint chip (gated)

`DecisionList` gained: an opt-in `showGroups` prop (default `false`) that renders `.dGroup` dividers before each group's first row when the objective carries `decisionGroups`; a `MODE_ICONS` map (doc->FileText, map->MapIcon, mapEntry->MapPin, decision->Scale) prepending an icon inside the mode badge for known modes; and a `feedHint` chip (falling back to the `feedsInto`-derived chip). `ActTierZeroWorkbench` passes `showGroups={isBoundaryObjective}` and routes `feedNote` into the existing right-panel `feedsLabel` feeds-block. **All three are gated** -- `showGroups` defaults false and `MODE_ICONS` only fires for the four boundary modes, so stakeholders / legal-governance and every other Tier-0 surface render flat with text-only badges, UNCHANGED. The lucide `Map` icon is imported `as MapIcon` to avoid shadowing the global `Map` constructor used in `new Map()`.

### 5. Preserve the register `BoundaryCapture` as unwired dead code (no deletion in revamps)

Per the no-deletion rule, the 5-register `BoundaryCapture.tsx` + its 44-test suite stay on disk, now UNWIRED (importable only by its own test). The filenames are now inverted vs roles (`BoundaryCapture` = register/dead, `BoundaryCaptureLegacy` = mixed/live); renaming is deferred (churns the legacy test imports, out of scope). The retired SP1 register mode keys survive only in the unwired component + as dead `MODE_LABELS` entries (commented).

## Consequences

- `s1-boundaries` now renders the 7-item / 2-group mixed-mode surface faithful to the mockup; the predicate, store, workbench, and panel are unchanged in shape (the surface stayed within `TIER_ZERO_OBJECTIVE_IDS`).
- `DecisionList` is now a richer shared component (group dividers + badge icons + feedHint), but every enhancement is opt-in/gated, so no other Tier-0 surface changed behaviour (regression-guarded by a "no dividers when showGroups omitted" test).
- The schema carries two new optional display fields usable by ANY future objective wanting per-row / in-panel feed captions.
- The register surface is dead but preserved; a future rename would clean up the inverted filenames.

## Amanah

Structured capture of legal/physical/regulatory land constraints (boundaries, title/deed, easements, zoning, water rights, covenants, permits) -- a halal legal-constraint surveying purpose. No sale, advance-purchase, financing instrument, or CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). No riba/gharar. The surface is CSA-free. Clean.

## Verification

- **Typecheck:** shared `tsc --noEmit` EXIT 0; web `tsc --noEmit` (8GB heap) EXIT 0.
- **Bounded vitest** (`--pool=forks --testTimeout=20000`, [[feedback-vitest-bounded-runs]]) all green: shared `catalogues` (105); web `DecisionWorkingPanel` (55, +2 post-review c3/c6 gate-note assertions), `DecisionList` (23, +group/icon/feedHint), `BoundaryCaptureLegacy` (57, preserved live), `BoundaryCapture` (44, preserved unwired), `ActTierZeroWorkbench` (37).
- **Final code-quality review:** APPROVE WITH NITS -- no Critical/Important, no correctness bugs, no regression risk to other Tier-0 surfaces; all five stated constraints verified (gating, no-deletion, three coupled id sources agree, ASCII-only, Map alias). The one actioned nit (a c7 gate-note clarifying comment) + two extra gate-note assertions shipped in `9d77a306`.
- **Live preview (DOM-verified):** `preview_screenshot` hung on the Act view's map canvas (transient, disclosed per [[project-screenshot-hang]]); verified via `preview_eval` DOM probes on the live `s1-boundaries` route instead. Centre column: 7 items in mockup order under 2 group dividers ("Title & boundary", "Legal & permit obligations"), every mode badge carrying an icon (Map/Document/Map + entry/Decision), feed chips on c3/c4/c5 with no double-prefix, "0 / 7 decisions made", completion gate + focused question present. Right panel per item: correct body (zoning-select + review-flag buttons for c4; water source/status for c5; etc.), the `feedNote` blue feeds-block callout verbatim, and the correct per-mode gate note while invalid -- c2 "Confirm boundaries have been reviewed on the base layer to record.", c1 "Set a document status to record.", c3 'Add at least one easement, or mark "No implications", to record.', c4 "Select a zoning classification and a review flag to record.", c5 "Select at least one water source and a status to record.", c6 "Select at least one obligation type to record.", c7 no note + Record enabled (always valid).
- **Hygiene:** every commit explicit-pathspec (`git commit -F <msg> -- <paths>`, no `git add -A`, no `--amend`), no-BOM UTF-8 message files, `git fetch` + divergence check (0/0 at close), foreign WIP (`.claude/launch.json`, `AppShell.*`, `apps/web/.env.example`, etc.) never staged, ASCII-only (apostrophes via double-quoted JS strings) ([[project-branch-rebase]], [[feedback-commit-immediately-on-rebased-branches]], [[feedback-no-deletion]]).

## Alternatives considered

- **Keep the 5-register surface, restyle the columns to look like the mockup** -- rejected; the operator asked to match the mockup's structure (7 items / 2 groups / mixed modes), not just its chrome. A restyle could not reproduce the mixed doc/map/decision bodies.
- **Build a new mixed-mode component** -- rejected; `BoundaryCaptureLegacy` already IS a pixel-faithful build of this mockup, preserved precisely for this kind of revival. Reviving it is the no-deletion rule paying off.
- **Model feed captions by overloading `feedsInto`** -- rejected; it is typed as downstream objective IDs resolved to titles, not free text. Two dedicated optional display fields keep the semantics clean and are reusable.
- **Delete the now-dead register `BoundaryCapture`** -- rejected per the no-deletion-in-revamps rule; preserved unwired (it may yet be revived, exactly as the mixed surface just was).
