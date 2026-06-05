# 2026-06-03 -- Eco-Resort / Glamping: extend the agritourism catalogue (5 additive objectives)

**Branch.** `feat/atlas-permaculture` (explicit-path commit `89541b55`, 3 files
+604/-10; **not pushed**).

Eco-Resort / Glamping is one of the four still-missing types from the 19-type roadmap.
Exploration established it is **not greenfield**: the existing `agritourism`
("Agritourism / Retreat") primary type already scopes paid overnight guest stays on
regenerating land - visitor capacity, guest water & sanitation, accommodation design,
booking / pricing / revenue (operator-ratified 2026-05-29 as clean service reservation),
safety, and phased launch.

## Decision shape

Two operator AskUserQuestion gates settled the approach:

- **Type modeling = extend agritourism, do NOT add a new `eco_resort` type.** A new type
  would near-duplicate agritourism and force schema / taxonomy / matrix / index churn for
  almost-identical content. So this is a **catalogue-content-only** change - no edits to
  `projectTypes.ts`, `projectTypeTaxonomy.schema.ts`, `project.schema.ts`,
  `relationshipMatrix.ts`, or `catalogues/index.ts`.
- **Unit scope = draft markdown first, then encode** (hybrid sourcing). Authored a
  reviewable spec `docs/catalogues/eco-resort-glamping-agritourism-extension-draft.md`;
  operator replied **"ratified"** with no edits; then encoded to TS.

## The 5 additive objectives

Each captures only the *delta* agritourism lacked and cross-references (does not
duplicate) its nearest existing neighbour. Per-stratum AG numbering continues; `AG`
prefix already passes `OBJECTIVE_REF`. Primary count **29 -> 34**, resolved total
**48 -> 53** (19 universal + 34 primary).

- **AG-S3.7** (s3) - Ecological carrying capacity under visitor pressure: soil /
  compaction, trampling / trail-erosion thresholds, sensitive-habitat & wildlife-corridor
  exclusion, seasonal sensitivity windows, sacrificial-vs-protected ground, a
  carrying-capacity ceiling feeding S6/S4. observeFeeds Soil + Ecology & Habitat.
  Cross-ref: distinct from AG-S6.5 (operational load) - this is *ecological* tolerance.
- **AG-S4.9** (s4) - Guest-to-production biosecurity & contamination buffers:
  bidirectional contamination pathways, buffer distances, arrival hygiene, weed/pathogen
  controls on vehicles/gear/pets, safe guest-animal interaction (welfare + zoonosis).
  Complements AG-S4.4 (circulation/zoning).
- **AG-S5.9** (s5) - Dispersed low-impact accommodation siting & landscape integration:
  locate units against the AG-S3.7 map, minimise/zero-foundation disturbance,
  reversibility, inter-unit spacing, low-impact access. **Owns siting only**; per-unit
  structure design stays with AG-S5.4, servicing with AG-S5.10. observeFeeds
  Infrastructure & Access.
- **AG-S5.10** (s5) - Decentralised servicing & dark-sky / quiet design: point-of-use
  water/rainwater, greywater/blackwater treatment, off-grid power/refrigeration,
  dark-sky lighting, acoustic-quiet zoning, within AG-S3.3/AG-S3.7 limits + regulatory
  compliance. Turns the AG-S3.3/AG-S3.4 surveys into design commitments. observeFeeds
  Water & Hydrology + Infrastructure & Access.
- **AG-S7.8** (s7) - Seasonal-occupancy resilience & off-season resourcing: off-season
  maintenance / land-recovery, seasonal staffing cycle, cash-flow buffering across the
  peak-to-trough swing, mothballing / partial closure, complementary off-season uses;
  consistent with AG-S2.8 (seasonal patterns) + AG-S7.6 (viability).

Each glamping-specific objective carries a **conditional `scopeNotes`** ("Applies
when ...; omit for day-visit-only agritourism") mirroring the education
EDU-S4.7 / EDU-S5.7 "omit if no food service intended" precedent, so plain day-visit
agritourism / retreat projects are not over-scoped.

## Amanah

The extension introduces **no new sales surface** - bookings remain the already-ratified
service-reservation model (2026-05-29). AG-S7.8 explicitly records that any future
season-pass / advance multi-night package / membership prepayment would be a sales
instrument requiring **verbatim encoding + an Amanah scopeNote** (*bay` ma laysa `indak*
/ gharar - no advance sale of undelivered nights) and **Scholar Council review**; it is
not assumed here. No riba / gharar / CSRA / salam framing
([[feedback-csa-in-catalogues]], [[fiqh-csra-erased-2026-05-04]]). AG-S4.9's
guest-animal interaction carries a welfare (ihsan) duty. Clean.

## Files (3)

- `catalogues/agritourism.ts` - appended the 5 `obj()` blocks at per-stratum insertion
  anchors; header count comments updated (29 -> 34; total 48 -> 53) + a multi-line
  extension note documenting the extend-not-add decision and the conditional-scope
  rationale. No import changes (uses the already-imported `ck` / `dg` / `obj`).
- `__tests__/catalogues.test.ts` - agritourism resolution block: count `29 -> 34`, total
  `48 -> 53`, title rewd; new `it` asserting the 5 extension refs all carry non-empty
  `scopeNotes`. Generic source-discipline / ref-uniqueness / decision-group-partition
  checks auto-cover the new objectives.
- NEW `docs/catalogues/eco-resort-glamping-agritourism-extension-draft.md` - the ratified
  spec.

## Verified

- `corepack pnpm -C packages/shared exec tsc --noEmit` **EXIT 0** (pnpm not on PowerShell
  PATH -> via `corepack`). One fix during verify: the new `scopeNotes` test used
  `extensionRefs.includes(o.ref)` but `ref` is `string | undefined` -> `o.ref ?? ''`.
- `catalogues.test.ts` **99/99** (was 98; +1) bounded `--pool=forks --testTimeout=20000`
  ([[feedback-vitest-bounded-runs]]).

## Commit hygiene

`git fetch` first; behind 0 / ahead 76 (no divergence). Working tree heavy with foreign
WIP - the 3 slice files staged **explicitly by name**, staged set verified == exactly
those 3 ([[feedback-commit-immediately-on-rebased-branches]], [[project-branch-rebase]]).
Not pushed (standing "commit, not push"). LF->CRLF warnings benign. ASCII-only.

## Next

Three types still missing from the 19-type roadmap: Watershed / Wetland Restoration,
Sustainable Forestry / Woodlot, Community Garden / Urban Ag (iterated one at a time).

ADR [[decisions/2026-06-03-olos-agritourism-eco-resort-extension]]; entity
[[entities/shared-package]] (fold deferred while tree carries foreign WIP).
