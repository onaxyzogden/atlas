# 2026-05-16 — OLOS pre-live-testing hardening (P0/P1 blockers + P2 backlog)


Pre-external-multi-device-testing scan + fixes. Scope (user-confirmed):
v3 forward journey only; diagnose + fix P0/P1, catalogue P2. **Four**
agent-report errors were verified against code and corrected before
acting (recorded in the plan + this entry so the findings register can
be trusted) — most consequentially #4: "Matrix Toggles is a no-op /
deferred to v3.1" was **false**; it is fully wired (`BaseMapCard`
"Overlays" legend on all forward stages, ~14 consuming overlays). The
only residue was a stale `matrixTogglesStore.ts` header comment
(fixed) — the working feature was **not** disabled (that would have
been destructive). Likewise the "syncService is orphaned" claim was
false (it is auth-wired but **partial**).

**Phase 1 — legacy gating (P0-2):** `routes/index.tsx` — the four v3
7-stage routes (`design`/`prove`/`build`/`operate`) + legacy v2
`projectRoute`/`cycleRoute` converted to `beforeLoad` redirects onto
the v3 forward path (`component: () => null`), mirroring the existing
`discover`/`diagnose` precedent. Page components kept importable
(`void X;`) per the no-deletion policy. `V3LifecycleSidebar` audited:
already 3-item nav only, Coming-soon utilities already
`<button disabled>` — P1-2 satisfied, no change.

**Phase 2 — multi-device durability (P0-1):** new dependency-free
`apps/web/src/lib/projectBundle.ts` — snapshots the entire `ogden-`
localStorage namespace as opaque persist envelopes (prefix-capture is
inherently complete — the plan's hand-enumeration would itself have
risked the "misses a slice" failure; the actual store count is ~70,
not the plan's assumed ~12), 4-key denylist
(auth-token/matrix-toggles/connectivity/exported-flag). Restore =
remove-portable + overwrite + reload. Test-first: 8-spec round-trip
(`projectBundle.test.ts`) green. `ProjectBundleBar`
(`v3/components/`, mounted in `V3ProjectLayout`) is **both** the
export/import entry point **and** the data-safety banner (prominent
warning until `hasExportedBundle()`, then collapses; import has an
explicit "replace ALL + reload" confirm — a bundle is opaque so no
per-field diff). Documented the partial-sync boundary: new ADR
`decisions/2026-05-16-atlas-multi-device-bundle-escape-hatch.md` +
corrected the stale `concepts/local-first-architecture.md` ("not yet
synced" was wrong — 4 slices do sync) + index. Full `syncService`
coverage deferred to backlog (too large to gate testing on).

**Phase 3 — forward-path friction (P1-1..P1-3):** P1-1 Matrix Toggles
**retracted** (verified working — see above). P1-2 already correct.
P1-3 slide-up error boundaries: audited the 3 hosts — Plan + Act both
delegate chrome (incl. `Suspense`) to `_shared/moduleNav/ModuleSlideUp`
(one `ErrorBoundary` added there covers both), Observe has its own copy
(boundary added). Reused the existing `components/ErrorBoundary.tsx`,
keyed per-card so a failed lazy chunk degrades to a message + retry
instead of a white screen behind the open sheet. Plan's pre-existing
`OrphanProbeBoundary` is an unrelated narrower concern, left intact.

**Phase 4 — gates:** `npm run typecheck` (8 GB tsc) **exit 0** (the
historical `DesignElementLayers` Geometry/MultiPoint→Point error is
confirmed resolved — correction #1). Full Vitest **913/913** (73
files) including the new bundle round-trip. P2 backlog filed:
`concepts/p2-pre-testing-backlog.md` + index — 7 items, incl. a
verified correction to the plan's own P2 note (`regenerationPlanStore`
**is** UI-mounted via `RegenerationPlanCard` in `PlanModuleSlideUp`,
contrary to the plan's "not UI-mounted" claim).

**Verification limit (disclosed, not faked):** the plan's manual
in-browser checks (route-redirect click-through, multi-device bundle
round-trip in-browser, toggle→overlay confirmation, forced chunk
failure) require a live MapLibre/WebGL session, which returns black
frames offline per the documented environment limit in recent ADRs.
The substantive verification I stand behind is the automated gate:
`tsc` exit 0 + 913 specs (incl. the bundle export→wipe→import
deep-equal + token-never-travels specs). Not committed — left for the
user's review per session policy.
