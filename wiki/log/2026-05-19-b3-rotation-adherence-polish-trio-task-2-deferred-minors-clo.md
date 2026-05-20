# 2026-05-19 — B3 rotation-adherence polish trio (Task-2 deferred minors closed)


**Branch.** `feat/atlas-permaculture`. Single explicit-path commit
`4b17a535` closing the three minors deferred from the Task-2
code-quality review on the B3 plan-vs-actual adherence surface
(commit `290035bd`, ADR `2026-05-19-atlas-b3-rotation-adherence.md`).
Total < 50 LOC across 3 files; strictly the render-only audit
surface — no engine change, no store touched, no spine mutation.

1. **Severity-class collapse fix.** `.badgeWarn` (amber) was
   handling both HIGH and MED, collapsing the engine's 3-tier
   severity into 2 visible tiers. Added `.badgeAlert` (coral) and
   introduced a module-scope `SEVERITY_CLASS` map: HIGH → coral,
   MED → amber, LOW → green. Restores the full signal end-to-end.
2. **Test ↔ engine-copy decoupling.** The seeded-drift assertion
   matched on `/grazed .* beyond/i` — coupling the card test to
   wording in `rotationAdherence.ts`. Replaced with a structural
   `data-testid="rec-row"` + `data-severity="high"` query, plus a
   `getByText(/HIGH/)` badge assertion.
3. **Inline `Head` sub-component removed.** The inner `function
   Head()` was re-created on every render and did not match the
   sibling `RotationSequenceCard` precedent (which inlines the
   header JSX in each branch). Inlined directly in all three
   branches (no-paddocks empty, on-track empty, drift).

**Covenant.** Surface remains strictly agronomic/ecological:
no riba/gharar/CSRA/salam/investor/financing/yield-as-return
lexicon (`/interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i`
clean on touched files), no `WorkItem.status` read or write, no
store writes, no `syncManifest` touch, no DB migration.

**Verification.** `pnpm --filter @ogden/web typecheck` → exit 0;
`pnpm --filter @ogden/web test` → 127 files / 1358 tests green;
fetch + ff-only push (0 behind / 7 ahead → `5c2a28a5..4b17a535`).

**Editable-adherence companion** (the out-of-scope follow-up
explicitly called out in the B3 ADR) remains a separate slice
with its own brainstorm → spec → plan cycle, deferred to a
future session. Design forks already resolved in plan-mode this
session (recorded in
`C:\Users\MY OWN AXIS\.claude\plans\c-users-my-own-axis-downloads-apricot-l-vectorized-cascade.md`
Part B): per-row inline editor mounting, write scope =
`rotationPlanStore` cell edits + render-only corrective-WorkItem
suggestion via the D4 single-writer `fulfilWorkItem` boundary,
immutable `LivestockMoveEvent` log excluded, explicit Save/Cancel
semantics per D2.1. Covenant guards binding for whatever the
brainstorm produces: no `WorkItem.status` mutation, writes only
through `rotationPlanStore`, separate `sectionId`
(`plan-livestock-rotation-adherence-actions`), no schema change
to the move-log or work-item spine.
