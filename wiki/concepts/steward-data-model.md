# Steward Data Model

How "a steward" is represented across OLOS/atlas, and where the same human
attributes get re-captured. Full inventory:
[docs/steward-data-audit-2026-06-14.md](../../docs/steward-data-audit-2026-06-14.md).

## Canonical model (the one good path)

A steward is assembled at read time from two tables joined by `userId`:

- **Identity + app role** -- `ProjectMemberRecord` (`userId`, `email`, `displayName`,
  `role`) in `apps/web/src/store/memberStore.ts`, server-synced (`project_members`).
  `ProjectRole` is the 8-value permission enum (owner / designer / reviewer / viewer /
  primary_steward / team_member / contractor / landowner).
- **Rich overlay** -- `StewardProfile` (`relationship`, `age`, `occupation`,
  `lifestyle`, `maintenanceHrsInitial/Ongoing`, `budget`, `skills[]`, `personalVision`,
  `personalExperienceGoals[]`) in `apps/web/src/store/visionStore.ts:46`,
  **client-only** IndexedDB (`ogden-vision`).
- **Join** -- `useStewardRoster(projectId)` ->
  `StewardRosterEntry { member, profile }` in
  `apps/web/src/v3/observe/modules/human-context/roster.ts`. Edited via
  `StewardSurveyDetail.tsx`; exported read-only as `StewardPayload`.

Two independent axes by design: app `ProjectRole` (permission) vs
`StewardProfile.relationship` (domain relationship). Not part of the problem.

## The spread (the problem)

The same attributes -- name, role, skills, hours -- are re-entered as flat,
name-keyed `FormValue` arrays in capture surfaces that never link back to the roster
by `userId`:

- `s1-vision-steward` (`StewardCapture.tsx`) -- invites; the **only** surface that
  feeds the canonical roster.
- `s1-labour-inventory` (`LabourInventoryCapture.tsx`) -- per-person seasonal hours +
  skills/proficiency + role, by name.
- `ev-s1-provision-balance` c6 -- ratifying members, by name.
- `ev-s2-social-fabric` c5 -- skills by household (chips, no proficiency).
- `ev-s7-settlement-plan` c1 / c5 -- cohort composition (free-text) + verifier, by name.
- Work assignment (`workItemStore`) -- `userId` present but capacity-blind.

Plus parallel people-entity stores with no shared key: `crewMemberStore`
(`CrewMember`: skillLevel, weeklyHoursCap), `stakeholderRegisterStore`
(`StakeholderRecord`: role, relationshipStatus), `humanContextStore` (`Household`:
count only).

## Option 1 -- roster link (BUILT 2026-06-14)

The first consolidation step shipped: capture surfaces now offer a picker seeded from
the canonical roster + pending invites, and record a stable dual ref alongside the
free-text name. Free-text stays as the off-platform fallback; every pre-Option-1 saved
decision round-trips byte-identically (the ref slots are OPTIONAL and TOTAL-decoded).

- **Vocabulary** -- `apps/web/src/v3/act/tier-shell/captures/stewardRef.ts`:
  `StewardRef = { userId } | { email } | null`, serialised as a compact token
  (`u:<userId>` joined member / `e:<email>` pending invite / `''` off-platform). The
  email arm bridges the founding-cohort stage (invites carry no userId yet);
  userId is the precise key once someone joins. Decode is TOTAL (junk -> null/undefined).
- **Selectors** -- `buildStewardOptions(roster, stewardModel)` merges members + invites
  (dedupe by lowercased email, member wins); `memberStewardOptions(roster)` is the
  members-only list for work assignment (no userId for a not-yet-joined invite).
- **Control** -- `StewardPicker` (themed native `<select>`, captures/controls/).
- **Injection** -- `DecisionWorkingPanel` computes `stewardOptions` beside its existing
  roster/ratify seeds and threads it to the captures; `WorkItemRow` calls
  `useStewardRoster` + `memberStewardOptions` directly.
- **Wired consumers** -- LabourInventory roster (`rosterRefs[]`), ProvisionBalance c6
  ratify rows, SettlementPlan c5 verifier (`spVerifierRef` token) + c1 cohort restructure
  (free-text composition -> linkable `spCohortRows[]`, legacy `spComposition`/`spHouseholds`
  derived on encode so the c6 capacityFit strip + `settlementPhasesFrom` read unchanged),
  and work assignment (`fulfilWorkItem.assigneeId` on the spine, members-only).
- Verbatim `FINANCIAL_SCOPE_NOTE` / `RATIFY_ACK` / `SETTLEMENT_SCOPE_NOTES` untouched --
  pure identity-linking, no sale/advance-purchase/salam surface added. Amanah clean.

Deferred next (operator order): Option 3 (`needs` field), Option 2 (sync
`StewardProfile`), then reassess Option 4 (unified `Steward` entity).

## Key gaps

- ~~No `userId` link from capture surfaces to the roster~~ -- closed by Option 1 (above);
  the same person is now linkable to one `{userId|email}` identity per capture.
- "Needs" is captured nowhere as a steward field.
- `StewardProfile` is client-only; identity is server-authoritative (split durability).
- Three parallel "people" models (member / crew / contact) by deliberate design.

See the audit for the variable->location cross-reference and consolidation options
(link by `userId`; sync `StewardProfile`; add `needs`; or a unified `Steward` entity).

Related: [[entities/act-tier-shell]] (capture surfaces), [[entities/plan-tier-shell]].
