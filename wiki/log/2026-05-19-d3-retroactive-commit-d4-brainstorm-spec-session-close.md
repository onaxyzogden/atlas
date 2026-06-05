# 2026-05-19 — D3 retroactive commit + D4 brainstorm/spec (session close)


**Branch.** `feat/atlas-permaculture`. Two work items this session.

**D3 (closed, committed, pushed).** The budget/cost-tracking slice was
already implemented out-of-band, uncommitted, with no spec/ADR — the same
posture as D2. Followed the user-approved D2 retroactive path:
verify → spec → explicit-path commit. Verified clean: `packages/shared`
tsc exit 0; `apps/web` tsc exit 0 (8 GiB heap) zero errors; 4 suites
17/17 green (`budgetVariance` incl. covenant no-financing regex,
`workItemBudgetStore`, `workItemStore.costs`, `seedGoalCompassCosts`);
covenant grep over engine + `BudgetCard` clean; code review PASS.
Authored net-new as-built spec
[[specs/2026-05-18-d3-budget-cost-tracking-design]] and ADR
[[decisions/2026-05-18-atlas-d3-budget-cost]]. Committed via four
strict explicit-path commits `7ad993d0` (shared engine), `09bfaab2`
(store + spine-seed trilogy), `317b887d` (card + registration),
`1472b4ea` (spec + wiki); fast-forward pushed `c6a64a20..1472b4ea`.
No `git add -A`; D2.1/out-of-band hunks excluded by per-file diff
inspection.

**D4 (brainstorm + spec done; plan handed off).** Ran the
brainstorm→spec cycle for the field-execution-&-proof slice. Four
operator-confirmed forks: core scope = proof + photo references;
surface = new card + tracker badge; actual dates = D4 becomes the
single writer of the long-existing `WorkItem.actualStart/actualEnd`
spine fields; covenant = the most clearly non-covenant D slice (zero
cost/financing surface). Authored
[[specs/2026-05-19-d4-field-execution-proof-design]] (committed
`3e39ca91`/`8a80275e`). A **parallel session** independently authored
the authoritative D4 spec
`docs/superpowers/specs/2026-05-19-d4-field-proof-design.md` (adds D0
typed-event linking; no dedicated `act-field-proof` card) and marked
my spec **SUPERSEDED — retire-not-delete** (commit `3751a1fc`, banner
preserved per the no-deletion-in-revamps covenant). Per operator
instruction, D4 implementation is **dedicated to a separate session**
owning the authoritative spec — no D4 plan written here.

**Git state at close.** Working tree clean. Branch was 3 ahead / 0
behind upstream (`3751a1fc`, `8a80275e`, `3e39ca91` — D4 spec +
supersede banner), fast-forwardable; pushed this close. No force-push;
D2.1 and parallel-session work never clobbered (explicit-path
discipline).
