# 2026-05-20 — B4 follow-up: poultry/waterfowl browse-toxicity rows

**Branch.** `feat/atlas-permaculture`. Closes the second of the two
follow-ups called out in
[2026-05-20-session-close-protocol-plus-b4-canopy-clip](2026-05-20-session-close-protocol-plus-b4-canopy-clip.md):
`LIVESTOCK_BROWSE_TOXICITY` was 12 entries, all ruminant- and
equine-focused, even though `LivestockSpecies` already includes
`'poultry'` and `'ducks_geese'` and the silvopasture host union plumbs
those species through unchanged. A guild on the same host with a
chicken or duck herd was producing zero toxicity hits because no
catalog row had poultry/ducks_geese in its `affects` array.

**Diagnosis.** No infrastructure change required.
`toxicityForGuild()` already uses
`entry.affects.some((a) => herdSet.has(a))` and the dedup test keys on
`(speciesId, sorted affects)`, so new avian rows for plants that
already have a ruminant entry are accepted as distinct rows. Treating
the avian rationale + citation as a separate row (not a merged
`affects` array on the existing ruminant row) is the right surface —
the steward sees per-species rationale and citation inline rather than
inferring avian risk from a ruminant clinical note.

**What changed.**

- [apps/web/src/features/agroforestry/livestockBrowseToxicity.ts](../../apps/web/src/features/agroforestry/livestockBrowseToxicity.ts):
  appended seven entries to the catalog. Total 12 → 19.
  - `black_locust` — `['poultry']`, **avoid** — robin/phasin lectins →
    avian GI + cardiac toxicity (Cornell CALS).
  - `cherry` — `['poultry', 'ducks_geese']`, **caution** — *Prunus*
    cyanogenic glycosides; birds sensitive at lower doses than
    ruminants (Merck Vet Manual).
  - `peach` — `['poultry', 'ducks_geese']`, **caution** — same
    *Prunus* pathway as cherry (Merck Vet Manual).
  - `garlic` — `['poultry', 'ducks_geese']`, **caution** — *Allium*
    n-propyl disulfide → Heinz-body hemolytic anemia; birds markedly
    more sensitive than ruminants (ASPCA Animal Poison Control).
  - `garlic_chive` — `['poultry', 'ducks_geese']`, **caution** — same
    *Allium* hemolytic risk; volunteer chive stands in ground-cover
    layers (ASPCA Animal Poison Control).
  - `borage` — `['poultry']`, **caution** — pyrrolizidine alkaloids
    → cumulative hepatotoxicity in laying hens; egg-residue concern
    (Merck Vet Manual).
  - `white_oak` — `['ducks_geese']`, **caution** — gallotannins →
    waterfowl mast toxicosis on heavy autumn acorn fall (Merck Vet
    Manual).
- [apps/web/src/features/agroforestry/__tests__/livestockBrowseToxicity.test.ts](../../apps/web/src/features/agroforestry/__tests__/livestockBrowseToxicity.test.ts):
  three new `toxicityForGuild` cases — (1) "narrows to avian-only
  entries for a poultry herd" using a `cherry + garlic + black_locust`
  guild, asserts the avian rows surface and the ruminant rows do not;
  (2) "narrows to waterfowl-only entries for a ducks_geese herd"
  using `white_oak + garlic_chive`; (3) "returns both ruminant and
  avian rows for a mixed cattle+poultry herd on cherry", asserts the
  steward sees two distinct cherry rows (avoid + caution) so the
  per-species rationale is preserved. Suite grew 15 → 18; all 43
  agroforestry tests green.
- [wiki/decisions/2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md](../decisions/2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md):
  Follow-ups bullet flipped from "Still open: poultry expansion …" to
  closed with a link to this entry. The per-member spatial-positions
  follow-up remains open (needs a data-model change).

**Why separate rows rather than merging into existing ruminant entries.**
The avian clinical pathways and citations differ enough from the
ruminant pathways to deserve their own line in the steward view. The
*Allium* row, for instance, calls out that birds are markedly more
sensitive at lower intake — that nuance is lost if the row reads as
`['horses', 'cattle', 'sheep', 'goats', 'poultry', 'ducks_geese']`
with a single ruminant-flavoured rationale. Keeps the dedup test
honest (one row per `(speciesId, affects-set)`) without coalescing
distinct biological claims.

**Verification.**
- `npx vitest run src/features/agroforestry/__tests__/livestockBrowseToxicity.test.ts` — 18/18 green.
- `npx vitest run src/features/agroforestry` — 43/43 green (3 files).
- `npx tsc --noEmit` against `apps/web` — touched files clean.

**Out of scope.** Pig / rabbit / bee tolerances (separate gap, not
surfaced by B4); adding new `speciesId`s not already in
`plantCatalog.ts`; per-member spatial-positions canopy dedup;
B5.2 cover-crop catalog backfill.
