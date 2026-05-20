# 2026-04-28 — v3 concept-polish pass (scholar-reconciled)


### Done

Reviewed five Emergent HTML concept mockups (Project Command Home, Diagnose, Design, Prove, Operations) and grafted their best UI/UX ideas onto the live v3 React surfaces — without disturbing DiagnoseMap, matrix overlays, homestead anchor, or any Zustand store. Reconciled with the **Permaculture Scholar** and **UI/UX Design Scholar** before any chrome was touched; three concept ideas were dropped outright (glass-blur cards, per-stage tints, live-pulse) and substituted with biophilic-compatible primitives. Rationale and verdict table in [`wiki/decisions/2026-04-28-atlas-concept-polish-pass.md`](decisions/2026-04-28-atlas-concept-polish-pass.md).

**New primitives**
- [`apps/web/src/v3/styles/chrome.css`](../apps/web/src/v3/styles/chrome.css) — `.eyebrow`, `.verdict-ring-quiet` (1px ring + inset shadow, no blur), `.observed-stamp` utilities.
- [`Sparkline.tsx`](../apps/web/src/v3/components/Sparkline.tsx) — neutral-stroke SVG sparkline with semantic accent on the endpoint dot only (closes UX Scholar §5 P1 from 2026-04-23). Shipped but not yet wired (no series ≥ 3 points exists in v3 mock data).
- [`ObservedStamp.tsx`](../apps/web/src/v3/components/ObservedStamp.tsx) — "last observed N {min,hr,days,wk,mo,yr} ago" timestamp; replaces concept live-pulse; honors `prefers-reduced-motion`.
- [`LifecycleProgressRing.tsx`](../apps/web/src/v3/components/LifecycleProgressRing.tsx) — thin SVG arc keyed off active route; mounted in V3ProjectLayout sticky header. Replaces per-stage tint with one unifying lifecycle indicator (Permaculture: "Integrate Rather Than Segregate").

**Flow / structure**
- [`DesignPage.tsx`](../apps/web/src/v3/pages/DesignPage.tsx) — overlay chips + base-map select moved to a sticky `.bottomToolbar` (precedent: 2026-04-27 right-rail/bottom-toolbar split).
- [`ProvePage.tsx`](../apps/web/src/v3/pages/ProvePage.tsx) — section IDs `prove-blockers`, `prove-best-uses`, `prove-vision-fit`, `prove-execution`, `prove-rules`.
- [`ProveRail.tsx`](../apps/web/src/v3/components/rails/ProveRail.tsx) — IntersectionObserver scrollspy with click-to-scroll; quiet active state (no fill, no glow).

**Layout chrome**
- [`V3ProjectLayout.tsx`](../apps/web/src/v3/V3ProjectLayout.tsx) + [`.module.css`](../apps/web/src/v3/V3ProjectLayout.module.css) — sticky header housing LifecycleProgressRing.

**Eyebrow + ObservedStamp sweep**
- [`HomePage.tsx`](../apps/web/src/v3/pages/HomePage.tsx) — eyebrows on Project Health + 3-col headers; ObservedStamp replaces `.liveBadge` + `.lastUpdated`. `HomePage.module.css` `.sectionTitle`/`.colTitle` re-typeset from 11 px uppercase muted (which was functioning as eyebrow) to proper 16/14 px headings; eyebrow role moved to `.eyebrow`.
- [`DiagnosePage.tsx`](../apps/web/src/v3/pages/DiagnosePage.tsx) — eyebrows on the three section headers (Site analysis, Categories, R/O/L). DiagnoseMap, overlays, homestead anchor untouched.
- [`ProvePage.tsx`](../apps/web/src/v3/pages/ProvePage.tsx) — eyebrows on all five sections.
- [`OperatePage.tsx`](../apps/web/src/v3/pages/OperatePage.tsx) — eyebrows on all four section headers; ObservedStamp on "Today on the Land".

**Quiet KPI treatment**
- [`MetricCard.tsx`](../apps/web/src/v3/components/MetricCard.tsx) extended with optional `accent="quiet-ring"` and `trend?: ReactNode` props. Operate "Today on the Land" tiles now render with the quiet ring. Sparkline embedding deferred until trend arrays exist in `TodayTile`.

### Confidence / Quality audit

Sweep of touched components confirms no mixing of channels:
- Eyebrow + quiet-ring + sparkline stroke = monochrome (confidence)
- ObservedStamp dot + sparkline endpoint + MetricCard status pills = semantic (quality)

### Verification

- `npm run lint` (apps/web) — pending in this session
- 5-page hand-walk + reduced-motion check — pending
- Sidebar permaculture verbs (Observe/Test/Steward/Evaluate) and matrix overlays unchanged
