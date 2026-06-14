# Steward Data Audit -- where steward variables are defined across OLOS/atlas

**Date:** 2026-06-14
**Status:** Reference / audit (documentation only -- no code changed)
**Scope:** Every task/objective/capture where the user defines steward variables
(names, availability, relationship type, project role, skills, needs), plus the
adjacent people-entity stores. Ends with a fragmentation assessment and
consolidation options (analysis, not a build plan).

---

## Why this exists

Steward-related data is captured in many disconnected places across the app, and
the same human attributes are re-typed per objective. This document inventories
the spread so a future consolidation can be scoped from facts, not memory.

**The one-line finding:** there *is* a partial canonical model for "the steward as
a person" -- but ~6 capture surfaces and 2 parallel stores re-enter the same
attributes (name, role, skills, hours) as flat, name-keyed form data that never
links back to that canonical roster.

---

## The canonical model (the one good path)

"A steward" is assembled at read time from two tables joined by `userId`:

| Layer | What it holds | File | Persistence |
|---|---|---|---|
| Identity + app role | `userId`, `email`, `displayName`, `role` (8-value `ProjectRole` enum) | [memberStore.ts](apps/web/src/store/memberStore.ts), schema [collaboration.schema.ts](packages/shared/src/schemas/collaboration.schema.ts) | server (`project_members`) |
| Rich overlay (`StewardProfile`) | `relationship`, `age`, `occupation`, `lifestyle`, `maintenanceHrsInitial/Ongoing`, `budget`, `skills[]`, `personalVision`, `personalExperienceGoals[]` | [visionStore.ts:46](apps/web/src/store/visionStore.ts) | **client-only** (IndexedDB `ogden-vision`) |

The join is a selector, keyed by `userId`, that never duplicates identity:

- [`useStewardRoster(projectId)`](apps/web/src/v3/observe/modules/human-context/roster.ts) -> `StewardRosterEntry { member, profile }`
- Edited via [StewardSurveyDetail.tsx](apps/web/src/v3/observe/modules/human-context/StewardSurveyDetail.tsx) (v3 Observe) and legacy [StewardSurveyCard.tsx](apps/web/src/features/observe/StewardSurveyCard.tsx)
- Aggregated in [HumanContextDashboard.tsx](apps/web/src/v3/observe/modules/human-context/HumanContextDashboard.tsx)
- Exported read-only as `StewardPayload` in [export.schema.ts](packages/shared/src/schemas/export.schema.ts) (a computed merge -- it is **not** a stored row)

**Two independent axes, by design.** App `ProjectRole` (owner / designer / reviewer /
viewer / primary_steward / team_member / contractor / landowner) is permission, on
`project_members`. `StewardProfile.relationship` (lead / co-steward / family / ally /
contributor) is domain relationship, on the client overlay. A person can be a project
`owner` and a `co-steward`, or a `viewer` who is the `lead`. This split is deliberate
and documented at [visionStore.ts:40](apps/web/src/store/visionStore.ts) -- not part
of the problem.

---

## Section B -- capture surfaces that re-enter steward attributes (the spread)

Each surface below records steward-ish data as flat, index-aligned `FormValue` arrays
keyed by **free-text name**, with **no `userId` link** back to `useStewardRoster`. The
same person is re-typed per objective.

| Objective / mode | Component | Stratum / Tier | Steward variables | Storage (FormValue keys) | Links to roster? |
|---|---|---|---|---|---|
| `s1-vision-steward` | [StewardCapture.tsx:148](apps/web/src/v3/act/tier-shell/StewardCapture.tsx) | S1 / Plan | names, emails, roles (team_member / contractor / landowner) | `inviteNames[]`, `inviteEmails[]`, `inviteRoles[]` -> `project.metadata.team.queuedInvites[]` -> eventually `project_members` | becomes members (pre-join) |
| `s1-labour-inventory` | [LabourInventoryCapture.tsx:283](apps/web/src/v3/act/tier-shell/LabourInventoryCapture.tsx) | S1 / Plan | per-person **availability** (seasonal hours), **skills** + proficiency, role, capacity band | `rosterNames[]`, `rosterSpring/Summer/Autumn/Winter[]`, `rosterSkills[]` (packed), `rosterRoles[]` | **no** (by name) |
| `ev-s1-provision-balance` c6 (ratify) | [ProvisionBalanceCapture.tsx](apps/web/src/v3/act/tier-shell/ProvisionBalanceCapture.tsx) | S1 / Act | ratifying member names, status, signature timestamp | `ratifyNames[]`, `ratifyStatus[]`, `ratifySignedAt[]` | **no** (by name) |
| `ev-s2-social-fabric` c5 (skills) | [SocialFabricCapture.tsx](apps/web/src/v3/act/tier-shell/SocialFabricCapture.tsx) | S2 / Act | **skills** by household (6 domains, chip model, no proficiency) | `sfSkills{i}[]` per household | **no** (per household) |
| `ev-s2-carrying-capacity` c6 | [CarryingCapacityCapture.tsx](apps/web/src/v3/act/tier-shell/CarryingCapacityCapture.tsx) | S2 / Act | population ceiling (households x people-per-household) -> gates settlement size | computed from c1--c5 siblings | n/a |
| `ev-s7-settlement-plan` c1 (cohort) | [SettlementPlanCapture.tsx](apps/web/src/v3/act/tier-shell/SettlementPlanCapture.tsx) | S7 / Act | founding cohort composition (free-text names/roles), arrival date, household count | `spComposition`, `spArrivalISO`, `spHouseholds` | **no** (free-text) |
| `ev-s7-settlement-plan` c5 (enforcement) | [SettlementPlanCapture.tsx](apps/web/src/v3/act/tier-shell/SettlementPlanCapture.tsx) | S7 / Act | verifier name, verifier role (`VerifierRole`), signature timestamp | `spVerifierName`, `spVerifierRole`, `spVerifiedAt` | **no** (by name) |
| Work assignment | [ActWorkPanel.tsx](apps/web/src/v3/act/tier-shell/work/ActWorkPanel.tsx) / `workItemStore` | S7 / Act | assignee (`assignedToUserId` / `assignedToName` / `assignedToEmail`), carer filter | WorkItem spine (typed-record) | `userId` present but **capacity-blind** |

Note: `s1-vision-steward` is the *only* surface that flows into the canonical roster --
its queued invites become `project_members`. The rest are dead-ends for steward data.

---

## Section C -- adjacent people-entity stores (parallel sprawl)

Separate from the steward roster, the app keeps several other "people" tables, each
with its own id scheme, sync strategy, and overlapping attributes.

| Store | Type | People variables | Key | Sync |
|---|---|---|---|---|
| [crewMemberStore.ts](apps/web/src/store/crewMemberStore.ts), schema [crewMember.schema.ts:28](packages/shared/src/schemas/crewMember.schema.ts) | `CrewMember` | name, `skillLevel` (lead/skilled/general/apprentice), `weeklyHoursCap`, `networkContactId`, notes | local UUID | versioned-blob `ogden-crew-members` |
| [stakeholderRegisterStore.ts:49](apps/web/src/store/stakeholderRegisterStore.ts) | `StakeholderRecord` | name, type, role, `contactMethod`/detail, `relationshipStatus` (conflict -> partnership), `commsChannels[]`, cultural context | `stakeholder-{UUID}` | versioned-blob `ogden-stakeholder-register` |
| [humanContextStore.ts](apps/web/src/store/humanContextStore.ts) | `Household`, `NeighbourPin` | household label, `householdSize` (count only -- **no individuals**), neighbour pins | UUID | versioned-blob `ogden-human-context` |
| [stewardshipRoutine.schema.ts](packages/shared/src/schemas/olos/stewardshipRoutine.schema.ts) | `StewardshipRoutine` | `stewardRoleId` (free string, **unlinked** to any roster id) | string id | server schema (no client store) |

`CrewMember` even documents its own apartness: its docstring says it is "deliberately
distinct from `ProjectMemberRecord` (ACL identity) and `NetworkContact` (external CRM)"
([crewMember.schema.ts:1](packages/shared/src/schemas/crewMember.schema.ts)). So three
separate models -- member, crew, network contact -- each carry a person's name and
some subset of skills/role/contact, with no shared key.

---

## Section D -- variable -> where-defined cross-reference

The reader's index. "A" = canonical model, "B" = capture surfaces, "C" = adjacent stores.

- **Name** -> A (member.displayName) | B (s1-vision-steward, labour-inventory, provision-balance ratify, settlement cohort, settlement verifier) | C (crew, stakeholder, household label)
- **Project role / relationship** -> A (`ProjectRole` *and* `StewardProfile.relationship` -- two axes) | B (invite roles, roster roles) | C (stakeholder role + `relationshipStatus`)
- **Skills** -> A (`StewardProfile.skills`) | B (labour-inventory, with proficiency; social-fabric, chips, no proficiency) | C (crew `skillLevel`)
- **Availability / hours / capacity** -> A (`StewardProfile.maintenanceHrsInitial/Ongoing`) | B (labour-inventory seasonal hours; carrying-capacity ceiling; settlement capacityFit confirm) | C (crew `weeklyHoursCap`)
- **Needs** -> **not captured as a steward field anywhere.** Nearest proxies: habitability thresholds (settlement c2 -- infrastructure, not a person) and skill-gap badges (social-fabric c5).

---

## Fragmentation assessment

1. **Same attribute, 3--4 homes.** *Skills* live on `StewardProfile.skills`,
   `LabourInventory.rosterSkills` (with proficiency), `SocialFabric.sfSkills`
   (household chips), and `CrewMember.skillLevel`. *Hours/capacity* live on
   `StewardProfile.maintenanceHrs*`, `LabourInventory` seasonal hours, and
   `CrewMember.weeklyHoursCap`. None reconcile.

2. **No `userId` link from capture surfaces.** Every Section B surface keys people by
   free-text **name** in parallel arrays. Re-typing "Sarah Mitchell" in the labour
   roster, the provision-balance ratify list, and the settlement cohort produces three
   unrelated rows. Only `s1-vision-steward` joins the roster (its invites become
   members).

3. **"Needs" has no home.** Despite being an explicit steward variable in the brief,
   there is no `needs` field anywhere on the steward. The closest data is
   infrastructure thresholds and auto-derived skill-gap badges.

4. **Client/server split inside the canonical model.** Identity (`memberStore`) is
   server-authoritative; the rich overlay (`visionStore.stewardProfiles`) is
   client-only IndexedDB, "Sprint 3+ will sync" per
   [visionStore.ts:5](apps/web/src/store/visionStore.ts). So the richest steward data
   does not leave the device.

5. **Capacity-blind work assignment.** `WorkItem` assignments carry `assignedToUserId`
   but read no skill or capacity, so the over-capacity signal computed by
   `CrewMember.weeklyHoursCap` never informs who a task is assigned to.

6. **Three parallel "people" models.** `ProjectMemberRecord`, `CrewMember`, and
   `NetworkContact`/`StakeholderRecord` each hold a name and a subset of role/skills/
   contact with no shared key -- by explicit design, but it means "who is this person"
   has no single answer.

---

## Consolidation options (analysis only -- not a build plan)

Listed least-to-most invasive. Each is a direction, not a committed scope.

1. **Link the capture surfaces to the roster by `userId`.** Lowest effort, highest
   payoff. The labour roster, ratify list, and settlement cohort already collect names;
   add an optional `stewardUserId` alongside each name (a picker seeded from
   `useStewardRoster`). Roster-seeding already exists in spirit -- `StewardCapture`
   seeds invites and `LabourInventory` can pre-populate from team members -- so this is
   wiring, not new capture. Keeps free-text for off-platform people. **Trade-off:** each
   surface needs a picker + a back-link; no schema unification, so attributes still live
   in many places, just *attributable* to one person.

2. **Promote `StewardProfile` to server sync.** Make the rich overlay match
   `memberStore`'s server authority (the code already anticipates this). **Trade-off:**
   needs an API table + sync manifest entry; unblocks multi-device and team-visible
   profiles, but does not by itself reduce the number of capture homes.

3. **Add an explicit `needs` field to `StewardProfile`.** Smallest gap-closer for the
   one variable with no home. **Trade-off:** trivial, but only meaningful once a surface
   actually captures it.

4. **A unified `Steward` entity / server join view `getSteward(projectId, userId)`.**
   The most invasive: one canonical row (or a server-assembled view) that merges
   identity + profile + crew capacity + assignments, so every surface reads/writes one
   place. **Trade-off:** large migration touching `memberStore`, `visionStore`,
   `crewMemberStore`, and the capture FormValue contracts; collapses the member/crew/
   contact distinction that is currently deliberate (ACL vs resourcing vs CRM), so it
   needs a decision on whether those *should* merge.

**Recommended sequencing if pursued:** Option 1 first (attributability with minimal
risk), then 3 (close the needs gap), then 2 (durability), and only consider 4 after 1
shows whether a single entity is actually wanted or whether attributable-but-separate
tables are sufficient.

---

## Verification of this document

Documentation only -- no code, tests, or build touched. Every `file:line` reference
above was opened and confirmed during the audit (2026-06-14): the FormValue keys
(`inviteNames`/`rosterSkills`/`spVerifierName` etc.), the `StewardProfile` shape at
[visionStore.ts:46](apps/web/src/store/visionStore.ts), the `useStewardRoster` join,
and the `CrewMember` schema at
[crewMember.schema.ts:28](packages/shared/src/schemas/crewMember.schema.ts) all exist
as cited.
