# 2026-04-26 — Visitor MapTiler key + Zustand selector loop fixes


### Done

**Live-site MapTiler key entry.** Production build of `atlas.ogden.ag` ships without `VITE_MAPTILER_KEY`. Visitors now paste their own free key into the page; it's persisted to `localStorage` (`ogden-maptiler-key`) and survives reload. Files: [`apps/web/src/lib/maplibre.ts`](apps/web/src/lib/maplibre.ts) (added `MAPTILER_KEY_STORAGE`, `resolveKey()`, `setMaptilerKey()` — module-load constants now resolve from localStorage first, env fallback, no breaking changes at call sites because save flow triggers `window.location.reload()`); [`apps/web/src/features/project/wizard/StepBoundary.tsx`](apps/web/src/features/project/wizard/StepBoundary.tsx) (replaced env-var-jargon error with visitor-facing key-entry fallback `MapKeyFallback`); [`apps/web/src/components/MapTokenMissing.tsx`](apps/web/src/components/MapTokenMissing.tsx) (same input + Save & reload + Clear saved key).

**Infinite-render bug — Feasibility & Herd Rotation panels.** Both panels triggered `Maximum update depth exceeded` and rendered as ErrorBoundary fallback. Root cause: Zustand selectors of the form `useStore((s) => s.someMethod(args))` or `useStore((s) => s.array.filter(...))` where the inner expression returned a freshly-derived array each call. `useSyncExternalStore` saw a "changed" snapshot every render → re-render → selector re-runs → new array → re-render → loop. Fixed in 6 files by switching to subscribe-then-derive: read the raw store array (stable reference) and compute the project-filtered slice inside `useMemo`:
- [`apps/web/src/features/decision/SeasonalRealismCard.tsx`](apps/web/src/features/decision/SeasonalRealismCard.tsx) — was `usePhaseStore((st) => st.getProjectPhases(project.id))` — actual crash from screenshot
- [`apps/web/src/components/panels/TimelinePanel.tsx`](apps/web/src/components/panels/TimelinePanel.tsx) — same `getProjectPhases` pattern, latent
- [`apps/web/src/features/livestock/MultiSpeciesPlannerCard.tsx`](apps/web/src/features/livestock/MultiSpeciesPlannerCard.tsx) — `paddocks.filter(...)` inside selector — Herd Rotation crash
- [`apps/web/src/features/fieldwork/WalkChecklistCard.tsx`](apps/web/src/features/fieldwork/WalkChecklistCard.tsx) — 4 inline-filter selectors
- [`apps/web/src/features/ai-design-support/DesignBriefPitchCard.tsx`](apps/web/src/features/ai-design-support/DesignBriefPitchCard.tsx) — 5 inline-filter selectors
- [`apps/web/src/features/ai-design-support/EducationalExplainerCard.tsx`](apps/web/src/features/ai-design-support/EducationalExplainerCard.tsx) — 5 inline-filter selectors

Decision record: [decisions/2026-04-26-zustand-selector-stability.md](decisions/2026-04-26-zustand-selector-stability.md).

**Dashboard content centering.** [`apps/web/src/features/dashboard/DashboardView.module.css`](apps/web/src/features/dashboard/DashboardView.module.css) — added `.content > * { margin-inline: auto; }`. Each dashboard page already declares its own `max-width` (e.g. HerdRotationDashboard `.page { max-width: 860px }`) — they were just left-aligning inside a 1080px column. Auto inline margin centers them without changing per-page widths. Verified: 860px page now renders with ~107px gap on each side within the 1080px container.

### Verification

- Reproduced both infinite-loop panels in dev preview (Feasibility, Herd Rotation), applied fixes, reproduced clean render — no error boundary, child cards present.
- DOM probe confirms centered child: `childLeft: 347, childRight: 1207` inside `contentLeft: 240, contentRight: 1320`.
- MapTiler visitor flow verified earlier in session via tsc + vite build (both exit 0).

### Deferred

- **Landing-zone audit for the same selector anti-pattern.** Caught 6 files via grep on `use\w+Store\(\(.*?\) => .*?\.(filter|map|sort|slice)\(`. A second sweep should also check store-method getters that return new arrays (`getProjectPhases`, etc.) — only `getProjectPhases` was confirmed problematic; other `getXxx` methods (`getVisionData`, `getConfig`) use `.find()` and return stored references, which is safe.
- **ESLint custom rule** to flag the anti-pattern at lint-time. Defer until next sweep confirms the pattern is closed.

### Recommended next session

- **Sweep store API for stable-reference contracts.** For each `getXxx(id)` method, document whether it returns a stored reference or a fresh array. Convert any fresh-array getters to subscribe-then-derive at every call-site. Optionally add a one-line comment on each store action describing return semantics.
