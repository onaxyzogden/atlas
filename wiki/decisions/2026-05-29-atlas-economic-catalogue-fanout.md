# ADR: Economic-catalogue fan-out -- Ecovillage + Agritourism primaries

**Date:** 2026-05-29
**Status:** accepted
**Context:**
Follow-on to [[decisions/2026-05-29-atlas-per-type-objective-model]]. That ADR
proved the per-type 3-layer pipeline end-to-end on one vertical slice
(Regenerative Farm primary + Residential secondary) and left "the other 11
catalogues fan out as pure data in follow-on slices." Its Covenant section
located the 2026-05-29 Amanah Gate override ("encode verbatim, no gating")
specifically in the **economic-catalogue fan-out (Ecovillage / Agritourism /
Wellness)**, where `completionGate` / `actHandoff` are stored as plain data.

This slice encodes the **first two of those three** -- the operator's
AskUserQuestion choice "Both economic ones" -- back to back, through the
catalogue registry seam (`constants/plan/catalogues/index.ts`) and nowhere else.
Each is the first concrete exercise of the "add a catalogue = a file + register
in index.ts, no other code change" claim from the parent ADR.

**Decision:**

- **Two primary catalogues encoded as pure data.** `ecovillage.ts` (31 primary
  objectives) and `agritourism.ts` (29). Each adds its file plus exactly four
  `index.ts` edits -- import, re-export, a `getPrimaryCatalogue` ternary arm, and
  an `ALL_CATALOGUE_OBJECTIVES` union entry -- honouring the "add it here and
  nowhere else" seam. No engine, schema, store, or wizard change.

- **Primary-only registration for both.** Ecovillage is `canBeSecondary: false`
  in the taxonomy. Agritourism is `canBeSecondary: true`, **but its catalogue doc
  carries only a primary layer** (no additive-as-secondary objectives, no patch
  records), so it registers in `getPrimaryCatalogue` only -- exactly like
  Ecovillage; `getSecondaryCatalogue` still handles only `residential`. A separate
  Agritourism-secondary-layer spec is not in hand and **was not invented**
  ("catalogue docs operator-provided, don't invent content"). When such a spec
  arrives it is a distinct follow-on slice (a secondary additive set + patches,
  registered in `getSecondaryCatalogue`).

- **Economic objectives stored as plain data per the 2026-05-29 override --
  first concrete application.** Ecovillage `ev-t3-financial-model` (EV-T3.8,
  "financial contribution & shared economics") + `ev-t6-financial-plan` (EV-T6.5,
  "communal financial plan & capital contribution schedule"); Agritourism
  `ag-t3-revenue-model` (AG-T3.8, booking/pricing/revenue) + `ag-t6-phased-launch`
  (AG-T6.6, phased launch & financial viability). `completionGate` / `actHandoff`
  carried verbatim, **no covenant flag**, as the parent ADR's Covenant section
  authorises. On the merits the content is communal cost-sharing and hospitality
  reservation / occupancy / break-even framing -- **not** advance sale of
  un-possessed future yield -- so the CSRA advance-purchase prohibition
  ([[fiqh-csra-erased-2026-05-04]]) is neither implicated nor reintroduced; the
  operator's informed override governs regardless.

- **Count reconciliations, locked by tests.**
  - *Ecovillage:* the source header table reads "Primary: 29", but the per-tier
    sub-headers and the 50-total both confirm **31**; the source's duplicate ref
    "6.6" (adaptive management) was reassigned to **EV-T6.9** so refs stay unique.
    `catalogues.test.ts` asserts `length === 31`, resolved `=== 50`, ref-uniqueness.
  - *Agritourism:* **29** primary, **48** total, no duplicate refs in the source
    index (cleaner than Ecovillage). `catalogues.test.ts` asserts `length === 29`,
    resolved `=== 48`, ref-uniqueness.

- **AG-T5.4 rubric deviation (OPERATOR REVIEW ITEM).** The Agritourism source
  objective `ag-t5-food-integration` ("design farm-to-guest integration feedback
  loop", AG-T5.4) has **exactly 4 checklist items**; Catalogue Authoring Standards
  v1.4 sets a **5-item floor**. The Agritourism doc is body v1.0 / Standards v1.3,
  predating that floor. Encoded **verbatim at 4 items** ("don't invent content");
  rather than weaken the shared invariant for everyone, `catalogues.test.ts`
  carries a narrow, documented single-id allowlist
  `SHORT_OBJECTIVE_ALLOWLIST = { 'ag-t5-food-integration' }` so the floor stays 5
  for every other -- and every future v1.4 -- catalogue. This is the first rubric
  carve-out; if a fresher Agritourism doc (Standards >= v1.4) arrives, re-encode
  AG-T5.4 to >= 5 items and drop the allowlist entry.

- **`resolveProjectObjectives.test.ts` premise update.** The "skip-not-throw on a
  real pairing" block used `agritourism` as a stand-in for an **unencoded** primary
  (resolving 19 universal + 6 residential-additive = 25). Encoding agritourism
  changed that to 19 + 29 + 6 = **54**; the count, test name, and comment block were
  updated. The block's intent is **preserved and still passes**: residential's P0
  patch targets `rf-t1-landscape-context` (a regenFarm objective), absent under an
  agritourism primary -- agritourism has its OWN `ag-t1-landscape-context`, a
  different id -- so P0 still skips (recorded, not thrown), P1-P4 land, and
  tension-9 (residential + agritourism) still surfaces.

**Consequences:**

- **Two of three economic catalogues done; Wellness remains.** Nine catalogues
  total stay unencoded -- Homestead, Silvopasture, Conservation, Education,
  MarketGarden, Nursery, OffGrid, Orchard, **Wellness** -- selectable today and
  resolving universal-only until fanned out as pure data.
- **Resolution math (verified):** Ecovillage primary = **50** objectives (19
  Universal + 31); Agritourism primary = **48** (19 + 29). Both primary-only (no
  secondary content layered).
- The `planTierStore.toProgressMap` global-id-uniqueness invariant holds for both
  resolved sets (`catalogues.test.ts` asserts globally-unique checklist item ids
  per catalogue).
- The AG-T5.4 allowlist is the **only** rubric exception in the suite; it is
  scoped to one id and self-documents its provenance and removal condition.
- **697 / 697 shared tests pass**; shared typecheck clean.

Commits on `feat/atlas-permaculture` (explicit-path, primary-only, pushed,
post-push divergence 0/0): Ecovillage **`416b48d2`** (31 objectives); Agritourism
**`7b81931a`** (29 objectives + the `resolveProjectObjectives` premise fix + the
AG-T5.4 allowlist). Heavy foreign parallel-session WIP (capitalPartnerSummary,
EconomicsPanel, financialStore, DesignMap/DiagnoseMap/OperateMap,
MaterialSubstitutions, graphify-out/*, ZoneSomSidebar, scratch `_*.txt` /
`tsc_*.txt`) left uncommitted per [[feedback-no-deletion]]. CSRA model untouched;
ASCII-only copy. Log: [[log/2026-05-29-economic-catalogue-fanout]].
