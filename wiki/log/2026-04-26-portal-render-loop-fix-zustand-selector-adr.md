# 2026-04-26 — Portal render-loop fix + Zustand selector ADR


**Trigger.** `PortalConfigPanel` ErrorBoundary caught "Maximum update depth exceeded" on mount; stack pointed at [`StakeholderReviewModeCard.tsx`](apps/web/src/features/portal/StakeholderReviewModeCard.tsx) — same anti-pattern as `EnterpriseRevenueMixCard` (commit `5f8e245`) and the prior `phases` fix in `3b7ef6c`.

**Root cause.** `usePortalStore((s) => s.getConfig(project.id))` — getter-in-selector. `getConfig` does `get().configs.find(...)`. Under cascading updates (parent's `useMemo` calls `createConfig` while child is subscribed to `configs`), the find result identity churns and re-enters subscribe before settling.

**Fix.** Five files in `features/portal/`:

- [`StakeholderReviewModeCard.tsx`](apps/web/src/features/portal/StakeholderReviewModeCard.tsx) — replaced `getConfig` selector with `(s) => s.configs` + `useMemo` find; also moved 5 `.length` selectors to the hoist+useMemo pattern for consistency.
- [`PortalConfigPanel.tsx`](apps/web/src/features/portal/PortalConfigPanel.tsx) — same selector swap; preserved auto-create `useMemo` calling `createConfig` when no config exists.
- [`PortalShareSnapshotCard.tsx`](apps/web/src/features/portal/PortalShareSnapshotCard.tsx) — same selector swap.
- [`ServiceStewardshipFramingCard.tsx`](apps/web/src/features/portal/ServiceStewardshipFramingCard.tsx) — same selector swap.
- [`ShareLinkReadinessCard.tsx`](apps/web/src/features/portal/ShareLinkReadinessCard.tsx) — selector swap + 5 `.length` hoists.

**ADR.** Third recurrence; codified the rule in [`decisions/2026-04-26-zustand-selector-discipline.md`](decisions/2026-04-26-zustand-selector-discipline.md). Selectors must return primitives, raw store fields, or action refs only — no getter calls, no inline `.filter()/.map()/.sort()`. Includes a grep predicate for manual audit and flags two outstanding `getVisionData(...)` sites in `features/vision/` and `features/export/` as deferred low-risk follow-ups.

**Verification.** Preview reload → Public Portal panel → `section[aria-label="Stakeholder review mode"]` mounts; no "Maximum update depth" string in body; `apps/web` tsc clean for all 5 files. Console errors limited to pre-existing axe a11y contrast warnings + persist-middleware migration warnings (unrelated).

### Deferred

- **Sweep `features/vision/` and `features/export/`** for `s.getVisionData(...)` getter-in-selector at `StageRevealNarrativeCard.tsx:62` and `InvestorSummaryExport.tsx:24`. Not currently looping but matches the ADR anti-pattern.
- **Repo-wide grep audit** beyond `portal` + `economics` to confirm no other `s.getX(id)` selectors remain.
- **ESLint rule `no-derived-zustand-selector`** — codify the ADR mechanically if a fourth incident occurs.

### Recommended next session

- Knock out the two vision/export `getVisionData` sites under the new ADR (~10 min, mechanical).
- Or: pick up the deferred `StickyMiniScore` add-and-commit from 2026-04-25.
