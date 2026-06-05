# ADR: Portfolio Home P7 — capability-based access, full §6 nav, full §3.3 card revamp

**Date:** 2026-05-31
**Status:** accepted
**Context:** Phase 7 of the OLOS Portfolio Home epic (`OLOS_Portfolio_Home_Spec_v1.0`) polishes the Dashboard view, adds the summary bar, and — critically — wires the spec's access-control matrix (§8) and navigation/landing model (§6), neither of which existed after P1–P6. Three design forks needed steward sign-off because each had a cheaper, weaker alternative.

**Decision:**

1. **Role gating is capability-based, never role-name literals.** A single pure helper `portfolioAccess(project, roleMap)` in `portfolioModel.ts` returns `{ role, isOwnerTier, canEdit, isContractor }`, deriving every §8 gate from `hasCapability(role, cap)` (`@ogden/shared`). Local-only projects (no `serverId`) resolve to owner-tier — the steward owns their own offline land. There is **no `admin` ProjectRole**, so "admin = no New-project" has no carrier: New-project stays open to all authed users (creating a project makes you its owner). Owner-tier (`manage_members`) gates relationship-create and the cross-project Observe compare entry points; the compare page short-circuits to a read-only notice when the viewer is owner-tier on no project.

2. **Full §6 navigation.** The `/` `landingRoute` `beforeLoad` becomes project-count-aware using the synchronously-hydrated `useProjectStore.getState()` (zustand-persist): 0 active → `/home` (create flow); 1 → that project's `/v3/project/$id/home`; 2+ → `/v3/portfolio`. **No role logic in `beforeLoad`** (roles are async — would race hydration). AppShell's hardcoded "All Projects" → `/v3/project` link is repointed to `/v3/portfolio` and relabelled "Portfolio".

3. **Full §3.3 card revamp.** `ProjectUrgencyCard` is rebuilt as a BentoBox composition (stage colour bar, serif name, type badges, stage + active-stratum + Plan-progress bar, last-activity line, urgency-chip alert row, area, explicit Open CTA) rather than incrementally adding fields. Parent (`PortfolioDashboardView`) computes stage + Plan progress **once** (`usePortfolioStages`, `usePortfolioPlanProgress`) and threads them as props — no per-card store subscriptions in the grid.

**Consequences:**
- The contractor guard lives in the `/v3/portfolio` route **component** (async-role effect), not `beforeLoad`; a contractor with no owner-tier project is redirected to their assigned project's Act surface (`usePortfolioContractorRedirect`), avoiding the PerProjectHomePage contractor empty-state dead-end.
- Fixed the latent P5 role-key bug in `PortfolioAtAGlanceRail` (`roleMap.get(project.id)` → `project.serverId`-keyed), the same bug class `portfolioAccess` now centralises.
- §8 read-only roles (team_member / viewer / landowner) get no relationship-create and no compare across list, rail, domain header, and the compare page itself.
- Card + rail share `projectTypeBadges(p)` and the stage/progress derivation, so they cannot drift.
- Commit `6bdbb80c` (17 files, append-only on `feat/atlas-permaculture`). Web `tsc` clean (own files); `ProjectUrgencyCard` tests 3/3. Relationships still have zero effect on Plan/Act/Observe logic.
- P1–P6 of this four-zone spec were committed in code but not individually logged in the wiki; this ADR + log entry are the first wiki record of the epic's later phases.
