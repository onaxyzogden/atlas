# 2026-06-02 -- Catalogue conformance gap closed for the 5 new primary catalogues

**Branch:** `feat/atlas-permaculture`
**Commit:** `8677bda8` -- test(shared): close conformance gap for 5 new primary
catalogues (4 files, +78/-4).

## Context

The food-forest adoption ADR ([[decisions/2026-06-02-olos-food-forest-adoption]])
flagged a debt: the 5 newer primary catalogues (homestead, education, conservation,
market_garden, off_grid) were guarded only by TypeScript compile-time enforcement.
They were absent from the `ALL_AUTHORED` arrays in `catalogues.test.ts` and
`shortTitle.test.ts`, so the runtime conformance rubric (schema validity, 5-15
checklist bound, completion-gate / act-handoff presence, ref format, global id
uniqueness, decision-group full-partition, source/sourceTypeId discipline,
shortTitle derivation) never exercised them. Operator chose (AskUserQuestion) to
"close the test-gap slice."

Amanah gate: land-stewardship planning conformance tests; no riba/gharar. Clean.

## What shipped

1. **`catalogues.test.ts`** -- added the 5 `*_PRIMARY_OBJECTIVES` imports + spreads
   into `ALL_AUTHORED`; widened `OBJECTIVE_REF` from
   `/^(U|RF|RES|EV|AG|WELL|SILV|ORCH|NRS)-S[1-7]\.\d+$/` to add
   `HMS|EDU|CON|MGD|OFG`; added a per-catalogue `source=primary` /
   `sourceTypeId` discipline test for each of the 5 (mirroring the existing
   per-catalogue assertions).
2. **`shortTitle.test.ts`** -- added the same 5 imports + spreads into its
   `ALL_AUTHORED`.
3. **`remapSlug.test.ts`** -- deliberately left untouched (its `ALL_AUTHORED` is a
   designed subset: universal + regen_farm + ecovillage + agritourism + residential).

## Real defect the rubric surfaced (the point of closing the gap)

Applying the runtime rubric immediately caught what the compile-time guard could
not: **three objectives undershoot the Authoring Standards v1.4 five-item checklist
floor**, each authored with only 4 items. Confirmed faithful-to-source by extracting
the original `.docx` (`OLOS_Homestead_Objective_Catalogue_v1.1.docx`,
`OLOS_Education_Objective_Catalogue_v1.0.docx`) -- the sources themselves authored 4;
nothing was lost in encoding:

- `hms-s7-adaptive-management`
- `edu-s6-adaptive-management`
- `edu-s7-program-launch`

(The rubric test stops at the first failure, so only homestead showed initially; a
programmatic count of all 5 catalogues -- 118 objectives -- isolated exactly these
three. No objective exceeds the 15 ceiling.)

### Resolution -- normalize to the operator's own floor, do not invent scope

Rather than silently rewrite verbatim source or relax the floor (which all other
catalogues meet), each objective was brought to the 5-item minimum by adding ONE
within-archetype checklist item that sibling objectives of the same kind already
carry, then placed into an existing decision group to preserve the full-partition
invariant:

- **hms-s7-adaptive-management c5** -- contingency response for provision shortfalls /
  system failures (mirrors offGrid c3 failure-response + conservation c3 escalation;
  adapted to homestead provision frame). Added to dg1 "Review process & triggers".
- **edu-s6-adaptive-management c5** -- multi-year comprehensive review against founding
  goals (mirrors the N-year comprehensive-review item every sibling
  adaptive-management objective carries -- offGrid c5, conservation c5; education
  alone lacked it). Added to dg1 "Annual review & triggers".
- **edu-s7-program-launch c5** -- pause / remediation protocol if soft-launch review
  criteria are not met (makes explicit the fail path of the HARD GATE the objective
  already names in `scopeNotes`; mirrors offGrid systems-establishment go/no-go c6).
  Added to dg1 "Soft launch scope & criteria".

Each addition is comment-flagged `FLAGGED for operator review` in-source as a derived
expansion (Standards-v1.4 normalization), not verbatim source text. **Operator may
reword or replace any of the three** -- they are the minimum-faithful interpretation,
not authored intent.

## Verification

- **Full `@ogden/shared` vitest suite:** 915/915 green across 55 files, `--pool=forks`
  (bounded -- no Windows threads-pool zombie hang). The two target files:
  `catalogues.test.ts` 82/82, `shortTitle.test.ts` 3/3.
- **Typecheck:** `corepack pnpm --filter @ogden/shared typecheck`
  (`tsc --noEmit`, `--max-old-space-size=8192`) exit 0.

## Commit shape

Explicit-path commit (`git add --` the 4 files only; staged set verified == intended,
no leftover hunks). Branch was 13 ahead / 0 behind origin at commit time (fetched
first per rebased-branch discipline); now 14 ahead / 0 behind. Heavy foreign WIP from
parallel sessions left untouched -- never `git add -A`. Message written to a temp file
and committed with `git commit -F` (here-strings break on punctuation on Windows
PowerShell). ASCII-only; JS apostrophes avoided/double-quoted. Commit-only -- NOT
pushed (branch is force-pushed/rebased externally; push is the operator's call).

## State after

All 12 selectable primaries' catalogues (those with an encoded layer) are now exercised
by the runtime conformance rubric, not only by TypeScript. The food-forest adoption
debt is closed. Three operator-review flags stand on the derived checklist items.
