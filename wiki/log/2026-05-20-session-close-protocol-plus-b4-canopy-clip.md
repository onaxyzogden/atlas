# 2026-05-20 — Session close: parallel-session protocol + B4 canopy-envelope clip

**Branch.** `feat/atlas-permaculture`. Two slices in one session,
both shipped. Day-level synthesis — see the per-slice entries for
authoritative records.

## Slice 1 — Parallel-session coordination protocol

Five commits `1eb3e8f8 → 537d7e13 → 43e2fce8 → c938ed65 → 94ce0c78`
already on `origin/feat/atlas-permaculture`. Per-day `wiki/log/`
files (470 monolith entries migrated), new
[parallel-session-coordination](../concepts/parallel-session-coordination.md)
concept page, SCHEMA + index updates, zero-dep `core.hooksPath`
pre-push deletion-guard hook + installer. Installed in main clone
and verified end-to-end (negative + positive smoke tests both
green). Closes the silent-drop loss class that lost an entry to a
parallel rebase earlier in the week. Full record:
[2026-05-20-parallel-session-coordination-protocol-shipped](2026-05-20-parallel-session-coordination-protocol-shipped.md).

## Slice 2 — B4 canopy-envelope clip (overlap dedup)

Four commits `d2ff1248 → a927ca9b → 3bad1814 → 9787a006` plus this
session-end commit. Closes an undocumented gap in
[B4](../decisions/2026-05-19-atlas-b4-guild-livestock-silvopasture-integration.md):
two or more guilds on the same silvopasture host could sum canopy
footprints exceeding the host polygon itself. `rawCanopyM2` now
clipped at `turf.area(host.geometry)` before division;
`HostIntegrationRow` exposes `hostAreaM2` + `canopyClampedM2`; card
surfaces a muted "canopy claims clipped by N m² at host envelope"
sub-line only when `canopyClampedM2 > 0`. **Denominator unchanged
on purpose** — silvopasture canopy coverage % is over the *grazed*
area, not the full silvopasture polygon (which may include
uncovered margins). 40/40 agroforestry tests green; touched files
TS-clean. ADR status flipped Not pushed → Pushed (the parallel
session had shipped B4 to origin out-of-band before that ADR's
first save propagated). Full record:
[2026-05-20-b4-canopy-dedup-host-envelope-cap](2026-05-20-b4-canopy-dedup-host-envelope-cap.md).

## Session debrief

**Completed.**
- Parallel-session coordination protocol (per-day log files + hook
  + verified end-to-end).
- B4 follow-up: canopy-envelope clip + card surfacing + tests + ADR
  status correction.

**Deferred (queued for a future session).**
- *B4 follow-up — poultry browse-toxicity expansion.*
  `LIVESTOCK_BROWSE_TOXICITY` currently 12 entries, ruminant- and
  equine-focused; chicken/duck/goose tolerances unrepresented.
  Surfaces as an explicit Follow-up bullet on the B4 ADR.
- *B4 follow-up — per-member spatial positions for real
  `turf.union` canopy dedup.* Requires a data-model change
  (members are pinned to host polygons, not placed individually);
  the envelope-clip approximation is the right move until that
  changes.
- *B5.2 conventional cover-crop catalog backfill* — closes the B5.1
  ADR's catalog-growth thread (clover/vetch/rye/etc with grounded
  sources).
- *P2 backlog* — manifest status drift, citation:null cost rows,
  caveats[] truncation, IGRAC licence contradiction,
  regenerationPlanStore hardening, map-overlay chrome, focus-trap
  audit.

**Recommended next session.** Pick from the deferred set. Slight
lean toward **poultry browse-toxicity expansion** (closes the
ruminant-only catalog gap that B4 made visible — small, well-
scoped, citation-bound) or **B5.2 cover-crop catalog backfill**
(closes a still-open B5.1 thread). Both are smaller than a P2
triage and either gives a clean atomic ship.

## Push protocol followed

Five-commit suite pushed in one
`git push --force-with-lease=feat/atlas-permaculture:94ce0c78`
after a fresh `git fetch` confirmed origin still at `94ce0c78`
(no divergence vs. the lease target). Pre-push hook ran and passed
(no `wiki/log/*.md` deletions — only two additions across all five
commits).

## Next-session orient cue

A fresh session reading the top of `wiki/log.md` finds this entry
first, then the two per-slice entries, then the prior protocol
shipment. The B4 ADR's Follow-ups block points to both open
threads (poultry browse-toxicity + per-member positions) for any
session that wants to pick up B4's outstanding work.
