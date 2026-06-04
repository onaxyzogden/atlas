# ADR: Agritourism membership / season-pass instrument as an in-place AG-S4.8 extension

**Date:** 2026-06-03
**Project:** Atlas / OLOS (atlas.ogden.ag)
**Branch:** feat/atlas-permaculture
**Status:** Accepted
**Related:** 2026-06-03 eco-resort / glamping agritourism extension (AG-S7.8 deferred this
instrument); 2026-05-29 agritourism economics ruled clean service reservation;
[[fiqh-csra-erased-2026-05-04]]; [[feedback-csa-in-catalogues]]; marketGarden MGD-S1.4 /
MGD-S1.6 (CSA membership-benefit guardrail); livestockOperation LVS-S7.7 (Amanah scopeNote
house style)

## Context

The eco-resort / glamping extension (commit `89541b55`) deliberately stopped short of a
season-pass / membership instrument. `AG-S7.8`'s scopeNote recorded, verbatim, that any
future season-pass / advance multi-night package / membership prepayment is a sales
instrument requiring **verbatim encoding + an Amanah scopeNote** (*bayʿ mā laysa ʿindak* /
gharar - no advance sale of undelivered nights) and **Scholar Council review**; it was not
assumed there.

The operator asked for that instrument to be **realised**. Two AskUserQuestion gates set
the approach:

- **Placement = extend the existing `AG-S4.8` revenue-model objective** (reject a standalone
  objective). Keeps the membership terms beside the booking / pricing / revenue decisions
  they qualify, and avoids a new ref.
- **Unit scope = draft markdown first, then encode** (hybrid sourcing). After two expert-lens
  refinement rounds the operator replied **"ratified - apply the optional AG-S7.8 forward
  pointer,"** authorizing encode with the forward pointer.

The fiqh stakes are the whole point. A season-pass / membership sold as **prepayment for
specific undelivered nights** is the advance sale of what the operator does not yet possess
- *bayʿ mā laysa ʿindak* / gharar - the structure that retired the MTC CSRA model
(2026-05-04). Per `feedback_csa_in_catalogues` it is **surfaced, never silently omitted or
reworded**. The permitted halal form is already articulated verbatim in the codebase
(`marketGarden.ts` MGD-S1.4 / MGD-S1.6) and the global covenant: *"share entitlement framed
as a membership benefit, not advance purchase."*

## Decision

Extend `ag-s4-revenue-model` (AG-S4.8, `s4-foundation-decisions`) **in place** - no new
objective, no new ref. Objective count stays **34**, resolved total stays **53**; the
`.length` / total test assertions are unchanged. This is a **catalogue-content-only**
additive extension of one existing objective.

### What the extension adds

- **Five checklist items c7-c11**, self-conditional so a plain agritourism / retreat with no
  membership tier answers c7 "none" and marks c8-c11 N/A (never over-scopes):
  - **c7** - whether a membership / season-pass tier is offered at all (default: none unless
    deliberately adopted).
  - **c8** - if adopted, structure as a **membership benefit** (access, priority, member
    rates, belonging-benefits) with **each stay still a separate per-stay service
    reservation** (deposit + balance on a booked, deliverable stay) and the membership
    **cancellable with pro-rata refund** of unused access - the fee buys belonging and
    access terms, NOT a bundle of specific undelivered nights (avoids *bayʿ mā laysa
    ʿindak* / gharar).
  - **c9** - member value demonstrably **non-stay-predominant** (community, seasonal /
    biodynamic events, bounded off-season access) so it is a membership in substance, not a
    nights-purchase in disguise; any member produce-share is **delivered-not-prepaid** per
    the market-garden CSA guardrail (MGD-S1.4 / MGD-S1.6).
  - **c10** - member access (especially off-season) **bound within the AG-S3.7 ecological
    carrying-capacity ceiling** and its seasonal sensitivity windows; coordinate with
    AG-S7.8 for off-season resilience; if member access leaves a hardened visitor precinct,
    **AG-S3.7 must be in scope** (the membership can pull it into scope).
  - **c11** - route any such instrument to **Scholar Council review** before adoption;
    surface explicitly, never as a default / recommended model; **no CSRA / salam**
    advance-purchase framing.
- **Two decision groups** keeping the partition complete and mutually exclusive:
  **dg3** "Membership structure & fiqh routing (optional)" {c7, c8, c11} and **dg4**
  "Membership substance & ecological bound" {c9, c10}. Full partition after extension:
  dg1 {c1,c2,c3} · dg2 {c4,c5,c6} · dg3 {c7,c8,c11} · dg4 {c9,c10}. Checklist 6 -> 11
  (within 5-15); decision groups 2 -> 4 (within 1-6).
- **A `scopeNotes` Amanah flag** on AG-S4.8 (which previously had none), in the locked house
  style (LVS-S7.7 / MGD-S1.4): names the instrument verbatim, cites *bayʿ mā laysa ʿindak* /
  gharar, references the retired CSRA model, prescribes the membership-benefit restructuring
  (with cancellable / pro-rata-refundable evidence of access-not-purchase, non-stay
  substance, the produce-share tether, and the AG-S3.7 bound), marks it non-default, strips
  CSRA / salam framing, and **contains the literal string "Scholar Council"** (the
  conformance contract). Records the permissible un-flagged form: ordinary per-stay service
  reservation, already covered by c1-c2.
- **`completionGate`** amended (append) to require any contemplated membership / season-pass
  tier be membership-benefit-structured, carry genuine non-stay substance within AG-S3.7
  limits, and be routed to Scholar Council. `actHandoff` unchanged ("Booking, Pricing &
  Revenue Model Brief").
- **AG-S7.8 forward pointer** (optional, operator-authorized): its scopeNote now reads
  "...Should the operator later want such an instrument **(now scoped at AG-S4.8)**..." - a
  purely additive parenthetical keeping the two objectives internally consistent.
- **Header note** in `agritourism.ts` recording the 2026-06-03 AG-S4.8 membership extension
  and that it realises what AG-S7.8 deferred (objective counts unchanged).

### Design rationale (operator expert-lens refinement)

Two rounds of biodynamics / permaculture / SaaS critique drove the substance requirements.
The membership-benefit form is not a fiqh compromise but the *authentic* one: the same
answer arrives from fiqh ("membership benefit, not advance purchase"), Steiner associative
economics (CSA was born as community *association with* a farm, not a veg-box prepurchase),
and SaaS (subscription-to-access beats prepaid-credits-for-undelivered-units, which is a
deferred-revenue liability). The apparent collision - biodynamic *risk-sharing* vs gharar -
resolves by keeping the **association** (belonging, presence, stewardship) and dropping the
**speculation** (advance purchase of uncertain future yield). The load-bearing insight:
membership integrity is a **design** problem, not a labeling one - the scopeNote handles the
words, the checklist (c9 non-stay substance) makes the substance a requirement.

### Deliberately NOT touched

`projectTypes.ts`, `projectTypeTaxonomy.schema.ts`, `project.schema.ts`,
`relationshipMatrix.ts`, `catalogues/index.ts` - no new type id, no new ref, no new formula.
No new objective. App-layer / catalogue-content only.

## Amanah Gate

This slice exists *because* of the fiqh constraint, not in spite of it. The instrument is
**surfaced** (not omitted - `feedback_csa_in_catalogues`), **restructured** to
membership-benefit (not advance prepayment of undelivered nights - *bayʿ mā laysa ʿindak* /
gharar), **flagged** (Amanah scopeNote), marked non-default, stripped of CSRA / salam
framing, and **routed** to Scholar Council. No riba. Consistent with the standing MTC
covenant (membership benefit = entitlement of belonging, not a return on advance-purchase).
The objective does **not** itself declare any structure halal - it routes that judgement to
the Council.

## Consequences

- `getPrimaryCatalogue('agritourism')` / `resolveProjectObjectives({ primaryTypeId:
  'agritourism' })` still layer 19 universal + 34 primary = 53 objectives; AG-S4.8 now
  carries 11 checklist items in 4 decision groups; the resolved set stays a valid partition
  with globally-unique ids.
- A new Amanah `it` in `catalogues.test.ts` asserts AG-S4.8 `scopeNotes` is truthy and
  contains "Scholar Council" + "membership benefit", and the c8 label contains "membership
  benefit". Count (34) / total (53) assertions unchanged.
- `tsc --noEmit` on `@ogden/shared` EXIT 0; bounded `catalogues.test.ts` **100/100** (was
  99; +1) under `pool:'forks'`.
- Committed `15680301` on `feat/atlas-permaculture` (3 files: `agritourism.ts`,
  `catalogues.test.ts`, the ratified draft md). Not pushed.

## Deferred

- The other 3 missing roadmap types: Watershed / Wetland Restoration, Sustainable Forestry /
  Woodlot, Community Garden / Urban Ag (iterated one at a time).
- Folding this and the eco-resort extension into `entities/shared-package.md` (deferred while
  the working tree carries foreign WIP, per the livestock-type precedent).
