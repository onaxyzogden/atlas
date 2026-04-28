# Atlas v3 concept-polish pass — scholar-reconciled

**Date:** 2026-04-28
**Status:** Adopted
**Scope:** `apps/web/src/v3` — chrome polish only; no functional change to DiagnoseMap, overlays, homestead anchor, or stores

## Context

Five Emergent HTML concept mockups (Project Command Home, Diagnose, Design,
Prove, Operations) were reviewed against the live v3 React surfaces with the
goal of grafting their best UI/UX ideas onto Atlas without disturbing the
permaculture-aligned functionality already on `feat/atlas-permaculture`
(MapLibre matrix overlays, V3LifecycleSidebar Observe/Test/Steward/Evaluate
verbs, Zustand homestead/wind stores, biophilic token system).

Before grafting, the plan was reconciled with two scholars:

- **Permaculture Scholar** (NotebookLM `5aa3dcf3-…`) — invoked principles
  *"Design from Patterns to Details"*, *"Integrate Rather Than Segregate"*,
  and *"Use Small and Slow Solutions"*; flagged that biophilic UI must read
  as organic material, not tech-glossy.
- **UI/UX Design Scholar** (in-repo audit `design-system/ogden-atlas/ui-ux-scholar-audit.md`)
  — invoked *"Nothing screams so everything is heard"*, the
  Confidence (monochrome) ≠ Quality (semantic) split, and the still-open
  P1 Sparkline primitive from the 2026-04-23 audit.

Both scholars concurred: the concept mockups' chrome is louder and more
fragmented than Atlas's biophilic identity warrants. What's worth taking is
the *structural* ideas (bottom-toolbar, scrollspy, eyebrow labels,
KPI hero treatment) — not the visual surface (glass/blur, per-page tints,
glow pulses).

## Decision

### Rejected outright

| # | Concept idea | Reason |
|---|---|---|
| 1 | Glass-card chrome (translucent + gold border + 4px backdrop-blur) | Permaculture: tech-glossy, distances user from land. UI/UX: violates "nothing screams". Reuse `--surface` / `--surface-raised` solids instead. |
| 2 | Per-stage radial backdrop tint (5 hues across lifecycle) | Permaculture: fragments lifecycle-as-loop, violates "Integrate Rather Than Segregate". Replaced by a single shared **LifecycleProgressRing**. |
| 3 | Live-pulse dot on Operations KPIs | Permaculture: violates "Small and Slow Solutions". Replaced by quiet **ObservedStamp** ("last observed N min ago"). |
| 4 | Cormorant Garamond display font | Off-brand vs Fira Code/Sans biophilic identity. |

### Modified

| # | Concept idea | Modification |
|---|---|---|
| 5 | Verdict-ring glow (gold + 40px blur) | Softened to **`.verdict-ring-quiet`** — 1px earth-toned ring + tokenized inset shadow. No blur, no glow. |

### Kept and grafted

| # | Concept idea | Where it landed |
|---|---|---|
| 6 | Eyebrow uppercase section labels | `.eyebrow` utility in `apps/web/src/v3/styles/chrome.css`; applied across HomePage, DiagnosePage, ProvePage, OperatePage. Heading hierarchy preserved (eyebrow is `<p>` *above* `<h2>`). |
| 7 | Design page bottom-toolbar refactor | `DesignPage` overlay chips + base-map select moved to a sticky bottom toolbar (precedent: 2026-04-27 right-rail/bottom-toolbar split). |
| 8 | Prove scrollspy in DecisionRail | `ProveRail` scrollspy via IntersectionObserver across 5 anchors (Blockers · Best Uses · Vision Fit · Execution · Rules). |

### New (additive)

| # | Item | File |
|---|---|---|
| 10 | **Sparkline** primitive (closes UX Scholar §5 P1 from 2026-04-23) | `apps/web/src/v3/components/Sparkline.tsx` — neutral stroke, semantic accent on endpoint dot only. Awaits trend data in stores; not yet wired to a live site (no series ≥ 3 points exists in mock today). |
| 11 | **ObservedStamp** | `apps/web/src/v3/components/ObservedStamp.tsx` — "last observed N {min,hr,days,wk,mo,yr} ago". Replaces concept live-pulse. Honors `prefers-reduced-motion`. |
| 12 | **LifecycleProgressRing** | `apps/web/src/v3/components/LifecycleProgressRing.tsx` — thin SVG arc keyed off active route; mounted in `V3ProjectLayout` sticky header. Replaces per-stage tint with one unifying lifecycle indicator. |
| 13 | `MetricCard` extensions | Added optional `accent="quiet-ring"` and `trend?: ReactNode` props for hero KPI emphasis and future sparkline embedding (currently used on Operate "Today on the Land" tiles). |

## Phased ordering (Permaculture: patterns to details)

The plan executed flow/structure *before* chrome polish:

1. Foundation primitives (`chrome.css`, Sparkline, ObservedStamp, LifecycleProgressRing)
2. Flow/structure (DesignPage bottom toolbar, ProveRail scrollspy, ProvePage section anchors)
3. Layout chrome (LifecycleProgressRing mounted in V3ProjectLayout header)
4. Eyebrow + ObservedStamp sweep across Home, Diagnose, Prove, Operate
5. Quiet verdict-ring on Operate hero MetricCards (Sparkline data path deferred)
6. Audit + wiki (this entry)

## Confidence / Quality audit

Sweep of touched components confirms:

- All eyebrow labels: monochrome `var(--color-text-muted)` (confidence channel).
- ObservedStamp dot: `rgba(var(--color-sage-rgb), 0.55)` — quality (alive/biological) channel; not used for confidence.
- Quiet verdict-ring: monochrome earth ring; conveys emphasis (confidence), not status (quality).
- MetricCard status pills: unchanged — already correct quality-channel use of `tone-good/watch/warning/blocked`.
- Sparkline (when used): neutral stroke = confidence; endpoint accent = quality.

## Consequences

- HomePage `.liveBadge` / `.liveDot` / `.lastUpdated` chrome is no longer rendered — those CSS rules in `HomePage.module.css` are now dead. Left in place this pass; safe to delete in a follow-up cleanup.
- HomePage `.sectionTitle` and `.colTitle` were re-typeset from 11 px uppercase muted (which functioned as eyebrows) to 16/14 px bold heading-toned. The eyebrow role is now carried by `.eyebrow`. Heading hierarchy preserved per WCAG audit (2026-04-24).
- `Sparkline` primitive is shipped but not yet rendered anywhere — first sites will land when trend arrays are added to TodayTile / DiagnoseCategory / ProveVisionFitBar.
- `LifecycleProgressRing` co-exists with `V3LifecycleSidebar`; the ring is monochrome and thin to avoid competing with the sidebar's stage indication.

## Verification

- `npm run lint` (apps/web) — green
- Hand-walk all 5 v3 routes
- Sidebar verbs (Observe/Test/Steward/Evaluate) and matrix overlays (topography, sectors, wind, zones) confirmed unchanged
- ProveRail scrollspy advances on scroll; clicking rail item scrolls to anchor
- DiagnoseMap, homestead anchor, click-to-fly spotlight pulse, Download Brief markdown export — all unchanged

## Sources

- Permaculture Scholar — NotebookLM `5aa3dcf3-…` (in-session consultation 2026-04-28)
- UI/UX Design Scholar — `design-system/ogden-atlas/ui-ux-scholar-audit.md` (notebook `995a59d1-…`)
- Concept mockups — five Emergent HTML SPAs (Project Command Home / Diagnose / Design / Prove / Operations)
- Precedent ADRs — `2026-04-27-right-rail-bottom-toolbar-split.md`, `2026-04-24-token-policy-oklch-gates.md` (mapZIndex), `2026-04-23-ui-ux-scholar-baseline.md`
