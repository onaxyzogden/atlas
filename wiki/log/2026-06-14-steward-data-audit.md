# 2026-06-14 -- Steward data audit (documentation only)

Inventoried every place a user defines steward variables (name, availability,
relationship type, project role, skills, needs) across OLOS/atlas, plus the adjacent
people-entity stores -- in response to the operator noting steward detail is spread
across objectives, tasks, and strata. **No code changed; markdown only.**

**Finding.** There *is* a partial canonical model: a steward is the join of
`memberStore` (`ProjectMemberRecord` -- server identity + 8-value `ProjectRole`) and
`visionStore.stewardProfiles[userId]` (`StewardProfile` -- relationship, age,
occupation, lifestyle, maintenance hours, budget, skills[], personal vision/goals;
**client-only** IndexedDB), joined by `useStewardRoster(projectId)`
(`apps/web/src/v3/observe/modules/human-context/roster.ts`) and exported read-only as
`StewardPayload`. App `ProjectRole` (permission) vs `StewardProfile.relationship`
(domain) are two deliberate independent axes.

**The spread.** ~6 capture surfaces re-enter the same attributes as flat, **name-keyed**
`FormValue` arrays with **no `userId` link** back to the roster: `s1-vision-steward`
(`StewardCapture` -- the only one that feeds the roster, via `queuedInvites` ->
`project_members`), `s1-labour-inventory` (`LabourInventoryCapture` -- per-person
seasonal hours + skills/proficiency + role), `ev-s1-provision-balance` c6 (ratify list),
`ev-s2-social-fabric` c5 (skills by household, no proficiency), `ev-s7-settlement-plan`
c1/c5 (cohort free-text + verifier), and `workItemStore` assignment (userId present but
capacity-blind). Plus parallel people stores with no shared key: `crewMemberStore`
(`CrewMember`: skillLevel, weeklyHoursCap -- self-documented as "deliberately distinct
from ProjectMemberRecord and NetworkContact"), `stakeholderRegisterStore`
(`StakeholderRecord`: role, relationshipStatus), `humanContextStore` (`Household`: count
only, no individuals).

**Gaps.** Same attribute in 3--4 homes (skills, hours); no userId attribution from
capture surfaces; **"needs" captured nowhere** as a steward field; `StewardProfile`
client-only while identity is server-authoritative; three parallel people models by
design.

**Consolidation options (analysis only, no build):** (1) link capture surfaces to the
roster by `userId` (lowest risk, roster-seed already exists in spirit); (2) promote
`StewardProfile` to server sync; (3) add a `needs` field; (4) a unified `Steward` entity
/ server join `getSteward(projectId, userId)` (most invasive, collapses the deliberate
member/crew/contact distinction). Recommended order: 1 -> 3 -> 2 -> reassess 4.

**Deliverables:** full audit `docs/steward-data-audit-2026-06-14.md`; pointer page
`wiki/concepts/steward-data-model.md` (added to `index.md`). Every cited `file:line`
opened and verified. No tests/build run -- nothing in `src/` or `packages/` changed.
Amanah: read-only documentation, no sale/advance-purchase/CSRA/salam surface -- clean.
Concept [[concepts/steward-data-model]]; entities [[entities/act-tier-shell]],
[[entities/plan-tier-shell]].
