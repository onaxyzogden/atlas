# 2026-06-08 -- OLOS HTML-prototype wiring audit COMPLETE (all 28 rows already encoded, zero catalogue edits)

**Branch.** `feat/structured-capture-forms` (audit/doc commits only; **not pushed**).

Closed out the multi-batch effort to "wire" the 28 OLOS HTML prototypes
(`C:\Users\MY OWN AXIS\Documents\OLOS UI\olos_*.html`) into the Atlas plan model.
The wiring map (`docs/html-prototype-wiring.md`) was originally authored against a
**defunct** `features/act/*Card.tsx` architecture. The forward reality is
**catalogue-driven**: every Plan/Act decision is DATA in
`packages/shared/src/constants/plan/catalogues/*.ts` (authored via `obj()`/`ck()`/`ckA()`/
`ckF()`/`dg()`/`patch()`), and a single catalogue objective lights up BOTH the read-only
Plan `DecisionChecklist` (all tiers) AND the Act surface. So "wiring" reduced to a
**content-reconciliation audit**: diff each prototype's decision text / groups / gate
against its mapped catalogue objective and confirm it is already encoded.

**Conclusion: all three batches (A rows 1-9, B rows 10-23, C rows 24-28) are already
encoded. ZERO catalogue edits were required across the entire 28-row effort.** The
conformance test stayed green (104/104) throughout -- no objective definitions changed.

## This session (Batch B + Batch C)

- **Batch B (rows 10-23, Intentional-Community / Ecovillage)** -- full 14-row HTML diff
  against `ecovillage.ts`, `livestockOperation.ts`, `nursery.ts`. Every row confirmed
  verbatim-encoded. Resolved the three one-to-many / ambiguous mappings:
  - Row 13 = same objective as row 12 (`ev-s1-conflict-framework`, a Tier-3 re-render,
    NOT a distinct objective) -- no new objective, no HALT needed.
  - Row 16 = `ev-s3-energy-potential` (Tier-2 survey, not the s5 design objective).
  - Row 22 = `ev-s4-settlement-strategy` (s4, not s7).
  - Row 18 = `lvs-sec-s1-enterprise-intent` (secondary host-integration intent, not the
    primary `lvs-s1-enterprise-vision`).
  - Row 23 = `nur-sec-s3-propagation-strategy` (nursery secondary, additive).
  Commit `0d2691e4` (`docs(atlas): audit Batch B HTML-prototype decisions (already-encoded)
  + covenant-content inventory`).
- **Batch C (rows 24-28, Plan-stage prototypes)** -- audited against the catalogue. These
  prototypes carry the `.plan-readonly-note` ("Read-only preview - decisions are worked
  through in Act"), `.open-act-btn`, `.launch-btn` markers, i.e. they are read-only
  `DecisionChecklist` renders of objectives already authored. Row 24 = `s4-direction`
  (universal U-S4.1) verbatim match. Commit `b95a6fd5`
  (`docs(atlas): audit Batch C Plan-stage prototypes (already-encoded read-only renders)`).
- Batch A was closed earlier (commit `b44ae18e`).

## Flags raised (no code/catalogue change)

- **Row-15 prototype-file mismatch:** `olos_communal_infra_strategy.html` actually contains
  **nursery propagation** content, not communal-infra-strategy. The catalogue objective
  `ev-s4-infra-strategy` is verified correct independently (cross-confirmed by the row-26
  Plan prototype). The PROTOTYPE FILE needs a re-export -- recorded in the wiring doc, not
  a catalogue defect.
- **Covenant-content inventory (4 items, for operator review -- NOT in catalogue):** captured
  verbatim from rows 10/19/20/21 -- faith/halal/financial right-panel provisions that have
  no catalogue decision home (e.g. row 19 outdoor prayer space + women's outdoor screening;
  row 21 member cost-sharing mechanisms). Logged in the wiring doc's
  "Covenant-content inventory (Batch B)" section. Whether to promote any of these into
  catalogue decisions is deferred to operator review.

## Amanah

- **Row 21 financial mechanisms reviewed -- CLEAN.** Member cost-sharing among co-owners
  (buy-in, levy, penalty-free hardship deferral = qard-hasan-consistent, capital reserve);
  no riba, no `bay` ma laysa `indak` advance-purchase / CSRA / salam framing. Consistent
  with the existing 2026-05-29 operator authorisation to encode the ecovillage economic
  objectives (EV-S4.8 / EV-S7.5) as "member buy-in, levies, capital reserves, communal
  fund governance -- cost-sharing among members who collectively own the asset, not advance
  sale of future yield." Logged to the inventory, no catalogue change
  ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Deferred (separate workstream)

- Bespoke Tier-1+ right-panel work surfaces (cluster schematic, watercourse-setback gate,
  capacity calculators, and the faith/halal provisions in the inventory) + a
  `DecisionWorkingPanel`-style router for Tier 1+.
- Tier-1+ per-decision mode-badge rendering.
- Operator review on whether logged covenant provisions become catalogue decisions.
- Re-export of the mislabelled `olos_communal_infra_strategy.html` prototype.

ASCII-only; explicit-pathspec commits; foreign WIP untouched; not pushed
([[project-branch-rebase]], [[feedback-no-deletion]]). ADR:
[[decisions/2026-06-08-html-prototype-wiring-closed-no-catalogue-edits]]; entity
[[entities/act-tier-shell]].
