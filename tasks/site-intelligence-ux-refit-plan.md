# Site Intelligence Panel — UX Refit Plan

**Date:** 2026-04-23
**Source:** Modern UI/UX Design Scholar critique (NotebookLM conv `2b89f729`, note `1d4f6a25`)
**Target file (primary):** [SiteIntelligencePanel.tsx](apps/web/src/components/panels/SiteIntelligencePanel.tsx)
**CSS:** [SiteIntelligencePanel.module.css](apps/web/src/components/panels/SiteIntelligencePanel.module.css)
**Shared primitives:** [sections/_shared.tsx](apps/web/src/components/panels/sections/_shared.tsx)

---

## Context

Panel reads as a "drawer-dump" — every row has similar visual weight, score/confidence/interpretive badges share color semantics, and four always-"Waiting" Derived Analyses rows occupy ~120px of vertical real-estate with zero insight. Goal: a site-evaluator must answer *"is this land good?"* in <5 seconds.

---

## Phase 1 — Hierarchy: Summary → Diagnostics → Evidence → Derived

**Why first:** biggest cognitive uplift, smallest code churn (JSX reorder, not new components).

**Current order** ([SiteIntelligencePanel.tsx:679-721](apps/web/src/components/panels/SiteIntelligencePanel.tsx:679)): ScoresAndFlagsSection (contains hero + Derived + Live Data) → Hydrology → Groundwater → …

**Target order inside ScoresAndFlagsSection** ([ScoresAndFlagsSection.tsx](apps/web/src/components/panels/sections/ScoresAndFlagsSection.tsx)):

1. Hero bento: score ring + completeness dots (unchanged)
2. **Blocking alerts** — keep right-column placement, but upgrade to actionable structure (Phase 1b)
3. **LIVE US/ONTARIO DATA** card *(moved up from below)*
4. **DERIVED ANALYSES** card *(moved down — now visually "secondary/computed")*

**Phase 1b — Actionable alert micro-structure** (only if CRITICAL flags exist):
- Title (bold, 1 line) — e.g., "Missing regulatory layer"
- Reason (muted, 1 line) — e.g., "Wetlands data unavailable for this county"
- Action CTA — e.g., "Request local record" or "Upload PDF survey" (stub to no-op for now; ticket surface only)
- Source tag (existing)

Files: swap JSX blocks in `ScoresAndFlagsSection.tsx` (lines ~255–282 vs 288–364). Extract alert body into `<ActionableAlert>` inline component in same file.

---

## Phase 2 — Badge Semantics: Split Confidence from Interpretation

**Why:** `Low` confidence badge and `Low` suitability badge today look similar → users confuse meta-data with data.

**Rule:**

| Signal | Treatment | CSS class |
|---|---|---|
| **Interpretive** (Arid, Hardiness 6a, Low suitability, Estimated) | Keep semantic color (green/gold/red) | `.badgeHigh/Medium/Low`, `.classificationChip` |
| **Confidence** (High/Med/Low) | **Desaturate → monochrome greys** | new `.confidenceNeutral` variant |
| **Provenance** (source/date/resolution) | Already a tooltip on ConfBadge ✓ | unchanged |

Implementation:
- In [_shared.tsx](apps/web/src/components/panels/sections/_shared.tsx) `ConfBadge` (lines 66–120): add `variant?: 'semantic' | 'neutral'` prop, default `'neutral'`. Neutral = grey pill with muted text, reason-glyph retained.
- Remove `.badgeHigh/Medium/Low` color tokens from confidence pills in `.liveDataRow`.
- Keep the "Low" suitability badge next to "Overall Suitability" *semantic* (red) — that's interpretive.

---

## Phase 3 — Collapse Waiting Rows into a "Dependencies" Summary

**Why:** four always-"Waiting" rows = 120px of clutter when `tier3Status.every(t => t.status === 'waiting')`.

**Logic** ([SiteIntelligencePanel.tsx:159-185](apps/web/src/components/panels/SiteIntelligencePanel.tsx:159) and render ~258–280 in `ScoresAndFlagsSection.tsx`):

- **If all 4 rows waiting** → render a single 1-line collapsed state:
  `⏸  4 analyses awaiting Tier-1 data  · chevron ▾`
  Click expands the full list (disclosure).
- **If ≥1 row is `computing` or `complete`** → render the current list as-is (shimmer for computing, check for complete).
- **When a blocker is met** → that specific row rendered; still-blocked rows remain in the collapsed summary.

New sub-component in `ScoresAndFlagsSection.tsx`: `<DerivedAnalysesCard>` owning disclosure state. Default collapsed when all-waiting.

---

## Phase 4 — Component Polish

### 4a. Sticky mini-score: *collapse*, don't duplicate

**Current** ([StickyMiniScore.tsx:33-50](apps/web/src/components/panels/StickyMiniScore.tsx:33)): IntersectionObserver on hero; sticky renders a 28px ring + label that is visually a *second* score when scrolled.

**Fix:** make the hero → sticky transition feel like one element morphing.
- On sticky reveal, fade/shrink the hero ring from 68px → invisible with a 220ms transform, and slide the sticky in synchronously (same IO event). Use `.suitabilityCard[data-sticky-active="true"]` to drive opacity on hero ring.
- Alternative (lighter): keep both rendered but dim the hero ring to 0.35 opacity when sticky is visible so the eye doesn't register two scores.

### 4b. Score liveness pulse

Add a 2-second gold pulse animation to the hero score ring on mount + on score change (Linear status-animation pattern). Pure CSS `@keyframes` on `.scoreCircle` wrapper.

### 4c. Empty state

Today, if no project/parcel selected the panel still renders with placeholder zeros.
- Add early return in `SiteIntelligencePanel` body: if `!project || !project.boundary` → render `<EmptyState>` card: *"Select a parcel on the map to begin analysis"* + tiny illustration/icon. Prevents the entire scaffold from rendering with zero-state badges.

### 4d. Card surface

Minor: bump card background from current tone to a slightly lighter dark-earth mix (oklch +3% L) + 1px inner border + subtle inset shadow (Vercel sidebar pattern). Single CSS var change in `SiteIntelligencePanel.module.css` around `.suitabilityCard`, `.tier3Card`, `.liveDataWrap`.

---

## Verification

1. `npm run build` from repo root — must pass (shared package tsbuildinfo is already dirty).
2. `npm run dev` in `apps/web`, open a project with a parcel, confirm:
   - Above-the-fold: score + critical alert + Live Data first row are visible without scroll
   - Confidence pills are grey; only interpretive badges carry color
   - Derived Analyses card shows "4 analyses awaiting Tier-1 data" collapsed when appropriate
   - Scrolling past hero: hero ring dims/disappears, sticky mini appears — no double-ring moment
   - Deselect parcel → empty state renders instead of zero-scaffold
3. Screenshot before/after via `preview_screenshot` MCP.

---

## Out of Scope (deferred)

- Bento side-by-side header (scholar's option d) — panel is only 360–400px wide; bento needs 2-col breakpoint work we're not doing now
- Rhythm breaks / micro-charts between sections — separate design sprint
- Actionable alert CTAs wired to real endpoints — stub buttons only this pass

---

## Phasing & Effort

| Phase | Files touched | Rough LOC | Risk |
|---|---|---|---|
| 1 — Reorder + actionable alert | ScoresAndFlagsSection.tsx | ~60 | Low |
| 2 — Badge semantics | _shared.tsx + CSS | ~40 | Low |
| 3 — Dependencies collapse | ScoresAndFlagsSection.tsx | ~80 | Medium (new disclosure state) |
| 4a — Sticky morph | StickyMiniScore.tsx + CSS | ~30 | Low |
| 4b–d — Polish | CSS + 1 new EmptyState | ~50 | Low |

Recommend executing Phase 1 → 3 → 2 → 4 (biggest information-architecture wins first, polish last).
