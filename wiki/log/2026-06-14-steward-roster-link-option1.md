# 2026-06-14 -- Steward roster link (Option 1): pickers across the capture surfaces

**Objective:** Implement Option 1 of the steward-data consolidation
([[concepts/steward-data-model]], audit `docs/steward-data-audit-2026-06-14.md`) --
link the name-keyed steward capture surfaces back to the canonical roster so the same
person is attributable to ONE `{userId|email}` identity instead of being re-typed by
free-text name per objective. Operator-approved plan, Option 1 ONLY; dual-ref link key;
full slice incl. the cohort restructure.

## What shipped (6 phases, NOT committed, nothing pushed)

- **P1 -- shared primitives.** New `captures/stewardRef.ts`: `StewardRef = {userId} |
  {email} | null` serialised as a compact token (`u:<userId>` joined member /
  `e:<email>` pending invite / `''` off-platform). Decode is TOTAL (junk/foreign ->
  null/undefined), encode is its lossless inverse, so every pre-Option-1 saved decision
  round-trips byte-identically. `buildStewardOptions(roster, model)` merges members +
  invites (dedupe by lowercased email, member/userId wins); `memberStewardOptions(roster)`
  is the members-only list for work assignment. New `StewardPicker` control (themed
  native `<select>`, captures/controls/) + barrel export.
- **P2 -- injection.** `DecisionWorkingPanel` computes `stewardOptions` beside its
  existing roster/ratify seeds (same `projectId`/`siblingValues` seam) and threads it to
  the three captures; no behavioural change until a capture consumes it.
- **P3 -- clean consumers.** LabourInventory roster (parallel `rosterRefs[]` token array,
  absent => all undefined back-compat) + ProvisionBalance c6 ratify rows (optional nested
  `ref` on the JSON row). Seed builders stamp the ref they already know
  (`{email}` per invite). Ratify signature hard gate untouched.
- **P4 -- settlement.** c5 enforcement verifier gets `verifierRef` stored as the
  `spVerifierRef` token (legacy re-encodes byte-identically -- `undefined` dropped by
  conditional spread). c1 cohort **restructured**: free-text composition -> linkable
  `spCohortRows[]` register (`{id, ref?, name, size}`), with legacy `spComposition`
  (join of names) + `spHouseholds` (row count) DERIVED on encode so the c6 capacityFit
  strip and `settlementPhasesFrom` read unchanged; legacy decode collapses old
  composition into one synthetic row (composition/households preserved). Bake-on-first-edit.
- **P5 -- work assignment.** Members-only (no userId for a not-yet-joined invite).
  `ProofCapture.assigneeId` + `fulfilWorkItem` capture/body stamp `assigneeId` on the
  spine alongside `who`; `WorkItemRow` mark-done form gets a `StewardPicker` (gated on
  `memberOptions.length > 0`) that fills `who`=label + `assigneeId`=userId; a free-text
  "Who" edit clears the link.

## Verify

- 170/170 across the 6 touched suites (stewardRef 22, Labour 21, ProvisionBalance 47,
  SettlementPlan 71, workItemStore.fulfil 6 incl. 2 new assigneeId, new WorkItemRow.steward
  3) -- bounded `pool:'forks'` ([[feedback-vitest-bounded-runs]]).
- web `tsc` clean bar the 4 pre-existing baseline errors
  (`syncServiceWorkItemsFallback` + `WorkConflictSection`), zero new.
- Live: web-demo bundle loads + the Act tier-shell renders cleanly with the new imports
  (zero console/build errors). The ecovillage-gated captures + a due work-item don't
  surface on the `mtc` "TYPES NOT SET" sample, so the picker VISUALS rest on the
  render-DOM tests (the established fallback for deep-nested capture state,
  [[project-screenshot-hang]]); the new `WorkItemRow.steward` render test closes the one
  surface that previously lacked render coverage.

## Amanah

Pure identity-linking across cost-share / governance surfaces. Verbatim
`FINANCIAL_SCOPE_NOTE` / `RATIFY_ACK` / `SETTLEMENT_SCOPE_NOTES` untouched; no sale,
advance-purchase, salam, or CSRA surface added or reworded -- clean
([[fiqh-csra-erased-2026-05-04]]).

## Deferred (operator order)

Option 3 (`needs` field on `StewardProfile`) -> Option 2 (server-sync `StewardProfile`)
-> reassess Option 4 (unified `Steward` entity).

Concept [[concepts/steward-data-model]]; entity [[entities/act-tier-shell]].
