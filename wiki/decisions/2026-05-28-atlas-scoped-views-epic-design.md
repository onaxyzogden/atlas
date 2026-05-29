# 2026-05-28 — Scoped Views Epic (Phase 5 Slice 5.5 re-scoped: Contractor / Landowner / Team-member role-based Project Home)

**Status.** Design approved in-conversation; implementation NOT started. This
record re-scopes what the Slice 5.3 + 5.4 ADRs carried over as a single
"Slice 5.5 — Contractor / Landowner scoped views (frontend-only)" into a
four-slice epic, after the ratified `OLOS_Project_Home_Spec_v1` (sections
1.3, 4, 5, 6, 7, 8) was read in full and checked against the code. The
one-line carry-over did not survive contact with the substrate (see
Context). No code written under this record yet — each slice below ships as
its own commit + its own implementation ADR, mirroring the 5.2 / 5.3 / 5.4
pattern. Continues [[decisions/2026-05-28-atlas-per-project-home-slice54]].

## Context

### Why the carry-over was re-opened

The Slice 5.4 ADR handed off:

> "Slice 5.5 — Contractor + Landowner scoped views: pre-filter the projects
> array passed into `useProjectUrgency` ... For Per-Project Home this becomes
> an upstream visibility check on the single project. Hook signature
> unchanged. Frontend-only."

That sentence was written from memory before the spec was in hand. Reading
`OLOS_Project_Home_Spec_v1` against the code surfaced three walls that make
the literal carry-over either unimplementable or unsafe, plus a scope gap:

1. **No per-project role map exists.** `memberStore.myRole` is a single slot
   (`apps/web/src/store/memberStore.ts`), overwritten on each `fetchMyRole`.
   Filtering N portfolio projects by role needs N roles held at once. No bulk
   endpoint and no `useMyProjectRoles` map hook exist.

2. **Role-filtering would empty the portfolio in the dominant mode.**
   `useProjectRole` only fetches when a user is logged in
   (`apps/web/src/hooks/useProjectRole.ts:31`). The app has a first-class
   offline/demo flow with "no auth, no backend"
   (`apps/web/src/store/memberStore.ts:18`); Portfolio Home reads purely from
   the localStorage project store. With no `user`, every role resolves to
   `null`, so a naive filter hides ALL of the user's own local projects.

3. **Frontend filtering is not what the spec means by enforcement.** Spec
   sections 7.2 / 8.5 require data-layer 403 on URL/API manipulation. A
   frontend filter looks like enforcement while delivering none.

4. **The spec is a multi-slice epic, not one frontend commit.** Section 5
   (contractor task-only view), section 6 (landowner read-only progress view
   via shareable link), section 7 (contractor access expiry) are each
   substantial bodies of work.

### Two findings that de-risk the epic

- **Data-layer enforcement is largely already wired.** Nearly every API route
  plugin gates on `preHandler: [authenticate, resolveProjectRole]` with
  `requireRole(...)` on mutating routes (`apps/api/src/plugins/rbac.ts`
  documents ~22 existing `requireRole` callsites; vegetation, exports, ai,
  climate-analysis, zoning, basemap-terrain, etc. all carry the preHandler
  chain). The 8.5 requirement is mostly allowlist + query-scoping work, not
  greenfield enforcement.

- **The landowner read-only view has a real foundation.** A full
  `apps/web/src/v3/observe/dashboard/presentation/` suite (SiteOverview /
  CurrentConditions / EcologicalTrajectory / EvidenceLibrary sections +
  `PresentationModeOverlay`), `presentationShareStore.ts`,
  `ObserveShareViewerPage.tsx`, and a backend `portal/` public-link API
  (`apps/api/src/routes/portal/public.ts`) already ship. Section 6 maps
  almost 1:1 onto this — the landowner view is composition over existing
  share infrastructure plus a project-progress layer.

## Decision

### 1. Foundational principle — roles are an authenticated + synced capability

Scoped views (team-member / contractor / landowner) exist ONLY for a project
that is synced to the backend (`project.serverId` set) AND viewed by an
authenticated, non-owner member. **Local-only and offline/demo projects
always render as the full single-owner view.**

Rationale: a contractor or landowner cannot exist on a project that lives
only in the viewer's browser — there is no membership table, no second
identity, nothing to scope. Roles become meaningful exactly when a project is
synced and the viewer is an authenticated non-owner. This preserves the
local-first promise (the dominant dev/demo mode is untouched) and matches the
spec's own assumption that roles are assigned server-side (section 7.1).

The two alternatives were rejected: making backend-backing mandatory (curtails
the core local-first promise) and mirroring roles into the local store (adds a
sync-conflict surface and makes "enforcement" cosmetic since local data is
user-editable — contradicts 8.5).

### 2. View inventory — spec sections 1.3 / 4 / 5 / 6 mapped to substrate

Every scope below is conditional on
`authenticated AND project.serverId AND resolvedRole not in {owner, primary_steward}`.
Otherwise the surface renders the full steward view.

| Spec view | Trigger role | Substrate today | Net-new work |
|---|---|---|---|
| Steward — full | owner / primary_steward (and ALL local-only projects) | Per-Project Home (Slice 5.4) | None — this is the baseline |
| Team member — scoped | team_member (legacy: designer) | Per-Project Home regions exist; no assignment filter | Assignment-scoped Next Up + Attention Rail; partial Stage Status Row (Act only unless review rights); scoped activity feed; Act-only quick-nav; "No assignments yet" state (section 7.2) |
| Contractor — task-only | contractor | Field-action substrate exists; no task-only surface | New minimal surface (scope header, scoped task list, scoped map, proof); data-layer query scoping + 403 on Plan/Observe — the confidentiality boundary |
| Landowner — read-only | landowner / external reviewer (link, no account) | presentation/ suite + presentationShareStore + portal/ public API | Project-progress layer (cycle, Plan completion %, Act-verified count, plain-language phase) + steward-curated ecological highlights atop existing presentation sections |

### 3. Enforcement model (spec 7.2 / 8.5)

Frontend role-gating decides which surface renders — that is UX. The real
boundary is the API, which already runs
`authenticate -> resolveProjectRole -> requireRole(...)`. Epic enforcement
work:

- **Break the contractor -> designer equivalence on Plan/Observe.** Today
  `contractor` aliases to `designer`
  (`packages/shared/src/relationships/projectRoleCapabilities.ts:158`) and
  carries `{read, comment, edit}` over the whole project, so a contractor
  session currently satisfies every `requireRole('owner','designer')` gate —
  full Plan/Observe read+edit. The Slice 5.1 authors flagged this as a
  deliberate placeholder (inline doc, lines 44-47: "future Phase 5 slices add
  per-route scoping"). 5.5a/5.5c own that scoping: a contractor session must
  receive 403 on Plan + Observe routes and be scoped to assigned field
  actions only. Mechanism (narrow the alias vs. stage-scoped capabilities vs.
  explicit allowlist exclusion) is resolved in the 5.5a implementation plan;
  the ~22 `requireRole` callsites consuming `roleSatisfies` make this
  load-bearing and the reason it is sequenced first.

- **Distinct landowner access paths.** The `landowner` member role
  (`{read, comment}`, alias `viewer`) and the section-6 landowner VIEW are two
  different things. The landowner view is served via the shareable
  portal/presentation path (no account, time-limited, read-only), not by
  granting live-surface read on the project. The doc keeps them separate; the
  member role is not the access channel for the external-reviewer view.

- **Bulk role map.** A `useMyProjectRoles(projectIds)` hook (built once in
  5.5a) returns a `Map<projectId, role>` so Portfolio can filter/badge by role
  for logged-in sessions while staying a no-op offline. Likely backed by a
  small `GET /projects/my-roles` batch endpoint or N cached per-project calls;
  resolved in the 5.5a plan.

### 4. Slice roadmap

- **5.5a — Role substrate + access foundation** (security spine; ships first):
  `useMyProjectRoles` bulk hook + role-map; Per-Project Home access gate (an
  honest "you do not have access to this project" empty state for
  authenticated non-members, distinct from the existing "No project loaded."
  copy); Portfolio role-filter/badge for logged-in sessions (no-op offline);
  break the contractor Plan/Observe equivalence so those routes return 403 to
  a contractor session.
- **5.5b — Team-member scoped Per-Project Home**: assignment filtering across
  Next Up / Attention Rail / Stage Status Row / activity feed / quick-nav.
- **5.5c — Contractor task-only view**: new surface + data-layer query scoping
  (highest confidentiality care; the section-5 "what contractors never see"
  list is the acceptance gate).
- **5.5d — Landowner read-only progress view + contractor access expiry**:
  compose on the existing presentation/portal substrate; add the progress
  layer + steward-curated highlights; expiry per section 7.2
  (task-complete / manual revoke / 90-day fallback with steward notification +
  task-reassignment flagging).

5.5a is fixed as first — every later slice needs the role substrate and the
enforcement spine. View order after the foundation (Team -> Contractor ->
Landowner) was chosen for a steady risk ramp: closest-to-existing first, the
confidentiality boundary second, the most self-contained / most-reuse view
last.

## Architecture pins

- **Auth + synced only** (this record, decision 1): scoped views never apply
  to local-only / offline projects. Any future surface that wants to scope a
  local-only project is a re-litigation of this principle and needs its own
  ADR.
- **Enforcement lives at the API** (spec 8.5): frontend gating is UX only.
  No slice may present a frontend filter as the access boundary; the 403 is
  the boundary. Contractor confidentiality (section 5) is a data-layer
  obligation, not a UX preference.
- **No-deletion** ([[feedback-no-deletion]]): the existing Per-Project Home,
  Portfolio Home, presentation suite, and `V3HomePage` stay; the epic composes
  on them. New scoped surfaces are added, not swapped in over deletions.
- **Single canonical urgency reader**
  ([[decisions/2026-05-28-atlas-portfolio-home-slice53]]): scoped views still
  consume `useProjectUrgency`; role filtering happens UPSTREAM of the hook
  (the projects array is pre-filtered), so the hook signature is unchanged —
  the one part of the original carry-over that survives intact.
- **Shared chip helper**: scoped Attention Rails reuse `buildUrgencyChips`
  (`apps/web/src/v3/home/urgencyChips.ts`); no scoped surface reinvents chip
  copy.
- **3-item nav forward IA** ([[project-lifecycle-retirement]]): scoped views
  are Plan / Act / Observe-grounded; no 7-stage-lifecycle widgets reintroduced.
- **Slice = commit on `feat/atlas-permaculture`**
  ([[feedback-commit-immediately-on-rebased-branches]]): each of 5.5a-d is one
  commit, staged with explicit paths, divergence-checked before push. This
  design record is itself committed immediately to survive out-of-band rebases.
- **ASCII-only user copy**: all new visible strings ("you do not have access
  to this project", "No assignments yet", scope/header labels) are plain ASCII.
- **CSRA model erased** (global instructions): no investment / advance-purchase
  / yield-share framing on any scoped surface. The landowner view surfaces
  ecological progress, not financial return. Public-facing label for capital
  contributors remains "capital partners & allies"; section-6.x economics are
  Scholar-Council-gated and out of scope for Project Home (spec section 9).

## Risks / open questions (resolved in per-slice implementation plans)

- **5.5a:** exact mechanism for breaking contractor's Plan/Observe access
  without regressing the ~22 legacy `requireRole` gates; whether
  `useMyProjectRoles` needs a new batch endpoint or composes cached
  per-project calls.
- **5.5c:** field-action query scoping — confirm the field-action API can
  filter to "assigned to viewer" server-side, not just client-side.
- **5.5d:** how much of the section-6 landowner view the existing portal/
  share schema already carries vs. needs a project-progress extension;
  contractor-expiry scheduling (where the 90-day timer lives — client, cron,
  or on-read check).
- **Cross-cutting:** the spec assumes org-admin role assignment (section 7.1)
  that this app does not yet have; member/role assignment currently flows
  through `metadata.team` + the members API. Each slice confirms its role
  source before gating on it.

## Carry-over / next step

- **Immediate next:** produce the Slice 5.5a implementation plan (writing-plans)
  and execute. 5.5a is the only slice unblocked right now; 5.5b-d each depend
  on 5.5a's substrate.
- **Phase 6 Notifications** still imports `buildUrgencyChips`; scoped views do
  not change that.
- **Phase 7 cleanup** (retire `V3HomePage`, decide `/v3/project` vs
  `/v3/portfolio` landing) is unaffected by this epic.

Log: [[log/2026-05-28-scoped-views-epic-design]].
