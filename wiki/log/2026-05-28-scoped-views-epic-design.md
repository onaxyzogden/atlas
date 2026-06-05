# 2026-05-28 — Scoped Views Epic design pass (Phase 5 Slice 5.5 re-scope)

**Branch.** `feat/atlas-permaculture`. Design-only operation — no
implementation code. Re-scopes the single-line "Slice 5.5" carry-over from
[[log/2026-05-28-per-project-home-slice54]] into a four-slice epic after
reading the ratified `OLOS_Project_Home_Spec_v1` in full. ADR:
[[decisions/2026-05-28-atlas-scoped-views-epic-design]].

## Synthesis

The Slice 5.3 + 5.4 ADRs carried Slice 5.5 forward as "Contractor / Landowner
scoped views — filter projects upstream of `useProjectUrgency`, frontend-only,
hook signature unchanged." Reading the spec against the code collapsed that
one-liner:

- **Three walls** make the literal carry-over unimplementable/unsafe:
  (1) `memberStore.myRole` is a single slot, so there is no per-project role
  map to filter a portfolio on; (2) `useProjectRole` only fetches when logged
  in, and Portfolio Home reads the localStorage store, so a naive role filter
  empties the portfolio in the dominant offline/demo mode; (3) frontend
  filtering is not the spec's data-layer 403 (sections 7.2 / 8.5).
- **The spec is an epic** — section 5 (contractor task-only view), section 6
  (landowner read-only shareable progress view), section 7 (contractor access
  expiry) are each substantial.

Two verifications de-risked it: the API already gates ~every route on
`authenticate -> resolveProjectRole -> requireRole(...)` (so 8.5 is mostly
allowlist + query-scoping, not greenfield), and the landowner view has a real
foundation in the existing `v3/observe/.../presentation/` suite +
`presentationShareStore` + the `portal/` public-link API.

The sharpest enforcement finding: `contractor` currently aliases to `designer`
(`projectRoleCapabilities.ts:158`) with `{read, comment, edit}` over the whole
project, so a contractor session satisfies every `requireRole('owner',
'designer')` gate today — full Plan/Observe access. Slice 5.1 flagged this as
a deliberate placeholder pending "future Phase 5 slices"; 5.5a/5.5c own it.

## Decisions locked (in-conversation, via AskUserQuestion)

1. **Re-scope as epic, design first** (vs. ship a narrow frontend slice or
   build bulk-role substrate then filter). The user chose the design pass.
2. **Foundational principle: scoped views are an authenticated + synced
   capability.** Local-only / offline projects always render full
   single-owner view. (Rejected: mandatory backend-backing; mirroring roles
   into the local store.)
3. **View order after the foundation: Team -> Contractor -> Landowner**
   (steady risk ramp). 5.5a (role substrate + enforcement spine) is fixed
   first.

## Files of note

**New (2):**
- `wiki/decisions/2026-05-28-atlas-scoped-views-epic-design.md` — the epic
  design ADR (principle, view inventory, enforcement model, 4-slice roadmap,
  architecture pins, per-slice open questions).
- `wiki/log/2026-05-28-scoped-views-epic-design.md` — this entry.

**Modified (2):**
- `wiki/index.md` — design ADR pointer under Decisions.
- `wiki/log.md` — reverse-chron pointer.

## Verification

Design-only; no tsc / vitest / preview. Spec self-review passed (no
placeholders, internally consistent, scoped, sole ambiguity explicitly
deferred). Pre-commit hygiene: `git diff --cached --name-only` confirms only
the 4 wiki files staged — no foreign WIP from the exclusion list. Committed +
divergence-checked before push per
[[feedback-commit-immediately-on-rebased-branches]].

## Carry-over

- **Immediate next:** Slice 5.5a implementation plan + execution. 5.5b-d each
  depend on 5.5a's role substrate + enforcement spine.
- Each slice ships as its own commit + its own implementation ADR (mirrors
  5.2 / 5.3 / 5.4).
